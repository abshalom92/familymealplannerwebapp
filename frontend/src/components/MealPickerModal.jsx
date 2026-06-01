import { useEffect, useState, useMemo } from 'react'
import api from '../api/client'

const SLOT_LABELS = { breakfast: '☀️ Breakfast', lunch: '🌤 Lunch', dinner: '🌙 Dinner' }
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function mealContainsAllergen(meal, allergenSet) {
  if (allergenSet.size === 0) return false
  return meal.ingredients?.some((ing) =>
    [...allergenSet].some(
      (a) => ing.name.toLowerCase().includes(a) || (ing.category && ing.category.toLowerCase().includes(a))
    )
  )
}

export default function MealPickerModal({ slot, weekStart, onClose, onSelect, requestMode = false }) {
  const [meals, setMeals] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [familyMembers, setFamilyMembers] = useState([])
  const [mealsError, setMealsError] = useState(false)

  useEffect(() => {
    api.get('/family/').then((r) => setFamilyMembers(r.data)).catch(() => {})
    api.get('/meals/').then((r) => setMeals(r.data)).catch(() => setMealsError(true))
  }, [])

  // Build allergen set from ALL family members (9b)
  const allergenSet = useMemo(() => {
    const s = new Set()
    for (const m of familyMembers) {
      for (const a of (m.allergies || [])) s.add(a.toLowerCase())
      for (const a of (m.foods_to_avoid || [])) s.add(a.toLowerCase())
    }
    return s
  }, [familyMembers])

  const filtered = meals.filter((m) => {
    const matchType = filter === 'all' || m.meal_type === filter || m.meal_type === 'any'
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">{requestMode ? 'Request a Meal' : 'Pick a Meal'}</h2>
              <p className="text-sm text-gray-500">
                {DAY_LABELS[slot.day]} · {SLOT_LABELS[slot.meal]}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
          </div>

          {allergenSet.size > 0 && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 mb-3">
              <span className="font-bold">(!)</span> Meals highlighted in red contain allergens: {[...allergenSet].join(', ')}
            </p>
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
          {mealsError ? (
            <div className="text-center py-10 px-4">
              <p className="text-3xl mb-3">📵</p>
              <p className="font-semibold text-gray-600 mb-1">Meal list unavailable offline</p>
              <p className="text-xs text-gray-400">Open the meal picker while connected at least once to cache the meal list for offline use.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No meals found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((meal) => {
                const hasAllergen = mealContainsAllergen(meal, allergenSet)
                return (
                  <button
                    key={meal.id}
                    onClick={() => onSelect(meal)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors group ${
                      hasAllergen
                        ? 'border-red-200 bg-red-50 hover:bg-red-100'
                        : 'border-gray-100 hover:bg-green-50 hover:border-green-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-medium ${hasAllergen ? 'text-red-700' : 'text-gray-800 group-hover:text-green-700'}`}>
                          {hasAllergen && <span className="font-bold mr-1">(!)</span>}
                          {meal.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{meal.description}</p>
                      </div>
                      <span className="text-xs text-gray-400 ml-2 shrink-0">
                        {meal.prep_time + meal.cook_time} min
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
