from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..auth_utils import hash_password, verify_password, create_access_token, create_refresh_token, verify_refresh_token
from ..limiter import limiter
import os
import uuid

router = APIRouter()

_REFRESH_COOKIE = "refresh_token"
_REFRESH_PATH = "/api/auth/refresh"
_REFRESH_MAX_AGE = 30 * 24 * 3600
_SECURE = os.getenv("ENVIRONMENT") == "production"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=_SECURE,
        max_age=_REFRESH_MAX_AGE,
        path=_REFRESH_PATH,
        samesite="lax",
    )


@router.post("/register", response_model=schemas.Token)
@limiter.limit("3/minute")
async def register(request: Request, response: Response, user_data: schemas.UserCreate, db: Session = Depends(get_db)):
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
    _set_refresh_cookie(response, create_refresh_token({"sub": str(user.id)}))
    return {"access_token": token, "token_type": "bearer", "username": user.username, "is_guest": False}


@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if not user or not user.password_hash or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    token = create_access_token({"sub": str(user.id)})
    _set_refresh_cookie(response, create_refresh_token({"sub": str(user.id)}))
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


@router.post("/refresh", response_model=schemas.Token)
async def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(_REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    user_id = verify_refresh_token(token)
    user = db.query(models.User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    new_access = create_access_token({"sub": str(user.id)})
    _set_refresh_cookie(response, create_refresh_token({"sub": str(user.id)}))
    return {"access_token": new_access, "token_type": "bearer", "username": user.username, "is_guest": user.is_guest}


@router.post("/logout", status_code=204)
async def logout(response: Response):
    response.delete_cookie(_REFRESH_COOKIE, path=_REFRESH_PATH)
