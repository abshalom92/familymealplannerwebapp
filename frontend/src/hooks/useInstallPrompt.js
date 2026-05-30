import { useState, useEffect } from 'react'

// Captured at module load time so we don't miss early-firing events
let _deferredPrompt = null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  _deferredPrompt = e
})

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(!!_deferredPrompt)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      _deferredPrompt = e
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const onInstalled = () => {
      _deferredPrompt = null
      setCanInstall(false)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!_deferredPrompt) return null
    _deferredPrompt.prompt()
    const { outcome } = await _deferredPrompt.userChoice
    _deferredPrompt = null
    setCanInstall(false)
    return outcome
  }

  return { canInstall, install }
}
