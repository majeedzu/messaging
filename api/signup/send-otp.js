import { supabase, sendOTP } from '@/utils/utils';

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password || password.length < 8) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email);

    if (existing && existing.length > 0) {
      return Response.json({ error: 'User already exists' }, { status: 409 });
    }

    await sendOTP(email);

    return Response.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
