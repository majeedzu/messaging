const Paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
import { sql } from '@vercel/postgres';
import { getUserFromToken } from '../utils.js';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference } = req.query;

  try {
    const response = await Paystack.transaction.verify(reference);

    if (response.data.status === 'success') {
      // Get user from metadata or token if passed
      // For simplicity, assume reference has user info or use session
      // Parse from reference or use callback metadata

      // Update user plan
      const renewalDate = new Date();
      if (response.data.metadata.cycle === 'yearly') renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      else renewalDate.setMonth(renewalDate.getMonth() + 1);

      await sql`
        INSERT INTO subscriptions (user_id, plan_type, billing_cycle, amount, currency, renewal_date, paystack_subscription_id)
        VALUES (${response.data.metadata.userId}, ${response.data.metadata.plan}, ${response.data.metadata.cycle}, ${response.data.amount / 100}, ${response.data.currency}, ${renewalDate}, ${response.data.reference})
        ON CONFLICT DO NOTHING
      `;

      await sql`UPDATE users SET plan_tier = ${response.data.metadata.plan} WHERE id = ${response.data.metadata.userId}`;

      res.redirect('/dashboard.html?success=upgraded');
    } else {
      res.status(400).json({ error: 'Payment failed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
};