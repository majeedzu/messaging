import { supabase } from '../utils.js';
import { generateToken } from '../utils.js';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const email = url.searchParams.get('email');

  if (!token || !email) {
    return res.redirect('/signup.html?error=invalid_link');
  }

  try {
    const { data: tokenData } = await supabase
      .from('temp_otps')
      .select('*')
      .eq('otp_hash', token)
      .eq('email', email)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!tokenData) {
      return res.redirect('/signup.html?error=invalid_or_expired_link');
    }

    await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('email', email);

    await supabase
      .from('temp_otps')
      .delete()
      .eq('otp_hash', token);

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    const jwtToken = generateToken({ userId: user.id });

    res.redirect(`/dashboard.html?verified=true&token=${jwtToken}`);
  } catch (error) {
    console.error(error);
    res.redirect('/signup.html?error=verification_failed');
  }
};
