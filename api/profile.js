import { sql } from '@vercel/postgres';
import { getUserFromToken } from './utils.js';

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { rows: [subscription] } = await sql`
      SELECT * FROM subscriptions WHERE user_id = ${user.id} AND status = 'active' ORDER BY created_at DESC LIMIT 1
    `;
    res.json({ ...user, subscription });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
