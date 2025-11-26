import { verifyOTP, hashPassword, generateToken, supabase, detectCountry } from '@/utils/utils';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, email, phone, password, otp } = req.body;

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
      .or(`email.eq.${email},phone.eq.${phone}`);

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Detect country
    const { code: country_code } = detectCountry(phone);

    // Trial ends in 14 days
    const trialEnd = new Date(Date.now() + 14 * 24*
