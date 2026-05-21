import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user

router = APIRouter()


def _generate_code():
    return secrets.token_hex(4).upper()


def _group_response(group):
    return {
        "id": group.id,
        "name": group.name,
        "join_code": group.join_code,
        "owner_id": group.owner_id,
        "members": [
            {
                "user_id": m.user_id,
                "username": m.user.username,
                "first_name": m.user.first_name,
                "last_name": m.user.last_name,
            }
            for m in group.members
        ],
    }


@router.get('', response_model=schemas.FamilyGroupOut)
def get_group(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = current_user.family_group_membership
    if not membership:
        raise HTTPException(status_code=404, detail="Not in a family group")
    return _group_response(membership.group)


@router.post('/create', response_model=schemas.FamilyGroupOut)
def create_group(
    data: schemas.FamilyGroupCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.family_group_membership:
        raise HTTPException(status_code=400, detail="Already in a family group. Leave first.")

    code = _generate_code()
    while db.query(models.FamilyGroup).filter_by(join_code=code).first():
        code = _generate_code()

    group = models.FamilyGroup(name=data.name, join_code=code, owner_id=current_user.id)
    db.add(group)
    db.flush()

    membership = models.FamilyGroupMember(group_id=group.id, user_id=current_user.id)
    db.add(membership)
    db.commit()
    db.refresh(group)
    return _group_response(group)


@router.post('/join', response_model=schemas.FamilyGroupOut)
def join_group(
    data: schemas.FamilyGroupJoin,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.family_group_membership:
        raise HTTPException(status_code=400, detail="Already in a family group. Leave first.")

    group = db.query(models.FamilyGroup).filter_by(join_code=data.join_code.upper()).first()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid join code")

    membership = models.FamilyGroupMember(group_id=group.id, user_id=current_user.id)
    db.add(membership)
    db.commit()
    db.refresh(group)
    return _group_response(group)


@router.delete('/leave', status_code=204)
def leave_group(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = current_user.family_group_membership
    if not membership:
        raise HTTPException(status_code=404, detail="Not in a family group")

    group = membership.group
    db.delete(membership)
    db.flush()

    # If owner left and group is now empty, delete it
    remaining = db.query(models.FamilyGroupMember).filter_by(group_id=group.id).count()
    if remaining == 0:
        db.delete(group)

    db.commit()


@router.post('/regenerate-code', response_model=schemas.FamilyGroupOut)
def regenerate_code(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = current_user.family_group_membership
    if not membership:
        raise HTTPException(status_code=404, detail="Not in a family group")
    group = membership.group
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the group owner can regenerate the code")

    code = _generate_code()
    while db.query(models.FamilyGroup).filter_by(join_code=code).first():
        code = _generate_code()
    group.join_code = code
    db.commit()
    db.refresh(group)
    return _group_response(group)
