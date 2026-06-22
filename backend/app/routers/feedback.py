import html
import json as _json
import logging
import os
import urllib.error
import urllib.request
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import models
from ..auth_utils import ALGORITHM, SECRET_KEY, bearer_scheme
from ..database import get_db
from ..limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter()

FEEDBACK_RECIPIENT = "abshalom92@gmail.com"


class FeedbackRequest(BaseModel):
    message: str = Field(min_length=1, max_length=280)


def _maybe_current_user(
    credentials: Optional[HTTPAuthorizationCredentials],
    db: Session,
) -> Optional[models.User]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    return db.query(models.User).filter(models.User.id == int(user_id)).first()


def _send_feedback_email(message: str, sender_label: str, sender_email: Optional[str]) -> None:
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.error("[feedback] RESEND_API_KEY not set — cannot deliver feedback from %s", sender_label)
        return
    from_addr = os.getenv("INVITE_FROM_EMAIL", "onboarding@resend.dev")
    safe_message = html.escape(message).replace("\n", "<br/>")
    reply_to_line = (
        f'<p style="color:#6b7280;font-size:12px">Reply-to: <a href="mailto:{html.escape(sender_email)}">{html.escape(sender_email)}</a></p>'
        if sender_email
        else ""
    )
    payload = _json.dumps({
        "from": f"Family Meal Planner <{from_addr}>",
        "to": [FEEDBACK_RECIPIENT],
        "subject": f"Feedback from {sender_label}",
        "html": f"""
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#15803d;margin-bottom:8px">New feedback received</h2>
  <p style="color:#6b7280;font-size:12px;margin:0 0 16px">From: {html.escape(sender_label)}</p>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;color:#111827;white-space:pre-wrap">{safe_message}</div>
  {reply_to_line}
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
        logger.error("[feedback] Resend rejected (status %s): %s", e.code, body)
    except Exception as e:
        logger.exception("[feedback] Resend call failed: %s", e)


@router.post("")
@limiter.limit("5/hour")
async def submit_feedback(
    request: Request,
    body: FeedbackRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    user = _maybe_current_user(credentials, db)
    if user:
        sender_label = f"{user.username} ({user.email})"
        sender_email = user.email
    else:
        sender_label = "anonymous"
        sender_email = None
    background_tasks.add_task(_send_feedback_email, body.message, sender_label, sender_email)
    return {"ok": True}
