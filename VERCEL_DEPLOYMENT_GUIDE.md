# Vercel Deployment Guide

## Environment Variables Setup

To properly deploy this application on Vercel, you need to add the following environment variables in your Vercel project settings:

### Required Environment Variables

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Description: Your Supabase project URL
   - Example: `https://zqcjnfcwxkeapwzhifsy.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Description: Supabase anonymous key (public)
   - Found in: Supabase Dashboard > Project Settings > API

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Description: Supabase service role key (secret - keep private!)
   - Found in: Supabase Dashboard > Project Settings > API
   - ⚠️ This key has admin privileges - never expose it in the client

4. **GEMINI_API_KEY**
   - Description: Google Gemini API key for AI quiz generation
   - Found in: Google AI Studio (https://ai.google.dev/)
   - Get a key at: https://aistudio.google.com/app/apikey

5. **NEXT_PUBLIC_SITE_URL**
   - Description: Your production URL
   - Example: `https://your-app-name.vercel.app`

6. **BIOMETRIC_API_KEY** (Optional - for biometric attendance feature)
   - Description: API key for biometric devices
   - Generate a secure random string

## How to Add Environment Variables to Vercel

### Method 1: Using Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add each variable:
   - Name: `VARIABLE_NAME`
   - Value: `your_value_here`
   - Environment: Select `Production`, `Preview`, and `Development`
6. Click **Save**
7. **Important**: Redeploy your application after adding variables
   - Go to **Deployments** → Click **Redeploy** on the latest deployment

### Method 2: Using Vercel CLI

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_SITE_URL
vercel env add BIOMETRIC_API_KEY

# Deploy
vercel --prod
```

### Method 3: Using vercel.json (Not Recommended for Secrets)

Create a `vercel.json` file (⚠️ Don't commit actual secrets):

```json
{
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_key",
    "NEXT_PUBLIC_SITE_URL": "@site_url",
    "BIOMETRIC_API_KEY": "@biometric_api_key"
  }
}
```

Then use Vercel CLI to add the actual values as secrets.

## Troubleshooting

### Issue: "Getting local fallback" or API key not working

**Solution Steps:**

1. **Verify Environment Variables are Set**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Ensure all variables are present and correct

2. **Check Deployment Logs**
   ```bash
   vercel logs <deployment-url>
   ```
   Look for errors related to missing environment variables

3. **Redeploy After Adding Variables**
   - Environment variables are only available after a new deployment
   - Go to Deployments → Click "Redeploy" on the latest deployment

4. **Verify in Browser Console**
   - Open your production site
   - Open browser console (F12)
   - Type: `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)`
   - Should show your Supabase URL, not `undefined`

5. **Check for Server-Side Issues**
   - The `SUPABASE_SERVICE_ROLE_KEY` is only available server-side
   - Check Vercel Function logs for errors

### Issue: PWA Not Installing / Wrong Icons

**Solution Steps:**

1. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear site data in browser settings

2. **Verify Manifest File**
   - Visit: `https://your-site.vercel.app/manifest.json`
   - Should return the manifest JSON
   - Check that icons are accessible

3. **Test Icons are Loading**
   - Visit: `https://your-site.vercel.app/icon-192x192.png`
   - Should display your school logo

4. **Lighthouse PWA Audit**
   - Open Chrome DevTools → Lighthouse
   - Run audit with "Progressive Web App" checked
   - Fix any reported issues

5. **Service Worker Registration**
   - Open Chrome DevTools → Application → Service Workers
   - Should show `sw.js` registered and running

## Quick Test Deployment

To test if your environment variables are working:

1. Add a test API route at `/api/test-env`:
   ```typescript
   import { NextResponse } from 'next/server'

   export async function GET() {
     return NextResponse.json({
       hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
       hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
       hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
       // Don't return actual values in production!
     })
   }
   ```

2. Visit `https://your-site.vercel.app/api/test-env`
3. Should return `true` for all variables

## PWA Optimization Checklist

- ✅ Manifest file present and valid
- ✅ Service worker registered
- ✅ Icons in correct sizes (192x192, 512x512)
- ✅ Maskable icons for Android
- ✅ HTTPS enabled (automatic on Vercel)
- ✅ Start URL defined
- ✅ Display mode set to 'standalone'
- ✅ Theme color defined
- ✅ Apple touch icon for iOS

## Need Help?

- Check Vercel Docs: https://vercel.com/docs
- Check Next.js Docs: https://nextjs.org/docs
- Check Supabase Docs: https://supabase.com/docs
