import { supabase } from '../utils.js';
import { generateToken } from '../utils.js';

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token, email } = req.query;

  if (!token || !email) {
    return res.redirect('/signup.html?error=no_token');
  }

  try {
    // Check token
    const { data: tokenData } = await supabase
      .from('verification_tokens')
      .select('*')
      .eq('token', token)
      .eq('email', email)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!tokenData) {
      return res.redirect('/signup.html?error=invalid_token');
    }

    // Verify user
    const { error } = await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('email', email);

    if (error) {
      return res.redirect('/signup.html?error=verify_failed');
    }

    // Delete token
    await supabase
      .from('verification_tokens')
      .delete()
      .eq('token', token);

    // Generate login token
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
