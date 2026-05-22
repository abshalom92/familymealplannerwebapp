import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

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

const MACRO_COLORS = ['#22c55e', '#3b82f6', '#f97316']
const CATEGORY_COLORS = {
  produce: '#22c55e',
  dairy: '#3b82f6',
  meat: '#ef4444',
  grains: '#f59e0b',
  pantry: '#8b5cf6',
}
const CATEGORY_ICONS = { produce: '🥦', dairy: '🥛', meat: '🥩', grains: '🌾', pantry: '🫙' }

function StatCard({ label, value, sub, color = 'green' }) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
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
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()))
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!user?.isGuest) {
      api.get('/profile').then(({ data }) => setProfile(data)).catch(() => {})
      api.get('/group').then(({ data: group }) => {
        const me = group.members.find(m => m.username === user?.username)
        if (me?.is_head) {
          api.get('/group/pending').then(({ data: p }) => setPendingCount(p.length)).catch(() => {})
        }
      }).catch(() => {})
    }
  }, [user])

  const firstName = profile?.first_name
    || (user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'there')

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/calendar/week', { params: { week_start: formatDate(weekStart) } })
      setPlans(data)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const weekLabel = () => {
    const end = addDays(weekStart, 6)
    const opts = { month: 'short', day: 'numeric' }
    return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }

  // ── Nutrition totals ──────────────────────────────────────────────
  const totals = plans.reduce((acc, p) => {
    const m = p.meal
    acc.calories  += m.calories  || 0
    acc.protein   += m.protein_g || 0
    acc.carbs     += m.carbs_g   || 0
    acc.fats      += m.fats_g    || 0
    acc.iron      += m.iron_mg   || 0
    acc.calcium   += m.calcium_mg || 0
    return acc
  }, { calories: 0, protein: 0, carbs: 0, fats: 0, iron: 0, calcium: 0 })

  const macroData = [
    { name: 'Protein', value: Math.round(totals.protein * 4) },
    { name: 'Carbs',   value: Math.round(totals.carbs   * 4) },
    { name: 'Fats',    value: Math.round(totals.fats    * 9) },
  ].filter(d => d.value > 0)

  // ── Category breakdown ────────────────────────────────────────────
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
  const totalSlots = 21 // 7 days × 3 slots

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome, {firstName}! 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">{today}</p>
      </div>

      {/* HoH pending requests banner */}
      {pendingCount > 0 && (
        <div className="mb-6 flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-3">
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

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-700">Weekly Overview</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          >‹</button>
          <span className="text-sm text-gray-600 min-w-[190px] text-center">{weekLabel()}</span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          >›</button>
          <button
            onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
            className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
          >This week</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Meals Planned"
              value={`${mealsPlanned} / ${totalSlots}`}
              sub={`${totalSlots - mealsPlanned} slots open`}
              color="green"
            />
            <StatCard
              label="Total Calories"
              value={Math.round(totals.calories).toLocaleString()}
              sub="for the week"
              color="orange"
            />
            <StatCard
              label="Total Protein"
              value={`${Math.round(totals.protein)}g`}
              sub={`Iron: ${totals.iron.toFixed(1)} mg`}
              color="blue"
            />
            <StatCard
              label="Total Calcium"
              value={`${Math.round(totals.calcium)} mg`}
              sub={`Vitamin C: ${Math.round(totals.calcium)} mg`}
              color="purple"
            />
          </div>

          {mealsPlanned === 0 ? (
            <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-medium text-gray-500">No meals planned this week</p>
              <p className="text-sm mt-1">Head to the Calendar to start planning.</p>
              <button
                onClick={() => navigate('/calendar')}
                className="mt-4 px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Go to Calendar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Macro Pie Chart */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-1">Weekly Macro Breakdown</h3>
                <p className="text-xs text-gray-400 mb-4">Calories from protein, carbs & fats</p>
                {macroData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={macroData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        labelLine={false}
                        label={CustomPieLabel}
                      >
                        {macroData.map((_, i) => (
                          <Cell key={i} fill={MACRO_COLORS[i % MACRO_COLORS.length]} />
                        ))}
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
                      <Tooltip
                        formatter={(v, _, props) => [`${v} ingredients`, props.payload.category]}
                        cursor={{ fill: '#f9fafb' }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-400 py-10 text-sm">No ingredient data available</p>
                )}
              </div>

              {/* Micro-nutrient summary */}
              <div className="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">Weekly Nutrient Summary</h3>
                  {(profile?.calorie_goal || profile?.protein_goal_g) && (
                    <span className="text-xs text-gray-400">vs. your daily goals × 7</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Calories', value: Math.round(totals.calories), unit: 'kcal', color: '#f97316', goal: profile?.calorie_goal },
                    { label: 'Protein',  value: Math.round(totals.protein),  unit: 'g',    color: '#22c55e', goal: profile?.protein_goal_g },
                    { label: 'Carbs',    value: Math.round(totals.carbs),    unit: 'g',    color: '#3b82f6', goal: profile?.carbs_goal_g },
                    { label: 'Fats',     value: Math.round(totals.fats),     unit: 'g',    color: '#a855f7', goal: profile?.fats_goal_g },
                    { label: 'Iron',     value: totals.iron.toFixed(1),      unit: 'mg',   color: '#ef4444' },
                    { label: 'Calcium',  value: Math.round(totals.calcium),  unit: 'mg',   color: '#06b6d4' },
                    { label: 'Vitamin C',value: Math.round(plans.reduce((a, p) => a + (p.meal.vitamin_c_mg || 0), 0)), unit: 'mg', color: '#eab308' },
                    { label: 'Vitamin D',value: Math.round(plans.reduce((a, p) => a + (p.meal.vitamin_d_iu || 0), 0)), unit: 'IU', color: '#ec4899' },
                  ].map(({ label, value, unit, color, goal }) => {
                    const weeklyGoal = goal ? goal * 7 : null
                    const pct = weeklyGoal ? Math.min(100, Math.round((value / weeklyGoal) * 100)) : null
                    return (
                      <div key={label} className="flex items-start gap-3">
                        <div className="w-2 h-10 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="text-lg font-bold text-gray-700 leading-tight">
                            {typeof value === 'number' ? value.toLocaleString() : value}{' '}
                            <span className="text-xs font-normal text-gray-400">{unit}</span>
                          </p>
                          {pct !== null && (
                            <div className="mt-1">
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, backgroundColor: color }}
                                />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">{pct}% of weekly goal</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  )
}
