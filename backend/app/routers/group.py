import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..auth_utils import get_current_user

router = APIRouter()


def _generate_code():
    return secrets.token_hex(4).upper()


def _member_dict(m):
    prefs = []
    for fm in (m.user.family_members or []):
        prefs.extend(fm.food_preferences or [])
    return {
        "user_id": m.user_id,
        "username": m.user.username,
        "first_name": m.user.first_name,
        "last_name": m.user.last_name,
        "is_head": m.is_head,
        "status": m.status,
        "food_preferences": list(dict.fromkeys(prefs)),
    }


def _group_response(group):
    approved = [m for m in group.members if m.status == 'approved']
    return {
        "id": group.id,
        "name": group.name,
        "join_code": group.join_code,
        "owner_id": group.owner_id,
        "members": [_member_dict(m) for m in approved],
    }


def _require_hoh(current_user: models.User):
    membership = current_user.family_group_membership
    if not membership or membership.status != 'approved':
        raise HTTPException(status_code=403, detail="Not in an approved family group")
    if not membership.is_head:
        raise HTTPException(status_code=403, detail="Only a Head of Household can do this")
    return membership


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

    membership = models.FamilyGroupMember(
        group_id=group.id, user_id=current_user.id, is_head=True, status='approved'
    )
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

    membership = models.FamilyGroupMember(
        group_id=group.id, user_id=current_user.id, is_head=False, status='pending'
    )
    db.add(membership)
    db.commit()
    db.refresh(group)
    return _group_response(group)


@router.get('/pending', response_model=list[schemas.FamilyGroupMemberOut])
def get_pending_requests(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _require_hoh(current_user)
    pending = db.query(models.FamilyGroupMember).filter_by(
        group_id=membership.group_id, status='pending'
    ).all()
    return [_member_dict(m) for m in pending]


@router.post('/approve/{user_id}', response_model=schemas.FamilyGroupOut)
def approve_member(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _require_hoh(current_user)
    pending = db.query(models.FamilyGroupMember).filter_by(
        group_id=membership.group_id, user_id=user_id, status='pending'
    ).first()
    if not pending:
        raise HTTPException(status_code=404, detail="Pending request not found")
    pending.status = 'approved'
    db.commit()
    db.refresh(membership.group)
    return _group_response(membership.group)


@router.delete('/deny/{user_id}', status_code=204)
def deny_member(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _require_hoh(current_user)
    pending = db.query(models.FamilyGroupMember).filter_by(
        group_id=membership.group_id, user_id=user_id, status='pending'
    ).first()
    if not pending:
        raise HTTPException(status_code=404, detail="Pending request not found")
    db.delete(pending)
    db.commit()


@router.post('/promote/{user_id}', response_model=schemas.FamilyGroupOut)
def promote_member(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _require_hoh(current_user)
    target = db.query(models.FamilyGroupMember).filter_by(
        group_id=membership.group_id, user_id=user_id, status='approved'
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    target.is_head = True
    db.commit()
    db.refresh(membership.group)
    return _group_response(membership.group)


@router.post('/demote', response_model=schemas.FamilyGroupOut)
def demote_self(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _require_hoh(current_user)
    other_heads = db.query(models.FamilyGroupMember).filter(
        models.FamilyGroupMember.group_id == membership.group_id,
        models.FamilyGroupMember.is_head == True,
        models.FamilyGroupMember.user_id != current_user.id,
        models.FamilyGroupMember.status == 'approved',
    ).count()
    if other_heads == 0:
        raise HTTPException(
            status_code=400,
            detail="You are the only Head of Household. Promote another member first."
        )
    membership.is_head = False
    db.commit()
    db.refresh(membership.group)
    return _group_response(membership.group)


@router.delete('/leave', status_code=204)
def leave_group(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = current_user.family_group_membership
    if not membership:
        raise HTTPException(status_code=404, detail="Not in a family group")

    if membership.is_head and membership.status == 'approved':
        other_heads = db.query(models.FamilyGroupMember).filter(
            models.FamilyGroupMember.group_id == membership.group_id,
            models.FamilyGroupMember.is_head == True,
            models.FamilyGroupMember.user_id != current_user.id,
            models.FamilyGroupMember.status == 'approved',
        ).count()
        if other_heads == 0:
            remaining = db.query(models.FamilyGroupMember).filter(
                models.FamilyGroupMember.group_id == membership.group_id,
                models.FamilyGroupMember.user_id != current_user.id,
            ).count()
            if remaining > 0:
                raise HTTPException(
                    status_code=400,
                    detail="Promote another Head of Household before leaving."
                )

    group = membership.group
    db.delete(membership)
    db.flush()

    remaining = db.query(models.FamilyGroupMember).filter_by(group_id=group.id).count()
    if remaining == 0:
        db.delete(group)

    db.commit()


@router.post('/regenerate-code', response_model=schemas.FamilyGroupOut)
def regenerate_code(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _require_hoh(current_user)
    group = membership.group

    code = _generate_code()
    while db.query(models.FamilyGroup).filter_by(join_code=code).first():
        code = _generate_code()
    group.join_code = code
    db.commit()
    db.refresh(group)
    return _group_response(group)
