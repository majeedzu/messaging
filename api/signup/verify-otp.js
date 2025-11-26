import { verifyOTP, hashPassword, generateToken, supabase, detectCountry } from '../utils.js';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });
  req.on('end', async () => {
    try {
      const { name, email, phone, password, otp } = JSON.parse(body);

      if (!email || !password || !otp) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      // Validate OTP
      const validOTP = await verifyOTP(email, otp, phone);
      if (!validOTP) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // Check if user exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${email}${phone ? `,phone.eq.${phone}` : ''}`);

      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Detect country
      const countryInfo = detectCountry(phone || '');
      const country_code = countryInfo.code;

      // Trial ends in 14 days
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // Create user
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          name,
          email,
          phone: phone || null,
          country_code,
          password_hash: passwordHash,
          trial_end: trialEnd,
          plan_tier: 'trial'
        })
        .select('id')
        .single();

      if (userError) {
        return res.status(500).json({ error: 'Failed to create user' });
      }

      // Generate token
      const token = generateToken({ userId: user.id });

      res.status(200).json({ 
        success: true, 
        token,
        user: { 
          id: user.id, 
          name, 
          email, 
          plan_tier: 'trial' 
        } 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
};
