import { redis, redisPipeline, hashToObj } from './_db.js';
import { FIXTURES } from './fixtures.js';

// Get API Key from env, if missing it will just gracefully skip
const API_KEY = process.env.FOOTBALL_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // To prevent abuse, we might want to restrict who can call this or use a Cron secret
  // For Vercel Cron, you can check req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`

  if (!API_KEY) {
    return res.status(200).json({ status: 'skipped', reason: 'No FOOTBALL_API_KEY configured. Falling back to admin manual control.' });
  }

  try {
    // 1. Find matches that are currently 'live' according to our schedule
    // A match is live if it started less than 2.5 hours ago.
    const now = new Date();
    const liveMatches = FIXTURES.filter(m => {
      const start = new Date(m.date + 'T' + m.timeIST + ':00+05:30');
      const ends = new Date(start.getTime() + 2.5 * 60 * 60 * 1000);
      return now >= start && now <= ends;
    });

    if (liveMatches.length === 0) {
      return res.status(200).json({ status: 'ok', message: 'No live matches right now' });
    }

    // 2. Fetch live data from football-data.org (example implementation)
    // You can adapt this to API-Football if you prefer.
    const apiRes = await fetch('https://api.football-data.org/v4/matches', {
      headers: { 'X-Auth-Token': API_KEY }
    });

    if (!apiRes.ok) {
      throw new Error(`API responded with ${apiRes.status}`);
    }

    const data = await apiRes.json();
    const activeGames = data.matches || [];
    let updatedCount = 0;
    const nowStr = new Date().toISOString();

    // 3. Map API results to our matches and update Redis
    for (const ourMatch of liveMatches) {
      // Find matching game from API based on team names or date.
      // Note: Team names might differ slightly, a robust implementation would use a mapping dictionary.
      // For this example, we'll try a simple includes match.
      const apiMatch = activeGames.find(ag => 
        (ag.homeTeam?.name?.includes(ourMatch.team1.name) || ourMatch.team1.name.includes(ag.homeTeam?.name)) &&
        (ag.awayTeam?.name?.includes(ourMatch.team2.name) || ourMatch.team2.name.includes(ag.awayTeam?.name))
      );

      if (apiMatch) {
        const t1Score = apiMatch.score?.fullTime?.home || apiMatch.score?.regularTime?.home || 0;
        const t2Score = apiMatch.score?.fullTime?.away || apiMatch.score?.regularTime?.away || 0;
        
        let matchStatus = 'live';
        if (apiMatch.status === 'FINISHED' || apiMatch.status === 'AWARDED') {
          matchStatus = 'finished';
        }

        // Update score
        await redis('HSET', `score:${ourMatch.id}`,
          'matchId', String(ourMatch.id),
          'team1Score', String(t1Score),
          'team2Score', String(t2Score),
          'minute', apiMatch.minute || '',
          'status', matchStatus,
          'updatedAt', nowStr
        );

        // If finished, auto-set winner metadata
        if (matchStatus === 'finished') {
          let winner = '';
          if (t1Score > t2Score) winner = ourMatch.team1.name;
          else if (t2Score > t1Score) winner = ourMatch.team2.name;
          else winner = 'Draw'; // If draw is allowed

          await redis('HSET', `meta:${ourMatch.id}`,
            'matchId', String(ourMatch.id),
            'statusOverride', 'finished',
            'winner', winner,
            'updatedAt', nowStr
          );
        }

        updatedCount++;
      }
    }

    return res.status(200).json({ status: 'ok', updated: updatedCount });

  } catch (err) {
    console.error('Live Sync Error:', err);
    return res.status(500).json({ error: 'Failed to sync live scores', details: err.message });
  }
}
