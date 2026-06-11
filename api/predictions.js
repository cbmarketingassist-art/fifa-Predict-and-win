import { redis, redisPipeline, hashToObj, cors } from './_db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET /api/predictions ──
    if (req.method === 'GET') {
      const { phone, matchId, all } = req.query;

      // All predictions
      if (all === '1') {
        const keys = await redis('SMEMBERS', 'all_preds');
        if (!keys || !keys.length) return res.status(200).json([]);
        const pipeline = keys.map(k => ['HGETALL', k]);
        const results = await redisPipeline(pipeline);
        return res.status(200).json(results.map(r => hashToObj(r)).filter(Boolean));
      }

      // By match
      if (matchId) {
        const keys = await redis('SMEMBERS', `preds:match:${matchId}`);
        if (!keys || !keys.length) return res.status(200).json([]);
        const pipeline = keys.map(k => ['HGETALL', k]);
        const results = await redisPipeline(pipeline);
        return res.status(200).json(results.map(r => hashToObj(r)).filter(Boolean));
      }

      // By user
      if (phone) {
        const keys = await redis('SMEMBERS', `preds:user:${phone}`);
        if (!keys || !keys.length) return res.status(200).json([]);
        const pipeline = keys.map(k => ['HGETALL', k]);
        const results = await redisPipeline(pipeline);
        return res.status(200).json(results.map(r => hashToObj(r)).filter(Boolean));
      }

      return res.status(400).json({ error: 'Provide ?phone=, ?matchId=, or ?all=1' });
    }

    // ── POST /api/predictions ──
    // Now supports UPSERT — if prediction already exists, update it (allows changing predictions)
    if (req.method === 'POST') {
      const { phone, matchId, teamName } = req.body || {};
      if (!phone || !matchId || !teamName) {
        return res.status(400).json({ error: 'phone, matchId, teamName required' });
      }

      const key = `pred:${phone}_${matchId}`;
      const now = new Date().toISOString();

      // Check if prediction already exists
      const existing = hashToObj(await redis('HGETALL', key));
      const isUpdate = existing && existing.phone;

      const pred = {
        phone,
        matchId: String(matchId),
        teamName,
        submittedAt: isUpdate ? existing.submittedAt : now,
        changedAt: isUpdate ? now : '',
      };

      // Store/update prediction + ensure indexes
      await redis('HSET', key, ...Object.entries(pred).flat());
      await redis('SADD', `preds:match:${matchId}`, key);
      await redis('SADD', `preds:user:${phone}`, key);
      await redis('SADD', 'all_preds', key);

      // Async webhook trigger
      if (process.env.GOOGLE_SHEET_WEBHOOK) {
        fetch(process.env.GOOGLE_SHEET_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: isUpdate ? 'prediction_update' : 'prediction', data: pred })
        }).catch(err => console.error('Webhook error:', err));
      }

      return res.status(200).json({ ...pred, updated: isUpdate });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Predictions API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
