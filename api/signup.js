import { supabase } from '../utils.js';
import { hashPassword } from '../utils.js';
import Resend from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { name, email, phone, password } = JSON.parse(body);

      if (!name || !email || !password || password.length < 8) {
        return res.status(400).json({ error: 'Invalid input' });
      }

      // Check if user exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Detect country
      const countryInfo = detectCountry(phone || '');
      const country_code = countryInfo.code;

      // Create unverified user
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          name,
          email,
          phone: phone || null,
          country_code,
          password_hash: passwordHash,
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          plan_tier: 'trial',
          is_verified: false
        })
        .select('id')
        .single();

      if (userError) {
        return res.status(500).json({ error: 'Failed to create user' });
      }

      // Generate verification token
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

      await supabase
        .from('verification_tokens')
        .insert({ email, token, expires_at: expiresAt });

      // Send verification email
      const verifyUrl = `${req.headers.host}/verify.html?token=${token}&email=${encodeURIComponent(email)}`;

      await resend.emails.send({
        from: 'SMS Messenger <noreply@yourdomain.com>',
        to: [email],
        subject: 'Verify your SMS Messenger account',
        html: `
          <h2>Verify your email</h2>
          <p>Click the link below to verify your account:</p>
          <a href="https://${verifyUrl}" style="background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px;">Verify Email</a>
          <p>Or copy this link: https://${verifyUrl}</p>
          <p>This link expires in 24 hours.</p>
        `
      });

      res.json({ success: true, message: 'Verification email sent! Check your inbox.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
};
