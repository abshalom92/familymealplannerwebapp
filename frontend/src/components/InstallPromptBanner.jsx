import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

export default function InstallPromptBanner() {
  const { canInstall, install } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)

  if (!canInstall || dismissed) return null

  const handleInstall = async () => {
    const outcome = await install()
    if (outcome === 'dismissed') setDismissed(true)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: '#1D4ED8',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '14px 20px',
      boxShadow: '0 -2px 16px rgba(37,99,235,0.35)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <img src="/icon.svg" alt="" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}/>
        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>
          Add Family Meal Planner to your home screen
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          style={{
            background: 'white',
            color: '#1D4ED8',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.75)',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: '1rem',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
