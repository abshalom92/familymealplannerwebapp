import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import RecipeModal from '../components/RecipeModal'
import MealPickerModal from '../components/MealPickerModal'
import AutoFillModal from '../components/AutoFillModal'
import DayGuestsPopover from '../components/DayGuestsPopover'

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
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()))
  const [mealPlan, setMealPlan] = useState([])
  const [viewMealId, setViewMealId] = useState(null)
  const [pickerSlot, setPickerSlot] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showAutoFill, setShowAutoFill] = useState(false)
  const [autoFillLoading, setAutoFillLoading] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [guestPopoverDay, setGuestPopoverDay] = useState(null)

  // Group & role state
  const [isHoH, setIsHoH] = useState(false)
  const [inGroup, setInGroup] = useState(false)
  const [groupLoaded, setGroupLoaded] = useState(false)

  // Pending requests
  const [pendingRequests, setPendingRequests] = useState([])  // HoH: all group pending
  const [myRequests, setMyRequests] = useState([])             // non-HoH: own pending

  // Notify family dialog (13f)
  const [showNotifyDialog, setShowNotifyDialog] = useState(false)
  const [notifyScope, setNotifyScope] = useState('week')
  const [notifyDay, setNotifyDay] = useState(0)
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [notifySent, setNotifySent] = useState(false)

  // Actioning a request (accept/deny)
  const [actioning, setActioning] = useState(null)

  // Load group info once
  useEffect(() => {
    if (user?.isGuest) { setGroupLoaded(true); return }
    api.get('/group').then(r => {
      const me = r.data.members?.find(m => m.username === user?.username)
      setIsHoH(me?.is_head ?? false)
      setInGroup(true)
    }).catch(() => {
      setIsHoH(false)
      setInGroup(false)
    }).finally(() => setGroupLoaded(true))
  }, [user])

  const fetchWeek = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/calendar/week', { params: { week_start: formatDate(weekStart) } })
      setMealPlan(data)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  const fetchRequests = useCallback(async () => {
    if (!groupLoaded || !inGroup) return
    const ws = formatDate(weekStart)
    if (isHoH) {
      api.get('/meal-requests/pending', { params: { week_start: ws } })
        .then(r => setPendingRequests(r.data))
        .catch(() => {})
    } else {
      api.get('/meal-requests', { params: { week_start: ws } })
        .then(r => setMyRequests(r.data.filter(req => req.status === 'pending')))
        .catch(() => {})
    }
  }, [weekStart, isHoH, inGroup, groupLoaded])

  useEffect(() => { fetchWeek() }, [fetchWeek])
  useEffect(() => { fetchRequests() }, [fetchRequests])

  const getMealForSlot = (day, slot) =>
    mealPlan.find((p) => p.day_of_week === day && p.meal_slot === slot)

  const getMyRequestForSlot = (day, slot) =>
    myRequests.find(r => r.day_of_week === day && r.meal_slot === slot)

  const getPendingRequestForSlot = (day, slot) =>
    pendingRequests.find(r => r.day_of_week === day && r.meal_slot === slot)

  const handleSelectMeal = async (meal) => {
    if (inGroup && !isHoH) {
      // Request mode for non-HoH group members
      await api.post('/meal-requests', {
        week_start: formatDate(weekStart),
        day_of_week: pickerSlot.day,
        meal_slot: pickerSlot.meal,
        meal_id: meal.id,
      })
      setPickerSlot(null)
      fetchRequests()
    } else {
      await api.post('/calendar/', {
        week_start: formatDate(weekStart),
        day_of_week: pickerSlot.day,
        meal_slot: pickerSlot.meal,
        meal_id: meal.id,
      })
      setPickerSlot(null)
      fetchWeek()
    }
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

  const handleCancelRequest = async (e, reqId) => {
    e.stopPropagation()
    await api.delete(`/meal-requests/${reqId}`)
    fetchRequests()
  }

  const handleAcceptRequest = async (e, reqId) => {
    e.stopPropagation()
    setActioning(reqId)
    try {
      await api.post(`/meal-requests/${reqId}/accept`)
      setPendingRequests(prev => prev.filter(r => r.id !== reqId))
      fetchWeek()
    } finally {
      setActioning(null)
    }
  }

  const handleDenyRequest = async (e, reqId) => {
    e.stopPropagation()
    setActioning(reqId)
    try {
      await api.post(`/meal-requests/${reqId}/deny`)
      setPendingRequests(prev => prev.filter(r => r.id !== reqId))
    } finally {
      setActioning(null)
    }
  }

  const handleNotifyFamily = async () => {
    setNotifyLoading(true)
    try {
      await api.post('/calendar/notify-family', {
        week_start: formatDate(weekStart),
        scope: notifyScope,
        day_of_week: notifyScope === 'day' ? notifyDay : null,
      })
      setNotifySent(true)
      setTimeout(() => { setShowNotifyDialog(false); setNotifySent(false) }, 1500)
    } finally {
      setNotifyLoading(false)
    }
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
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-800">Weekly Meal Calendar</h1>
          {(isHoH || !inGroup) && (
            <button
              onClick={() => setShowAutoFill(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full transition-colors shadow-sm"
            >
              ✨ Auto-Fill
            </button>
          )}
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
            (isHoH || !inGroup) && (
              <button
                onClick={() => setClearConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 border border-red-200 text-red-400 hover:bg-red-50 hover:border-red-300 text-sm font-semibold rounded-full transition-colors"
              >
                🗑 Clear Week
              </button>
            )
          )}
          {isHoH && (
            <button
              onClick={() => { setShowNotifyDialog(true); setNotifyScope('week'); setNotifyDay(0) }}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 text-sm font-semibold rounded-full transition-colors"
            >
              🔔 Notify Family
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

      {/* Non-HoH info banner */}
      {inGroup && !isHoH && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
          <span>💡</span>
          <span>As a family member, clicking an empty slot submits a meal request to your HoH for approval.</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div />
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
                      <DayGuestsPopover
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
                <div className="flex items-center justify-end pr-2">
                  <span className="text-xs font-semibold text-gray-400 text-right leading-tight">
                    {SLOT_LABELS[slot]}
                  </span>
                </div>
                {DAYS.map((_, day) => {
                  const entry = getMealForSlot(day, slot)
                  const myReq = (!entry && inGroup && !isHoH) ? getMyRequestForSlot(day, slot) : null
                  const pendingReq = (!entry && isHoH) ? getPendingRequestForSlot(day, slot) : null

                  // Pending request cell for HoH
                  if (pendingReq) {
                    return (
                      <div
                        key={day}
                        className="min-h-[80px] rounded-xl border-2 border-red-400 bg-red-50 relative group shadow-sm"
                        style={{ boxShadow: '0 0 0 3px rgba(239,68,68,0.15)' }}
                      >
                        <div className="p-2 h-full flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-bold text-red-700 leading-tight line-clamp-2">
                              {pendingReq.meal.name}
                            </p>
                            <p className="text-[10px] text-red-400 mt-0.5">
                              @{pendingReq.requester?.username}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              onClick={(e) => handleAcceptRequest(e, pendingReq.id)}
                              disabled={actioning === pendingReq.id}
                              className="flex-1 text-[10px] font-bold bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded px-1 py-0.5 transition-colors"
                            >
                              ✓
                            </button>
                            <button
                              onClick={(e) => handleDenyRequest(e, pendingReq.id)}
                              disabled={actioning === pendingReq.id}
                              className="flex-1 text-[10px] font-bold bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-600 rounded px-1 py-0.5 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  // Own pending request cell for non-HoH
                  if (myReq) {
                    return (
                      <div
                        key={day}
                        className="min-h-[80px] rounded-xl border-2 border-amber-300 bg-amber-50 relative group cursor-pointer"
                        onClick={() => setViewMealId(myReq.meal.id)}
                      >
                        <div className="p-2 h-full flex flex-col justify-between">
                          <p className="text-xs font-semibold text-amber-800 leading-tight line-clamp-2">
                            {myReq.meal.name}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                              Requested
                            </span>
                            <button
                              onClick={(e) => handleCancelRequest(e, myReq.id)}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  // Normal planned meal cell
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
                              {entry.planned_by && entry.planned_by !== user?.username
                                ? `@${entry.planned_by}`
                                : `${entry.meal.prep_time + entry.meal.cook_time}m`}
                            </span>
                            {(isHoH || !inGroup) && (
                              <button
                                onClick={(e) => handleRemoveMeal(e, entry.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-gray-400 text-xl">
                            {inGroup && !isHoH ? '📨' : '+'}
                          </span>
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
          requestMode={inGroup && !isHoH}
        />
      )}
      {showAutoFill && (
        <AutoFillModal
          onClose={() => setShowAutoFill(false)}
          onConfirm={handleAutoFill}
          loading={autoFillLoading}
        />
      )}

      {/* Notify Family Dialog (13f) */}
      {showNotifyDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 mx-4">
            {notifySent ? (
              <div className="text-center py-4">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-semibold text-gray-800">Notification sent!</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Notify Family</h3>
                <p className="text-sm text-gray-500 mb-5">
                  Let your family know about recent meal plan changes.
                </p>
                <div className="space-y-3 mb-5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio" name="scope" value="week"
                      checked={notifyScope === 'week'}
                      onChange={() => setNotifyScope('week')}
                      className="accent-green-600"
                    />
                    <span className="text-sm font-medium text-gray-700">This week's entire plan</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio" name="scope" value="day"
                      checked={notifyScope === 'day'}
                      onChange={() => setNotifyScope('day')}
                      className="accent-green-600"
                    />
                    <span className="text-sm font-medium text-gray-700">A specific day</span>
                  </label>
                  {notifyScope === 'day' && (
                    <select
                      value={notifyDay}
                      onChange={(e) => setNotifyDay(Number(e.target.value))}
                      className="ml-6 w-40 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {FULL_DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleNotifyFamily}
                    disabled={notifyLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium text-sm py-2 rounded-lg transition-colors"
                  >
                    {notifyLoading ? 'Sending…' : 'Send Notification'}
                  </button>
                  <button
                    onClick={() => setShowNotifyDialog(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium text-sm py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
