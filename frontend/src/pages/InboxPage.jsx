import { useState, useEffect } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const TYPE_ICONS = {
  request_accepted: '✅',
  request_denied: '❌',
  plan_updated: '📅',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOT_ICONS = { breakfast: '☀️', lunch: '🌤', dinner: '🌙' }

function formatTs(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function InboxPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [isHoH, setIsHoH] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/inbox'),
      api.get('/group').catch(() => null),
    ]).then(([notifRes, groupRes]) => {
      setNotifications(notifRes.data)
      if (groupRes) {
        const me = groupRes.data.members?.find(m => m.username === user?.username)
        if (me?.is_head) {
          setIsHoH(true)
          api.get('/meal-requests/pending').then(r => setPendingRequests(r.data)).catch(() => {})
        }
      }
    }).finally(() => setLoading(false))

    // Mark all as read when page opens
    api.post('/inbox/read-all').catch(() => {})
  }, [user])

  const handleAccept = async (reqId) => {
    setActioning(reqId)
    try {
      await api.post(`/meal-requests/${reqId}/accept`)
      setPendingRequests(prev => prev.filter(r => r.id !== reqId))
    } finally {
      setActioning(null)
    }
  }

  const handleDeny = async (reqId) => {
    setActioning(reqId)
    try {
      await api.post(`/meal-requests/${reqId}/deny`)
      setPendingRequests(prev => prev.filter(r => r.id !== reqId))
    } finally {
      setActioning(null)
    }
  }

  const markAllRead = () => {
    api.post('/inbox/read-all').catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📬 Inbox</h1>

      {/* HoH: Pending Meal Requests */}
      {isHoH && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            Pending Meal Requests
            {pendingRequests.length > 0 && (
              <span className="text-sm bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </h2>
          {pendingRequests.length === 0 ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              No pending meal requests.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="border-2 border-red-200 bg-red-50 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{req.meal.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {SLOT_ICONS[req.meal_slot] || ''} {req.meal_slot} &middot; {DAYS[req.day_of_week]} &middot; week of {req.week_start}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Requested by{' '}
                        <span className="font-medium text-gray-700">
                          {req.requester?.first_name || req.requester?.username}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleAccept(req.id)}
                        disabled={actioning === req.id}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeny(req.id)}
                        disabled={actioning === req.id}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 text-sm font-medium rounded-lg transition-colors"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notification history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">Notifications</h2>
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={markAllRead}
              className="text-xs text-green-600 hover:text-green-700 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                  n.is_read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'
                }`}
              >
                <span className="text-lg mt-0.5 shrink-0">{TYPE_ICONS[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                    {n.title}
                  </p>
                  {n.body && <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatTs(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
