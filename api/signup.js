import { supabase } from '../utils.js';
import { hashPassword, detectCountry } from '../utils.js';
import { v4 as uuidv4 } from 'uuid';
import Resend from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

      // Create user with trial
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
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

      // Generate verification token
      const verificationToken = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('temp_otps')
        .upsert({
          email,
          otp_hash: verificationToken,
          expires_at: expiresAt
        }, { onConflict: 'email' });

      // Send verification email
      const verifyUrl = `https://${req.headers.host}/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`;
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

      await resend.emails.send({
        from: `SMS Messenger <${fromEmail}>`,
        to: [email],
        subject: 'Verify your SMS Messenger account',
        html: `
          <h2>Verify your email</h2>
          <p>Click the link below to verify your account:</p>
          <a href="${verifyUrl}" style="background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px;">Verify Email</a>
          <p>Link expires in 24 hours.</p>
        `
      });

      res.status(200).json({ success: true, message: 'Verification email sent! Check your inbox.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
};
