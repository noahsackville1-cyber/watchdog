from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float
from sqlalchemy.sql import func
from database import Base
import uuid


def generate_key():
    return uuid.uuid4().hex


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    ping_key = Column(String(64), unique=True, default=generate_key, index=True)

    # Schedule: either a cron expression or an interval in minutes
    schedule_type = Column(String(20), default="interval")  # "cron" | "interval"
    schedule_value = Column(String(100), default="60")       # cron expr or minutes

    grace_period = Column(Integer, default=5)   # minutes after expected run before "late"

    last_ping = Column(DateTime, nullable=True)
    last_duration = Column(Float, nullable=True)  # seconds
    last_exit_code = Column(Integer, nullable=True)

    status = Column(String(20), default="waiting")  # waiting | ok | late | failing
    consecutive_failures = Column(Integer, default=0)

    alert_telegram = Column(Boolean, default=True)
    alert_discord = Column(Boolean, default=False)

    ai_diagnosis_enabled = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    paused = Column(Boolean, default=False)


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, nullable=False, index=True)
    timestamp = Column(DateTime, server_default=func.now())
    level = Column(String(20), default="info")  # info | warning | error
    message = Column(Text, nullable=False)
    run_id = Column(String(64), nullable=True)   # optional per-run grouping


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    anthropic_api_key = Column(String(255), default="")
    telegram_bot_token = Column(String(255), default="")
    telegram_chat_id = Column(String(100), default="")
    discord_webhook_url = Column(String(500), default="")
    max_log_lines = Column(Integer, default=500)
    diagnosis_log_lines = Column(Integer, default=100)  # lines sent to AI


class DiagnosisReport(Base):
    __tablename__ = "diagnosis_reports"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, nullable=False, index=True)
    triggered_at = Column(DateTime, server_default=func.now())
    trigger_reason = Column(String(100))   # "late" | "failure" | "manual"
    log_snapshot = Column(Text)
    diagnosis = Column(Text)
    suggested_fix = Column(Text)
