// Mirrors backend/app/ingredient_substitutions.py — keep in sync.
// More specific patterns must come before shorter ones that would also match.
const SUBSTITUTION_MAP = {
  dairy: [
    ["cream cheese",    "dairy-free cream cheese",  "pantry"],
    ["sour cream",      "coconut cream",            "pantry"],
    ["milk",            "oat milk",                 "pantry"],
    ["butter",          "vegan butter",             "pantry"],
    ["heavy cream",     "coconut cream",            "pantry"],
    ["whipping cream",  "coconut cream",            "pantry"],
    ["cream",           "coconut cream",            "pantry"],
    ["cheddar",         "dairy-free cheddar",       "pantry"],
    ["mozzarella",      "dairy-free mozzarella",    "pantry"],
    ["parmesan",        "nutritional yeast",        "pantry"],
    ["cheese",          "dairy-free cheese",        "pantry"],
    ["yogurt",          "coconut yogurt",           "pantry"],
    ["yoghurt",         "coconut yogurt",           "pantry"],
    ["whey",            "plant protein powder",     "pantry"],
    ["ghee",            "coconut oil",              "pantry"],
    ["custard",         "coconut custard",          "pantry"],
    ["kefir",           "coconut kefir",            "pantry"],
  ],
  milk: [
    ["cream cheese",    "dairy-free cream cheese",  "pantry"],
    ["milk",            "oat milk",                 "pantry"],
    ["butter",          "vegan butter",             "pantry"],
    ["cream",           "coconut cream",            "pantry"],
    ["cheese",          "dairy-free cheese",        "pantry"],
    ["yogurt",          "coconut yogurt",           "pantry"],
    ["yoghurt",         "coconut yogurt",           "pantry"],
    ["whey",            "plant protein powder",     "pantry"],
    ["ghee",            "coconut oil",              "pantry"],
  ],
  egg: [
    ["egg",             "flax egg",                 "pantry"],
  ],
  gluten: [
    ["breadcrumb",      "gluten-free breadcrumbs",  "pantry"],
    ["flour",           "gluten-free flour",        "pantry"],
    ["bread",           "gluten-free bread",        "grains"],
    ["pasta",           "rice pasta",               "grains"],
    ["noodle",          "rice noodles",             "grains"],
    ["oat",             "gluten-free oats",         "grains"],
    ["tortilla",        "corn tortilla",            "grains"],
    ["pita",            "gluten-free wrap",         "grains"],
    ["bagel",           "gluten-free bagel",        "grains"],
    ["cracker",         "rice cracker",             "grains"],
    ["couscous",        "quinoa",                   "grains"],
    ["barley",          "buckwheat",                "grains"],
    ["bulgur",          "quinoa",                   "grains"],
    ["spelt",           "gluten-free flour",        "pantry"],
    ["semolina",        "cornmeal",                 "grains"],
    ["rye",             "buckwheat flour",          "pantry"],
  ],
  wheat: [
    ["breadcrumb",      "gluten-free breadcrumbs",  "pantry"],
    ["flour",           "gluten-free flour",        "pantry"],
    ["bread",           "gluten-free bread",        "grains"],
    ["pasta",           "rice pasta",               "grains"],
    ["noodle",          "rice noodles",             "grains"],
    ["tortilla",        "corn tortilla",            "grains"],
    ["cracker",         "rice cracker",             "grains"],
    ["couscous",        "quinoa",                   "grains"],
    ["barley",          "buckwheat",                "grains"],
    ["pita",            "gluten-free wrap",         "grains"],
  ],
  peanut: [
    ["peanut butter",   "sunflower seed butter",    "pantry"],
    ["peanut",          "sunflower seed butter",    "pantry"],
    ["groundnut",       "sunflower seed butter",    "pantry"],
  ],
  "tree nut": [
    ["pine nut",        "pumpkin seeds",            "pantry"],
    ["almond milk",     "oat milk",                 "pantry"],
    ["almond butter",   "sunflower seed butter",    "pantry"],
    ["almond",          "sunflower seeds",          "pantry"],
    ["cashew",          "sunflower seeds",          "pantry"],
    ["walnut",          "pumpkin seeds",            "pantry"],
    ["pecan",           "sunflower seeds",          "pantry"],
    ["pistachio",       "pumpkin seeds",            "pantry"],
    ["macadamia",       "sunflower seeds",          "pantry"],
    ["hazelnut",        "sunflower seeds",          "pantry"],
    ["chestnut",        "sunflower seeds",          "pantry"],
  ],
  nut: [
    ["pine nut",        "pumpkin seeds",            "pantry"],
    ["peanut butter",   "sunflower seed butter",    "pantry"],
    ["almond milk",     "oat milk",                 "pantry"],
    ["almond butter",   "sunflower seed butter",    "pantry"],
    ["almond",          "sunflower seeds",          "pantry"],
    ["cashew",          "sunflower seeds",          "pantry"],
    ["walnut",          "pumpkin seeds",            "pantry"],
    ["pecan",           "sunflower seeds",          "pantry"],
    ["peanut",          "sunflower seed butter",    "pantry"],
    ["pistachio",       "pumpkin seeds",            "pantry"],
  ],
  soy: [
    ["soy sauce",       "coconut aminos",           "pantry"],
    ["soya sauce",      "coconut aminos",           "pantry"],
    ["soy milk",        "oat milk",                 "pantry"],
    ["tofu",            "chicken breast",           "meat"],
    ["tempeh",          "chicken breast",           "meat"],
    ["miso",            "vegetable broth",          "pantry"],
    ["edamame",         "green peas",               "produce"],
    ["soy",             "coconut aminos",           "pantry"],
    ["soya",            "coconut aminos",           "pantry"],
  ],
  soya: [
    ["soy sauce",       "coconut aminos",           "pantry"],
    ["soy milk",        "oat milk",                 "pantry"],
    ["tofu",            "chicken breast",           "meat"],
    ["tempeh",          "chicken breast",           "meat"],
    ["miso",            "vegetable broth",          "pantry"],
    ["edamame",         "green peas",               "produce"],
    ["soy",             "coconut aminos",           "pantry"],
    ["soya",            "coconut aminos",           "pantry"],
  ],
  shellfish: [
    ["shrimp",          "chicken breast",           "meat"],
    ["prawn",           "chicken breast",           "meat"],
    ["lobster",         "chicken breast",           "meat"],
    ["crab",            "chicken breast",           "meat"],
    ["scallop",         "chicken thigh",            "meat"],
    ["clam",            "chicken thigh",            "meat"],
    ["mussel",          "chicken thigh",            "meat"],
    ["squid",           "chicken breast",           "meat"],
    ["octopus",         "chicken breast",           "meat"],
    ["calamari",        "chicken strips",           "meat"],
    ["crawfish",        "chicken breast",           "meat"],
    ["crayfish",        "chicken breast",           "meat"],
    ["oyster",          "chicken thigh",            "meat"],
  ],
  fish: [
    ["salmon",          "chicken breast",           "meat"],
    ["tuna",            "chicken breast",           "meat"],
    ["cod",             "chicken breast",           "meat"],
    ["tilapia",         "chicken breast",           "meat"],
    ["halibut",         "chicken breast",           "meat"],
    ["bass",            "chicken breast",           "meat"],
    ["trout",           "chicken breast",           "meat"],
    ["sardine",         "chicken breast",           "meat"],
    ["mackerel",        "chicken breast",           "meat"],
    ["anchovy",         "capers",                   "pantry"],
    ["catfish",         "chicken breast",           "meat"],
    ["snapper",         "chicken breast",           "meat"],
    ["mahi",            "chicken breast",           "meat"],
    ["haddock",         "chicken breast",           "meat"],
    ["pollock",         "chicken breast",           "meat"],
    ["flounder",        "chicken breast",           "meat"],
    ["swordfish",       "chicken breast",           "meat"],
    ["herring",         "chicken breast",           "meat"],
    ["perch",           "chicken breast",           "meat"],
  ],
  sesame: [
    ["sesame oil",      "olive oil",                "pantry"],
    ["tahini",          "sunflower seed butter",    "pantry"],
    ["sesame",          "sunflower seeds",          "pantry"],
  ],
}

export function findSubstitute(ingredientName, allergen) {
  const name = ingredientName.toLowerCase()
  const patterns = SUBSTITUTION_MAP[allergen.toLowerCase()] || []
  for (const [pattern, subName, subCategory] of patterns) {
    if (name.includes(pattern)) {
      return { name: subName, category: subCategory }
    }
  }
  return null
}

/**
 * Apply a substitutions dict to an ingredient list.
 * Returns a new array; substituted ingredients have an `_original` field set.
 * @param {Array} ingredients
 * @param {Object} substitutions  { originalName: { name, category } }
 */
export function applySubstitutions(ingredients, substitutions) {
  if (!substitutions || Object.keys(substitutions).length === 0) return ingredients
  return ingredients.map((ing) => {
    const sub = substitutions[ing.name]
    if (sub) return { ...ing, name: sub.name, category: sub.category, _original: ing.name }
    return ing
  })
}
