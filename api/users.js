import { redis, redisPipeline, hashToObj, cors } from './_db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET /api/users ──
    if (req.method === 'GET') {
      const { phone, all } = req.query;

      // List all users
      if (all === '1') {
        const phones = await redis('SMEMBERS', 'users');
        if (!phones || !phones.length) return res.status(200).json([]);
        const pipeline = phones.map(p => ['HGETALL', `user:${p}`]);
        const results = await redisPipeline(pipeline);
        const users = results.map(r => hashToObj(r)).filter(Boolean);
        return res.status(200).json(users);
      }

      // Get single user
      if (phone) {
        const data = await redis('HGETALL', `user:${phone}`);
        const user = hashToObj(data);
        return res.status(200).json(user || {});
      }

      return res.status(400).json({ error: 'Provide ?phone= or ?all=1' });
    }

    // ── POST /api/users ──
    if (req.method === 'POST') {
      const { phone, name } = req.body || {};
      if (!phone) return res.status(400).json({ error: 'phone is required' });

      const now = new Date().toISOString();
      const existing = hashToObj(await redis('HGETALL', `user:${phone}`));

      const user = {
        phone,
        name: name || (existing && existing.name) || 'Unknown',
        joinedAt: (existing && existing.joinedAt) || now,
        updatedAt: now,
      };

      await redis('HSET', `user:${phone}`, ...Object.entries(user).flat());
      await redis('SADD', 'users', phone);

      // Async webhook trigger (don't await so we don't slow down the user)
      if (process.env.GOOGLE_SHEET_WEBHOOK) {
        fetch(process.env.GOOGLE_SHEET_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetTab: 'User Registration', type: 'user', data: user })
        }).catch(err => console.error('Webhook error:', err));
      }

      return res.status(200).json(user);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Users API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
