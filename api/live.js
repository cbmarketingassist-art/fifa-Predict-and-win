import { redis, hashToObj } from './_db.js';
import { FIXTURES } from './fixtures.js';

// ─────────────────────────────────────────────────────────────────────────────
//  /api/live  — Real-time score sync
//
//  Strategy:
//    1. ESPN public scoreboard — free, no key, unmetered. Primary source.
//    2. API-Football (api-sports.io) if APIFOOTBALL_KEY is set — metered
//       fallback (free tier = 100 req/day, so never primary).
//    3. If both fail, return gracefully (admin manual control still works).
//
//  Called by:
//    - Client auto-sync: GET every 30s while a match is live (js/app.js).
//      GETs share a 20s Redis lock so any number of open browsers
//      produce at most ~3 upstream requests per minute.
//    - Admin "Force Sync" button: POST — bypasses the throttle.
// ─────────────────────────────────────────────────────────────────────────────

const APIFOOTBALL_KEY   = process.env.APIFOOTBALL_KEY;   // optional
const ESPN_BASE         = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const APIFOOTBALL_BASE  = 'https://v3.football.api-sports.io';
const WC2026_LEAGUE_ID  = 1;
const WC2026_SEASON     = 2026;

// ── Name normalisation map ──────────────────────────────────────────────────
// API providers use slightly different team names than our fixture list.
// Map theirs → ours so scores land on the right match.
const NAME_MAP = {
  // ESPN
  'Bosnia-Herzegovina':       'Bosnia and Herzegovina',
  'Congo DR':                 'DR Congo',
  'Türkiye':                  'Turkey',
  'Turkiye':                  'Turkey',
  // API-Football
  'USA':                      'United States',
  'Korea Republic':           'South Korea',
  'Republic of Korea':        'South Korea',
  "Côte d'Ivoire":            'Ivory Coast',
  "Cote d'Ivoire":            'Ivory Coast',
  'Bosnia & Herzegovina':     'Bosnia and Herzegovina',
  'Curacao':                  'Curaçao',
};

function normalise(name = '') {
  return NAME_MAP[name] || name;
}

// ── Date helpers ────────────────────────────────────────────────────────────
// Fixture dates are IST calendar days; API timestamps are UTC. A 19:00 UTC
// kickoff in North America is already the *next* day in IST, so convert
// before comparing.
function istDateOf(utcStr) {
  const d = new Date(utcStr);
  if (isNaN(d)) return null;
  return new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

// ── Find our fixture for a given API match ──────────────────────────────────
function findOurFixture(apiHome, apiAway, apiDateStr) {
  const home = normalise(apiHome);
  const away = normalise(apiAway);

  const candidates = FIXTURES.filter(f =>
    (f.team1.name === home && f.team2.name === away) ||
    (f.team1.name === away && f.team2.name === home)
  );
  if (!candidates.length) return null;

  const istDay = apiDateStr ? istDateOf(apiDateStr) : null;
  if (!istDay) return candidates[0];

  // Exact IST day first, then ±1 day for safety. The date check keeps a
  // knockout rematch from colliding with the pair's group-stage fixture.
  return candidates.find(f => f.date === istDay)
      || candidates.find(f => Math.abs(new Date(f.date) - new Date(istDay)) <= 86400000)
      || null;
}

// ── Determine if a team is home or away for our fixture ────────────────────
function resolveScores(fixture, apiHome, apiAway, homeScore, awayScore) {
  const normHome = normalise(apiHome);
  if (fixture.team1.name === normHome) {
    return { team1Score: homeScore, team2Score: awayScore };
  }
  return { team1Score: awayScore, team2Score: homeScore };
}

// ── Push a finished result to the Google Sheet ──────────────────────────────
// Same message shape api/admin.js sends on a manual winner, so an auto result
// lands in the sheet identically to a hand-entered one.
async function postResultToSheet(fixture, winner) {
  if (!process.env.GOOGLE_SHEET_WEBHOOK) return;
  const payload = {
    'Match Name':       `${fixture.team1?.name || 'TBD'} vs ${fixture.team2?.name || 'TBD'}`,
    'Match Date':       fixture.date || '',
    'Match Time':       fixture.timeIST || '',
    'Winner Team Name': winner,
  };
  try {
    await fetch(process.env.GOOGLE_SHEET_WEBHOOK, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sheetTab: 'Prediction', type: 'result_update', data: payload }),
    });
  } catch (err) {
    console.error('Sheet webhook error:', err.message);
  }
}

// ── Write score + meta to Redis ────────────────────────────────────────────
async function writeToRedis(fixture, team1Score, team2Score, minute, isFinished, winnerName = null) {
  const existing = hashToObj(await redis('HGETALL', `meta:${fixture.id}`)) || {};

  // Human override wins: once an admin sets a winner manually, this match is
  // locked (meta.manual === '1') and auto-sync leaves it completely alone.
  if (existing.manual === '1') return;

  const nowStr = new Date().toISOString();

  if (!isFinished) {
    // Live: keep the score + minute fresh on every sync.
    await redis('HSET', `score:${fixture.id}`,
      'matchId',    String(fixture.id),
      'team1Score', String(team1Score),
      'team2Score', String(team2Score),
      'minute',     minute != null ? String(minute) : '',
      'status',     'live',
      'updatedAt',  nowStr
    );
    return;
  }

  // Prefer the provider's winner flag (covers knockout penalty shootouts,
  // where the score alone says draw); fall back to score comparison.
  let winner = winnerName ? normalise(winnerName) : null;
  if (!winner) {
    winner = 'Draw';
    if (team1Score > team2Score) winner = fixture.team1.name;
    else if (team2Score > team1Score) winner = fixture.team2.name;
  }

  // Dedupe: if we already recorded this exact result, do nothing — this is
  // what stops the sheet from getting a fresh row on every 30s poll.
  if (existing.statusOverride === 'finished' && existing.winner === winner) return;

  await redis('HSET', `score:${fixture.id}`,
    'matchId',    String(fixture.id),
    'team1Score', String(team1Score),
    'team2Score', String(team2Score),
    'minute',     minute != null ? String(minute) : '',
    'status',     'finished',
    'updatedAt',  nowStr
  );
  await redis('HSET', `meta:${fixture.id}`,
    'matchId',        String(fixture.id),
    'statusOverride', 'finished',
    'winner',         winner,
    'source',         'auto',
    'updatedAt',      nowStr
  );

  // First time this result is seen (or the winner changed) → post once.
  await postResultToSheet(fixture, winner);
}

