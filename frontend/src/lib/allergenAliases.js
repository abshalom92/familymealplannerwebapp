const ALLERGEN_ALIASES = {
  shellfish: ['shrimp', 'prawn', 'lobster', 'crab', 'crayfish', 'crawfish', 'scallop', 'clam', 'oyster', 'mussel', 'squid', 'octopus', 'calamari'],
  fish: ['salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'bass', 'trout', 'sardine', 'mackerel', 'herring', 'anchovy', 'catfish', 'snapper', 'mahi', 'swordfish', 'flounder', 'pollock', 'haddock', 'perch'],
  dairy: ['milk', 'butter', 'cream', 'cheese', 'yogurt', 'yoghurt', 'whey', 'casein', 'ghee', 'custard', 'cheddar', 'mozzarella', 'parmesan', 'ricotta', 'brie', 'gouda', 'kefir', 'lactose'],
  milk: ['milk', 'butter', 'cream', 'cheese', 'yogurt', 'yoghurt', 'whey', 'casein', 'ghee', 'custard', 'cheddar', 'mozzarella', 'parmesan', 'ricotta', 'brie', 'gouda', 'kefir', 'lactose'],
  gluten: ['wheat', 'bread', 'flour', 'pasta', 'noodle', 'couscous', 'barley', 'rye', 'oat', 'cracker', 'breadcrumb', 'crouton', 'semolina', 'bulgur', 'spelt', 'tortilla', 'pita', 'bagel'],
  wheat: ['wheat', 'bread', 'flour', 'pasta', 'noodle', 'couscous', 'barley', 'rye', 'cracker', 'breadcrumb', 'crouton', 'semolina', 'bulgur', 'spelt'],
  peanut: ['peanut', 'groundnut'],
  'tree nut': ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'macadamia', 'hazelnut', 'chestnut', 'pine nut'],
  nut: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'macadamia', 'hazelnut', 'chestnut', 'pine nut', 'peanut', 'groundnut'],
  soy: ['soy', 'tofu', 'tempeh', 'miso', 'edamame', 'soya'],
  soya: ['soy', 'tofu', 'tempeh', 'miso', 'edamame', 'soya'],
  sesame: ['sesame', 'tahini'],
  egg: ['egg'],
}

export function expandAllergen(keyword) {
  const kw = keyword.toLowerCase().trim()
  const result = [kw]
  for (const alias of (ALLERGEN_ALIASES[kw] || [])) {
    if (alias !== kw) result.push(alias)
  }
  return result
}

export function ingredientMatchesAllergen(ingredientName, allergen) {
  const name = ingredientName.toLowerCase()
  return expandAllergen(allergen).some((kw) => name.includes(kw))
}
