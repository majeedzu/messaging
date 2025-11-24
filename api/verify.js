import { supabase } from '../utils.js';
import { generateToken } from '../utils.js';

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token || !email) {
    return res.redirect('/signup.html?error=missing_params');
  }

  try {
    // Check verification token
    const { data: tokenData } = await supabase
      .from('temp_otps')
      .select('*')
      .eq('otp_hash', token)
      .eq('email', email)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!tokenData) {
      return res.redirect('/signup.html?error=invalid_or_expired_token');
    }

    // Mark user as verified
    const { error } = await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('email', email);

    if (error) {
      return res.redirect('/signup.html?error=verification_failed');
    }

    // Cleanup token
    await supabase
      .from('temp_otps')
      .delete()
      .eq('otp_hash', token);

    // Get user and generate JWT
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    const jwtToken = generateToken({ userId: user.id });

    res.redirect(`/dashboard.html?verified=true&token=${jwtToken}`);
  } catch (error) {
    console.error(error);
    res.redirect('/signup.html?error=server_error');
  }
};
