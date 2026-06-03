ALLERGEN_ALIASES: dict[str, list[str]] = {
    "shellfish": [
        "shrimp", "prawn", "lobster", "crab", "crayfish", "crawfish",
        "scallop", "clam", "oyster", "mussel", "squid", "octopus", "calamari",
    ],
    "fish": [
        "salmon", "tuna", "cod", "tilapia", "halibut", "bass", "trout",
        "sardine", "mackerel", "herring", "anchovy", "catfish", "snapper",
        "mahi", "swordfish", "flounder", "pollock", "haddock", "perch",
    ],
    "dairy": [
        "milk", "butter", "cream", "cheese", "yogurt", "yoghurt", "whey",
        "casein", "ghee", "custard", "cheddar", "mozzarella", "parmesan",
        "ricotta", "brie", "gouda", "kefir", "lactose",
    ],
    "milk": [
        "milk", "butter", "cream", "cheese", "yogurt", "yoghurt", "whey",
        "casein", "ghee", "custard", "cheddar", "mozzarella", "parmesan",
        "ricotta", "brie", "gouda", "kefir", "lactose",
    ],
    "gluten": [
        "wheat", "bread", "flour", "pasta", "noodle", "couscous", "barley",
        "rye", "oat", "cracker", "breadcrumb", "crouton", "semolina",
        "bulgur", "spelt", "tortilla", "pita", "bagel",
    ],
    "wheat": [
        "wheat", "bread", "flour", "pasta", "noodle", "couscous", "barley",
        "rye", "cracker", "breadcrumb", "crouton", "semolina", "bulgur", "spelt",
    ],
    "peanut": ["peanut", "groundnut"],
    "tree nut": [
        "almond", "cashew", "walnut", "pecan", "pistachio", "macadamia",
        "hazelnut", "chestnut", "pine nut",
    ],
    "nut": [
        "almond", "cashew", "walnut", "pecan", "pistachio", "macadamia",
        "hazelnut", "chestnut", "pine nut", "peanut", "groundnut",
    ],
    "soy": ["soy", "tofu", "tempeh", "miso", "edamame", "soya"],
    "soya": ["soy", "tofu", "tempeh", "miso", "edamame", "soya"],
    "sesame": ["sesame", "tahini"],
    "egg": ["egg"],
}


def expand_allergen(keyword: str) -> list[str]:
    kw = keyword.lower().strip()
    result = [kw]
    for alias in ALLERGEN_ALIASES.get(kw, []):
        if alias != kw:
            result.append(alias)
    return result


def ingredient_matches_allergen(ingredient_name: str, allergen: str) -> bool:
    name = ingredient_name.lower()
    return any(kw in name for kw in expand_allergen(allergen))
