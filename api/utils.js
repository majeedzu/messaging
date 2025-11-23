import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import AfricasTalking from 'africastalking';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-prod';
const BCRYPT_ROUNDS = 12;

// Initialize Africa's Talking (signup OTPs)
const AT = AfricasTalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME
});
const sms = AT.SMS;

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
  const { rows } = await sql`SELECT * FROM users WHERE id = ${decoded.userId}`;
  return rows[0] || null;
}

// Helper: Detect country from phone (simple prefix)
export function detectCountry(phone) {
  const prefixes = {
    '+233': { code: 'GH', currency: 'GHS' },
    '+1': { code: 'US', currency: 'USD' },
    '+234': { code: 'NG', currency: 'NGN' },
    '+254': { code: 'KE', currency: 'KES' }
    // Add more as needed
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

// Helper: Generate and send OTP
export async function sendOTP(phone, email = null) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await hashPassword(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Store hashed OTP
  await sql`
    INSERT INTO temp_otps (phone, email, otp_hash, expires_at)
    VALUES (${phone}, ${email}, ${otpHash}, ${expiresAt})
    ON CONFLICT (phone) DO UPDATE SET
      otp_hash = ${otpHash},
      expires_at = ${expiresAt}
  `;

  // Send via SMS (priority)
  try {
    await sms.send({
      to: phone,
      message: `SMS Messenger OTP: ${otp}. Valid for 10 minutes. Do not share.`
    });
  } catch (smsErr) {
    console.error('SMS failed:', smsErr);
    // Fallback: email (implement email service later, e.g., Resend)
    // For now, log
  }

  return true;
}

// Helper: Verify OTP
export async function verifyOTP(phone, otp, email = null) {
  const { rows } = await sql`
    SELECT * FROM temp_otps
    WHERE (phone = ${phone} OR email = ${email})
    AND expires_at > NOW()
    ORDER BY created_at DESC LIMIT 1
  `;
  if (!rows[0]) return false;

  return await verifyPassword(otp, rows[0].otp_hash);
}

// Helper: Cleanup expired OTPs (call periodically)
export async function cleanupExpiredOTPs() {
  await sql`DELETE FROM temp_otps WHERE expires_at < NOW()`;
}