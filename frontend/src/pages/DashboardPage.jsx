import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { offlineDB } from '../lib/offlineDB'

function getMondayOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const ALL_NUTRIENTS = [
  { key: 'calories',  label: 'Calories',  unit: 'kcal', color: '#f97316', mealKey: 'calories',     goalKey: 'calorie_goal',   decimals: 0 },
  { key: 'protein',   label: 'Protein',   unit: 'g',    color: '#22c55e', mealKey: 'protein_g',    goalKey: 'protein_goal_g', decimals: 0 },
  { key: 'carbs',     label: 'Carbs',     unit: 'g',    color: '#3b82f6', mealKey: 'carbs_g',      goalKey: 'carbs_goal_g',   decimals: 0 },
  { key: 'fats',      label: 'Fats',      unit: 'g',    color: '#a855f7', mealKey: 'fats_g',       goalKey: 'fats_goal_g',    decimals: 0 },
  { key: 'iron',      label: 'Iron',      unit: 'mg',   color: '#ef4444', mealKey: 'iron_mg',      decimals: 1 },
  { key: 'calcium',   label: 'Calcium',   unit: 'mg',   color: '#06b6d4', mealKey: 'calcium_mg',   decimals: 0 },
  { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg',   color: '#eab308', mealKey: 'vitamin_c_mg', decimals: 0 },
  { key: 'vitamin_d', label: 'Vitamin D', unit: 'IU',   color: '#ec4899', mealKey: 'vitamin_d_iu', decimals: 0 },
]

const ALL_NUTRIENT_KEYS = ALL_NUTRIENTS.map(n => n.key)

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

const MACRO_COLORS = ['#22c55e', '#3b82f6', '#f97316']
const CATEGORY_COLORS = { produce: '#22c55e', dairy: '#3b82f6', meat: '#ef4444', grains: '#f59e0b', pantry: '#8b5cf6' }
const CATEGORY_ICONS  = { produce: '🥦', dairy: '🥛', meat: '🥩', grains: '🌾', pantry: '🫙' }

function StatCard({ label, value, sub, color = 'green' }) {
  const colors = {
    green:  'bg-green-50  border-green-200  text-green-700',
    blue:   'bg-blue-50   border-blue-200   text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  }
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  )
}

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [weekStart, setWeekStart]   = useState(() => getMondayOfWeek(new Date()))
  const [plans, setPlans]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [profile, setProfile]       = useState(null)
  const [pendingCount, setPendingCount] = useState(0)

  // Group role + meal requests
  const [isHoH, setIsHoH]           = useState(false)
  const [inGroup, setInGroup]       = useState(false)
  const [mealReqPending, setMealReqPending] = useState([])   // HoH: pending requests this week
  const [myMealRequests, setMyMealRequests] = useState([])   // non-HoH: own pending requests
  const [vaultExpiringCount, setVaultExpiringCount] = useState(0)

  // 10b: daily/weekly toggle
  const [statView, setStatView] = useState('daily')

  // 10c: configurable nutrient summary
  const [summaryNutrients, setSummaryNutrients] = useState(() => loadLS('summary_nutrients', ALL_NUTRIENT_KEYS))
  const [showSummaryConfig, setShowSummaryConfig] = useState(false)

  // 10d: week-at-a-glance nutrient selectors
  const [glanceNutrients, setGlanceNutrients] = useState(() => loadLS('glance_nutrients', ['calories', 'protein', 'carbs']))

  useEffect(() => {
    if (!user?.isGuest) {
      api.get('/profile').then(({ data }) => setProfile(data)).catch(() => {})
      api.get('/group').then(({ data: group }) => {
        const me = group.members.find(m => m.username === user?.username)
        const hoh = me?.is_head ?? false
        setIsHoH(hoh)
        setInGroup(true)
        api.get('/vault/expiring').then(({ data }) => setVaultExpiringCount(data.length)).catch(() => {})
        const ws = formatDate(getMondayOfWeek(new Date()))
        if (hoh) {
          api.get('/group/pending').then(({ data: p }) => setPendingCount(p.length)).catch(() => {})
          api.get('/meal-requests/pending', { params: { week_start: ws } })
            .then(({ data }) => setMealReqPending(data)).catch(() => {})
        } else if (me) {
          api.get('/meal-requests', { params: { week_start: ws } })
            .then(({ data }) => setMyMealRequests(data.filter(r => r.status === 'pending'))).catch(() => {})
        }
      }).catch(() => { setInGroup(false); setIsHoH(false) })
    }
  }, [user])

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const ws = formatDate(weekStart)
    try {
      if (await offlineDB.hasQueuedWrites()) {
        const cached = await offlineDB.getWeekPlan(ws)
        if (cached) { setPlans(cached); setLoading(false); return }
      }
      const { data } = await api.get('/calendar/week', { params: { week_start: ws } })
      setPlans(data)
    } catch {
      const cached = await offlineDB.getWeekPlan(ws)
      if (cached) setPlans(cached)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  // Re-fetch when user returns to this tab (picks up offline IDB changes made on CalendarPage)
  useEffect(() => {
    const onFocus = () => fetchPlans()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchPlans])

  const firstName = profile?.first_name
    || (user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'there')

  const weekLabel = () => {
    const end = addDays(weekStart, 6)
    const opts = { month: 'short', day: 'numeric' }
    return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }

  // Today's day-of-week index (0=Mon, 6=Sun)
  const todayDOW = useMemo(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  }, [])

  // Per-day breakdown for the viewed week
  const byDay = useMemo(() =>
    Array.from({ length: 7 }, (_, day) => {
      const dayPlans = plans.filter(p => p.day_of_week === day)
      const result = { day, mealsCount: dayPlans.length }
      for (const n of ALL_NUTRIENTS) {
        result[n.key] = dayPlans.reduce((s, p) => s + (p.meal[n.mealKey] || 0), 0)
      }
      return result
    }), [plans])

  // Totals for whichever view the stat cards are showing
  const statSource = statView === 'daily' ? byDay[todayDOW] : {
    mealsCount: plans.length,
    ...ALL_NUTRIENTS.reduce((acc, n) => {
      acc[n.key] = plans.reduce((s, p) => s + (p.meal[n.mealKey] || 0), 0)
      return acc
    }, {}),
  }

  // Weekly totals (always used for charts / nutrient summary)
  const totals = useMemo(() =>
    ALL_NUTRIENTS.reduce((acc, n) => {
      acc[n.key] = plans.reduce((s, p) => s + (p.meal[n.mealKey] || 0), 0)
      return acc
    }, {}), [plans])

  const macroData = [
    { name: 'Protein', value: Math.round(totals.protein * 4) },
    { name: 'Carbs',   value: Math.round(totals.carbs   * 4) },
    { name: 'Fats',    value: Math.round(totals.fats    * 9) },
  ].filter(d => d.value > 0)

  const catCounts = {}
  for (const p of plans) {
    for (const ing of p.meal.ingredients || []) {
      const cat = ing.category || 'pantry'
      catCounts[cat] = (catCounts[cat] || 0) + 1
    }
  }
  const categoryData = Object.entries(catCounts)
    .map(([cat, count]) => ({ category: cat, count, label: `${CATEGORY_ICONS[cat] || '📦'} ${cat}` }))
    .sort((a, b) => b.count - a.count)

  const mealsPlanned = plans.length
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const toggleSummaryNutrient = (key) => {
    const updated = summaryNutrients.includes(key)
      ? summaryNutrients.filter(k => k !== key)
      : [...summaryNutrients, key]
    setSummaryNutrients(updated)
    localStorage.setItem('summary_nutrients', JSON.stringify(updated))
  }

  const updateGlanceNutrient = (idx, key) => {
    const updated = [...glanceNutrients]
    updated[idx] = key
    setGlanceNutrients(updated)
    localStorage.setItem('glance_nutrients', JSON.stringify(updated))
  }

  const handleAcceptReq = async (reqId) => {
    await api.post(`/meal-requests/${reqId}/accept`)
    setMealReqPending(prev => prev.filter(r => r.id !== reqId))
    fetchPlans()
  }

  const handleDenyReq = async (reqId) => {
    await api.post(`/meal-requests/${reqId}/deny`)
    setMealReqPending(prev => prev.filter(r => r.id !== reqId))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome, {firstName}! 👋</h1>
        <p className="text-gray-400 mt-1 text-sm">{today}</p>
      </div>

      {/* HoH: pending join requests banner */}
      {pendingCount > 0 && (
        <div className="mb-4 flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <p className="text-sm font-medium text-yellow-800">
              {pendingCount} pending family join request{pendingCount !== 1 ? 's' : ''} waiting for your approval
            </p>
          </div>
          <button
            onClick={() => navigate('/family')}
            className="text-xs px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
          >
            Review
          </button>
        </div>
      )}

      {/* HoH: pending meal requests banner (13d) */}
      {isHoH && mealReqPending.length > 0 && (
        <div className="mb-6 flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍽</span>
            <p className="text-sm font-medium text-red-800">
              {mealReqPending.length} pending meal request{mealReqPending.length !== 1 ? 's' : ''} from family members this week
            </p>
          </div>
          <button
            onClick={() => navigate('/inbox')}
            className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
          >
            Review in Inbox
          </button>
        </div>
      )}

      {/* Vault expiring soon card */}
      {vaultExpiringCount > 0 && (
        <div className="mb-4 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏪</span>
            <p className="text-sm font-medium text-orange-800">
              {vaultExpiringCount} vault item{vaultExpiringCount !== 1 ? 's' : ''} expiring soon
            </p>
          </div>
          <button
            onClick={() => navigate('/vault')}
            className="text-xs px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            View Vault
          </button>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-700">Weekly Overview</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">‹</button>
          <span className="text-sm text-gray-600 min-w-[190px] text-center">{weekLabel()}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">›</button>
          <button onClick={() => setWeekStart(getMondayOfWeek(new Date()))} className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors">This week</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* 10a + 10b — Stat cards with daily/weekly toggle */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-600">
                {statView === 'daily' ? `${DAY_LABELS[todayDOW]}'s Plan` : 'Full Week'}
              </p>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                <button
                  onClick={() => setStatView('daily')}
                  className={`px-3 py-1.5 font-medium transition-colors ${statView === 'daily' ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setStatView('weekly')}
                  className={`px-3 py-1.5 font-medium transition-colors ${statView === 'weekly' ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  Weekly
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="Meals Planned"
                value={statView === 'daily' ? `${statSource.mealsCount} / 3` : `${statSource.mealsCount} / 21`}
                sub={statView === 'daily' ? `${3 - statSource.mealsCount} slots open` : `${21 - statSource.mealsCount} slots open`}
                color="green"
              />
              <StatCard
                label="Calories"
                value={Math.round(statSource.calories).toLocaleString()}
                sub={statView === 'daily' ? 'kcal today' : 'kcal this week'}
                color="orange"
              />
              <StatCard
                label="Protein"
                value={`${Math.round(statSource.protein)}g`}
                sub={statView === 'daily' ? 'today' : 'this week'}
                color="blue"
              />
            </div>
          </div>

          {/* 13b — HoH: pending meal request cards with red outline */}
          {isHoH && mealReqPending.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                Pending Meal Requests
                <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                  {mealReqPending.length}
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mealReqPending.map(req => (
                  <div
                    key={req.id}
                    className="border-2 border-red-300 bg-red-50 rounded-xl p-4 shadow-sm"
                    style={{ boxShadow: '0 0 0 4px rgba(239,68,68,0.1)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 truncate">{req.meal.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {DAY_SHORT[req.day_of_week]} &middot; {req.meal_slot} &middot; week of {req.week_start}
                        </p>
                        <p className="text-sm text-gray-500">
                          From: <span className="font-medium text-gray-700">
                            {req.requester?.first_name || req.requester?.username}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAcceptReq(req.id)}
                          className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDenyReq(req.id)}
                          className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-lg transition-colors"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 13a — Non-HoH: own pending requests with "Requested" badge */}
          {inGroup && !isHoH && myMealRequests.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">My Pending Requests This Week</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myMealRequests.map(req => (
                  <div key={req.id} className="border border-amber-300 bg-amber-50 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{req.meal.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {DAY_SHORT[req.day_of_week]} &middot; {req.meal_slot}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        Requested
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mealsPlanned === 0 ? (
            <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-medium text-gray-500">No meals planned this week</p>
              <p className="text-sm mt-1">Head to the Calendar to start planning.</p>
              <button onClick={() => navigate('/calendar')} className="mt-4 px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors">
                Go to Calendar
              </button>
            </div>
          ) : (
            <div className="space-y-6">

              {/* 10d — Week at a Glance */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-gray-700">Week at a Glance</h3>
                    <p className="text-xs text-gray-400">Daily nutrient totals — pick any 3 to display</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[0, 1, 2].map(idx => (
                      <select
                        key={idx}
                        value={glanceNutrients[idx]}
                        onChange={e => updateGlanceNutrient(idx, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                      >
                        {ALL_NUTRIENTS.map(n => (
                          <option key={n.key} value={n.key} disabled={glanceNutrients.includes(n.key) && n.key !== glanceNutrients[idx]}>
                            {n.label}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-center">
                    <thead>
                      <tr>
                        <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-4 w-28">Nutrient</th>
                        {DAY_SHORT.map((d, i) => (
                          <th key={d} className={`text-xs font-semibold pb-2 ${i === todayDOW ? 'text-green-600' : 'text-gray-500'}`}>
                            {d}
                            {i === todayDOW && <span className="block w-1.5 h-1.5 bg-green-500 rounded-full mx-auto mt-0.5" />}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {glanceNutrients.map(key => {
                        const n = ALL_NUTRIENTS.find(x => x.key === key)
                        return (
                          <tr key={key} className="border-t border-gray-50">
                            <td className="text-left py-2 pr-4">
                              <span className="text-xs font-medium text-gray-600">{n.label}</span>
                              <span className="text-[10px] text-gray-400 ml-1">({n.unit})</span>
                            </td>
                            {byDay.map((day, i) => {
                              const val = day[key]
                              const fmt = n.decimals > 0 ? val.toFixed(n.decimals) : Math.round(val)
                              return (
                                <td key={i} className={`py-2 text-xs ${i === todayDOW ? 'text-green-700 font-bold' : val > 0 ? 'text-gray-700 font-medium' : 'text-gray-300'}`}>
                                  {val > 0 ? Number(fmt).toLocaleString() : '—'}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Macro Pie Chart */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-700 mb-1">Weekly Macro Breakdown</h3>
                  <p className="text-xs text-gray-400 mb-4">Calories from protein, carbs & fats</p>
                  {macroData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={macroData} cx="50%" cy="50%" outerRadius={100} dataKey="value" labelLine={false} label={CustomPieLabel}>
                          {macroData.map((_, i) => <Cell key={i} fill={MACRO_COLORS[i % MACRO_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v} cal`, '']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-400 py-10 text-sm">No nutrition data available</p>
                  )}
                </div>

                {/* Food Category Bar Chart */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-700 mb-1">Food Group Variety</h3>
                  <p className="text-xs text-gray-400 mb-4">Ingredient count by category this week</p>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={categoryData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip formatter={(v, _, props) => [`${v} ingredients`, props.payload.category]} cursor={{ fill: '#f9fafb' }} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {categoryData.map((entry, i) => <Cell key={i} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-400 py-10 text-sm">No ingredient data available</p>
                  )}
                </div>

              </div>

              {/* 10c — Weekly Nutrient Summary with configurable nutrients */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-700">Weekly Nutrient Summary</h3>
                    {(profile?.calorie_goal || profile?.protein_goal_g) && (
                      <p className="text-xs text-gray-400">vs. your daily goals × 7</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowSummaryConfig(c => !c)}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg transition-colors"
                  >
                    {showSummaryConfig ? 'Done' : 'Configure'}
                  </button>
                </div>

                {showSummaryConfig && (
                  <div className="mb-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Choose which nutrients to display:</p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_NUTRIENTS.map(n => (
                        <button
                          key={n.key}
                          onClick={() => toggleSummaryNutrient(n.key)}
                          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                            summaryNutrients.includes(n.key)
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 bg-white text-gray-400'
                          }`}
                        >
                          {n.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {ALL_NUTRIENTS.filter(n => summaryNutrients.includes(n.key)).map(({ key, label, unit, color, mealKey, goalKey, decimals }) => {
                    const value = totals[key] ?? 0
                    const formatted = decimals > 0 ? Number(value.toFixed(decimals)) : Math.round(value)
                    const weeklyGoal = goalKey && profile?.[goalKey] ? profile[goalKey] * 7 : null
                    const pct = weeklyGoal ? Math.min(100, Math.round((value / weeklyGoal) * 100)) : null
                    return (
                      <div key={key} className="flex items-start gap-3">
                        <div className="w-2 h-10 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="text-lg font-bold text-gray-700 leading-tight">
                            {formatted.toLocaleString()}{' '}
                            <span className="text-xs font-normal text-gray-400">{unit}</span>
                          </p>
                          {pct !== null && (
                            <div className="mt-1">
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">{pct}% of weekly goal</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {summaryNutrients.length === 0 && (
                    <p className="col-span-4 text-sm text-gray-400 text-center py-4">No nutrients selected — click Configure to add some.</p>
                  )}
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  )
}
