import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { offlineDB } from '../lib/offlineDB'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

const STATUS_STYLES = {
  fresh:        'bg-green-100 text-green-700',
  expiring_soon:'bg-amber-100 text-amber-700',
  expired:      'bg-red-100 text-red-700',
  used_up:      'bg-gray-100 text-gray-500',
}
const STATUS_LABELS = {
  fresh:        '✓ Fresh',
  expiring_soon:'⚠ Expiring Soon',
  expired:      '✕ Expired',
  used_up:      '— Used Up',
}
const STORAGE_LABELS = {
  frozen:       '🧊 Frozen',
  refrigerated: '❄️ Refrigerated',
  pantry:       '🫙 Pantry',
  freeze_dried: '🌵 Freeze-Dried',
  other:        '📦 Other',
}

const NOTIFY_DAYS = { frozen: 14, refrigerated: 1, pantry: 2, freeze_dried: 2, other: 2 }

function computeStatus(entry) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [y, m, d] = entry.expiration_date.split('-').map(Number)
  const expiry = new Date(y, m - 1, d)
  if (entry.servings_remaining <= 0) return 'used_up'
  if (expiry < today) return 'expired'
  const threshold = NOTIFY_DAYS[entry.storage_method] ?? 2
  const thresholdDate = new Date(today); thresholdDate.setDate(thresholdDate.getDate() + threshold)
  if (expiry <= thresholdDate) return 'expiring_soon'
  return 'fresh'
}

