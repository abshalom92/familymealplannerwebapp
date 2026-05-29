const DB_NAME = 'mealplanner-offline'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('weekPlan')) {
        db.createObjectStore('weekPlan', { keyPath: 'weekStart' })
      }
      if (!db.objectStoreNames.contains('grocery')) {
        db.createObjectStore('grocery', { keyPath: 'weekStart' })
      }
      if (!db.objectStoreNames.contains('writeQueue')) {
        db.createObjectStore('writeQueue', { autoIncrement: true, keyPath: 'id' })
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

function tx(storeName, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(storeName, mode)
        t.onerror = (e) => reject(e.target.error)
        const req = fn(t.objectStore(storeName))
        if (req) {
          req.onsuccess = (e) => resolve(e.target.result)
          req.onerror = (e) => reject(e.target.error)
        } else {
          t.oncomplete = () => resolve()
        }
      })
  )
}

export const offlineDB = {
  cacheWeekPlan(weekStart, data) {
    return tx('weekPlan', 'readwrite', (s) => s.put({ weekStart, data }))
  },
  getWeekPlan(weekStart) {
    return tx('weekPlan', 'readonly', (s) => s.get(weekStart)).then((r) => r?.data ?? null)
  },
  cacheGrocery(weekStart, data) {
    return tx('grocery', 'readwrite', (s) => s.put({ weekStart, data }))
  },
  getGrocery(weekStart) {
    return tx('grocery', 'readonly', (s) => s.get(weekStart)).then((r) => r?.data ?? null)
  },
  queueWrite(op) {
    return tx('writeQueue', 'readwrite', (s) => s.add(op))
  },
  getWriteQueue() {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction('writeQueue', 'readonly')
          const req = t.objectStore('writeQueue').getAll()
          req.onsuccess = (e) => resolve(e.target.result)
          req.onerror = (e) => reject(e.target.error)
        })
    )
  },
  clearWriteQueue() {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction('writeQueue', 'readwrite')
          const req = t.objectStore('writeQueue').clear()
          req.onsuccess = () => resolve()
          req.onerror = (e) => reject(e.target.error)
        })
    )
  },
  async hasQueuedWrites() {
    const queue = await this.getWriteQueue()
    return queue.length > 0
  },
}