// ── Source 1: ESPN public scoreboard ────────────────────────────────────────
// One request covers a 3-day UTC window: catches everything currently live
// and backfills any full-time result from the last couple of days.
async function syncFromESPN() {
  const DAY = 86400000;
  const fmt = t => new Date(t).toISOString().slice(0, 10).replace(/-/g, '');
  const now = Date.now();
  const url = `${ESPN_BASE}/scoreboard?dates=${fmt(now - DAY)}-${fmt(now + DAY)}`;

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ESPN responded ${res.status}`);
  const data   = await res.json();
  const events = data.events || [];
  if (!events.length) return { updated: 0, source: 'espn', message: 'No matches in window' };

  let updated = 0;
  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;

    const st         = comp.status?.type || {};
    const isLive     = st.state === 'in';
    const isFinished = st.state === 'post' && st.completed === true; // skips postponed/abandoned

    if (!isLive && !isFinished) continue;

    const homeC = comp.competitors?.find(c => c.homeAway === 'home');
    const awayC = comp.competitors?.find(c => c.homeAway === 'away');
    if (!homeC?.team || !awayC?.team) continue;

    const fixture = findOurFixture(homeC.team.displayName, awayC.team.displayName, comp.date || ev.date);
    if (!fixture) continue;

    const { team1Score, team2Score } = resolveScores(
      fixture,
      homeC.team.displayName, awayC.team.displayName,
      parseInt(homeC.score) || 0,
      parseInt(awayC.score) || 0,
    );

    // displayClock is like "67'" or "90'+8'" — leading int is the minute
    const minute = parseInt(comp.status?.displayClock) || null;
    const winnerName = homeC.winner ? homeC.team.displayName
                     : awayC.winner ? awayC.team.displayName
                     : null;

    await writeToRedis(fixture, team1Score, team2Score, minute, isFinished, winnerName);
    updated++;
  }

  return { updated, source: 'espn' };
}

// ── Source 2: API-Football (api-sports.io) ──────────────────────────────────
async function syncFromApiFootball() {
  const today = new Date().toISOString().slice(0, 10);
  const url   = `${APIFOOTBALL_BASE}/fixtures?league=${WC2026_LEAGUE_ID}&season=${WC2026_SEASON}&date=${today}`;

  const res = await fetch(url, {
    headers: {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key':  APIFOOTBALL_KEY,
    },
  });

  if (!res.ok) throw new Error(`API-Football responded ${res.status}`);
  const data = await res.json();
  const fixtures = data.response || [];
  if (!fixtures.length) return { updated: 0, source: 'api-football', message: 'No matches today' };

  let updated = 0;
  for (const item of fixtures) {
    const { fixture: fx, teams, goals } = item;
    const statusCode = fx.status?.short; // NS, 1H, HT, 2H, ET, PEN, FT, AET, PEN
    const isLive     = ['1H', 'HT', '2H', 'ET', 'BT', 'P'].includes(statusCode);
    const isFinished = ['FT', 'AET', 'PEN'].includes(statusCode);

    if (!isLive && !isFinished) continue; // skip upcoming/postponed

    const ourFixture = findOurFixture(teams.home.name, teams.away.name, fx.date);
    if (!ourFixture) continue;

    const { team1Score, team2Score } = resolveScores(
      ourFixture,
      teams.home.name, teams.away.name,
      goals.home ?? 0,
      goals.away ?? 0,
    );

    const winnerName = teams.home.winner ? teams.home.name
                     : teams.away.winner ? teams.away.name
                     : null;

    await writeToRedis(ourFixture, team1Score, team2Score, fx.status?.elapsed, isFinished, winnerName);
    updated++;
  }

  return { updated, source: 'api-football' };
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Throttle client-driven GETs: one upstream sync per 20s across ALL
  // visitors. POST (admin Force Sync) always goes through.
  if (req.method === 'GET') {
    try {
      const acquired = await redis('SET', 'sync:throttle', '1', 'NX', 'EX', '20');
      if (!acquired) {
        return res.status(200).json({ status: 'throttled', message: 'Synced within the last 20s' });
      }
    } catch { /* Redis unavailable — let the sync attempt proceed */ }
  }

  try {
    try {
      const result = await syncFromESPN();
      return res.status(200).json({ status: 'ok', ...result });
    } catch (err) {
      console.warn('ESPN sync failed:', err.message);
      if (!APIFOOTBALL_KEY) throw err;
    }

    const result = await syncFromApiFootball();
    return res.status(200).json({ status: 'ok', ...result });

  } catch (err) {
    console.error('Live sync failed entirely:', err.message);
    return res.status(200).json({
      status: 'skipped',
      reason: 'Score sources unreachable. Admin manual control is still active.',
      error:  err.message,
    });
  }
}