function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const expiry = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((expiry - today) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d`
}

export default function VaultPage() {
  const { user } = useAuth()
  const isOnline = useOnlineStatus()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [isHoH, setIsHoH] = useState(false)
  const [inGroup, setInGroup] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [withdrawTarget, setWithdrawTarget] = useState(null)
  const [withdrawCount, setWithdrawCount] = useState(1)
  const [pageError, setPageError] = useState('')
  const [hasQueuedVaultWrites, setHasQueuedVaultWrites] = useState(false)
  const [vaultSyncLoading, setVaultSyncLoading] = useState(false)

  // Add-entry form state
  const [meals, setMeals] = useState([])
  const [mealsLoading, setMealsLoading] = useState(false)
  const [mealsError, setMealsError] = useState(false)
  const [mealSearch, setMealSearch] = useState('')
  const [selectedMeal, setSelectedMeal] = useState(null)
  const [storageMethod, setStorageMethod] = useState('refrigerated')
  const [servingsTotal, setServingsTotal] = useState(4)
  const [dateAdded, setDateAdded] = useState(new Date().toISOString().split('T')[0])
  const [expirationDate, setExpirationDate] = useState('')
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (user?.isGuest) return
    api.get('/group').then(({ data: group }) => {
      const me = group.members.find(m => m.username === user?.username)
      setIsHoH(me?.is_head ?? false)
      setInGroup(true)
    }).catch(() => { setInGroup(false) })
  }, [user])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/vault')
      setEntries(Array.isArray(data) ? data : [])
      offlineDB.cacheVault(data)
    } catch {
      const cached = await offlineDB.getVault()
      if (cached) setEntries(Array.isArray(cached) ? cached : [])
    } finally {
      setLoading(false)
    }
  }, [])

  // Check for queued vault writes on mount
  useEffect(() => {
    offlineDB.hasQueuedVaultWrites().then(setHasQueuedVaultWrites)
  }, [])

  // Auto-sync vault queue when online (covers both reconnect and fresh load)
  useEffect(() => {
    if (isOnline && hasQueuedVaultWrites && !vaultSyncLoading) {
      syncVaultQueue()
    }
  }, [isOnline, hasQueuedVaultWrites]) // eslint-disable-line react-hooks/exhaustive-deps

  const syncVaultQueue = async () => {
    const queue = await offlineDB.getVaultWriteQueue()
    if (queue.length === 0) { setHasQueuedVaultWrites(false); return }
    setVaultSyncLoading(true)
    try {
      for (const write of queue) {
        if (write.op === 'withdraw') {
          await api.post(`/vault/${write.entryId}/withdraw`, { servings: write.servings })
        }
      }
      await offlineDB.clearVaultWriteQueue()
      setHasQueuedVaultWrites(false)
      await fetchEntries()
    } catch { /* network still unreliable — keep queue, try again on next reconnect */ } finally {
      setVaultSyncLoading(false)
    }
  }

  useEffect(() => { fetchEntries() }, [fetchEntries])

  useEffect(() => {
    if (showAdd) {
      setMealsLoading(true)
      setMealsError(false)
      api.get('/meals/')
        .then(({ data }) => {
          console.log('[vault] meals response:', typeof data, Array.isArray(data), Array.isArray(data) ? data.length : data)
          setMeals(Array.isArray(data) ? data : [])
        })
        .catch((err) => {
          console.error('[vault] meals error:', err?.response?.status, err?.message)
          setMealsError(true)
        })
        .finally(() => setMealsLoading(false))
    }
  }, [showAdd])

  useEffect(() => {
    if (!selectedMeal || !storageMethod) return
    setLoadingSuggest(true)
    api.get('/vault/suggest-expiration', { params: { meal_id: selectedMeal.id, storage_method: storageMethod } })
      .then(({ data }) => setExpirationDate(data.expiration_date))
      .catch(() => {})
      .finally(() => setLoadingSuggest(false))
  }, [selectedMeal, storageMethod])

  const filteredMeals = meals.filter(m =>
    mealSearch === '' || m.name.toLowerCase().includes(mealSearch.toLowerCase())
  )

  const resetAddForm = () => {
    setSelectedMeal(null)
    setMealSearch('')
    setStorageMethod('refrigerated')
    setServingsTotal(4)
    setDateAdded(new Date().toISOString().split('T')[0])
    setExpirationDate('')
    setFormError('')
  }

  const handleAddEntry = async () => {
    if (!selectedMeal || !expirationDate) return
    setFormError('')
    try {
      await api.post('/vault', {
        meal_id: selectedMeal.id,
        storage_method: storageMethod,
        servings_total: servingsTotal,
        date_added: dateAdded,
        expiration_date: expirationDate,
      })
      setShowAdd(false)
      resetAddForm()
      fetchEntries()
    } catch (e) {
      setFormError(e.response?.data?.detail || 'Failed to add entry')
    }
  }

  const handleWithdraw = async (entryId) => {
    setPageError('')
    if (!isOnline) {
      // Optimistic update — apply locally and queue for sync
      setEntries(prev => prev.map(e => {
        if (e.id !== entryId) return e
        const updated = { ...e, servings_remaining: Math.max(0, e.servings_remaining - withdrawCount) }
        updated.status = computeStatus(updated)
        return updated
      }))
      await offlineDB.queueVaultWrite({ op: 'withdraw', entryId, servings: withdrawCount })
      await offlineDB.cacheVault(entries.map(e => {
        if (e.id !== entryId) return e
        const updated = { ...e, servings_remaining: Math.max(0, e.servings_remaining - withdrawCount) }
        updated.status = computeStatus(updated)
        return updated
      }))
      setHasQueuedVaultWrites(true)
      setWithdrawTarget(null)
      return
    }
    try {
      const { data } = await api.post(`/vault/${entryId}/withdraw`, { servings: withdrawCount })
      setEntries(prev => prev.map(e => e.id === entryId ? data : e))
      offlineDB.cacheVault(entries.map(e => e.id === entryId ? data : e))
      setWithdrawTarget(null)
    } catch (e) {
      setPageError(e.response?.data?.detail || 'Withdraw failed')
    }
  }

  const handleDelete = async (entryId) => {
    if (!window.confirm('Delete this vault entry?')) return
    setPageError('')
    try {
      await api.delete(`/vault/${entryId}`)
      setEntries(prev => prev.filter(e => e.id !== entryId))
    } catch {
      setPageError('Failed to delete entry')
    }
  }

  const expiringSoon = entries.filter(e => e.status === 'expiring_soon' || e.status === 'expired')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🏪 Meal Vault</h1>
          <p className="text-gray-400 text-sm mt-1">Track prepped and stored meals</p>
        </div>
        {isHoH && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            + Add Entry
          </button>
        )}
      </div>

      {!isOnline && (
        <div className="mb-4 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm flex items-center gap-2">
          <span>📵</span>
          <span className="font-medium">You're offline.</span>
          <span className="text-gray-300">Withdrawals are saved locally and will sync when you reconnect.</span>
        </div>
      )}

      {isOnline && hasQueuedVaultWrites && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-800">
          {vaultSyncLoading ? '⏳ Syncing offline withdrawals…' : '✓ Syncing offline withdrawals…'}
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-sm font-medium text-amber-800">
            {expiringSoon.length} item{expiringSoon.length !== 1 ? 's' : ''} expiring soon or already expired
          </p>
        </div>
      )}

      {pageError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          {pageError}
          <button onClick={() => setPageError('')} className="font-bold text-lg leading-none ml-3">×</button>
        </div>
      )}

      {(user?.isGuest || (!loading && !inGroup)) && (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-medium text-gray-500">You need to be in a family group to use the Meal Vault</p>
        </div>
      )}

      {inGroup && loading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {inGroup && !loading && entries.length === 0 && (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">🫙</p>
          <p className="font-medium text-gray-500">The vault is empty</p>
          {isHoH
            ? <p className="text-sm mt-1">Click "Add Entry" to log a prepped meal.</p>
            : <p className="text-sm mt-1">The Head of Household can add meals to the vault.</p>
          }
        </div>
      )}

      {inGroup && !loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map(entry => (
            <div
              key={entry.id}
              className={`bg-white border rounded-2xl p-4 shadow-sm transition-opacity ${
                entry.status === 'expired'        ? 'border-red-200 bg-red-50' :
                entry.status === 'expiring_soon'  ? 'border-amber-200 bg-amber-50' :
                entry.status === 'used_up'        ? 'border-gray-100 opacity-60' :
                'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800">{entry.meal.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[entry.status]}`}>
                      {STATUS_LABELS[entry.status]}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {STORAGE_LABELS[entry.storage_method] || entry.storage_method}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-2 flex-wrap text-sm">
                    <span className="text-gray-600">
                      <span className="font-semibold">{entry.servings_remaining}</span>
                      <span className="text-gray-400">/{entry.servings_total}</span> servings
                    </span>
                    <span className="text-gray-500">Added: {entry.date_added}</span>
                    <span className={`font-medium ${
                      entry.status === 'expired'       ? 'text-red-600' :
                      entry.status === 'expiring_soon' ? 'text-amber-600' :
                      'text-gray-500'
                    }`}>
                      Expires: {entry.expiration_date} ({daysUntil(entry.expiration_date)})
                    </span>
                    <span className="text-gray-400 text-xs self-center">
                      by {entry.added_by.first_name || entry.added_by.username}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {entry.status !== 'used_up' && entry.status !== 'expired' && (
                    withdrawTarget?.id === entry.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={entry.servings_remaining}
                          value={withdrawCount}
                          onChange={e => setWithdrawCount(Math.min(Math.max(1, Number(e.target.value)), entry.servings_remaining))}
                          className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                        <button
                          onClick={() => handleWithdraw(entry.id)}
                          className="text-xs px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setWithdrawTarget(null)}
                          className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setWithdrawTarget({ id: entry.id, servings_remaining: entry.servings_remaining })
                          setWithdrawCount(1)
                        }}
                        className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg border border-blue-200 transition-colors"
                      >
                        Withdraw
                      </button>
                    )
                  )}
                  {isHoH && (
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-xs px-3 py-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg border border-gray-200 hover:border-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Entry Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Add Vault Entry</h2>
              <button
                onClick={() => { setShowAdd(false); resetAddForm() }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Meal</label>
              {selectedMeal ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-green-700">{selectedMeal.name}</span>
                  <button
                    onClick={() => { setSelectedMeal(null); setExpirationDate('') }}
                    className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search meals…"
                    value={mealSearch}
                    onChange={e => setMealSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <div className="mt-1 max-h-44 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-md">
                    {mealsLoading ? (
                      <p className="px-3 py-2 text-sm text-gray-400">Loading meals…</p>
                    ) : mealsError ? (
                      <p className="px-3 py-2 text-sm text-red-500">Failed to load meals — please close and try again</p>
                    ) : filteredMeals.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-400">No meals found</p>
                    ) : (
                      filteredMeals.slice(0, 8).map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setSelectedMeal(m); setMealSearch('') }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 hover:text-green-700 transition-colors"
                        >
                          {m.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Storage Method</label>
              <select
                value={storageMethod}
                onChange={e => setStorageMethod(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="refrigerated">❄️ Refrigerated</option>
                <option value="frozen">🧊 Frozen</option>
                <option value="pantry">🫙 Pantry</option>
                <option value="freeze_dried">🌵 Freeze-Dried</option>
                <option value="other">📦 Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Servings Prepped</label>
              <input
                type="number"
                min={1}
                max={100}
                value={servingsTotal}
                onChange={e => setServingsTotal(Math.max(1, Number(e.target.value)))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Added</label>
              <input
                type="date"
                value={dateAdded}
                onChange={e => setDateAdded(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date
                {loadingSuggest && <span className="ml-2 text-xs text-gray-400">Calculating…</span>}
                {!loadingSuggest && expirationDate && selectedMeal && (
                  <span className="ml-2 text-xs text-green-600">Auto-suggested — you can adjust</span>
                )}
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              {!selectedMeal && (
                <p className="text-xs text-gray-400 mt-1">Select a meal first to get a suggested date.</p>
              )}
            </div>

            {formError && <p className="text-sm text-red-600 mb-4">{formError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowAdd(false); resetAddForm() }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEntry}
                disabled={!selectedMeal || !expirationDate}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
