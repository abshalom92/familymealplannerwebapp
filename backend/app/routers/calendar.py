from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
import random
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user

router = APIRouter()


@router.get("/week", response_model=List[schemas.MealPlanOut])
def get_week(
    week_start: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.MealPlan)
        .filter(models.MealPlan.user_id == current_user.id, models.MealPlan.week_start == week_start)
        .all()
    )


@router.post("/", response_model=schemas.MealPlanOut)
def add_meal_to_calendar(
    plan: schemas.MealPlanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = (
        db.query(models.MealPlan)
        .filter(
            models.MealPlan.user_id == current_user.id,
            models.MealPlan.week_start == plan.week_start,
            models.MealPlan.day_of_week == plan.day_of_week,
            models.MealPlan.meal_slot == plan.meal_slot,
        )
        .first()
    )
    if existing:
        existing.meal_id = plan.meal_id
        db.commit()
        db.refresh(existing)
        return existing

    meal_plan = models.MealPlan(
        user_id=current_user.id,
        week_start=plan.week_start,
        day_of_week=plan.day_of_week,
        meal_slot=plan.meal_slot,
        meal_id=plan.meal_id,
    )
    db.add(meal_plan)
    db.commit()
    db.refresh(meal_plan)
    return meal_plan


@router.post("/autofill", response_model=List[schemas.MealPlanOut])
def autofill_week(
    req: schemas.AutofillRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Load all meals grouped by type (including 'any' as wildcards)
    all_meals = db.query(models.Meal).all()
    meal_pool = {
        slot: [m for m in all_meals if m.meal_type == slot or m.meal_type == "any"]
        for slot in req.slots
    }

    created = []
    for day in range(7):
        for slot in req.slots:
            pool = meal_pool.get(slot, [])
            if not pool:
                continue

            existing = (
                db.query(models.MealPlan)
                .filter(
                    models.MealPlan.user_id == current_user.id,
                    models.MealPlan.week_start == req.week_start,
                    models.MealPlan.day_of_week == day,
                    models.MealPlan.meal_slot == slot,
                )
                .first()
            )

            if existing and not req.overwrite:
                continue

            chosen = random.choice(pool)

            if existing:
                existing.meal_id = chosen.id
                db.flush()
                created.append(existing)
            else:
                plan = models.MealPlan(
                    user_id=current_user.id,
                    week_start=req.week_start,
                    day_of_week=day,
                    meal_slot=slot,
                    meal_id=chosen.id,
                )
                db.add(plan)
                db.flush()
                created.append(plan)

    db.commit()
    for p in created:
        db.refresh(p)
    return created


@router.delete("/week", status_code=204)
def clear_week(
    week_start: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db.query(models.MealPlan).filter(
        models.MealPlan.user_id == current_user.id,
        models.MealPlan.week_start == week_start,
    ).delete()
    db.commit()


@router.delete("/{plan_id}", status_code=204)
def remove_meal_from_calendar(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plan = db.query(models.MealPlan).filter(
        models.MealPlan.id == plan_id,
        models.MealPlan.user_id == current_user.id,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
