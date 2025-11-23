const Paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
import { sql } from '@vercel/postgres';

module.exports = async (req, res) => {
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;
  if (event.event === 'subscription.create') {
    // Handle new subscription
  } else if (event.event === 'subscription.renew') {
    // Update renewal_date
    const subId = event.data.subscription_code;
    const renewalDate = new Date(event.data.next_payment_date);
    await sql`
      UPDATE subscriptions SET renewal_date = ${renewalDate} WHERE paystack_subscription_id = ${subId}
    `;
  } else if (event.event === 'subscription.disable') {
    // Cancel subscription
  }

  res.status(200).send('OK');
};