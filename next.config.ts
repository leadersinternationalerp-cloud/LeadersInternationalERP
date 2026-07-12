import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true
})

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['zqcjnfcwxkeapwzhifsy.supabase.co'], // allow supabase storage images
  }
};

export default withPWA(nextConfig);
