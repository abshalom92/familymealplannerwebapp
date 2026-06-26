import { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '../api/client'

function Field({ label, name, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
      />
    </div>
  )
}

const RANGES = { '1M': 30, '3M': 90, '6M': 180, '9M': 270, '1Y': 365, '3Y': 1095 }

// Issue #3 fix: use local date via en-CA locale (YYYY-MM-DD) with explicit timezone
function todayISO(tz) {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function linearRegression(points) {
  const n = points.length
  if (n < 2) return null
  const xMean = points.reduce((s, p) => s + p.x, 0) / n
  const yMean = points.reduce((s, p) => s + p.weight, 0) / n
  const num = points.reduce((s, p) => s + (p.x - xMean) * (p.weight - yMean), 0)
  const den = points.reduce((s, p) => s + (p.x - xMean) ** 2, 0)
  if (den === 0) return null
  const slope = num / den
  const intercept = yMean - slope * xMean
  return { slope, intercept }
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Phoenix',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Lima',
  'America/Bogota',
  'America/Santiago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
  'Pacific/Fiji',
]

function PersonalBadgesSection() {
  const [badges, setBadges] = useState(null)

  useEffect(() => {
    api.get('/badges').then(({ data }) => setBadges(data)).catch(() => {})
  }, [])

  if (!badges) return null
  const personal = badges.personal_badges ?? []

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mt-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🏅</span>
        <h2 className="font-semibold text-gray-700">My Badges</h2>
        {personal.length > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
            {personal.length}
          </span>
        )}
      </div>
      {personal.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          Add meals to the calendar or vault to earn personal badges.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {personal.map(b => (
            <div
              key={b.id}
              title={`${b.description}\nEarned ${new Date(b.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 text-xs font-medium text-blue-800"
            >
              <span className="text-base leading-none">{b.icon}</span>
              <div>
                <p className="font-semibold leading-tight">{b.name}</p>
                <p className="text-[10px] opacity-70 leading-tight">
                  {new Date(b.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // password change state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  // invite state
  const [inviteEmail, setInviteEmail] = useState('')
  const [codeList, setCodeList] = useState([])
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)
  const [resendingCode, setResendingCode] = useState(null)
  const [resentCode, setResentCode] = useState(null)

  // weight tracker state
  const [history, setHistory] = useState([])
  const [newWeight, setNewWeight] = useState('')
  const [newDate, setNewDate] = useState(todayISO())
  const [loggingWeight, setLoggingWeight] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editWeight, setEditWeight] = useState('')
  const [editDate, setEditDate] = useState('')
  const [range, setRange] = useState('3M')
  const [pendingBackdate, setPendingBackdate] = useState(false)
  const [weightError, setWeightError] = useState('')

  useEffect(() => {
    api.get('/profile').then(({ data }) => {
      setProfile(data)
      setForm({
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        email: data.email ?? '',
        age: data.age ?? '',
        calorie_goal: data.calorie_goal ?? '',
        protein_goal_g: data.protein_goal_g ?? '',
        carbs_goal_g: data.carbs_goal_g ?? '',
        fats_goal_g: data.fats_goal_g ?? '',
        dietary_notes: data.dietary_notes ?? '',
        timezone: data.timezone ?? '',
      })
      // Sync the date input to the user's saved timezone
      setNewDate(todayISO(data.timezone || undefined))
    })
    api.get('/weight').then(({ data }) => setHistory(Array.isArray(data) ? data : []))
    api.get('/invite/my-codes').then(({ data }) => setCodeList(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  // Issue #3/4: effective timezone — stored preference falls back to browser's detected zone
  const effectiveTz = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        email: form.email || null,
        age: form.age ? parseInt(form.age) : null,
        calorie_goal: form.calorie_goal ? parseInt(form.calorie_goal) : null,
        protein_goal_g: form.protein_goal_g ? parseInt(form.protein_goal_g) : null,
        carbs_goal_g: form.carbs_goal_g ? parseInt(form.carbs_goal_g) : null,
        fats_goal_g: form.fats_goal_g ? parseInt(form.fats_goal_g) : null,
        dietary_notes: form.dietary_notes || null,
        timezone: form.timezone || null,
      }
      const { data } = await api.put('/profile', payload)
      setProfile(data)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const pwChecks = {
    length:    pwForm.next.length >= 8,
    uppercase: /[A-Z]/.test(pwForm.next),
    number:    /[0-9]/.test(pwForm.next),
    special:   /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwForm.next),
  }
  const pwValid = Object.values(pwChecks).every(Boolean)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match')
      return
    }
    setPwSaving(true)
    setPwError('')
    try {
      await api.post('/profile/change-password', {
        current_password: pwForm.current,
        new_password: pwForm.next,
      })
      setPwSaved(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err) {
      setPwError(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setPwSaving(false)
    }
  }

  const handleLogWeight = () => {
    const w = parseFloat(newWeight)
    if (!w || w <= 0) return
    const today = todayISO(effectiveTz)
    if (newDate > today) {
      setWeightError('Future dated entries are not allowed. Please check your date and resubmit.')
      return
    }
    setWeightError('')
    if (newDate < today) {
      setPendingBackdate(true)
      return
    }
    submitWeight()
  }

  const submitWeight = async () => {
    const w = parseFloat(newWeight)
    if (!w || w <= 0) return
    setPendingBackdate(false)
    setLoggingWeight(true)
    try {
      const { data } = await api.post('/weight', {
        weight_lbs: w,
        logged_at: `${newDate}T12:00:00`,
      })
      setHistory(prev => [...prev, data].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at)))
      setNewWeight('')
      setNewDate(todayISO(effectiveTz))
    } finally {
      setLoggingWeight(false)
    }
  }

  const startEdit = (entry) => {
    setEditingId(entry.id)
    setEditWeight(String(entry.weight_lbs))
    setEditDate(entry.logged_at.slice(0, 10))
  }

  const handleSaveEdit = async (id) => {
    const w = parseFloat(editWeight)
    if (!w || w <= 0) return
    const { data } = await api.put(`/weight/${id}`, {
      weight_lbs: w,
      logged_at: `${editDate}T12:00:00`,
    })
    setHistory(prev =>
      prev.map(e => e.id === id ? data : e)
          .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
    )
    setEditingId(null)
  }

  const handleDelete = async (id) => {
    await api.delete(`/weight/${id}`)
    setHistory(prev => prev.filter(e => e.id !== id))
  }

  const filtered = useMemo(() => {
    const days = RANGES[range]
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return history.filter(e => new Date(e.logged_at) >= cutoff)
  }, [history, range])

  const chartData = useMemo(() => {
    if (filtered.length < 2) return []
    const distinctDays = new Set(filtered.map(e => e.logged_at.slice(0, 10))).size
    if (distinctDays < 2) return []

    const points = filtered.map(e => ({
      label: new Date(e.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: e.weight_lbs,
      x: new Date(e.logged_at).getTime(),
    }))

    const reg = linearRegression(points)
    if (!reg) return points
    return points.map(p => ({ ...p, trend: parseFloat((reg.slope * p.x + reg.intercept).toFixed(1)) }))
  }, [filtered])

  const showChart = chartData.length >= 2

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true)
    setInviteError('')
    try {
      const payload = inviteEmail ? { email: inviteEmail } : {}
      await api.post('/invite/generate', payload)
      setInviteEmail('')
      const { data } = await api.get('/invite/my-codes')
      setCodeList(Array.isArray(data) ? data : [])
    } catch (err) {
      setInviteError(err.response?.data?.detail || 'Failed to generate invite code')
    } finally {
      setGeneratingInvite(false)
    }
  }

  const handleResend = async (code) => {
    setResendingCode(code)
    try {
      await api.post(`/invite/resend/${code}`)
      setResentCode(code)
      setTimeout(() => setResentCode(null), 2000)
    } catch {
      // silently fail — backend rate limit or missing email
    } finally {
      setResendingCode(null)
    }
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    })
  }

  if (!profile) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-700">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{displayName}</h1>
            <p className="text-sm text-gray-400">@{profile.username}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name" name="first_name" value={form.first_name} onChange={handleChange} placeholder="Jane" />
            <Field label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} placeholder="Doe" />
            <Field label="Age" name="age" value={form.age} onChange={handleChange} type="number" placeholder="32" />
            {/* Issue #4: timezone setting */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Timezone</label>
              <select
                name="timezone"
                value={form.timezone ?? ''}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
              >
                <option value="">— Browser default ({Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" placeholder="you@example.com" />
          </div>
        </div>

        {/* Dietary Goals */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-1">Daily Dietary Goals</h2>
          <p className="text-xs text-gray-400 mb-4">Used to show progress on your Dashboard</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Calories (kcal)" name="calorie_goal" value={form.calorie_goal} onChange={handleChange} type="number" placeholder="2000" />
            <Field label="Protein (g)" name="protein_goal_g" value={form.protein_goal_g} onChange={handleChange} type="number" placeholder="150" />
            <Field label="Carbs (g)" name="carbs_goal_g" value={form.carbs_goal_g} onChange={handleChange} type="number" placeholder="250" />
            <Field label="Fats (g)" name="fats_goal_g" value={form.fats_goal_g} onChange={handleChange} type="number" placeholder="65" />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Dietary Notes</h2>
          <textarea
            name="dietary_notes"
            value={form.dietary_notes ?? ''}
            onChange={handleChange}
            placeholder="e.g. vegetarian, avoiding processed sugar, trying to eat more fiber…"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
        </div>
      </form>

      {/* Change Password */}
      {!profile.is_guest && (
        <form onSubmit={handleChangePassword} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mt-6">
          <h2 className="font-semibold text-gray-700 mb-4">Change Password</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={pwForm.current}
                onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">New Password</label>
              <input
                type="password"
                required
                value={pwForm.next}
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="••••••••"
              />
              {pwForm.next.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {[
                    [pwChecks.length,    '8+ characters'],
                    [pwChecks.uppercase, 'One uppercase letter'],
                    [pwChecks.number,    'One number'],
                    [pwChecks.special,   'One special character (!@#$%^&*...)'],
                  ].map(([ok, label]) => (
                    <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>{ok ? '✓' : '○'}</span> {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="••••••••"
              />
            </div>
          </div>
          {pwError && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{pwError}</p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={pwSaving || !pwValid || !pwForm.current}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
            >
              {pwSaving ? 'Saving…' : 'Change Password'}
            </button>
            {pwSaved && <span className="text-sm text-green-600 font-medium">Password changed!</span>}
          </div>
        </form>
      )}

      {/* Invite a Friend */}
      {!profile.is_guest && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mt-6">
          <h2 className="font-semibold text-gray-700 mb-1">Invite a Friend</h2>
          <p className="text-xs text-gray-400 mb-4">
            Generate a single-use invite code. Optionally add an email to send it directly.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="friend@example.com (optional)"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              onClick={handleGenerateInvite}
              disabled={generatingInvite}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {generatingInvite ? 'Generating…' : inviteEmail ? 'Send Invite' : 'Generate Code'}
            </button>
          </div>
          {inviteError && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{inviteError}</p>
          )}
          {codeList.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Your invite codes</p>
              <div className="space-y-2">
                {codeList.map(item => (
                  <div key={item.code} className="flex items-center gap-2 text-sm min-w-0">
                    <span className={`font-mono shrink-0 ${item.used ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {item.code}
                    </span>
                    {item.used ? (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full shrink-0">Used</span>
                    ) : (
                      <button
                        onClick={() => handleCopyCode(item.code)}
                        className="text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full transition-colors shrink-0"
                      >
                        {copiedCode === item.code ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                    {item.sent_to_email && (
                      <>
                        <span className="text-xs text-gray-400 truncate min-w-0">&rarr; {item.sent_to_email}</span>
                        {!item.used && (
                          <button
                            onClick={() => handleResend(item.code)}
                            disabled={resendingCode === item.code}
                            className="text-xs text-green-600 hover:underline disabled:opacity-50 shrink-0"
                          >
                            {resentCode === item.code ? '(Email successfully sent!)' : resendingCode === item.code ? '(Sending…)' : '(Resend Invite)'}
                          </button>
                        )}
                      </>
                    )}
                    <span className="ml-auto text-xs text-gray-400 shrink-0">
                      {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Personal Badges */}
      <PersonalBadgesSection />

      {/* Weight Tracker */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mt-6">
        <h2 className="font-semibold text-gray-700 mb-4">Weight Tracker</h2>

        {/* Log form */}
        <div className="flex gap-2 mb-5">
          <input
            type="number"
            value={newWeight}
            onChange={e => setNewWeight(e.target.value)}
            placeholder="lbs"
            min="1"
            step="0.1"
            className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <input
            type="date"
            value={newDate}
            onChange={e => { setNewDate(e.target.value); setWeightError('') }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            onClick={handleLogWeight}
            disabled={loggingWeight || !newWeight}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loggingWeight ? 'Logging…' : 'Log'}
          </button>
        </div>

        {weightError && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{weightError}</p>
        )}

        {pendingBackdate && (
          <div className="mb-5 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
            <span className="text-amber-800">This date is in the past. Would you like to add a backdated entry?</span>
            <div className="flex gap-2 ml-4 shrink-0">
              <button
                onClick={submitWeight}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Yes, add it
              </button>
              <button
                onClick={() => setPendingBackdate(false)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Issue #2 fix: range buttons always visible when history exists; chart/message shown below */}
        {history.length > 0 && (
          <div className="mb-5">
            <div className="flex gap-1 mb-3">
              {Object.keys(RANGES).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    range === r
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {showChart ? (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11 }}
                    tickFormatter={v => `${v}`}
                    width={40}
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      `${val} lbs`,
                      name === 'trend' ? 'Trend' : 'Weight',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#16a34a' }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="trend"
                    stroke="#9ca3af"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No entries in this time range.</p>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Add at least 2 entries on different days to see the trend graph.</p>
            )}
          </div>
        )}

        {/* History list */}
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No entries yet — log your first weight above.</p>
        ) : (
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {[...history].reverse().map(entry => (
              <div
                key={entry.id}
                className="flex items-center gap-2 text-sm py-1.5 border-b border-gray-50 last:border-0"
              >
                {editingId === entry.id ? (
                  <>
                    <input
                      type="number"
                      value={editWeight}
                      onChange={e => setEditWeight(e.target.value)}
                      min="1"
                      step="0.1"
                      className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    <span className="text-gray-400 text-xs">lbs</span>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    <div className="ml-auto flex gap-1">
                      <button
                        onClick={() => handleSaveEdit(entry.id)}
                        className="px-2.5 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-gray-800">{entry.weight_lbs} lbs</span>
                    <span className="text-gray-400 text-xs">{formatDate(entry.logged_at)}</span>
                    <div className="ml-auto flex gap-1">
                      <button
                        onClick={() => startEdit(entry)}
                        className="px-2.5 py-1 text-xs text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="px-2.5 py-1 text-xs text-red-500 bg-red-50 rounded-lg hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
