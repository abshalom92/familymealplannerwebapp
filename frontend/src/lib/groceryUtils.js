import { ingredientMatchesAllergen } from './allergenAliases'

const ADULT = 1.0
const CHILD = 0.75
const TODDLER = 0.5

export function computeGroceryList(mealPlan, household, familyMembers) {
  const numAdults = household?.num_adults ?? 2
  const numChildren = household?.num_children ?? 0
  const numToddlers = household?.num_toddlers ?? 0
  const totalPortions = (numAdults * ADULT + numChildren * CHILD + numToddlers * TODDLER) || 2

  const allergens = new Set()
  for (const m of (familyMembers || [])) {
    for (const a of (m.allergies || [])) allergens.add(a.toLowerCase())
    for (const a of (m.foods_to_avoid || [])) allergens.add(a.toLowerCase())
  }

  const aggregated = {}
  for (const plan of mealPlan) {
    const meal = plan.meal
    if (!meal?.ingredients?.length) continue
    const scale = totalPortions / (meal.servings || 1)
    const subs = plan.substitutions || {}
    for (const ing of meal.ingredients) {
      const sub = subs[ing.name]
      const actualName = sub ? sub.name : ing.name
      const actualCategory = sub ? sub.category : ing.category
      const key = `${actualName.toLowerCase()}|${ing.unit}`
      if (!aggregated[key]) {
        aggregated[key] = { name: actualName, total_quantity: 0, unit: ing.unit, category: actualCategory }
      }
      aggregated[key].total_quantity += ing.quantity * scale
    }
  }

  const items = Object.values(aggregated).map((v) => ({
    name: v.name,
    total_quantity: Math.round(v.total_quantity * 100) / 100,
    unit: v.unit,
    category: v.category,
    allergen_warning: allergens.size > 0 && [...allergens].some((a) => ingredientMatchesAllergen(v.name, a)),
  }))

  items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  return items
}
