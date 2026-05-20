import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import RecipeModal from '../components/RecipeModal'
import MealPickerModal from '../components/MealPickerModal'
import AutoFillModal from '../components/AutoFillModal'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SLOTS = ['breakfast', 'lunch', 'dinner']
const SLOT_LABELS = { breakfast: '☀️ Breakfast', lunch: '🌤 Lunch', dinner: '🌙 Dinner' }
const SLOT_COLORS = {
  breakfast: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
  lunch: 'bg-blue-50 border-blue-200 hover:border-blue-400',
  dinner: 'bg-purple-50 border-purple-200 hover:border-purple-400',
}

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

const MAX_GUESTS = 40

function GuestPopover({ dateStr, onClose }) {
  const [adults, setAdults] = useState(0)
  const [children, setChildren] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/household/guests/${dateStr}`).then((r) => {
      setAdults(r.data.adult_guests)
      setChildren(r.data.child_guests)
    })
  }, [dateStr])

  const total = adults + children
  const over = total > MAX_GUESTS

  const handleSave = async () => {
    if (over) return
    setSaving(true)
    try {
      await api.put(`/household/guests/${dateStr}`, { adult_guests: adults, child_guests: children })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-52">
      <p className="text-xs font-semibold text-gray-700 mb-3">Add Guests</p>
      <div className="space-y-2 mb-3">
        <div>
          <label className="text-xs text-gray-500">Adult guests</label>
          <input type="number" min="0" max={MAX_GUESTS} value={adults}
            onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Child guests</label>
          <input type="number" min="0" max={MAX_GUESTS} value={children}
            onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>
      {over && <p className="text-xs text-red-500 mb-2">Max {MAX_GUESTS} guests.</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || over}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-xs font-medium py-1.5 rounded-lg transition-colors">
          {saving ? '…' : 'Save'}
        </button>
        <button onClick={onClose}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium py-1.5 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()))
  const [mealPlan, setMealPlan] = useState([]) // array of MealPlanOut
  const [viewMealId, setViewMealId] = useState(null)
  const [pickerSlot, setPickerSlot] = useState(null) // { day, meal }
  const [loading, setLoading] = useState(false)
  const [showAutoFill, setShowAutoFill] = useState(false)
  const [autoFillLoading, setAutoFillLoading] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [guestPopoverDay, setGuestPopoverDay] = useState(null) // day index 0-6

  const fetchWeek = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/calendar/week', { params: { week_start: formatDate(weekStart) } })
      setMealPlan(data)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { fetchWeek() }, [fetchWeek])

  const getMealForSlot = (day, slot) =>
    mealPlan.find((p) => p.day_of_week === day && p.meal_slot === slot)

  const handleSelectMeal = async (meal) => {
    await api.post('/calendar/', {
      week_start: formatDate(weekStart),
      day_of_week: pickerSlot.day,
      meal_slot: pickerSlot.meal,
      meal_id: meal.id,
    })
    setPickerSlot(null)
    fetchWeek()
  }

  const handleClearWeek = async () => {
    await api.delete('/calendar/week', { params: { week_start: formatDate(weekStart) } })
    setClearConfirm(false)
    fetchWeek()
  }

  const handleAutoFill = async (slots, overwrite) => {
    setAutoFillLoading(true)
    try {
      await api.post('/calendar/autofill', {
        week_start: formatDate(weekStart),
        slots,
        overwrite,
      })
      setShowAutoFill(false)
      fetchWeek()
    } finally {
      setAutoFillLoading(false)
    }
  }

  const handleRemoveMeal = async (e, planId) => {
    e.stopPropagation()
    await api.delete(`/calendar/${planId}`)
    fetchWeek()
  }

  const weekLabel = () => {
    const end = addDays(weekStart, 6)
    const opts = { month: 'short', day: 'numeric' }
    return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Weekly Meal Calendar</h1>
          <button
            onClick={() => setShowAutoFill(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full transition-colors shadow-sm"
          >
            ✨ Auto-Fill
          </button>
          {clearConfirm ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Clear all meals?</span>
              <button
                onClick={handleClearWeek}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full transition-colors"
              >
                Yes, clear
              </button>
              <button
                onClick={() => setClearConfirm(false)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-full transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setClearConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-red-200 text-red-400 hover:bg-red-50 hover:border-red-300 text-sm font-semibold rounded-full transition-colors"
            >
              🗑 Clear Week
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          >
            ‹
          </button>
          <span className="font-medium text-gray-700 min-w-[200px] text-center text-sm">{weekLabel()}</span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          >
            ›
          </button>
          <button
            onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors font-medium"
          >
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        /* Calendar Grid */
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div /> {/* spacer for slot labels */}
              {DAYS.map((d, i) => {
                const dayDate = addDays(weekStart, i)
                const dateStr = formatDate(dayDate)
                const isToday = dateStr === formatDate(new Date())
                return (
                  <div key={d} className="text-center relative">
                    <p className={`text-xs font-semibold ${isToday ? 'text-green-600' : 'text-gray-400'}`}>{d}</p>
                    <p className={`text-lg font-bold ${isToday ? 'text-green-600' : 'text-gray-700'}`}>
                      {dayDate.getDate()}
                    </p>
                    <button
                      onClick={() => setGuestPopoverDay(guestPopoverDay === i ? null : i)}
                      title="Add guests"
                      className="text-xs text-gray-400 hover:text-green-600 transition-colors mt-0.5"
                    >
                      👥
                    </button>
                    {guestPopoverDay === i && (
                      <GuestPopover
                        dateStr={dateStr}
                        onClose={() => setGuestPopoverDay(null)}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Meal rows */}
            {SLOTS.map((slot) => (
              <div key={slot} className="grid grid-cols-8 gap-2 mb-3">
                {/* Slot label */}
                <div className="flex items-center justify-end pr-2">
                  <span className="text-xs font-semibold text-gray-400 text-right leading-tight">
                    {SLOT_LABELS[slot]}
                  </span>
                </div>
                {DAYS.map((_, day) => {
                  const entry = getMealForSlot(day, slot)
                  return (
                    <div
                      key={day}
                      className={`min-h-[80px] rounded-xl border-2 border-dashed transition-all cursor-pointer relative group ${SLOT_COLORS[slot]}`}
                      onClick={() => entry ? setViewMealId(entry.meal_id) : setPickerSlot({ day, meal: slot })}
                    >
                      {entry ? (
                        <div className="p-2 h-full flex flex-col justify-between">
                          <p className="text-xs font-semibold text-gray-700 leading-tight line-clamp-2">
                            {entry.meal.name}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-400">
                              {entry.meal.prep_time + entry.meal.cook_time}m
                            </span>
                            <button
                              onClick={(e) => handleRemoveMeal(e, entry.id)}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-gray-400 text-xl">+</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <RecipeModal mealId={viewMealId} onClose={() => setViewMealId(null)} />
      {pickerSlot && (
        <MealPickerModal
          slot={pickerSlot}
          weekStart={formatDate(weekStart)}
          onClose={() => setPickerSlot(null)}
          onSelect={handleSelectMeal}
        />
      )}
      {showAutoFill && (
        <AutoFillModal
          onClose={() => setShowAutoFill(false)}
          onConfirm={handleAutoFill}
          loading={autoFillLoading}
        />
      )}
    </div>
  )
}
