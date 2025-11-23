import { sql } from '@vercel/postgres';
import { requireAuth, getPlanLimits } from '../utils.js'; // Assume requireAuth returns user

const AT = require('africastalking')({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME
});
const sms = AT.SMS;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await requireAuth(req);
    const { contacts, subject, message } = req.body;

    if (!contacts || contacts.length === 0 || !message) {
      return res.status(400).json({ error: 'Missing contacts or message' });
    }

    // Check plan limits
    const limits = getPlanLimits(user.plan_tier);
    if (contacts.length > limits.batch_size) {
      return res.status(400).json({ error: `Batch size exceeds limit (${limits.batch_size})` });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check daily batches
    const { rows: usage } = await sql`
      SELECT * FROM daily_usage WHERE user_id = ${user.id} AND date = ${today}
    `;
    const currentBatches = usage[0]?.sent_batches || 0;
    if (currentBatches >= limits.daily_batches) {
      return res.status(400).json({ error: 'Daily batch limit reached' });
    }

    // Send SMS batch
    const result = await sms.send({
      to: contacts.join(','),
      message: `${subject ? `[${subject}] ` : ''}${message}`,
      from: 'SMSMessenger' // Sender ID, configure in AT dashboard
    });

    // Log message
    await sql`
      INSERT INTO messages (user_id, subject, body, recipients, status)
      VALUES (${user.id}, ${subject}, ${message}, ${JSON.stringify(contacts)}, 'sent')
    `;

    // Update usage
    await sql`
      INSERT INTO daily_usage (user_id, date, sent_batches, contacts_sent, max_batches)
      VALUES (${user.id}, ${today}, 1, ${contacts.length}, ${limits.daily_batches})
      ON CONFLICT (user_id, date) DO UPDATE SET
        sent_batches = daily_usage.sent_batches + 1,
        contacts_sent = daily_usage.contacts_sent + ${contacts.length}
    `;

    res.json({ success: true, sentCount: contacts.length, result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Send failed', details: error.message });
  }
};