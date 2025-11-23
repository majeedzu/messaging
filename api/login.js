import { NextResponse } from 'next/server';
import { verifyPassword, getUserFromToken, generateToken, sql } from '../utils.js';

export async function POST(request) {
  try {
    const { emailOrPhone, password } = await request.json();

    if (!emailOrPhone || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Find user
    const { rows } = await sql`
      SELECT * FROM users WHERE email = ${emailOrPhone} OR phone = ${emailOrPhone}
    `;
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate new token
    const token = generateToken({ userId: user.id });

    return NextResponse.json({ token, user: { id: user.id, name: user.name, plan_tier: user.plan_tier } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}