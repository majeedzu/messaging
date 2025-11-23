-- Database schema for SMS Messenger App
-- Run this in Vercel Postgres dashboard or via migration

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  country_code TEXT NOT NULL, -- e.g., 'GH', 'US'
  password_hash TEXT NOT NULL,
  trial_start TIMESTAMP DEFAULT NOW(),
  trial_end TIMESTAMP,
  plan_tier TEXT DEFAULT 'trial' CHECK (plan_tier IN ('trial', 'medium', 'premium')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('medium', 'premium')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('GHS', 'USD')),
  renewal_date TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  paystack_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily usage tracking
CREATE TABLE IF NOT EXISTS daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sent_batches INTEGER DEFAULT 0,
  contacts_sent INTEGER DEFAULT 0,
  max_batches INTEGER, -- plan limit
  UNIQUE(user_id, date)
);

-- Message history (for logs)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  recipients JSONB NOT NULL, -- array of phones
  sent_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'sent' -- sent, failed, queued
);

-- Temp OTPs table for verification (expires in 10 min)
CREATE TABLE IF NOT EXISTS temp_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  email TEXT,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_temp_otps_phone ON temp_otps(phone);
CREATE INDEX idx_temp_otps_expires ON temp_otps(expires_at);

-- Indexes for performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_daily_usage_user_date ON daily_usage(user_id, date);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_messages_user ON messages(user_id);