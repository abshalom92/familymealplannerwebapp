from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user

router = APIRouter()


@router.get("/settings", response_model=schemas.HouseholdSettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    s = db.query(models.HouseholdSettings).filter(
        models.HouseholdSettings.user_id == current_user.id
    ).first()
    if not s:
        return schemas.HouseholdSettingsOut(num_adults=2, num_children=0, num_toddlers=0)
    return s


@router.put("/settings", response_model=schemas.HouseholdSettingsOut)
def update_settings(
    body: schemas.HouseholdSettingsIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    s = db.query(models.HouseholdSettings).filter(
        models.HouseholdSettings.user_id == current_user.id
    ).first()
    if s:
        s.num_adults = body.num_adults
        s.num_children = body.num_children
        s.num_toddlers = body.num_toddlers
    else:
        s = models.HouseholdSettings(
            user_id=current_user.id,
            num_adults=body.num_adults,
            num_children=body.num_children,
            num_toddlers=body.num_toddlers,
        )
        db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/guests/{guest_date}", response_model=schemas.DayGuestsOut)
def get_day_guests(
    guest_date: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    g = db.query(models.DayGuests).filter(
        models.DayGuests.user_id == current_user.id,
        models.DayGuests.date == guest_date,
    ).first()
    if not g:
        return schemas.DayGuestsOut(date=guest_date, adult_guests=0, child_guests=0)
    return g


@router.put("/guests/{guest_date}", response_model=schemas.DayGuestsOut)
def set_day_guests(
    guest_date: date,
    body: schemas.DayGuestsIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    g = db.query(models.DayGuests).filter(
        models.DayGuests.user_id == current_user.id,
        models.DayGuests.date == guest_date,
    ).first()
    if g:
        g.adult_guests = body.adult_guests
        g.child_guests = body.child_guests
    else:
        g = models.DayGuests(
            user_id=current_user.id,
            date=guest_date,
            adult_guests=body.adult_guests,
            child_guests=body.child_guests,
        )
        db.add(g)
    db.commit()
    db.refresh(g)
    return g
