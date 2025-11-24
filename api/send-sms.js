import { sql } from '@vercel/postgres';
import { requireAuth, getPlanLimits } from '../utils.js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
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
      return res
        .status(400)
        .json({ error: `Batch size exceeds limit (${limits.batch_size})` });
    }

    // Daily usage
    const today = new Date().toISOString().split('T')[0];

    const { rows: usage } = await sql`
      SELECT * FROM daily_usage
      WHERE user_id = ${user.id} AND date = ${today}
    `;

    const currentBatches = usage[0]?.sent_batches || 0;

    if (currentBatches >= limits.daily_batches) {
      return res.status(400).json({ error: 'Daily batch limit reached' });
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send emails one by one (safer)
    const results = [];

    for (const email of contacts) {
      const emailResult = await transporter.sendMail({
        from: `"SMS Messenger" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject || 'New Message',
        text: message
      });

      results.push({ email, status: 'sent', id: emailResult.messageId });
    }

    // Log messages
    await sql`
      INSERT INTO messages (user_id, subject, body, recipients, status)
      VALUES (
        ${user.id},
        ${subject},
        ${message},
        ${JSON.stringify(contacts)},
        'sent'
      )
    `;

    // Update daily usage
    await sql`
      INSERT INTO daily_usage (user_id, date, sent_batches, contacts_sent, max_batches)
      VALUES (${user.id}, ${today}, 1, ${contacts.length}, ${limits.daily_batches})
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        sent_batches = daily_usage.sent_batches + 1,
        contacts_sent = daily_usage.contacts_sent + ${contacts.length}
    `;

    return res.json({
      success: true,
      sentCount: contacts.length,
      results
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Send failed', details: error.message });
  }
}
