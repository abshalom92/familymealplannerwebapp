import { useState } from 'react'

const SLOTS = [
  { id: 'breakfast', label: 'Breakfast', icon: '☀️' },
  { id: 'lunch', label: 'Lunch', icon: '🌤' },
  { id: 'dinner', label: 'Dinner', icon: '🌙' },
]

export default function AutoFillModal({ onClose, onConfirm, loading }) {
  const [selected, setSelected] = useState({ breakfast: true, lunch: true, dinner: true })
  const [overwrite, setOverwrite] = useState(false)

  const toggle = (id) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  const anySelected = Object.values(selected).some(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">✨ Auto-Fill Week</h2>
              <p className="text-sm text-gray-500 mt-0.5">Randomly assign meals to empty slots</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
          </div>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fill these meals</p>
          <div className="space-y-2 mb-5">
            {SLOTS.map(({ id, label, icon }) => (
              <label
                key={id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  selected[id]
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected[id]}
                  onChange={() => toggle(id)}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="text-lg">{icon}</span>
                <span className="font-medium text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          <label className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <div>
              <p className="font-medium text-orange-700 text-sm">Replace existing meals</p>
              <p className="text-xs text-orange-500">By default, only empty slots are filled</p>
            </div>
          </label>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!anySelected || loading}
              onClick={() => onConfirm(Object.keys(selected).filter((k) => selected[k]), overwrite)}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : '✨'}
              {loading ? 'Filling…' : 'Auto-Fill'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
