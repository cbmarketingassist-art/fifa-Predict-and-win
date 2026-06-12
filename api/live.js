import { redis } from './_db.js';
import { FIXTURES } from './fixtures.js';

// ─────────────────────────────────────────────────────────────────────────────
//  /api/live  — Real-time score sync
//
//  Strategy:
//    1. Try API-Football (RapidAPI) if APIFOOTBALL_KEY is set — most reliable.
//    2. Fall back to WorldCup26.ir — free, no key required.
//    3. If both fail, return gracefully (admin manual control still works).
//
//  Called by:
//    - Vercel Cron: every 2 minutes (configured in vercel.json)
//    - Admin "Force Sync" button (POST request)
// ─────────────────────────────────────────────────────────────────────────────

const APIFOOTBALL_KEY   = process.env.APIFOOTBALL_KEY;   // optional but recommended
const WC26_BASE         = 'https://worldcup26.ir';
const APIFOOTBALL_BASE  = 'https://v3.football.api-sports.io';
const WC2026_LEAGUE_ID  = 1;
const WC2026_SEASON     = 2026;

// ── Name normalisation map ──────────────────────────────────────────────────
// API providers use slightly different team names than our fixture list.
// Map theirs → ours so scores land on the right match.
const NAME_MAP = {
  'United States':            'United States',
  'USA':                      'United States',
  'Korea Republic':           'South Korea',
  'Republic of Korea':        'South Korea',
  'DR Congo':                 'DR Congo',
  'Congo DR':                 'DR Congo',
  "Côte d'Ivoire":            'Ivory Coast',
  "Cote d'Ivoire":            'Ivory Coast',
  'Bosnia & Herzegovina':     'Bosnia and Herzegovina',
  'New Zealand':              'New Zealand',
  'Saudi Arabia':             'Saudi Arabia',
  'Cape Verde':               'Cape Verde',
  'Curacao':                  'Curaçao',
};

function normalise(name = '') {
  return NAME_MAP[name] || name;
}

// ── Find our fixture for a given API match ──────────────────────────────────
function findOurFixture(apiHome, apiAway, apiDateStr) {
  const home = normalise(apiHome);
  const away = normalise(apiAway);

  return FIXTURES.find(f => {
    const nameMatch =
      (f.team1.name === home && f.team2.name === away) ||
      (f.team1.name === away && f.team2.name === home);
    if (!nameMatch) return false;

    // Optional: date proximity check (within 1 day to handle timezone skew)
    if (apiDateStr) {
      const apiDay  = new Date(apiDateStr).toISOString().slice(0, 10);
      return f.date === apiDay;
    }
    return true;
  });
}

// ── Determine if a team is home or away for our fixture ────────────────────
function resolveScores(fixture, apiHome, apiAway, homeScore, awayScore) {
  const normHome = normalise(apiHome);
  if (fixture.team1.name === normHome) {
    return { team1Score: homeScore, team2Score: awayScore };
  }
  return { team1Score: awayScore, team2Score: homeScore };
}

// ── Write score + meta to Redis ────────────────────────────────────────────
async function writeToRedis(fixture, team1Score, team2Score, minute, isFinished) {
  const nowStr = new Date().toISOString();
  const status = isFinished ? 'finished' : 'live';

  await redis('HSET', `score:${fixture.id}`,
    'matchId',     String(fixture.id),
    'team1Score',  String(team1Score),
    'team2Score',  String(team2Score),
    'minute',      minute != null ? String(minute) : '',
    'status',      status,
    'updatedAt',   nowStr
  );

  if (isFinished) {
    let winner = 'Draw';
    if (team1Score > team2Score) winner = fixture.team1.name;
    else if (team2Score > team1Score) winner = fixture.team2.name;

    await redis('HSET', `meta:${fixture.id}`,
      'matchId',        String(fixture.id),
      'statusOverride', 'finished',
      'winner',         winner,
      'updatedAt',      nowStr
    );
  }
}

// ── Source 1: API-Football (RapidAPI) ──────────────────────────────────────
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
    const { fixture: fx, teams, goals, score } = item;
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

    await writeToRedis(ourFixture, team1Score, team2Score, fx.status?.elapsed, isFinished);
    updated++;
  }

  return { updated, source: 'api-football' };
}

// ── Source 2: WorldCup26.ir ────────────────────────────────────────────────
async function syncFromWorldCup26() {
  // Try a few common endpoint patterns for this community API
  const endpoints = [
    `${WC26_BASE}/api/matches`,
    `${WC26_BASE}/api/v1/matches`,
    `${WC26_BASE}/matches`,
  ];

  let data = null;
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { headers: { Accept: 'application/json' } });
      if (res.ok) { data = await res.json(); break; }
    } catch { /* try next */ }
  }

  if (!data) throw new Error('WorldCup26.ir: all endpoints failed');

  // Handle both array and {matches:[]} shapes
  const matches = Array.isArray(data) ? data : (data.matches || data.data || []);
  if (!matches.length) return { updated: 0, source: 'worldcup26', message: 'Empty response' };

  let updated = 0;
  for (const m of matches) {
    // WorldCup26 field names (best guess from community docs):
    const homeTeam   = m.home_team?.name || m.homeTeam?.name || m.team1;
    const awayTeam   = m.away_team?.name || m.awayTeam?.name || m.team2;
    const homeGoals  = m.home_team?.goals ?? m.home_score ?? m.score?.home ?? null;
    const awayGoals  = m.away_team?.goals ?? m.away_score ?? m.score?.away ?? null;
    const statusRaw  = (m.status || m.match_status || '').toLowerCase();
    const isLive     = statusRaw.includes('live') || statusRaw.includes('progress') || statusRaw === '1h' || statusRaw === '2h';
    const isFinished = statusRaw.includes('finished') || statusRaw === 'ft' || statusRaw.includes('complete');
    const minute     = m.time || m.elapsed || m.minute || null;
    const dateStr    = m.date || m.match_date || null;

    if ((!isLive && !isFinished) || homeGoals == null) continue;

    const ourFixture = findOurFixture(homeTeam, awayTeam, dateStr);
    if (!ourFixture) continue;

    const { team1Score, team2Score } = resolveScores(
      ourFixture, homeTeam, awayTeam,
      parseInt(homeGoals), parseInt(awayGoals),
    );

    await writeToRedis(ourFixture, team1Score, team2Score, minute, isFinished);
    updated++;
  }

  return { updated, source: 'worldcup26' };
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Attempt API-Football first if key is available
    if (APIFOOTBALL_KEY) {
      try {
        const result = await syncFromApiFootball();
        return res.status(200).json({ status: 'ok', ...result });
      } catch (err) {
        console.warn('API-Football failed, falling back to WorldCup26.ir:', err.message);
      }
    }

    // Fallback: WorldCup26.ir (always free, no key)
    const result = await syncFromWorldCup26();
    return res.status(200).json({ status: 'ok', ...result });

  } catch (err) {
    console.error('Live sync failed entirely:', err.message);
    return res.status(200).json({
      status: 'skipped',
      reason: 'Both API sources failed. Admin manual control is still active.',
      error:  err.message,
    });
  }
}
