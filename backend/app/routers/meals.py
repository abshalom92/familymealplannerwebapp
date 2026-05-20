from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.MealOut])
def list_meals(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Meal).all()


@router.get("/{meal_id}", response_model=schemas.MealOut)
def get_meal(meal_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    meal = db.query(models.Meal).filter(models.Meal.id == meal_id).first()
    if not meal:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Meal not found")
    return meal
