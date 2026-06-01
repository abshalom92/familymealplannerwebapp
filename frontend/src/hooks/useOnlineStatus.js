import { useState, useEffect } from 'react'

async function pingBackend() {
  try {
    const res = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      if (!navigator.onLine) {
        if (!cancelled) setIsOnline(false)
        return
      }
      const reachable = await pingBackend()
      if (!cancelled) setIsOnline(reachable)
    }

    check()
    const interval = setInterval(check, 5000)

    const handleOnline = () => check()
    const handleOffline = () => { if (!cancelled) setIsOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
