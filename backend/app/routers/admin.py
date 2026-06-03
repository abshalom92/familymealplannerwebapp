import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models

router = APIRouter()


def _require_admin(x_admin_secret: str = Header(...)):
    admin_secret = os.getenv("ADMIN_SECRET", "")
    if not admin_secret or not secrets.compare_digest(x_admin_secret, admin_secret):
        raise HTTPException(status_code=403, detail="Invalid admin secret")


@router.post("/invite")
def create_invite(db: Session = Depends(get_db), _: None = Depends(_require_admin)):
    code = secrets.token_urlsafe(8)
    while db.query(models.InviteCode).filter_by(code=code).first():
        code = secrets.token_urlsafe(8)
    invite = models.InviteCode(code=code)
    db.add(invite)
    db.commit()
    return {"code": code, "used": False}


@router.get("/invites")
def list_invites(db: Session = Depends(get_db), _: None = Depends(_require_admin)):
    invites = db.query(models.InviteCode).order_by(models.InviteCode.created_at.desc()).all()
    return [{"code": i.code, "used": i.used, "created_at": i.created_at} for i in invites]
