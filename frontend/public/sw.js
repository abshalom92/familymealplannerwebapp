const CACHE = 'mealplanner-v2'
const PRECACHE = ['/index.html', '/offline.html']

// API GET routes to cache (network-first, cache fallback)
const CACHEABLE = [
  '/api/calendar/week',
  '/api/grocery/week',
  '/api/meals/',
  '/api/family/',
  '/api/household/settings',
  '/api/group',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

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

  // Navigation: serve index.html offline, fall back to offline.html
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((cached) => cached || caches.match('/offline.html'))
      )
    )
  }
})
