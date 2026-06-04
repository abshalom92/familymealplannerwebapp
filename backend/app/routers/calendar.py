from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime
import random
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user, get_group_user_ids
from ..allergen_aliases import ingredient_matches_allergen
from ..ingredient_substitutions import get_substitutions

router = APIRouter()


def _require_flag(db: Session, current_user: models.User) -> None:
    """For HoH in multi-HoH groups, enforce the planning flag. Auto-claims for single-HoH."""
    membership = current_user.family_group_membership
    if not membership or membership.status != 'approved' or not membership.is_head:
        return

    group = db.query(models.FamilyGroup).filter_by(id=membership.group_id).first()
    if not group:
        return

    hoh_count = db.query(models.FamilyGroupMember).filter(
        models.FamilyGroupMember.group_id == membership.group_id,
        models.FamilyGroupMember.is_head == True,
        models.FamilyGroupMember.status == 'approved',
    ).count()

    if hoh_count <= 1:
        if group.planner_id != current_user.id:
            group.planner_id = current_user.id
            group.planner_claimed_at = datetime.utcnow()
            db.commit()
        return

    if group.planner_id != current_user.id:
        raise HTTPException(status_code=403, detail="PLANNING_FLAG_REQUIRED")


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
    _require_flag(db, current_user)
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
        existing.substitutions = {}  # manual pick clears auto-fill substitutions
        db.commit()
        db.refresh(existing)
        return existing

    meal_plan = models.MealPlan(
        user_id=current_user.id,
        week_start=plan.week_start,
        day_of_week=plan.day_of_week,
        meal_slot=plan.meal_slot,
        meal_id=plan.meal_id,
        substitutions={},
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
    _require_flag(db, current_user)
    all_meals = db.query(models.Meal).all()
    family_members = db.query(models.FamilyMember).filter(
        models.FamilyMember.user_id == current_user.id
    ).all()
    blocked = set()
    for fm in family_members:
        blocked.update(kw.lower() for kw in (fm.allergies or []))
        blocked.update(kw.lower() for kw in (fm.foods_to_avoid or []))

    # Build (meal, substitutions) pairs: prefer clean meals; fall back to substitutable ones.
    if blocked:
        combined: list[tuple] = []
        for meal in all_meals:
            has_allergen = any(
                ingredient_matches_allergen(ing.name, b)
                for ing in meal.ingredients
                for b in blocked
            )
            if not has_allergen:
                combined.append((meal, {}))
            else:
                subs = get_substitutions(meal, blocked)
                if subs is not None:
                    combined.append((meal, subs))
    else:
        combined = [(m, {}) for m in all_meals]

    meal_pool = {
        slot: [(m, s) for m, s in combined if m.meal_type == slot or m.meal_type == "any"]
        for slot in req.slots
    }

    autofill_user_ids = get_group_user_ids(db, current_user)
    created = []
    for day in range(7):
        for slot in req.slots:
            pool = meal_pool.get(slot, [])
            if not pool:
                continue

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

            chosen_meal, chosen_subs = random.choice(pool)

            if existing:
                existing.meal_id = chosen_meal.id
                existing.substitutions = chosen_subs
                db.flush()
                created.append(existing)
            else:
                plan = models.MealPlan(
                    user_id=current_user.id,
                    week_start=req.week_start,
                    day_of_week=day,
                    meal_slot=slot,
                    meal_id=chosen_meal.id,
                    substitutions=chosen_subs,
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
    _require_flag(db, current_user)
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
    _require_flag(db, current_user)
    user_ids = get_group_user_ids(db, current_user)
    plan = db.query(models.MealPlan).filter(
        models.MealPlan.id == plan_id,
        models.MealPlan.user_id.in_(user_ids),
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
