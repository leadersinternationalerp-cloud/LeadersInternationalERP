const VERSION = 'v1'
const STATIC = `static-${VERSION}`
const OFFLINE = '/offline.html'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE, '/logo.png', '/icon-192x192.png', '/icon-512x512.png'])))
  self.skipWaiting()
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

// ============================================================================
// Web Push & Notification Click Handlers
// ============================================================================

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_e) {
    data = { body: event.data ? event.data.text() : 'You have a new update from Leaders International School.' }
  }

  const title = data.title || 'Leaders International School'
  const options = {
    body: data.body || 'You have a new notification.',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    vibrate: data.vibrate || [250, 100, 250, 100, 250],
    tag: data.tag || 'lis-notification',
    renotify: true,
    requireInteraction: !!data.requireInteraction,
    data: {
      url: (data.data && data.data.url) || data.url || '/dashboard',
      timestamp: Date.now(),
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = event.notification.data?.url || '/dashboard'
  const targetUrl = new URL(rawUrl, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl)
          }
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
