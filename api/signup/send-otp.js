import { supabase, hashPassword, sendOTP } from '@/utils';

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password || password.length < 8) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email}`);

    if (existing && existing.length > 0) {
      return Response.json({ error: 'User already exists' }, { status: 409 });
    }

    // Send OTP
    const sent = await sendOTP(email);
    if (!sent) {
      return Response.json({ error: 'Failed to send OTP' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
