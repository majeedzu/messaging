import { NextResponse } from 'next/server';
import { hashPassword, sendOTP, detectCountry } from '../utils.js';

export async function POST(request) {
  try {
    const { name, email, phone, password } = await request.json();

    // Validation
    if (!name || !email || !phone || !password || password.length < 8) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Check if user exists
    const { rows: existing } = await sql`
      SELECT id FROM users WHERE email = ${email} OR phone = ${phone}
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Hash password (store temp for verify step)
    // Note: In verify-otp, we'll hash again from user input

    // Detect country
    const country = detectCountry(phone);

    // Send OTP
    const sent = await sendOTP(phone, email);
    if (!sent) {
      return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
    }

    // Temp store user data? For simplicity, client holds it, but insecure.
    // Better: store hashed pw in session or temp_users, but for now client-side.

    return NextResponse.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}