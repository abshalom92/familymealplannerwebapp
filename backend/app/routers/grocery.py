from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from collections import defaultdict
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user

router = APIRouter()

ADULT_PORTION = 1.0
CHILD_PORTION = 0.75
TODDLER_PORTION = 0.5


@router.get("/week", response_model=List[schemas.GroceryItem])
def get_grocery_list(
    week_start: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plans = (
        db.query(models.MealPlan)
        .filter(models.MealPlan.user_id == current_user.id, models.MealPlan.week_start == week_start)
        .all()
    )

    # Load household settings (fallback: 2 adults)
    settings = db.query(models.HouseholdSettings).filter(
        models.HouseholdSettings.user_id == current_user.id
    ).first()
    num_adults = settings.num_adults if settings else 2
    num_children = settings.num_children if settings else 0
    num_toddlers = settings.num_toddlers if settings else 0

    # Load day-guest overrides for the week
    week_end = week_start + timedelta(days=6)
    all_day_guests = db.query(models.DayGuests).filter(
        models.DayGuests.user_id == current_user.id,
        models.DayGuests.date >= week_start,
        models.DayGuests.date <= week_end,
    ).all()
    guests_by_date = {g.date: g for g in all_day_guests}

    aggregated: dict[str, dict] = defaultdict(lambda: {"total_quantity": 0.0, "unit": "", "category": ""})

    for plan in plans:
        day_date = week_start + timedelta(days=plan.day_of_week)
        day_guests = guests_by_date.get(day_date)
        adult_guests = day_guests.adult_guests if day_guests else 0
        child_guests = day_guests.child_guests if day_guests else 0

        total_portions = (
            (num_adults + adult_guests) * ADULT_PORTION
            + (num_children + child_guests) * CHILD_PORTION
            + num_toddlers * TODDLER_PORTION
        )
        base_servings = plan.meal.servings or 1
        scale = total_portions / base_servings

        for ing in plan.meal.ingredients:
            key = f"{ing.name.lower()}|{ing.unit}"
            aggregated[key]["total_quantity"] += ing.quantity * scale
            aggregated[key]["unit"] = ing.unit
            aggregated[key]["category"] = ing.category
            aggregated[key]["name"] = ing.name

    items = [
        schemas.GroceryItem(
            name=v["name"],
            total_quantity=round(v["total_quantity"], 2),
            unit=v["unit"],
            category=v["category"],
        )
        for v in aggregated.values()
    ]
    items.sort(key=lambda x: (x.category, x.name))
    return items
