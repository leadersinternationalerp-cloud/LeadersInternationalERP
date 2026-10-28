const VERSION = 'v1'
const STATIC = `static-${VERSION}`
const OFFLINE = '/offline.html'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE, '/logo.png', '/icon-192x192.png', '/icon-512x512.png'])))
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k !== STATIC).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return          // never intercept Supabase
  if (url.pathname.startsWith('/api/')) return             // never cache live data

  if (req.mode === 'navigate') {                           // HTML: network only, offline shell as fallback
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)))
    return
  }
  if (url.pathname.startsWith('/_next/static/') || /\.(png|jpe?g|svg|ico|webp|woff2?)$/.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(STATIC)
      const hit = await cache.match(req)
      const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res }).catch(() => hit)
      return hit || net
    })())
  }
})
