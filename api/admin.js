import { redis, redisPipeline, hashToObj, cors } from './_db.js';
import { FIXTURES } from './fixtures.js';

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '4321';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { passcode, action, ...data } = req.body || {};

    if (passcode !== ADMIN_PASSCODE) {
      return res.status(403).json({ error: 'Invalid passcode' });
    }

    // ── Verify passcode only ──
    if (action === 'verify') {
      return res.status(200).json({ success: true });
    }

    // ── Set live score ──
    if (action === 'setScore') {
      const { matchId, team1Score, team2Score, minute, status } = data;
      if (!matchId) return res.status(400).json({ error: 'matchId required' });

      const now = new Date().toISOString();
      await redis('HSET', `score:${matchId}`,
        'matchId', String(matchId),
        'team1Score', String(team1Score || 0),
        'team2Score', String(team2Score || 0),
        'minute', String(minute || ''),
        'status', status || 'live',
        'updatedAt', now
      );

      return res.status(200).json({ success: true });
    }

    // ── Set match meta (status override + winner) ──
    if (action === 'setMeta') {
      const { matchId, statusOverride, winner } = data;
      if (!matchId) return res.status(400).json({ error: 'matchId required' });

      const now = new Date().toISOString();
      await redis('HSET', `meta:${matchId}`,
        'matchId', String(matchId),
        'statusOverride', statusOverride || '',
        'winner', winner || '',
        'updatedAt', now
      );

      if (process.env.GOOGLE_SHEET_WEBHOOK && winner) {
        const matchDetails = FIXTURES.find(m => String(m.id) === String(matchId));
        const matchName = matchDetails ? `${matchDetails.team1?.name || 'TBD'} vs ${matchDetails.team2?.name || 'TBD'}` : `Match ${matchId}`;
        
        const payload = {
          'Match Name': matchName,
          'Match Date': matchDetails?.date || '',
          'Match Time': matchDetails?.timeIST || '',
          'Winner Team Name': winner
        };

        fetch(process.env.GOOGLE_SHEET_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetTab: 'Prediction', type: 'result_update', data: payload })
        }).catch(err => console.error('Webhook error:', err));
      }

      return res.status(200).json({ success: true });
    }

    // ── Set knockout teams (assign real teams to knockout slots) ──
    if (action === 'setKnockoutTeams') {
      const { matchId, team1Name, team2Name } = data;
      if (!matchId) return res.status(400).json({ error: 'matchId required' });

      const now = new Date().toISOString();
      await redis('HSET', `knockout:${matchId}`,
        'matchId', String(matchId),
        'team1Name', team1Name || '',
        'team2Name', team2Name || '',
        'updatedAt', now
      );

      return res.status(200).json({ success: true });
    }

    // ── Get all predictions for a specific match ──
    if (action === 'getMatchPredictions') {
      const { matchId } = data;
      if (!matchId) return res.status(400).json({ error: 'matchId required' });

      const keys = await redis('SMEMBERS', `preds:match:${matchId}`);
      if (!keys || !keys.length) return res.status(200).json({ predictions: [] });

      const pipeline = keys.map(k => ['HGETALL', k]);
      const results = await redisPipeline(pipeline);
      const predictions = results.map(r => hashToObj(r)).filter(Boolean);

      // Enrich with user names
      const phoneSet = [...new Set(predictions.map(p => p.phone))];
      const userPipeline = phoneSet.map(p => ['HGETALL', `user:${p}`]);
      const userResults = await redisPipeline(userPipeline);
      const userMap = {};
      phoneSet.forEach((phone, i) => {
        const u = hashToObj(userResults[i]);
        if (u) userMap[phone] = u.name || 'Unknown';
      });

      predictions.forEach(p => {
        p.userName = userMap[p.phone] || 'Unknown';
      });

      return res.status(200).json({ predictions });
    }

    // ── Reset a match (clear score, winner, status override) ──
    if (action === 'resetMatch') {
      const { matchId } = data;
      if (!matchId) return res.status(400).json({ error: 'matchId required' });

      await redis('DEL', `score:${matchId}`);
      await redis('DEL', `meta:${matchId}`);

      return res.status(200).json({ success: true });
    }

    // ── Bulk set status (emergency open/close all) ──
    if (action === 'bulkSetStatus') {
      const { statusOverride, matchIds } = data;
      if (!matchIds || !matchIds.length) return res.status(400).json({ error: 'matchIds required' });

      const now = new Date().toISOString();
      const cmds = matchIds.map(id => [
        'HSET', `meta:${id}`,
        'matchId', String(id),
        'statusOverride', statusOverride || '',
        'updatedAt', now
      ]);

      await redisPipeline(cmds);
      return res.status(200).json({ success: true, count: matchIds.length });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (err) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
