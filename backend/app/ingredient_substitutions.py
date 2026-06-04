# Maps allergen keyword → [(ingredient_pattern, substitute_name, substitute_category), ...]
# Patterns are checked as substrings of the ingredient name (case-insensitive).
# More specific patterns must come before shorter ones that would also match.
SUBSTITUTION_MAP: dict[str, list[tuple[str, str, str]]] = {
    "dairy": [
        ("cream cheese",    "dairy-free cream cheese",  "pantry"),
        ("sour cream",      "coconut cream",            "pantry"),
        ("milk",            "oat milk",                 "pantry"),
        ("butter",          "vegan butter",             "pantry"),
        ("heavy cream",     "coconut cream",            "pantry"),
        ("whipping cream",  "coconut cream",            "pantry"),
        ("cream",           "coconut cream",            "pantry"),
        ("cheddar",         "dairy-free cheddar",       "pantry"),
        ("mozzarella",      "dairy-free mozzarella",    "pantry"),
        ("parmesan",        "nutritional yeast",        "pantry"),
        ("cheese",          "dairy-free cheese",        "pantry"),
        ("yogurt",          "coconut yogurt",           "pantry"),
        ("yoghurt",         "coconut yogurt",           "pantry"),
        ("whey",            "plant protein powder",     "pantry"),
        ("ghee",            "coconut oil",              "pantry"),
        ("custard",         "coconut custard",          "pantry"),
        ("kefir",           "coconut kefir",            "pantry"),
    ],
    "milk": [
        ("cream cheese",    "dairy-free cream cheese",  "pantry"),
        ("milk",            "oat milk",                 "pantry"),
        ("butter",          "vegan butter",             "pantry"),
        ("cream",           "coconut cream",            "pantry"),
        ("cheese",          "dairy-free cheese",        "pantry"),
        ("yogurt",          "coconut yogurt",           "pantry"),
        ("yoghurt",         "coconut yogurt",           "pantry"),
        ("whey",            "plant protein powder",     "pantry"),
        ("ghee",            "coconut oil",              "pantry"),
    ],
    "egg": [
        ("egg",             "flax egg",                 "pantry"),
    ],
    "gluten": [
        ("breadcrumb",      "gluten-free breadcrumbs",  "pantry"),
        ("flour",           "gluten-free flour",        "pantry"),
        ("bread",           "gluten-free bread",        "grains"),
        ("pasta",           "rice pasta",               "grains"),
        ("noodle",          "rice noodles",             "grains"),
        ("oat",             "gluten-free oats",         "grains"),
        ("tortilla",        "corn tortilla",            "grains"),
        ("pita",            "gluten-free wrap",         "grains"),
        ("bagel",           "gluten-free bagel",        "grains"),
        ("cracker",         "rice cracker",             "grains"),
        ("couscous",        "quinoa",                   "grains"),
        ("barley",          "buckwheat",                "grains"),
        ("bulgur",          "quinoa",                   "grains"),
        ("spelt",           "gluten-free flour",        "pantry"),
        ("semolina",        "cornmeal",                 "grains"),
        ("rye",             "buckwheat flour",          "pantry"),
    ],
    "wheat": [
        ("breadcrumb",      "gluten-free breadcrumbs",  "pantry"),
        ("flour",           "gluten-free flour",        "pantry"),
        ("bread",           "gluten-free bread",        "grains"),
        ("pasta",           "rice pasta",               "grains"),
        ("noodle",          "rice noodles",             "grains"),
        ("tortilla",        "corn tortilla",            "grains"),
        ("cracker",         "rice cracker",             "grains"),
        ("couscous",        "quinoa",                   "grains"),
        ("barley",          "buckwheat",                "grains"),
        ("pita",            "gluten-free wrap",         "grains"),
    ],
    "peanut": [
        ("peanut butter",   "sunflower seed butter",    "pantry"),
        ("peanut",          "sunflower seed butter",    "pantry"),
        ("groundnut",       "sunflower seed butter",    "pantry"),
    ],
    "tree nut": [
        ("pine nut",        "pumpkin seeds",            "pantry"),
        ("almond milk",     "oat milk",                 "pantry"),
        ("almond butter",   "sunflower seed butter",    "pantry"),
        ("almond",          "sunflower seeds",          "pantry"),
        ("cashew",          "sunflower seeds",          "pantry"),
        ("walnut",          "pumpkin seeds",            "pantry"),
        ("pecan",           "sunflower seeds",          "pantry"),
        ("pistachio",       "pumpkin seeds",            "pantry"),
        ("macadamia",       "sunflower seeds",          "pantry"),
        ("hazelnut",        "sunflower seeds",          "pantry"),
        ("chestnut",        "sunflower seeds",          "pantry"),
    ],
    "nut": [
        ("pine nut",        "pumpkin seeds",            "pantry"),
        ("peanut butter",   "sunflower seed butter",    "pantry"),
        ("almond milk",     "oat milk",                 "pantry"),
        ("almond butter",   "sunflower seed butter",    "pantry"),
        ("almond",          "sunflower seeds",          "pantry"),
        ("cashew",          "sunflower seeds",          "pantry"),
        ("walnut",          "pumpkin seeds",            "pantry"),
        ("pecan",           "sunflower seeds",          "pantry"),
        ("peanut",          "sunflower seed butter",    "pantry"),
        ("pistachio",       "pumpkin seeds",            "pantry"),
    ],
    "soy": [
        ("soy sauce",       "coconut aminos",           "pantry"),
        ("soya sauce",      "coconut aminos",           "pantry"),
        ("soy milk",        "oat milk",                 "pantry"),
        ("tofu",            "chicken breast",           "meat"),
        ("tempeh",          "chicken breast",           "meat"),
        ("miso",            "vegetable broth",          "pantry"),
        ("edamame",         "green peas",               "produce"),
        ("soy",             "coconut aminos",           "pantry"),
        ("soya",            "coconut aminos",           "pantry"),
    ],
    "soya": [
        ("soy sauce",       "coconut aminos",           "pantry"),
        ("soy milk",        "oat milk",                 "pantry"),
        ("tofu",            "chicken breast",           "meat"),
        ("tempeh",          "chicken breast",           "meat"),
        ("miso",            "vegetable broth",          "pantry"),
        ("edamame",         "green peas",               "produce"),
        ("soy",             "coconut aminos",           "pantry"),
        ("soya",            "coconut aminos",           "pantry"),
    ],
    "shellfish": [
        ("shrimp",          "chicken breast",           "meat"),
        ("prawn",           "chicken breast",           "meat"),
        ("lobster",         "chicken breast",           "meat"),
        ("crab",            "chicken breast",           "meat"),
        ("scallop",         "chicken thigh",            "meat"),
        ("clam",            "chicken thigh",            "meat"),
        ("mussel",          "chicken thigh",            "meat"),
        ("squid",           "chicken breast",           "meat"),
        ("octopus",         "chicken breast",           "meat"),
        ("calamari",        "chicken strips",           "meat"),
        ("crawfish",        "chicken breast",           "meat"),
        ("crayfish",        "chicken breast",           "meat"),
        ("oyster",          "chicken thigh",            "meat"),
    ],
    "fish": [
        ("salmon",          "chicken breast",           "meat"),
        ("tuna",            "chicken breast",           "meat"),
        ("cod",             "chicken breast",           "meat"),
        ("tilapia",         "chicken breast",           "meat"),
        ("halibut",         "chicken breast",           "meat"),
        ("bass",            "chicken breast",           "meat"),
        ("trout",           "chicken breast",           "meat"),
        ("sardine",         "chicken breast",           "meat"),
        ("mackerel",        "chicken breast",           "meat"),
        ("anchovy",         "capers",                   "pantry"),
        ("catfish",         "chicken breast",           "meat"),
        ("snapper",         "chicken breast",           "meat"),
        ("mahi",            "chicken breast",           "meat"),
        ("haddock",         "chicken breast",           "meat"),
        ("pollock",         "chicken breast",           "meat"),
        ("flounder",        "chicken breast",           "meat"),
        ("swordfish",       "chicken breast",           "meat"),
        ("herring",         "chicken breast",           "meat"),
        ("perch",           "chicken breast",           "meat"),
    ],
    "sesame": [
        ("sesame oil",      "olive oil",                "pantry"),
        ("tahini",          "sunflower seed butter",    "pantry"),
        ("sesame",          "sunflower seeds",          "pantry"),
    ],
}


def find_substitute(ingredient_name: str, allergen: str) -> tuple[str, str] | None:
    """Return (substitute_name, substitute_category) for the first matching pattern, or None."""
    name = ingredient_name.lower()
    for pattern, sub_name, sub_category in SUBSTITUTION_MAP.get(allergen.lower(), []):
        if pattern in name:
            return sub_name, sub_category
    return None


def get_substitutions(meal, blocked_allergens: set) -> dict | None:
    """
    Attempt to substitute every allergen-triggering ingredient in the meal.
    Returns {original_ingredient_name: {"name": sub, "category": cat}} if all
    problem ingredients have a substitute, or None if any cannot be substituted.
    An empty dict means the meal is clean (no substitution needed — shouldn't reach here).
    """
    from .allergen_aliases import ingredient_matches_allergen

    subs: dict[str, dict] = {}
    for ing in meal.ingredients:
        for allergen in blocked_allergens:
            if ingredient_matches_allergen(ing.name, allergen):
                if ing.name in subs:
                    break  # already substituted via a different allergen match
                result = find_substitute(ing.name, allergen)
                if result is None:
                    return None  # No substitute — exclude meal entirely
                subs[ing.name] = {"name": result[0], "category": result[1]}
                break
    return subs
