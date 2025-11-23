import { sql } from '@vercel/postgres';
import { getUserFromToken } from '../utils.js';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { id } = req.body;
    await sql`DELETE FROM messages WHERE id = ${id} AND user_id = ${user.id}`;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};
