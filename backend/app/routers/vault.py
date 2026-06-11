from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user
from ..shelf_life import suggest_expiration, NOTIFY_DAYS_BEFORE

router = APIRouter()


def _get_approved_membership(db: Session, user: models.User):
    return db.query(models.FamilyGroupMember).filter(
        models.FamilyGroupMember.user_id == user.id,
        models.FamilyGroupMember.status == 'approved',
    ).first()


def _check_expiry_notifications(db: Session, entries: list, group_id: int):
    today = date.today()
    changed = False
    for entry in entries:
        if entry.expiry_notified or entry.servings_remaining <= 0:
            continue
        threshold = NOTIFY_DAYS_BEFORE.get(entry.storage_method, 2)
        if entry.expiration_date <= today + timedelta(days=threshold):
            members = db.query(models.FamilyGroupMember).filter(
                models.FamilyGroupMember.group_id == group_id,
                models.FamilyGroupMember.status == 'approved',
            ).all()
            days_left = (entry.expiration_date - today).days
            if days_left < 0:
                time_desc = "has expired"
            elif days_left == 0:
                time_desc = "expires today"
            elif days_left == 1:
                time_desc = "expires tomorrow"
            else:
                time_desc = f"expires in {days_left} day(s)"
            for m in members:
                db.add(models.Notification(
                    user_id=m.user_id,
                    type='vault_expiring',
                    title=f'Vault item expiring: {entry.meal.name}',
                    body=f'{entry.meal.name} ({entry.storage_method}) {time_desc}. {entry.servings_remaining} serving(s) left.',
                    data={"vault_entry_id": entry.id, "meal_id": entry.meal_id},
                ))
            entry.expiry_notified = True
            changed = True
    if changed:
        db.commit()


@router.get("", response_model=List[schemas.VaultEntryOut])
def list_vault(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = _get_approved_membership(db, current_user)
    if not membership:
        raise HTTPException(status_code=400, detail="You must be in a family group to view the vault")
    entries = (
        db.query(models.VaultEntry)
        .filter(models.VaultEntry.family_group_id == membership.group_id)
        .order_by(models.VaultEntry.expiration_date.asc())
        .all()
    )
    _check_expiry_notifications(db, entries, membership.group_id)
    return entries


@router.get("/expiring", response_model=List[schemas.VaultEntryOut])
def list_expiring(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = _get_approved_membership(db, current_user)
    if not membership:
        return []
    today = date.today()
    entries = (
        db.query(models.VaultEntry)
        .filter(
            models.VaultEntry.family_group_id == membership.group_id,
            models.VaultEntry.servings_remaining > 0,
        )
        .all()
    )
    result = []
    for e in entries:
        threshold = NOTIFY_DAYS_BEFORE.get(e.storage_method, 2)
        if e.expiration_date <= today + timedelta(days=threshold):
            result.append(e)
    return result


@router.get("/suggest-expiration")
def suggest_exp(
    meal_id: int = Query(..., gt=0),
    storage_method: str = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if storage_method not in NOTIFY_DAYS_BEFORE:
        raise HTTPException(status_code=400, detail="Invalid storage method")
    meal = db.query(models.Meal).filter(models.Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    exp_date = suggest_expiration(meal.ingredients, storage_method)
    return {"expiration_date": exp_date.isoformat()}


@router.post("", response_model=schemas.VaultEntryOut)
def create_vault_entry(
    body: schemas.VaultEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = _get_approved_membership(db, current_user)
    if not membership:
        raise HTTPException(status_code=400, detail="You must be in a family group to add vault entries")
    if not membership.is_head:
        raise HTTPException(status_code=403, detail="Only HoH can add vault entries")
    meal = db.query(models.Meal).filter(models.Meal.id == body.meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    entry = models.VaultEntry(
        family_group_id=membership.group_id,
        meal_id=body.meal_id,
        added_by_user_id=current_user.id,
        storage_method=body.storage_method,
        servings_total=body.servings_total,
        servings_remaining=body.servings_total,
        date_added=body.date_added,
        expiration_date=body.expiration_date,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/{entry_id}/withdraw", response_model=schemas.VaultEntryOut)
def withdraw(
    entry_id: int,
    body: schemas.VaultWithdrawRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = _get_approved_membership(db, current_user)
    if not membership:
        raise HTTPException(status_code=403, detail="You must be in a family group")
    entry = db.query(models.VaultEntry).filter(
        models.VaultEntry.id == entry_id,
        models.VaultEntry.family_group_id == membership.group_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Vault entry not found")
    if entry.servings_remaining <= 0:
        raise HTTPException(status_code=400, detail="No servings remaining")
    if body.servings > entry.servings_remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Only {entry.servings_remaining} serving(s) remaining",
        )
    entry.servings_remaining -= body.servings
    if entry.servings_remaining == 0:
        actor_name = current_user.first_name or current_user.username
        other_members = db.query(models.FamilyGroupMember).filter(
            models.FamilyGroupMember.group_id == membership.group_id,
            models.FamilyGroupMember.status == 'approved',
            models.FamilyGroupMember.user_id != current_user.id,
        ).all()
        for m in other_members:
            db.add(models.Notification(
                user_id=m.user_id,
                type='vault_empty',
                title=f'Vault item used up: {entry.meal.name}',
                body=f'{actor_name} used the last serving of {entry.meal.name}.',
                data={"vault_entry_id": entry.id, "meal_id": entry.meal_id},
            ))
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_vault_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = _get_approved_membership(db, current_user)
    if not membership or not membership.is_head:
        raise HTTPException(status_code=403, detail="Only HoH can delete vault entries")
    entry = db.query(models.VaultEntry).filter(
        models.VaultEntry.id == entry_id,
        models.VaultEntry.family_group_id == membership.group_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Vault entry not found")
    db.delete(entry)
    db.commit()
