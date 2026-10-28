import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/dashboard',
    name: 'Leaders International School ERP',
    short_name: 'Leaders ERP',
    description: 'School management system for Leaders International School',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#00264b',
    lang: 'en',
    dir: 'ltr',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: '/screenshots/dashboard-wide.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
      { src: '/screenshots/dashboard-narrow.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' },
    ],
    shortcuts: [
      { name: 'Dashboard', url: '/dashboard', icons: [{ src: '/icon-192x192.png', sizes: '192x192' }] },
      { name: 'Notifications', url: '/dashboard/notifications', icons: [{ src: '/icon-192x192.png', sizes: '192x192' }] },
      { name: 'My payments', url: '/dashboard/parent/fees', icons: [{ src: '/icon-192x192.png', sizes: '192x192' }] },
    ],
    prefer_related_applications: false,
  }
}
