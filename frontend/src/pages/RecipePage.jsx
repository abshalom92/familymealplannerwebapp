import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

const CATEGORY_COLORS = {
  produce: 'bg-green-100 text-green-700',
  dairy: 'bg-blue-100 text-blue-700',
  meat: 'bg-red-100 text-red-700',
  grains: 'bg-yellow-100 text-yellow-700',
  pantry: 'bg-gray-100 text-gray-700',
}

export default function RecipePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meal, setMeal] = useState(null)

  useEffect(() => {
    api.get(`/meals/${id}`).then((r) => setMeal(r.data))
  }, [id])

  if (!meal) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalTime = meal.prep_time + meal.cook_time
  const grouped = meal.ingredients.reduce((acc, ing) => {
    if (!acc[ing.category]) acc[ing.category] = []
    acc[ing.category].push(ing)
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-gray-500 hover:text-green-600 mb-6 text-sm font-medium transition-colors"
      >
        ← Back
      </button>

      {/* Hero */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white mb-6">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full mb-3 capitalize">
          {meal.meal_type}
        </span>
        <h1 className="text-3xl font-bold mb-2">{meal.name}</h1>
        <p className="text-green-100">{meal.description}</p>
        <div className="flex gap-6 mt-5 text-sm">
          <div className="text-center">
            <p className="text-green-200 text-xs">Prep</p>
            <p className="font-bold text-lg">{meal.prep_time}<span className="text-xs font-normal">m</span></p>
          </div>
          <div className="text-center">
            <p className="text-green-200 text-xs">Cook</p>
            <p className="font-bold text-lg">{meal.cook_time}<span className="text-xs font-normal">m</span></p>
          </div>
          <div className="text-center">
            <p className="text-green-200 text-xs">Total</p>
            <p className="font-bold text-lg">{totalTime}<span className="text-xs font-normal">m</span></p>
          </div>
          <div className="text-center">
            <p className="text-green-200 text-xs">Serves</p>
            <p className="font-bold text-lg">{meal.servings}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Ingredients */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ingredients</h2>
          <div className="space-y-3">
            {Object.entries(grouped).map(([category, ings]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{category}</p>
                <ul className="space-y-1.5">
                  {ings.map((ing) => (
                    <li key={ing.id} className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[ing.category] || 'bg-gray-100 text-gray-600'}`}>
                        {ing.quantity} {ing.unit}
                      </span>
                      <span className="text-gray-700 text-sm">{ing.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Instructions</h2>
          <ol className="space-y-4">
            {meal.instructions.split('\n').filter(Boolean).map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </span>
                <p className="text-gray-700 text-sm leading-relaxed pt-0.5">
                  {step.replace(/^\d+\.\s*/, '')}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
