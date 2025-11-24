import { sql, requireAuth, getPlanLimits } from '@/utils/utils';
import africastalking from 'africastalking';

const AT = africastalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME
});

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const { contacts, subject, message } = await req.json();

    if (!contacts?.length || !message) {
      return Response.json({ error: 'Missing contacts or message' }, { status: 400 });
    }

    const limits = getPlanLimits(user.plan_tier);

    if (contacts.length > limits.batch_size) {
      return Response.json(
        { error: `Batch limit exceeded (${limits.batch_size})` },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const { rows: usage } = await sql`
      SELECT * FROM daily_usage WHERE user_id = ${user.id} AND date = ${today}
    `;

    const sentToday = usage[0]?.sent_batches || 0;

    if (sentToday >= limits.daily_batches) {
      return Response.json({ error: 'Daily batch limit reached' }, { status: 400 });
    }

    const sms = AT.SMS;
    const result = await sms.send({
      to: contacts.join(','),
      message: `${subject ? `[${subject}] ` : ''}${message}`,
      from: 'SMSMessenger'
    });

    await sql`
      INSERT INTO messages (user_id, subject, body, recipients, status)
      VALUES (${user.id}, ${subject}, ${message}, ${JSON.stringify(contacts)}, 'sent')
    `;

    await sql`
      INSERT INTO daily_usage (user_id, date, sent_batches, contacts_sent)
      VALUES (${user.id}, ${today}, 1, ${contacts.length})
      ON CONFLICT (user_id, date) DO UPDATE SET
        sent_batches = daily_usage.sent_batches + 1,
        contacts_sent = daily_usage.contacts_sent + ${contacts.length}
    `;

    return Response.json({ success: true, sentCount: contacts.length, result });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Send failed', details: err.message }, { status: 500 });
  }
}
