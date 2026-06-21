import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function passwordChecks(pw) {
  return {
    length:    pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    number:    /[0-9]/.test(pw),
    special:   /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pw),
  }
}

export default function LoginPage() {
  const { login, register, guestLogin } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '', inviteCode: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const checks = passwordChecks(form.password)
  const passwordValid = Object.values(checks).every(Boolean)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.username, form.password)
      } else {
        await register(form.username, form.email, form.password, form.inviteCode)
      }
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : (detail || 'Something went wrong'))
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    setLoading(true)
    try {
      await guestLogin()
      navigate('/calendar')
    } catch {
      setError('Failed to start guest session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥗</div>
          <h1 className="text-3xl font-bold text-green-700">Family Meal Planner</h1>
          <p className="text-gray-500 mt-1">Plan meals, generate grocery lists, discover recipes</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  mode === m ? 'bg-white shadow text-green-700' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="your_username"
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invite Code</label>
                  <input
                    type="text"
                    required
                    value={form.inviteCode}
                    onChange={(e) => setForm({ ...form, inviteCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                    placeholder="Enter your invite code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="you@example.com"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
              />
              {mode === 'register' && form.password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {[
                    [checks.length,    '8+ characters'],
                    [checks.uppercase, 'One uppercase letter'],
                    [checks.number,    'One number'],
                    [checks.special,   'One special character (!@#$%^&*...)'],
                  ].map(([ok, label]) => (
                    <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{ok ? '✓' : '○'}</span> {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'register' && (!passwordValid || !form.inviteCode.trim()))}
              className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <hr className="flex-1 border-gray-200" />
            <span className="text-gray-500 text-sm">or</span>
            <hr className="flex-1 border-gray-200" />
          </div>

          <button
            onClick={handleGuest}
            disabled={loading}
            className="mt-4 w-full py-2.5 border-2 border-orange-600 text-orange-700 hover:bg-orange-50 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Continue as Guest 👋
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Guest sessions are not saved between visits
          </p>
        </div>
      </div>
    </main>
  )
}
