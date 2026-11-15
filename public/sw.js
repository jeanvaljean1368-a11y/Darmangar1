// Service Worker for درمانگر PWA
// Caches static assets and enables offline app shell

const CACHE_NAME = 'darmanegar-v1'
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

// Network-first for API and dynamic routes, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) {
    // Network-only for API
    return
  }
  if (url.pathname.startsWith('/_next/')) {
    // Cache-first for Next.js assets
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
  // Network-first with cache fallback for pages
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
