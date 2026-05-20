from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from collections import defaultdict
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user

router = APIRouter()


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

    aggregated: dict[str, dict] = defaultdict(lambda: {"total_quantity": 0.0, "unit": "", "category": ""})
    for plan in plans:
        for ing in plan.meal.ingredients:
            key = f"{ing.name.lower()}|{ing.unit}"
            aggregated[key]["total_quantity"] += ing.quantity
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
