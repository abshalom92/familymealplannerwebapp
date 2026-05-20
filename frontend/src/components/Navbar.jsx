import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()

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
          {navLink('/calendar', '📅 Calendar')}
          {navLink('/grocery', '🛒 Grocery List')}
          {navLink('/family', '👨‍👩‍👧 Family')}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 hidden sm:block">
            {user?.isGuest ? '👤 Guest' : `👤 ${user?.username}`}
          </span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-red-500 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
