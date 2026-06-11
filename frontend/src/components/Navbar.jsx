import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import api from '../api/client'

export default function Navbar() {
  const { user, logout } = useAuth()
  const isOnline = useOnlineStatus()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user || user.isGuest) return
    const fetchCount = () => {
      api.get('/inbox/unread-count').then(r => setUnreadCount(r.data.count)).catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Reset badge when user visits inbox
  useEffect(() => {
    if (location.pathname === '/inbox') setUnreadCount(0)
  }, [location.pathname])

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        location.pathname === to
          ? 'bg-green-600 text-white'
          : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🥗</span>
          <span className="font-bold text-green-700 hidden sm:block">Family Meal Planner</span>
        </div>
        <div className="flex items-center gap-1">
          {navLink('/dashboard', '🏠 Dashboard')}
          {navLink('/calendar', '📅 Calendar')}
          {navLink('/grocery', '🛒 Grocery List')}
          {navLink('/family', '👨‍👩‍👧 Family')}
          {!user?.isGuest && navLink('/vault', '🏪 Vault')}
          {!user?.isGuest && (
            <Link
              to="/inbox"
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/inbox'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              📬 Inbox
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!user?.isGuest && (
            <Link
              to="/profile"
              className={`text-sm hidden sm:flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                location.pathname === '/profile'
                  ? 'bg-green-100 text-green-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              👤 {user?.username}
            </Link>
          )}
          {user?.isGuest && (
            <span className="text-sm text-gray-500 hidden sm:block">👤 Guest</span>
          )}
          <button
            onClick={() => {
              if (!isOnline) {
                const ok = window.confirm(
                  "You're offline. If you sign out you won't be able to sign back in until the server is available. Sign out anyway?"
                )
                if (!ok) return
              }
              logout()
            }}
            className="text-sm text-gray-500 hover:text-red-500 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
