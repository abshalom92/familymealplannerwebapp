import { useState, useEffect, useRef } from 'react'
import api from '../api/client'

const MAX = 40

export default function DayGuestsPopover({ dateStr, onClose }) {
  const [adults, setAdults] = useState(0)
  const [children, setChildren] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    api.get(`/household/guests/${dateStr}`).then((r) => {
      setAdults(r.data.adult_guests)
      setChildren(r.data.child_guests)
    })
  }, [dateStr])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const total = adults + children
  const overLimit = total > MAX

  const handleSave = async () => {
    if (overLimit) { setError(`Max ${MAX} guests.`); return }
    setSaving(true)
    try {
      await api.put(`/household/guests/${dateStr}`, { adult_guests: adults, child_guests: children })
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 800)
    } catch (e) {
      setError(e.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={ref}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-52"
    >
      <p className="text-xs font-semibold text-gray-600 mb-3">Guests for this day</p>

      <div className="space-y-2 mb-3">
        <div>
          <label className="text-xs text-gray-500">Adult guests</label>
          <input
            type="number" min="0" max={MAX} value={adults}
            onChange={(e) => { setAdults(Math.max(0, parseInt(e.target.value) || 0)); setError('') }}
            className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Child guests</label>
          <input
            type="number" min="0" max={MAX} value={children}
            onChange={(e) => { setChildren(Math.max(0, parseInt(e.target.value) || 0)); setError('') }}
            className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {overLimit && <p className="text-xs text-red-500 mb-2">Max {MAX} guests total.</p>}
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      {total > 0 && !overLimit && (
        <p className="text-xs text-gray-400 mb-2">{total} guest{total !== 1 ? 's' : ''} added</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || overLimit}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
        >
          {saved ? 'Saved!' : saving ? '…' : 'Save'}
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium py-1.5 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
