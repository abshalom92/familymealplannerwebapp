from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.FamilyMemberOut])
def list_family_members(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.FamilyMember).filter(
        models.FamilyMember.user_id == current_user.id
    ).all()


@router.post("/", response_model=schemas.FamilyMemberOut, status_code=201)
def create_family_member(
    body: schemas.FamilyMemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    member = models.FamilyMember(
        user_id=current_user.id,
        name=body.name,
        allergies=body.allergies,
        foods_to_avoid=body.foods_to_avoid,
        food_preferences=body.food_preferences,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.put("/{member_id}", response_model=schemas.FamilyMemberOut)
def update_family_member(
    member_id: int,
    body: schemas.FamilyMemberUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    member = db.query(models.FamilyMember).filter(
        models.FamilyMember.id == member_id,
        models.FamilyMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")
    if body.name is not None:
        member.name = body.name
    if body.allergies is not None:
        member.allergies = body.allergies
    if body.foods_to_avoid is not None:
        member.foods_to_avoid = body.foods_to_avoid
    if body.food_preferences is not None:
        member.food_preferences = body.food_preferences
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}", status_code=204)
def delete_family_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    member = db.query(models.FamilyMember).filter(
        models.FamilyMember.id == member_id,
        models.FamilyMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")
    db.delete(member)
    db.commit()
