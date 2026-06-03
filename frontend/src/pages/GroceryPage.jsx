import { useState, useEffect } from 'react'
import api from '../api/client'
import { offlineDB } from '../lib/offlineDB'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

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

const CATEGORY_ICONS = {
  produce: '🥦',
  dairy: '🥛',
  meat: '🥩',
  grains: '🌾',
  pantry: '🫙',
}

const CATEGORY_COLORS = {
  produce: 'bg-green-50 border-green-200',
  dairy: 'bg-blue-50 border-blue-200',
  meat: 'bg-red-50 border-red-200',
  grains: 'bg-yellow-50 border-yellow-200',
  pantry: 'bg-gray-50 border-gray-200',
}

export default function GroceryPage() {
  const isOnline = useOnlineStatus()
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()))
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState({})
  const [household, setHousehold] = useState(null)
  const [fromCache, setFromCache] = useState(false)

  useEffect(() => {
    api.get('/household/settings').then((r) => setHousehold(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setFromCache(false)
    const key = formatDate(weekStart)
    const saved = localStorage.getItem(`grocery-checked-${key}`)
    setChecked(saved ? JSON.parse(saved) : {})
    ;(async () => {
      try {
        // If offline edits are queued, IDB is authoritative — SW cache would serve stale grocery data
        if (await offlineDB.hasQueuedWrites()) {
          const cached = await offlineDB.getGrocery(key)
          if (cached) { setItems(cached); setFromCache(true) }
          else setItems([])
          return
        }
        const r = await api.get('/grocery/week', { params: { week_start: key } })
        setItems(r.data)
        offlineDB.cacheGrocery(key, r.data)
      } catch {
        const cached = await offlineDB.getGrocery(key)
        if (cached) { setItems(cached); setFromCache(true) }
        else setItems([])
      } finally {
        setLoading(false)
      }
    })()
  }, [weekStart])

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const toggleCheck = (itemKey) => {
    setChecked((prev) => {
      const next = { ...prev, [itemKey]: !prev[itemKey] }
      localStorage.setItem(`grocery-checked-${formatDate(weekStart)}`, JSON.stringify(next))
      return next
    })
  }

  const weekLabel = () => {
    const end = addDays(weekStart, 6)
    const opts = { month: 'short', day: 'numeric' }
    return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }

  const totalItems = items.length
  const checkedCount = Object.values(checked).filter(Boolean).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {!isOnline && (
        <div className="mb-4 px-4 py-2 bg-gray-800 text-white rounded-xl text-sm flex items-center gap-2">
          <span>📵</span>
          <span>{fromCache ? 'Showing cached grocery list.' : 'You\'re offline. No cached list available for this week.'}</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Grocery List</h1>
          {household && (
            <p className="text-sm text-gray-500 mt-0.5">
              Scaled for {household.num_adults} adult{household.num_adults !== 1 ? 's' : ''}
              {household.num_children > 0 ? `, ${household.num_children} child${household.num_children !== 1 ? 'ren' : ''}` : ''}
              {household.num_toddlers > 0 ? `, ${household.num_toddlers} toddler${household.num_toddlers !== 1 ? 's' : ''}` : ''}
            </p>
          )}
          {totalItems > 0 && (
            <p className="text-sm text-gray-500">
              {checkedCount}/{totalItems} items checked
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-gray-600 min-w-[180px] text-center">{weekLabel()}</span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          >
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p className="font-medium">No meals planned this week</p>
          <p className="text-sm mt-1">Add meals to your calendar to generate a grocery list</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalItems ? (checkedCount / totalItems) * 100 : 0}%` }}
            />
          </div>

          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, catItems]) => (
              <div key={category} className={`rounded-xl border ${CATEGORY_COLORS[category] || 'bg-gray-50 border-gray-200'} overflow-hidden`}>
                <div className="px-4 py-2 border-b border-inherit flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_ICONS[category] || '📦'}</span>
                  <h3 className="font-semibold text-gray-700 capitalize">{category}</h3>
                  <span className="text-xs text-gray-400 ml-auto">{catItems.length} items</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {catItems.map((item) => {
                    const key = `${item.name}-${item.unit}`
                    const warn = item.allergen_warning && !checked[key]
                    return (
                      <li
                        key={key}
                        onClick={() => toggleCheck(key)}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${warn ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-white/50'}`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            checked[key]
                              ? 'bg-green-500 border-green-500'
                              : warn ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          {checked[key] && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className={`flex-1 text-sm ${checked[key] ? 'line-through text-gray-400' : warn ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                          {warn && <span className="font-bold mr-1">(!)</span>}
                          {item.name}
                        </span>
                        <span className={`text-sm font-medium ${checked[key] ? 'text-gray-300' : warn ? 'text-red-500' : 'text-gray-600'}`}>
                          {item.total_quantity} {item.unit}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
