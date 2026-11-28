// Service Worker for درمانگر PWA
// Handles: caching, offline fallback, push notifications

const CACHE_NAME = 'darmanegar-v2'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/darmanegar-logo.png',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  )
})

// === Push notification handling ===
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'درمانگر', body: event.data.text() }
  }

  const options = {
    body: data.body || 'شما یک اعلان جدید دارید',
    icon: data.icon || '/darmanegar-logo.png',
    badge: data.badge || '/darmanegar-logo.png',
    tag: data.tag || 'darmanegar',
    renotify: true,
    data: {
      url: data.url || '/',
    },
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'باز کردن',
      },
      {
        action: 'close',
        title: 'بستن',
      },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'درمانگر', options)
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') return

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Network-first for API and dynamic routes, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) {
    return
  }
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return res
        }).catch(() => cached)
      )
    )
    return
  }
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return res
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  )
})
