import { redisPipeline, hashToObj, redis } from './_db.js';
import { FIXTURES, TEAMS } from './fixtures.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
  } catch (e) {
    // Redis not configured yet — continue without server data
    console.warn('Redis not available, serving matches without server data:', e.message);
  }

  res.status(200).json(matches);
}
