import { verifyOTP, hashPassword, generateToken, supabase, detectCountry } from '@/utils/utils';

export async function POST(req) {
  try {
    const { name, email, phone, password, otp } = await req.json();

    const validOTP = await verifyOTP(email, otp, phone);
    if (!validOTP) {
      return Response.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},phone.eq.${phone}`);

    if (existing.length > 0) {
      return Response.json({ error: 'User already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const { code: country_code } = detectCountry(phone);

    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        country_code,
        password_hash: passwordHash,
        trial_end: trialEnd.toISOString(),
        plan_tier: 'trial'
      })
      .select('id')
      .single();

    if (error) throw error;

    const token = generateToken({ userId: data.id });

    return Response.json({ userId: data.id, token });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
