from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime
import random
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user, get_group_user_ids

router = APIRouter()


@router.get("/week", response_model=List[schemas.MealPlanOut])
def get_week(
    week_start: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_ids = get_group_user_ids(db, current_user)
    return (
        db.query(models.MealPlan)
        .filter(models.MealPlan.user_id.in_(user_ids), models.MealPlan.week_start == week_start)
        .all()
    )


@router.post("/", response_model=schemas.MealPlanOut)
def add_meal_to_calendar(
    plan: schemas.MealPlanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_ids = get_group_user_ids(db, current_user)
    existing = (
        db.query(models.MealPlan)
        .filter(
            models.MealPlan.user_id.in_(user_ids),
            models.MealPlan.week_start == plan.week_start,
            models.MealPlan.day_of_week == plan.day_of_week,
            models.MealPlan.meal_slot == plan.meal_slot,
        )
        .first()
    )
    if existing:
        existing.meal_id = plan.meal_id
        existing.user_id = current_user.id
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
    # Load all meals, then filter out any blocked by the user's family allergens (9a)
    all_meals = db.query(models.Meal).all()
    family_members = db.query(models.FamilyMember).filter(
        models.FamilyMember.user_id == current_user.id
    ).all()
    blocked = set()
    for fm in family_members:
        blocked.update(kw.lower() for kw in (fm.allergies or []))
        blocked.update(kw.lower() for kw in (fm.foods_to_avoid or []))
    if blocked:
        safe = []
        for meal in all_meals:
            tokens = {ing.name.lower() for ing in meal.ingredients}
            tokens |= {ing.category.lower() for ing in meal.ingredients if ing.category}
            if not any(any(b in t for t in tokens) for b in blocked):
                safe.append(meal)
        all_meals = safe

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

            autofill_user_ids = get_group_user_ids(db, current_user)
            existing = (
                db.query(models.MealPlan)
                .filter(
                    models.MealPlan.user_id.in_(autofill_user_ids),
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


_DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


@router.post("/notify-family", status_code=204)
def notify_family(
    req: schemas.FamilyNotifyRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = db.query(models.FamilyGroupMember).filter(
        models.FamilyGroupMember.user_id == current_user.id,
        models.FamilyGroupMember.status == 'approved',
    ).first()
    if not membership or not membership.is_head:
        raise HTTPException(status_code=403, detail="Only HoH can notify the family")

    other_members = db.query(models.FamilyGroupMember).filter(
        models.FamilyGroupMember.group_id == membership.group_id,
        models.FamilyGroupMember.user_id != current_user.id,
        models.FamilyGroupMember.status == 'approved',
    ).all()

    sender = current_user.first_name or current_user.username
    if req.scope == 'week':
        body = f"{sender} updated the family meal plan for the week of {req.week_start}."
    else:
        day_name = _DAYS_OF_WEEK[req.day_of_week] if req.day_of_week is not None else 'today'
        body = f"{sender} updated the {day_name} meal plan."

    for m in other_members:
        db.add(models.Notification(
            user_id=m.user_id,
            type='plan_updated',
            title='Meal plan updated',
            body=body,
            data={"week_start": str(req.week_start), "scope": req.scope},
        ))
    db.commit()


@router.delete("/week", status_code=204)
def clear_week(
    week_start: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_ids = get_group_user_ids(db, current_user)
    db.query(models.MealPlan).filter(
        models.MealPlan.user_id.in_(user_ids),
        models.MealPlan.week_start == week_start,
    ).delete(synchronize_session=False)
    db.commit()


@router.delete("/{plan_id}", status_code=204)
def remove_meal_from_calendar(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_ids = get_group_user_ids(db, current_user)
    plan = db.query(models.MealPlan).filter(
        models.MealPlan.id == plan_id,
        models.MealPlan.user_id.in_(user_ids),
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
