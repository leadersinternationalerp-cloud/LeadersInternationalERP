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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zqcjnfcwxkeapwzhifsy.supabase.co',
      },
    ],
  },
  turbopack: {},
};

export default withPWA(nextConfig);
