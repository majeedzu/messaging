import { sql } from '@vercel/postgres';
import { getUserFromToken, getPlanLimits } from './utils.js';

import { sql } from '@vercel/postgres';
import { getUserFromToken, getPlanLimits } from '../utils.js';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Get current plan, check trial expiry
    const today = new Date().toISOString().split('T')[0];
    let plan_tier = user.plan_tier;

    // Check trial expiry
    if (plan_tier === 'trial' && new Date(user.trial_end) < new Date()) {
      plan_tier = 'expired';
      await sql`UPDATE users SET plan_tier = 'expired' WHERE id = ${user.id}`;
    }

    // Get today's usage
    const { rows: usage } = await sql`
      SELECT * FROM daily_usage WHERE user_id = ${user.id} AND date = ${today}
    `;
    const dailyBatches = usage[0]?.sent_batches || 0;

    const limits = getPlanLimits(plan_tier);

    res.json({
      plan_tier,
      limits,
      daily_batches_used: dailyBatches,
      trial_end: user.trial_end
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};