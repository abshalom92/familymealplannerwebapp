from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user, get_group_user_ids

router = APIRouter()


def _get_approved_membership(db: Session, user: models.User):
    return db.query(models.FamilyGroupMember).filter(
        models.FamilyGroupMember.user_id == user.id,
        models.FamilyGroupMember.status == 'approved',
    ).first()


@router.post("", response_model=schemas.MealRequestOut)
def create_request(
    body: schemas.MealRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = _get_approved_membership(db, current_user)
    if not membership:
        raise HTTPException(status_code=400, detail="You must be in an approved family group to request meals")
    if membership.is_head:
        raise HTTPException(status_code=400, detail="HoH can add meals directly to the plan")

    # Upsert: if pending request already exists for same slot, update the meal
    existing = db.query(models.MealRequest).filter(
        models.MealRequest.group_id == membership.group_id,
        models.MealRequest.requester_id == current_user.id,
        models.MealRequest.week_start == body.week_start,
        models.MealRequest.day_of_week == body.day_of_week,
        models.MealRequest.meal_slot == body.meal_slot,
        models.MealRequest.status == 'pending',
    ).first()
    if existing:
        existing.meal_id = body.meal_id
        db.commit()
        db.refresh(existing)
        return existing

    req = models.MealRequest(
        group_id=membership.group_id,
        requester_id=current_user.id,
        week_start=body.week_start,
        day_of_week=body.day_of_week,
        meal_slot=body.meal_slot,
        meal_id=body.meal_id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/pending", response_model=List[schemas.MealRequestOut])
def get_pending_requests(
    week_start: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = _get_approved_membership(db, current_user)
    if not membership or not membership.is_head:
        raise HTTPException(status_code=403, detail="Only HoH can view pending requests")

    q = db.query(models.MealRequest).filter(
        models.MealRequest.group_id == membership.group_id,
        models.MealRequest.status == 'pending',
    )
    if week_start:
        q = q.filter(models.MealRequest.week_start == week_start)
    return q.order_by(models.MealRequest.created_at.asc()).all()


@router.get("", response_model=List[schemas.MealRequestOut])
def get_my_requests(
    week_start: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.MealRequest).filter(
        models.MealRequest.requester_id == current_user.id,
    )
    if week_start:
        q = q.filter(models.MealRequest.week_start == week_start)
    return q.order_by(models.MealRequest.created_at.desc()).all()


@router.post("/{req_id}/accept", status_code=204)
def accept_request(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = _get_approved_membership(db, current_user)
    if not membership or not membership.is_head:
        raise HTTPException(status_code=403, detail="Only HoH can accept requests")

    req = db.query(models.MealRequest).filter(
        models.MealRequest.id == req_id,
        models.MealRequest.group_id == membership.group_id,
        models.MealRequest.status == 'pending',
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Pending request not found")

    # Upsert meal plan
    user_ids = get_group_user_ids(db, current_user)
    existing_plan = db.query(models.MealPlan).filter(
        models.MealPlan.user_id.in_(user_ids),
        models.MealPlan.week_start == req.week_start,
        models.MealPlan.day_of_week == req.day_of_week,
        models.MealPlan.meal_slot == req.meal_slot,
    ).first()

    if existing_plan:
        existing_plan.meal_id = req.meal_id
        existing_plan.user_id = current_user.id
    else:
        db.add(models.MealPlan(
            user_id=current_user.id,
            week_start=req.week_start,
            day_of_week=req.day_of_week,
            meal_slot=req.meal_slot,
            meal_id=req.meal_id,
        ))

    req.status = 'accepted'
    req.resolved_at = datetime.utcnow()

    hoh_name = current_user.first_name or current_user.username
    db.add(models.Notification(
        user_id=req.requester_id,
        type='request_accepted',
        title='Meal request approved',
        body=f'{hoh_name} added "{req.meal.name}" to the family plan.',
        data={"meal_id": req.meal_id, "week_start": str(req.week_start), "day_of_week": req.day_of_week, "meal_slot": req.meal_slot},
    ))
    db.commit()


@router.post("/{req_id}/deny", status_code=204)
def deny_request(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = _get_approved_membership(db, current_user)
    if not membership or not membership.is_head:
        raise HTTPException(status_code=403, detail="Only HoH can deny requests")

    req = db.query(models.MealRequest).filter(
        models.MealRequest.id == req_id,
        models.MealRequest.group_id == membership.group_id,
        models.MealRequest.status == 'pending',
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Pending request not found")

    req.status = 'denied'
    req.resolved_at = datetime.utcnow()

    hoh_name = current_user.first_name or current_user.username
    db.add(models.Notification(
        user_id=req.requester_id,
        type='request_denied',
        title='Meal request declined',
        body=f'{hoh_name} declined your request for "{req.meal.name}".',
        data={"meal_id": req.meal_id, "week_start": str(req.week_start)},
    ))
    db.commit()


@router.delete("/{req_id}", status_code=204)
def cancel_request(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = db.query(models.MealRequest).filter(
        models.MealRequest.id == req_id,
        models.MealRequest.requester_id == current_user.id,
        models.MealRequest.status == 'pending',
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Pending request not found")
    db.delete(req)
    db.commit()
