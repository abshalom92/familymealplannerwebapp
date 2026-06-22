import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const MAX_LEN = 280

export default function FeedbackPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const remaining = MAX_LEN - message.length
  const canSubmit = message.trim().length > 0 && remaining >= 0 && !sending

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSending(true)
    setError('')
    try {
      await api.post('/feedback', { message: message.trim() })
      setSent(true)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Could not send feedback. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link
            to={user ? '/dashboard' : '/'}
            className="text-sm text-green-700 hover:underline"
          >
            &larr; Back
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Report a bug / Submit Feedback</h1>
        <p className="text-sm text-gray-500 mb-6">
          Briefly describe the bug or feedback in 280 characters or less. Be specific
          (what page, what you tried, what happened).
        </p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-green-800 font-medium mb-2">Thanks — your feedback was sent.</p>
            <p className="text-sm text-green-700 mb-4">
              {user ? 'I have your account info, so I can reply if needed.' : 'It was sent anonymously.'}
            </p>
            <button
              type="button"
              onClick={() => navigate(user ? '/dashboard' : '/')}
              className="text-sm text-green-700 hover:underline"
            >
              Back to {user ? 'Dashboard' : 'Login'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
                placeholder="Describe the bug or share your feedback..."
                rows={5}
                maxLength={MAX_LEN}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 resize-none"
                disabled={sending}
                autoFocus
              />
              <div className={`mt-1 text-xs text-right ${remaining < 20 ? 'text-amber-600' : 'text-gray-400'}`}>
                {remaining} / {MAX_LEN}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors"
            >
              {sending ? 'Sending…' : 'Send Feedback'}
            </button>

            {!user && (
              <p className="text-xs text-gray-400 text-center">
                You're not signed in — this will be sent anonymously.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
