import { sql } from '@vercel/postgres';
import { getUserFromToken } from './utils.js';

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { rows } = await sql`
      SELECT * FROM messages WHERE user_id = ${user.id} ORDER BY sent_at DESC LIMIT 20
    `;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
