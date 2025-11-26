import { supabase, sendOTP } from '../utils.js';

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const { name, email, password } = JSON.parse(body);

        if (!name || !email || !password || password.length < 8) {
          return res.status(400).json({ error: 'Invalid input' });
        }

        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', email);

        if (existing && existing.length > 0) {
          return res.status(409).json({ error: 'User already exists' });
        }

        // send OTP
        await sendOTP(email);

        return res.status(200).json({ success: true, message: 'OTP sent' });
      } catch (err) {
        console.error('Send OTP error:', err);
        const errorMessage = err.message || 'Server error';
        return res.status(500).json({ error: errorMessage });
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
