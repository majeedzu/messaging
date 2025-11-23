import { NextResponse } from 'next/server';
import { hashPassword, verifyOTP, generateToken, sql } from '../utils.js';

export async function POST(request) {
  try {
    const { name, email, phone, password, otp } = await request.json();

    // Verify OTP
    const validOTP = await verifyOTP(phone, otp, email);
    if (!validOTP) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // Check if already exists (double-check)
    const { rows: existing } = await sql`
      SELECT id FROM users WHERE email = ${email} OR phone = ${phone}
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Detect country
    const { country_code } = detectCountry(phone); // Assume utils exports it

    // Create user with 14-day trial
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const { rows } = await sql`
      INSERT INTO users (name, email, phone, country_code, password_hash, trial_end, plan_tier)
      VALUES (${name}, ${email}, ${phone}, ${country_code}, ${passwordHash}, ${trialEnd}, 'trial')
      RETURNING id
    `;

    const userId = rows[0].id;

    // Cleanup OTP
    await sql`DELETE FROM temp_otps WHERE phone = ${phone} OR email = ${email}`;

    // Generate token
    const token = generateToken({ userId });

    return NextResponse.json({ token, userId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}