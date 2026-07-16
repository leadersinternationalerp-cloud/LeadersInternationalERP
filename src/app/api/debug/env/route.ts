import { NextResponse } from 'next/server'

export async function GET() {
  // Only enable this in development or for testing
  // Remove or secure this endpoint in production!
  
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: {
      set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL ? '***configured***' : 'NOT SET'
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***configured***' : 'NOT SET'
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      value: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***configured***' : 'NOT SET'
    },
    NEXT_PUBLIC_SITE_URL: {
      set: !!process.env.NEXT_PUBLIC_SITE_URL,
      value: process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET'
    },
    BIOMETRIC_API_KEY: {
      set: !!process.env.BIOMETRIC_API_KEY,
      value: process.env.BIOMETRIC_API_KEY ? '***configured***' : 'NOT SET'
    },
    NODE_ENV: process.env.NODE_ENV,
  }

  return NextResponse.json({
    message: 'Environment Variable Check',
    timestamp: new Date().toISOString(),
    environmentVariables: envStatus,
    instructions: 'If any variable shows NOT SET, add it to Vercel Environment Variables and redeploy',
  })
}
