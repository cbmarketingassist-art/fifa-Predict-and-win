import { redisPipeline, hashToObj, redis } from './_db.js';
import { FIXTURES, TEAMS } from './fixtures.js';

// ── Dynamic cache TTL ─────────────────────────────────────────────────
// Match day  (any fixture within prediction-open → match-end window): 60 s
// Idle days  (no fixtures nearby): up to 12 hours, or until the next
//            prediction window opens — whichever comes first.
// This cuts database commands from ~450 K/day to < 1 K/day on off-days.
function computeCacheTTL() {
  const now = Date.now();
  const PRED_OPEN_MS = 8 * 60 * 60 * 1000;   // predictions open 8 h before kick-off
  const MATCH_END_MS = 3 * 60 * 60 * 1000;   // match ends ~3 h after kick-off
  const MAX_TTL_MS   = 12 * 60 * 60 * 1000;  // 12-hour cap

  let nearestWindowMs = Infinity;

  for (const f of FIXTURES) {
    const kickoff     = new Date(f.date + 'T' + f.timeIST + ':00+05:30').getTime();
    const windowStart = kickoff - PRED_OPEN_MS;
    const windowEnd   = kickoff + MATCH_END_MS;

    // Inside an active window → short TTL
    if (now >= windowStart && now <= windowEnd) return 60_000; // 1 minute

    // Track the soonest upcoming window so we wake up right when it opens
    if (windowStart > now) {
      nearestWindowMs = Math.min(nearestWindowMs, windowStart - now);
    }
  }

  return Math.min(MAX_TTL_MS, nearestWindowMs);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const cacheTTL = computeCacheTTL();

  // Try to read from cache first
  try {
    const cached = await redis('GET', 'cache:matches');
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheTTL) {
        return res.status(200).json(data);
      }
    }
  } catch (err) {
    console.warn('Redis cache read failed, performing full fetch:', err.message);
  }

  // Deep-clone fixtures so we don't mutate the import
  const matches = FIXTURES.map(m => JSON.parse(JSON.stringify(m)));

  // ── Merge server-stored data from Redis ──
  try {
    const metaCmds  = matches.map(m => ['HGETALL', `meta:${m.id}`]);
    const scoreCmds = matches.map(m => ['HGETALL', `score:${m.id}`]);
    const koCmds    = matches.map(m => ['HGETALL', `knockout:${m.id}`]);
    const allResults = await redisPipeline([...metaCmds, ...scoreCmds, ...koCmds]);

    const n = matches.length;
    const metas    = allResults.slice(0, n).map(r => hashToObj(r));
    const scores   = allResults.slice(n, n * 2).map(r => hashToObj(r));
    const knockouts = allResults.slice(n * 2).map(r => hashToObj(r));

    matches.forEach((m, i) => {
      // Meta overrides (winner, status)
      if (metas[i]) {
        if (metas[i].winner)         m.winner = metas[i].winner;
        if (metas[i].statusOverride) m.statusOverride = metas[i].statusOverride;
      }

      // Live scores
      if (scores[i]) {
        m.score = {
          team1Score: parseInt(scores[i].team1Score) || 0,
          team2Score: parseInt(scores[i].team2Score) || 0,
          minute:     scores[i].minute ? parseInt(scores[i].minute) : null,
          status:     scores[i].status || 'live',
          phase:      scores[i].phase || '',
        };
      }

      // Knockout team assignments (admin manually sets teams for R32, R16, QF, SF, Final)
      if (m.isKnockout && knockouts[i]) {
        const ko = knockouts[i];
        if (ko.team1Name && TEAMS[ko.team1Name]) {
          m.team1 = { ...TEAMS[ko.team1Name] };
        }
        if (ko.team2Name && TEAMS[ko.team2Name]) {
          m.team2 = { ...TEAMS[ko.team2Name] };
        }
      }
    });

    // Save generated list to cache
    try {
      await redis('SET', 'cache:matches', JSON.stringify({ timestamp: Date.now(), data: matches }));
    } catch (cacheErr) {
      console.warn('Failed to write matches to Redis cache:', cacheErr.message);
    }

  } catch (e) {
    // Redis not configured yet — continue without server data
    console.warn('Redis not available, serving matches without server data:', e.message);
  }

  res.status(200).json(matches);
}
