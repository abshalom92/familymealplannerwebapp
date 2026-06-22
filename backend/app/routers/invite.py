import html
import logging
import os
import secrets
import urllib.error
import urllib.request
import json as _json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..auth_utils import get_current_user
from ..limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter()

_EMAIL_RETENTION_DAYS = 30


class GenerateInviteRequest(BaseModel):
    email: Optional[EmailStr] = None


def _wipe_stale_emails(db: Session, user_id: int) -> bool:
    """Clears sent_to_email/email_sent_at on unused codes older than 30 days. Returns True if any were wiped."""
    cutoff = datetime.utcnow() - timedelta(days=_EMAIL_RETENTION_DAYS)
    rows = (
        db.query(models.InviteCode)
        .filter(
            models.InviteCode.created_by_id == user_id,
            models.InviteCode.used == False,
            models.InviteCode.email_sent_at.isnot(None),
            models.InviteCode.email_sent_at < cutoff,
        )
        .all()
    )
    for row in rows:
        row.sent_to_email = None
        row.email_sent_at = None
    return len(rows) > 0


def _sender_display(user: models.User) -> str:
    name_parts = [p for p in (user.first_name, user.last_name) if p]
    name = " ".join(name_parts).strip()
    username = user.username or ""
    if name and username:
        return f"{html.escape(name)} (@{html.escape(username)})"
    if name:
        return html.escape(name)
    if username:
        return f"@{html.escape(username)}"
    return "A friend"


def _send_invite_email(to_email: str, code: str, sender_display: str) -> None:
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.error("[invite] RESEND_API_KEY not set — cannot send invite to %s", to_email)
        return
    from_addr = os.getenv("INVITE_FROM_EMAIL", "onboarding@resend.dev")
    app_url = os.getenv("APP_URL", "https://familymealplannerwebapp.vercel.app")
    payload = _json.dumps({
        "from": f"Family Meal Planner <{from_addr}>",
        "to": [to_email],
        "subject": "You've been invited to Family Meal Planner",
        "html": f"""
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="color:#15803d;margin-bottom:8px">You're invited!</h2>
  <p style="color:#374151">{sender_display} has invited you to join <strong>Family Meal Planner</strong> — a private app
  for planning weekly meals, tracking groceries, and coordinating with your household.</p>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;text-align:center;margin:24px 0">
    <p style="margin:0 0 8px;color:#6b7280;font-size:12px">Your invite code</p>
    <p style="margin:0;font-family:monospace;font-size:22px;letter-spacing:3px;color:#15803d;font-weight:600">{code}</p>
  </div>
  <p style="color:#374151">Sign up at <a href="{app_url}" style="color:#15803d">{app_url}</a>
  and enter this code when creating your account.</p>
  <p style="color:#6b7280;font-size:12px">This is a one-time invite code. If you weren't expecting this, you can safely ignore it.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
  <p style="color:#9ca3af;font-size:11px">Family Meal Planner &mdash; {app_url}</p>
</div>
""",
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "FamilyMealPlanner/1.0 (+https://familymealplannerwebapp.vercel.app)",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.error("[invite] Resend rejected (status %s) for %s: %s", e.code, to_email, body)
    except Exception as e:
        logger.exception("[invite] Resend call failed for %s: %s", to_email, e)


@router.post("/generate")
@limiter.limit("5/hour")
async def generate_invite(
    request: Request,
    background_tasks: BackgroundTasks,
    body: GenerateInviteRequest = Body(default=GenerateInviteRequest()),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.is_guest:
        raise HTTPException(status_code=403, detail="Guests cannot generate invite codes")
    _wipe_stale_emails(db, current_user.id)
    code = secrets.token_urlsafe(8)
    while db.query(models.InviteCode).filter_by(code=code).first():
        code = secrets.token_urlsafe(8)
    invite = models.InviteCode(
        code=code,
        created_by_id=current_user.id,
        sent_to_email=body.email,
        email_sent_at=datetime.utcnow() if body.email else None,
    )
    db.add(invite)
    db.commit()
    if body.email:
        background_tasks.add_task(_send_invite_email, body.email, code, _sender_display(current_user))
    return {"code": code}


@router.post("/resend/{code}")
@limiter.limit("5/hour")
async def resend_invite(
    request: Request,
    code: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.is_guest:
        raise HTTPException(status_code=403, detail="Guests cannot resend invite codes")
    invite = db.query(models.InviteCode).filter_by(code=code, created_by_id=current_user.id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite code not found")
    if invite.used:
        raise HTTPException(status_code=400, detail="This invite code has already been used")
    if not invite.sent_to_email:
        raise HTTPException(status_code=400, detail="No email address on record for this code")
    background_tasks.add_task(_send_invite_email, invite.sent_to_email, code, _sender_display(current_user))
    return {"ok": True}


@router.get("/my-codes")
async def my_codes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.is_guest:
        raise HTTPException(status_code=403, detail="Guests cannot view invite codes")
    wiped = _wipe_stale_emails(db, current_user.id)
    if wiped:
        db.commit()
    codes = (
        db.query(models.InviteCode)
        .filter_by(created_by_id=current_user.id)
        .order_by(models.InviteCode.created_at.desc())
        .all()
    )
    return [
        {
            "code": c.code,
            "used": c.used,
            "sent_to_email": c.sent_to_email,
            "created_at": c.created_at,
        }
        for c in codes
    ]
