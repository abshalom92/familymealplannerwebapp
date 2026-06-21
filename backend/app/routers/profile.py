from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import ProfileOut, ProfileUpdate, PasswordChange
from ..auth_utils import get_current_user, hash_password, verify_password

router = APIRouter()


@router.get('', response_model=ProfileOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put('', response_model=ProfileOut)
def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_data = data.model_dump(exclude_none=True)
    if 'email' in update_data:
        email = update_data.pop('email')
        conflict = db.query(User).filter(User.email == email, User.id != current_user.id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email address already in use")
        current_user.email = email
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post('/change-password', status_code=204)
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.is_guest:
        raise HTTPException(status_code=403, detail="Guests cannot change passwords")
    if not current_user.password_hash:
        raise HTTPException(status_code=400, detail="No password set on this account")
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
