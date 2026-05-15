from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import Job, LogEntry, DiagnosisReport, Settings
from services.ai_diagnosis import run_diagnosis

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    schedule_type: str = "interval"
    schedule_value: str = "60"
    grace_period: int = 5
    alert_telegram: bool = True
    alert_discord: bool = False
    ai_diagnosis_enabled: bool = True


class JobUpdate(JobCreate):
    paused: Optional[bool] = None


def job_to_dict(job: Job, db: Session) -> dict:
    latest_logs = (
        db.query(LogEntry)
        .filter(LogEntry.job_id == job.id)
        .order_by(LogEntry.timestamp.desc())
        .limit(5)
        .all()
    )
    latest_diagnosis = (
        db.query(DiagnosisReport)
        .filter(DiagnosisReport.job_id == job.id)
        .order_by(DiagnosisReport.triggered_at.desc())
        .first()
    )
    return {
        "id": job.id,
        "name": job.name,
        "description": job.description,
        "ping_key": job.ping_key,
        "ping_url": f"/ping/{job.ping_key}",
        "schedule_type": job.schedule_type,
        "schedule_value": job.schedule_value,
        "grace_period": job.grace_period,
        "last_ping": job.last_ping.isoformat() if job.last_ping else None,
        "last_duration": job.last_duration,
        "last_exit_code": job.last_exit_code,
        "status": job.status,
        "consecutive_failures": job.consecutive_failures,
        "alert_telegram": job.alert_telegram,
        "alert_discord": job.alert_discord,
        "ai_diagnosis_enabled": job.ai_diagnosis_enabled,
        "paused": job.paused,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "recent_logs": [
            {
                "timestamp": l.timestamp.isoformat() if l.timestamp else None,
                "level": l.level,
                "message": l.message,
            }
            for l in reversed(latest_logs)
        ],
        "latest_diagnosis": {
            "triggered_at": latest_diagnosis.triggered_at.isoformat(),
            "trigger_reason": latest_diagnosis.trigger_reason,
            "diagnosis": latest_diagnosis.diagnosis,
            "suggested_fix": latest_diagnosis.suggested_fix,
        } if latest_diagnosis else None,
    }


@router.get("")
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.created_at).all()
    return [job_to_dict(j, db) for j in jobs]


@router.post("")
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    job = Job(**payload.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job_to_dict(job, db)


@router.get("/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job_to_dict(job, db)


@router.put("/{job_id}")
def update_job(job_id: int, payload: JobUpdate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return job_to_dict(job, db)


@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.query(LogEntry).filter(LogEntry.job_id == job_id).delete()
    db.query(DiagnosisReport).filter(DiagnosisReport.job_id == job_id).delete()
    db.delete(job)
    db.commit()
    return {"ok": True}


@router.get("/{job_id}/logs")
def get_logs(job_id: int, limit: int = 200, db: Session = Depends(get_db)):
    logs = (
        db.query(LogEntry)
        .filter(LogEntry.job_id == job_id)
        .order_by(LogEntry.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "level": l.level,
            "message": l.message,
            "run_id": l.run_id,
        }
        for l in reversed(logs)
    ]


class LogSubmit(BaseModel):
    message: str
    level: str = "info"
    run_id: Optional[str] = None


@router.post("/{job_id}/logs")
def submit_log(job_id: int, payload: LogSubmit, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    entry = LogEntry(job_id=job_id, level=payload.level, message=payload.message, run_id=payload.run_id)
    db.add(entry)
    # Prune old logs
    settings = db.query(Settings).first()
    max_lines = settings.max_log_lines if settings else 500
    count = db.query(LogEntry).filter(LogEntry.job_id == job_id).count()
    if count > max_lines:
        oldest = (
            db.query(LogEntry)
            .filter(LogEntry.job_id == job_id)
            .order_by(LogEntry.timestamp)
            .limit(count - max_lines)
            .all()
        )
        for old in oldest:
            db.delete(old)
    db.commit()
    return {"ok": True}


@router.get("/{job_id}/diagnoses")
def get_diagnoses(job_id: int, db: Session = Depends(get_db)):
    reports = (
        db.query(DiagnosisReport)
        .filter(DiagnosisReport.job_id == job_id)
        .order_by(DiagnosisReport.triggered_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": r.id,
            "triggered_at": r.triggered_at.isoformat(),
            "trigger_reason": r.trigger_reason,
            "diagnosis": r.diagnosis,
            "suggested_fix": r.suggested_fix,
        }
        for r in reports
    ]


@router.post("/{job_id}/diagnose")
async def trigger_diagnosis(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    settings = db.query(Settings).first()
    logs_raw = (
        db.query(LogEntry)
        .filter(LogEntry.job_id == job_id)
        .order_by(LogEntry.timestamp.desc())
        .limit(settings.diagnosis_log_lines if settings else 100)
        .all()[::-1]
    )
    logs = "\n".join(
        f"[{l.timestamp.strftime('%H:%M:%S')}] {l.level.upper()}: {l.message}" for l in logs_raw
    )
    result = await run_diagnosis(
        settings.anthropic_api_key if settings else "",
        job,
        logs,
        "Manual diagnosis triggered",
    )
    report = DiagnosisReport(
        job_id=job_id,
        trigger_reason="manual",
        log_snapshot=logs,
        diagnosis=result.get("diagnosis", ""),
        suggested_fix=result.get("suggested_fix", ""),
    )
    db.add(report)
    db.commit()
    return result
