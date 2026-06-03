import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

// Take control of all clients immediately on activation
self.skipWaiting()
clientsClaim()

// Precache all build assets (list injected by vite-plugin-pwa at build time)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Serve precached index.html for all SPA navigation requests
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// API GET routes — network first (4s timeout), SW cache fallback
const CACHEABLE_API = [
  '/api/calendar/week',
  '/api/grocery/week',
  '/api/meals/',
  '/api/family/',
  '/api/household/settings',
  '/api/group',
]

registerRoute(
  ({ request, url }) =>
    request.method === 'GET' &&
    CACHEABLE_API.some((p) => url.pathname.startsWith(p)),
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 4 })
)

// Static assets — cache first (content-hashed filenames never change)
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font',
  new CacheFirst({ cacheName: 'static-assets' })
)

// ─── Background Sync ────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'meal-plan-sync') {
    event.waitUntil(replayOfflineQueue())
  }
})

// ─── IDB helpers (mirrors offlineDB.js — SW runs in a separate context) ─────

const DB_NAME = 'mealplanner-offline'
const DB_VERSION = 2

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('weekPlan'))
        db.createObjectStore('weekPlan', { keyPath: 'weekStart' })
      if (!db.objectStoreNames.contains('grocery'))
        db.createObjectStore('grocery', { keyPath: 'weekStart' })
      if (!db.objectStoreNames.contains('writeQueue'))
        db.createObjectStore('writeQueue', { autoIncrement: true, keyPath: 'id' })
      if (!db.objectStoreNames.contains('auth'))
        db.createObjectStore('auth', { keyPath: 'key' })
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

function idbGet(storeName, key) {
  return openIDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(key)
        req.onsuccess = (e) => resolve(e.target.result)
        req.onerror = (e) => reject(e.target.error)
      })
  )
}

function idbGetAll(storeName) {
  return openIDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
        req.onsuccess = (e) => resolve(e.target.result)
        req.onerror = (e) => reject(e.target.error)
      })
  )
}

function idbPut(storeName, value) {
  return openIDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(value)
        req.onsuccess = () => resolve()
        req.onerror = (e) => reject(e.target.error)
      })
  )
}

function idbDelete(storeName, key) {
  return openIDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key)
        req.onsuccess = () => resolve()
        req.onerror = (e) => reject(e.target.error)
      })
  )
}

// ─── Auth token helpers ──────────────────────────────────────────────────────

async function getToken() {
  const record = await idbGet('auth', 'token')
  return record?.value ?? null
}

async function saveToken(token) {
  await idbPut('auth', { key: 'token', value: token })
}

// Fetch with Bearer token; auto-refreshes on 401 using the httpOnly refresh cookie
async function apiFetch(path, options, token) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  }
  let res = await fetch(path, { ...options, credentials: 'include', headers })

  if (res.status === 401) {
    const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    if (!refreshRes.ok) return res
    const data = await refreshRes.json()
    await saveToken(data.access_token)
    res = await fetch(path, {
      ...options,
      credentials: 'include',
      headers: { ...headers, Authorization: `Bearer ${data.access_token}` },
    })
  }

  return res
}

// ─── Offline write queue replay ──────────────────────────────────────────────

async function replayOfflineQueue() {
  const token = await getToken()
  if (!token) throw new Error('No auth token — cannot sync')

  const queue = await idbGetAll('writeQueue')
  if (queue.length === 0) return

  const applied = []

  // clearWeek ops first so subsequent adds land on a clean slate
  for (const write of queue.filter((w) => w.op === 'clearWeek')) {
    try {
      const res = await apiFetch(
        `/api/calendar/week?week_start=${write.weekStart}`,
        { method: 'DELETE' },
        token
      )
      if (res.ok || res.status === 404) applied.push(write.id)
    } catch { /* network still down — will retry */ }
  }

  // add / remove ops
  for (const write of queue.filter((w) => w.op !== 'clearWeek')) {
    try {
      if (write.op === 'add') {
        const res = await apiFetch(
          '/api/calendar/',
          {
            method: 'POST',
            body: JSON.stringify({
              week_start: write.weekStart,
              day_of_week: write.day,
              meal_slot: write.slot,
              meal_id: write.mealId,
            }),
          },
          token
        )
        if (res.ok) applied.push(write.id)
      } else if (write.op === 'remove') {
        // Need the server entry ID — fetch the week to find it
        const weekRes = await apiFetch(
          `/api/calendar/week?week_start=${write.weekStart}`,
          { method: 'GET' },
          token
        )
        if (weekRes.ok) {
          const plan = await weekRes.json()
          const entry = plan.find(
            (p) => p.day_of_week === write.day && p.meal_slot === write.slot
          )
          if (entry) {
            const delRes = await apiFetch(`/api/calendar/${entry.id}`, { method: 'DELETE' }, token)
            if (delRes.ok || delRes.status === 404) applied.push(write.id)
          } else {
            applied.push(write.id) // Already gone on server
          }
        }
      }
    } catch { /* skip individual failures — will retry on next sync */ }
  }

  // Remove successfully applied writes
  for (const id of applied) await idbDelete('writeQueue', id)

  // Tell all open clients the sync completed so they can refresh
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  clients.forEach((c) => c.postMessage({ type: 'BG_SYNC_COMPLETE' }))

  // Reject if any writes remain so the browser retries the sync tag later
  if (applied.length < queue.length) throw new Error('Some writes failed — will retry')
}
