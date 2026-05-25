from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..auth_utils import hash_password, verify_password, create_access_token
from ..limiter import limiter
import uuid

router = APIRouter()


@router.post("/register", response_model=schemas.Token)
@limiter.limit("3/minute")
async def register(request: Request, user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    invite = db.query(models.InviteCode).filter_by(code=user_data.invite_code, used=False).first()
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or already-used invite code")
    if db.query(models.User).filter(models.User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = models.User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        is_guest=False,
    )
    db.add(user)
    db.flush()
    invite.used = True
    invite.used_by_id = user.id
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "username": user.username, "is_guest": False}


@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
async def login(request: Request, user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if not user or not user.password_hash or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "username": user.username, "is_guest": False}


@router.post("/guest", response_model=schemas.Token)
@limiter.limit("10/minute")
async def guest_login(request: Request, db: Session = Depends(get_db)):
    cutoff = datetime.utcnow() - timedelta(hours=1)
    old_guests = db.query(models.User).filter(
        models.User.is_guest == True,
        models.User.created_at < cutoff,
    ).all()
    for g in old_guests:
        db.delete(g)
    db.flush()

    guest_username = f"guest_{uuid.uuid4().hex[:8]}"
    user = models.User(username=guest_username, is_guest=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)}, expires_delta=timedelta(hours=1))
    return {"access_token": token, "token_type": "bearer", "username": user.username, "is_guest": True}
