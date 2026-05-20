import { useEffect, useState } from 'react'
import api from '../api/client'

const SLOT_LABELS = { breakfast: '☀️ Breakfast', lunch: '🌤 Lunch', dinner: '🌙 Dinner' }
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function MealPickerModal({ slot, weekStart, onClose, onSelect }) {
  const [meals, setMeals] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [familyMembers, setFamilyMembers] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState('')

  useEffect(() => {
    api.get('/family/').then((r) => setFamilyMembers(r.data))
  }, [])

  useEffect(() => {
    const params = selectedMemberId ? { member_id: selectedMemberId } : {}
    api.get('/meals/', { params }).then((r) => setMeals(r.data))
  }, [selectedMemberId])

  const filtered = meals.filter((m) => {
    const matchType = filter === 'all' || m.meal_type === filter || m.meal_type === 'any'
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const selectedMember = familyMembers.find((m) => m.id === Number(selectedMemberId))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Pick a Meal</h2>
              <p className="text-sm text-gray-500">
                {DAY_LABELS[slot.day]} · {SLOT_LABELS[slot.meal]}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
          </div>

          {familyMembers.length > 0 && (
            <div className="mb-3">
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">Filter by family member…</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {selectedMember && (selectedMember.allergies?.length > 0 || selectedMember.foods_to_avoid?.length > 0) && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span>
                  Hiding meals with: {[...selectedMember.allergies, ...selectedMember.foods_to_avoid].join(', ')}
                </p>
              )}
            </div>
          )}

          <input
            type="text"
            placeholder="Search meals…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
          />
          <div className="flex gap-2">
            {['all', 'breakfast', 'lunch', 'dinner'].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                  filter === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-3">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No meals found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((meal) => (
                <button
                  key={meal.id}
                  onClick={() => onSelect(meal)}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 border border-gray-100 hover:border-green-200 transition-colors group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800 group-hover:text-green-700">{meal.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{meal.description}</p>
                    </div>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">
                      {meal.prep_time + meal.cook_time} min
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
