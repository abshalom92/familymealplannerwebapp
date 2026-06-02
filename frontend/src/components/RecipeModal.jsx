import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const CATEGORY_COLORS = {
  produce: 'bg-green-100 text-green-700',
  dairy: 'bg-blue-100 text-blue-700',
  meat: 'bg-red-100 text-red-700',
  grains: 'bg-yellow-100 text-yellow-700',
  pantry: 'bg-gray-100 text-gray-700',
}

export default function RecipeModal({ mealId, initialMeal = null, onClose }) {
  const [meal, setMeal] = useState(null)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!mealId) return
    // Reset state for the new meal
    setMeal(null)
    setError(false)
    if (initialMeal) return  // use initialMeal directly via displayMeal below
    api.get(`/meals/${mealId}`)
      .then((r) => setMeal(r.data))
      .catch(() => setError(true))
  }, [mealId, initialMeal])

  if (!mealId) return null

  // Use initialMeal prop directly so content shows immediately without waiting
  // for the useEffect cycle — avoids spinner flash and offline hang
  const displayMeal = meal ?? initialMeal
  const totalTime = displayMeal ? displayMeal.prep_time + displayMeal.cook_time : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {!displayMeal ? (
          <div className="flex flex-col items-center justify-center h-48 gap-4 p-6">
            {error ? (
              <>
                <p className="text-gray-500 text-sm text-center">Meal details unavailable offline.</p>
                <button onClick={onClose} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Close
                </button>
              </>
            ) : (
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-2xl text-white">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    {displayMeal.meal_type}
                  </span>
                  <h2 className="text-2xl font-bold mt-2">{displayMeal.name}</h2>
                  <p className="text-green-100 mt-1 text-sm">{displayMeal.description}</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white text-2xl leading-none ml-4"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                <span>⏱ Prep {displayMeal.prep_time} min</span>
                <span>🍳 Cook {displayMeal.cook_time} min</span>
                <span>⏰ Total {totalTime} min</span>
                <span>🍽 Serves {displayMeal.servings}</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Ingredients */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 text-lg">Ingredients</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(displayMeal.ingredients || []).map((ing) => (
                    <div key={ing.id} className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-lg">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[ing.category] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {ing.category}
                      </span>
                      <span className="text-gray-700 text-sm">
                        <strong>{ing.quantity} {ing.unit}</strong> {ing.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 text-lg">Instructions</h3>
                <div className="space-y-2">
                  {(displayMeal.instructions || '').split('\n').filter(Boolean).map((step, i) => (
                    <div key={i} className="flex gap-3 text-sm text-gray-700">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-semibold text-xs">
                        {i + 1}
                      </span>
                      <p className="leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { onClose(); navigate(`/recipe/${displayMeal.id}`) }}
                className="flex-1 py-2 border-2 border-green-500 text-green-600 hover:bg-green-50 rounded-lg font-medium transition-colors text-sm"
              >
                Open Full Page
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
