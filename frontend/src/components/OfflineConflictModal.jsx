const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SLOT_LABELS = { breakfast: '☀️ Breakfast', lunch: '🌤 Lunch', dinner: '🌙 Dinner' }

// conflicts: [{ write: { day, slot, mealName }, serverEntry: { meal: { name } } }]
export default function OfflineConflictModal({ conflicts, onResolve, onClose }) {
  const handleAll = (keepLocal) => onResolve(conflicts.map((c) => ({ ...c, keepLocal })))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Sync Conflicts</h2>
          <p className="text-sm text-gray-500 mt-1">
            The family plan changed while you were offline. Choose which version to keep for each slot.
          </p>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {conflicts.map((c, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">
                {DAY_LABELS[c.write.day]} · {SLOT_LABELS[c.write.slot] || c.write.slot}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onResolve([{ ...c, keepLocal: true }])}
                  className="text-left px-3 py-2 rounded-lg border-2 border-green-400 bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <p className="text-[10px] font-bold text-green-700 mb-0.5">MY VERSION</p>
                  <p className="text-xs font-semibold text-gray-800">{c.write.mealName}</p>
                </button>
                <button
                  onClick={() => onResolve([{ ...c, keepLocal: false }])}
                  className="text-left px-3 py-2 rounded-lg border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <p className="text-[10px] font-bold text-blue-700 mb-0.5">FAMILY PLAN</p>
                  <p className="text-xs font-semibold text-gray-800">{c.serverEntry.meal?.name}</p>
                </button>
              </div>
            </div>
          ))}
        </div>

        {conflicts.length > 1 && (
          <div className="p-4 border-t border-gray-100 flex gap-2">
            <button
              onClick={() => handleAll(true)}
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Keep all mine
            </button>
            <button
              onClick={() => handleAll(false)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Keep all family plan
            </button>
          </div>
        )}

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-lg transition-colors"
          >
            Resolve later
          </button>
        </div>
      </div>
    </div>
  )
}
