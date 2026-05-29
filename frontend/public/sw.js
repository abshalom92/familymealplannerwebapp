const CACHE = 'mealplanner-v1'

// API GET routes to cache (network-first, cache fallback)
const CACHEABLE = [
  '/api/calendar/week',
  '/api/grocery/week',
  '/api/meals/',
  '/api/family/',
  '/api/household/settings',
  '/api/group',
]

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Network-first for cacheable API GETs
  if (request.method === 'GET' && CACHEABLE.some((p) => url.pathname.startsWith(p))) {
    e.respondWith(
      fetch(request)
        .then((r) => {
          if (r.ok) {
            const clone = r.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
          }
          return r
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Navigation: serve index.html offline
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((cached) => cached || fetch(request))
      )
    )
  }
})
