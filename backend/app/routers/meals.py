from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.MealOut])
def list_meals(
    member_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    meals = db.query(models.Meal).all()

    if member_id is None:
        return meals

    member = db.query(models.FamilyMember).filter(
        models.FamilyMember.id == member_id,
        models.FamilyMember.user_id == current_user.id,
    ).first()

    if not member:
        return meals

    blocked = {kw.lower() for kw in (member.allergies or []) + (member.foods_to_avoid or [])}
    if not blocked:
        return meals

    safe = []
    for meal in meals:
        # Check both ingredient names and categories (e.g. "dairy" matches category)
        ingredient_tokens = set()
        for ing in meal.ingredients:
            ingredient_tokens.add(ing.name.lower())
            if ing.category:
                ingredient_tokens.add(ing.category.lower())
        if not any(any(b in token for token in ingredient_tokens) for b in blocked):
            safe.append(meal)
    return safe


@router.get("/ingredients/search", response_model=List[str])
def search_ingredients(
    q: str = Query(""),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if len(q) < 2 or len(q) > 100:
        return []
    results = (
        db.query(models.MealIngredient.name)
        .filter(models.MealIngredient.name.ilike(f"%{q}%"))
        .distinct()
        .limit(10)
        .all()
    )
    return [r[0] for r in results]


@router.get("/{meal_id}", response_model=schemas.MealOut)
def get_meal(meal_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    meal = db.query(models.Meal).filter(models.Meal.id == meal_id).first()
    if not meal:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Meal not found")
    return meal
