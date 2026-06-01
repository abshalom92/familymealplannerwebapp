const CACHE = 'mealplanner-v3'
const PRECACHE = ['/index.html', '/offline.html']

// API GET routes — network-first, cache fallback
const CACHEABLE_API = [
  '/api/calendar/week',
  '/api/grocery/week',
  '/api/meals/',
  '/api/family/',
  '/api/household/settings',
  '/api/group',
]

// Static asset extensions — cache-first so one prod visit caches the full app shell
const STATIC_EXTS = ['.js', '.css', '.svg', '.png', '.ico', '.woff2', '.woff', '.ttf']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  // Remove old cache versions
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Network-first for cacheable API GETs
  if (request.method === 'GET' && CACHEABLE_API.some((p) => url.pathname.startsWith(p))) {
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

  // Cache-first for static assets — fetches and caches on first visit, serves from cache after
  if (request.method === 'GET' && STATIC_EXTS.some((ext) => url.pathname.endsWith(ext))) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((r) => {
          if (r.ok) {
            const clone = r.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
          }
          return r
        })
      })
    )
    return
  }

  // Navigation — network first, fall back to cached index.html, then offline.html
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((cached) => cached || caches.match('/offline.html'))
      )
    )
  }
})
