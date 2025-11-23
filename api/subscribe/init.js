const Paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
import { sql } from '@vercel/postgres';
import { getUserFromToken, detectCountry } from '../utils.js';
import { v4 as uuidv4 } from 'uuid';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { plan, cycle } = req.query;
  if (!['medium', 'premium'].includes(plan) || !['monthly', 'yearly'].includes(cycle)) {
    return res.status(400).json({ error: 'Invalid plan/cycle' });
  }

  const countryInfo = detectCountry(user.phone);
  const monthlyPrices = {
    medium: { GHS: 10, USD: 2 },
    premium: { GHS: 20, USD: 4 }
  };
  const basePrice = monthlyPrices[plan][countryInfo.currency];
  let price = basePrice;
  if (cycle === 'yearly') {
    price = Math.round(basePrice * 12 * 0.9 * 100) / 100; // 10% discount on annual, rounded to 2 decimals
  }
  const currency = countryInfo.currency;

  const reference = `sub_${uuidv4()}`;

  // Create Paystack plan if not exists (optional, use fixed plan codes)
  // For simplicity, use authorization for recurring, but here one-time for subscription start

  res.json({
    reference,
    amount: price,
    currency,
    email: user.email,
    plan,
    cycle,
    country: countryInfo.code
  });
};