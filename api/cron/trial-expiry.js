import { sql } from '@vercel/postgres';

module.exports = async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await sql`
      UPDATE users
      SET plan_tier = 'expired'
      WHERE plan_tier = 'trial' AND trial_end < NOW()
    `;
    res.json({ success: true, updated: 'expired trials' });
  } catch (err) {
    res.status(500).json({ error: 'Cron failed' });
  }
};
