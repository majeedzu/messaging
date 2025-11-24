import { supabase } from '../utils.js';
import { hashPassword, sendOTP } from '../utils.js';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      const { name, email, password } = JSON.parse(body);

      // Validation
      if (!name || !email || !password || password.length < 8) {
        return res.status(400).json({ error: 'Invalid input' });
      }

      // Check if user exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${email}`);

      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Send OTP via email
      const sent = await sendOTP(email);
      if (!sent) {
        return res.status(500).json({ error: 'Failed to send OTP' });
      }

      res.status(200).json({ success: true, message: 'OTP sent to email' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
