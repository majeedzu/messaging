# Resend Email Setup Guide

## What You Need to Fix the "Failed to send verification email" Error

### Step 1: Get a Resend API Key

1. **Sign up for Resend** (if you haven't already):
   - Go to https://resend.com
   - Create a free account
   - You get 3,000 emails/month for free

2. **Get your API Key**:
   - Log into your Resend dashboard
   - Go to **API Keys** section
   - Click **Create API Key**
   - Copy the API key (starts with `re_`)

### Step 2: Set Environment Variables

#### For Vercel (Production):

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:

   ```
   RESEND_API_KEY = re_your_actual_api_key_here
   RESEND_FROM_EMAIL = onboarding@resend.dev  (for testing)
   ```

   **Note**: For production, you'll need to verify your own domain in Resend and use that email address.

#### For Local Development:

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add:

   ```
   RESEND_API_KEY=re_your_actual_api_key_here
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```

3. Make sure `.env` is in your `.gitignore` file (don't commit your API keys!)

### Step 3: Verify Your Setup

After setting the environment variables:

1. **Redeploy on Vercel** (if using Vercel):
   - Go to your Vercel dashboard
   - Click **Redeploy** on your latest deployment
   - This ensures the new environment variables are loaded

2. **Test the endpoint**:
   - Try signing up again
   - Check the browser console (F12) for detailed error messages
   - Check Vercel function logs for server-side errors

### Step 4: Common Issues & Solutions

#### Issue: "RESEND_API_KEY is not configured"
- **Solution**: Make sure you've added the environment variable in Vercel and redeployed

#### Issue: "Invalid API key" or "Unauthorized"
- **Solution**: Double-check your API key is correct and starts with `re_`

#### Issue: "Domain not verified" or "From address not allowed"
- **Solution**: 
  - For testing: Use `onboarding@resend.dev` (already set as default)
  - For production: Verify your domain in Resend dashboard under **Domains**

#### Issue: Still getting errors
- **Check the error message**: The improved error handling will now show you the exact error
- **Check Vercel logs**: Go to your Vercel dashboard → Your project → **Functions** tab → Click on the function → View logs
- **Check browser console**: Open Developer Tools (F12) → Console tab to see detailed errors

### Step 5: Production Setup (Optional but Recommended)

For production, you should:

1. **Verify your domain in Resend**:
   - Go to Resend dashboard → **Domains**
   - Add your domain (e.g., `yourdomain.com`)
   - Add the DNS records they provide to your domain's DNS settings
   - Wait for verification (usually takes a few minutes)

2. **Update environment variable**:
   - Set `RESEND_FROM_EMAIL` to your verified email (e.g., `noreply@yourdomain.com`)

### Testing

After setup, the error message will be more specific. Common errors you might see:

- ✅ **Success**: "Verification code sent to your email!"
- ❌ **"RESEND_API_KEY is not configured"**: Environment variable not set
- ❌ **"Invalid API key"**: Wrong API key
- ❌ **"Domain not verified"**: Need to use `onboarding@resend.dev` or verify your domain
- ❌ **"Rate limit exceeded"**: Too many requests (free tier: 3,000/month)

### Need Help?

1. Check the browser console for detailed error messages
2. Check Vercel function logs for server-side errors
3. Verify your environment variables are set correctly
4. Make sure you've redeployed after adding environment variables

