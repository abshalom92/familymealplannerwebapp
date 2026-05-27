from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user

router = APIRouter()


@router.post("/", response_model=schemas.WeightEntryOut, status_code=201)
def log_weight(
    body: schemas.WeightEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = models.WeightEntry(
        user_id=current_user.id,
        weight_lbs=body.weight_lbs,
        logged_at=body.logged_at or datetime.utcnow(),
    )
    db.add(entry)
    current_user.weight_lbs = body.weight_lbs
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/", response_model=List[schemas.WeightEntryOut])
def get_weight_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.WeightEntry)
        .filter(models.WeightEntry.user_id == current_user.id)
        .order_by(models.WeightEntry.logged_at.asc())
        .all()
    )


@router.put("/{entry_id}", response_model=schemas.WeightEntryOut)
def update_weight_entry(
    entry_id: int,
    body: schemas.WeightEntryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = db.query(models.WeightEntry).filter(
        models.WeightEntry.id == entry_id,
        models.WeightEntry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if body.weight_lbs is not None:
        entry.weight_lbs = body.weight_lbs
    if body.logged_at is not None:
        entry.logged_at = body.logged_at
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_weight_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = db.query(models.WeightEntry).filter(
        models.WeightEntry.id == entry_id,
        models.WeightEntry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
