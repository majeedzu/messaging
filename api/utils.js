import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import Resend from 'resend';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

const resend = new Resend(process.env.RESEND_API_KEY);

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-prod';
const BCRYPT_ROUNDS = 12;

// Helper: Hash password
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Helper: Verify password
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Helper: Generate JWT
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Helper: Verify JWT
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Helper: Get user from token
export async function getUserFromToken(token) {
  const decoded = verifyToken(token);
  if (!decoded?.userId) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', decoded.userId)
    .single();
  if (error) return null;
  return data;
}

// Helper: Detect country from phone (simple prefix)
export function detectCountry(phone) {
  const prefixes = {
    '+233': { code: 'GH', currency: 'GHS' },
    '+1': { code: 'US', currency: 'USD' },
    '+234': { code: 'NG', currency: 'NGN' },
    '+254': { code: 'KE', currency: 'KES' }
  };
  for (const [prefix, info] of Object.entries(prefixes)) {
    if (phone.startsWith(prefix)) return info;
  }
  return { code: 'INT', currency: 'USD' };
}

// Helper: Get plan limits
export function getPlanLimits(plan_tier) {
  const limits = {
    trial: { batch_size: 10, daily_batches: 3 },
    medium: { batch_size: 100, daily_batches: 10 },
    premium: { batch_size: Infinity, daily_batches: Infinity }
  };
  return limits[plan_tier] || limits.trial;
}

// Helper: Generate and send OTP via EMAIL
export async function sendOTP(email, phone = null) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await hashPassword(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Store hashed OTP
  const { error } = await supabase
    .from('temp_otps')
    .upsert({ email, phone, otp_hash: otpHash, expires_at: expiresAt }, { onConflict: 'email' });

  if (error) throw new Error('Failed to store OTP');

  // Send via email
  try {
    await resend.emails.send({
      from: 'SMS Messenger <noreply@yourdomain.com>',
      to: [email],
      subject: 'Your SMS Messenger Verification Code',
      html: `<p>Your verification code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`
    });
  } catch (emailErr) {
    console.error('Email failed:', emailErr);
    throw new Error('Failed to send verification email');
  }

  return true;
}

// Helper: Verify OTP
export async function verifyOTP(email, otp, phone = null) {
  const { data: rows } = await supabase
    .from('temp_otps')
    .select('*')
    .or(`email.eq.${email}${phone ? `,phone.eq.${phone}` : ''}`)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (!rows || rows.length === 0) return false;

  return await verifyPassword(otp, rows[0].otp_hash);
}

// Helper: Cleanup expired OTPs
export async function cleanupExpiredOTPs() {
  const { error } = await supabase
    .from('temp_otps')
    .delete()
    .lt('expires_at', new Date().toISOString());
  if (error) console.error('Cleanup failed:', error);
}
