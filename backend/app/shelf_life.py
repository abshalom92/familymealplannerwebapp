from datetime import date, timedelta

# (ingredient_category, storage_method) -> shelf life in days
_SHELF_LIFE: dict[tuple[str, str], int] = {
    ("meat",    "refrigerated"): 3,
    ("meat",    "frozen"):       120,
    ("meat",    "pantry"):       1,
    ("meat",    "freeze_dried"): 1095,
    ("meat",    "other"):        3,
    ("dairy",   "refrigerated"): 7,
    ("dairy",   "frozen"):       30,
    ("dairy",   "pantry"):       180,
    ("dairy",   "freeze_dried"): 730,
    ("dairy",   "other"):        5,
    ("produce", "refrigerated"): 5,
    ("produce", "frozen"):       180,
    ("produce", "pantry"):       7,
    ("produce", "freeze_dried"): 1095,
    ("produce", "other"):        3,
    ("grains",  "refrigerated"): 5,
    ("grains",  "frozen"):       60,
    ("grains",  "pantry"):       365,
    ("grains",  "freeze_dried"): 1095,
    ("grains",  "other"):        5,
    ("pantry",  "refrigerated"): 14,
    ("pantry",  "frozen"):       90,
    ("pantry",  "pantry"):       365,
    ("pantry",  "freeze_dried"): 730,
    ("pantry",  "other"):        90,
}

_DEFAULTS: dict[str, int] = {
    "refrigerated": 5,
    "frozen":        90,
    "pantry":       180,
    "freeze_dried": 730,
    "other":          7,
}

# Days before expiration to send inbox notification
NOTIFY_DAYS_BEFORE: dict[str, int] = {
    "frozen":        14,
    "refrigerated":   1,
    "pantry":         2,
    "freeze_dried":   2,
    "other":          2,
}


def suggest_expiration(ingredients, storage_method: str, from_date: date | None = None) -> date:
    """Return suggested expiration date driven by the most perishable ingredient."""
    if from_date is None:
        from_date = date.today()
    min_days = _DEFAULTS.get(storage_method, 7)
    for ing in ingredients:
        cat = (ing.category or "").lower()
        days = _SHELF_LIFE.get((cat, storage_method), _DEFAULTS.get(storage_method, 7))
        if days < min_days:
            min_days = days
    return from_date + timedelta(days=min_days)
