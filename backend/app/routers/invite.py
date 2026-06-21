import secrets
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..auth_utils import get_current_user
from ..limiter import limiter

router = APIRouter()


@router.post("/generate")
@limiter.limit("5/hour")
async def generate_invite(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.is_guest:
        raise HTTPException(status_code=403, detail="Guests cannot generate invite codes")
    code = secrets.token_urlsafe(8)
    while db.query(models.InviteCode).filter_by(code=code).first():
        code = secrets.token_urlsafe(8)
    invite = models.InviteCode(code=code)
    db.add(invite)
    db.commit()
    return {"code": code}
