from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    anthropic_api_key: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_webhook_url: Optional[str] = None
    max_log_lines: Optional[int] = None
    diagnosis_log_lines: Optional[int] = None


def mask(val: str) -> str:
    if not val:
        return ""
    return val[:4] + "..." + val[-4:] if len(val) > 8 else "****"


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    s = db.query(Settings).first()
    if not s:
        return {}
    return {
        "anthropic_api_key_set": bool(s.anthropic_api_key),
        "anthropic_api_key_preview": mask(s.anthropic_api_key),
        "telegram_bot_token_set": bool(s.telegram_bot_token),
        "telegram_bot_token_preview": mask(s.telegram_bot_token),
        "telegram_chat_id": s.telegram_chat_id,
        "discord_webhook_url_set": bool(s.discord_webhook_url),
        "discord_webhook_url_preview": mask(s.discord_webhook_url),
        "max_log_lines": s.max_log_lines,
        "diagnosis_log_lines": s.diagnosis_log_lines,
    }


@router.put("")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    s = db.query(Settings).first()
    if not s:
        s = Settings(id=1)
        db.add(s)

    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(s, k, v)

    db.commit()
    return {"ok": True}
