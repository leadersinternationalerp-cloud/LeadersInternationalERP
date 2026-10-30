import type { Metadata, Viewport } from 'next'
import './globals.css'
import PWARegister from '@/components/PWARegister'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00264b',
}

export const metadata: Metadata = {
  title: 'Leaders International School | ERP',
  description: 'Learning Today, Leading Tomorrow',
  appleWebApp: {
    capable: true,
    title: 'Leaders ERP',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/crest.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Leaders ERP" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  )
}
