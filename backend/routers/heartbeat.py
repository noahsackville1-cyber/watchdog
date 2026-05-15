from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from database import get_db
from models import Job, LogEntry, Settings, DiagnosisReport
from services.alerts import dispatch_alert
from services.ai_diagnosis import run_diagnosis

router = APIRouter(tags=["heartbeat"])


@router.post("/ping/{ping_key}")
async def heartbeat(
    ping_key: str,
    request: Request,
    db: Session = Depends(get_db),
    exit_code: Optional[int] = None,
    duration: Optional[float] = None,
    msg: Optional[str] = None,
):
    job = db.query(Job).filter(Job.ping_key == ping_key).first()
    if not job:
        raise HTTPException(status_code=404, detail="Unknown ping key")

    now = datetime.utcnow()
    prev_status = job.status

    job.last_ping = now
    if duration is not None:
        job.last_duration = duration
    if exit_code is not None:
        job.last_exit_code = exit_code

    # Determine new status
    if exit_code is not None and exit_code != 0:
        job.status = "failing"
        job.consecutive_failures += 1
    else:
        job.status = "ok"
        job.consecutive_failures = 0

    # Log the ping
    log_msg = msg or f"Heartbeat received (exit={exit_code}, duration={duration}s)"
    level = "error" if job.status == "failing" else "info"
    entry = LogEntry(job_id=job.id, level=level, message=log_msg)
    db.add(entry)
    db.commit()

    settings = db.query(Settings).first()

    # Alert on first failure or recovery
    if job.status == "failing" and (prev_status != "failing" or job.consecutive_failures == 1):
        alert_msg = (
            f"❌ <b>Watchdog: Job Failed</b>\n"
            f"<b>{job.name}</b> reported a failure.\n"
            f"Exit code: {exit_code}\n"
            f"Failures: {job.consecutive_failures}\n"
        )

        if job.ai_diagnosis_enabled and settings:
            logs_raw = (
                db.query(LogEntry)
                .filter(LogEntry.job_id == job.id)
                .order_by(LogEntry.timestamp.desc())
                .limit(settings.diagnosis_log_lines)
                .all()[::-1]
            )
            logs = "\n".join(
                f"[{l.timestamp.strftime('%H:%M:%S')}] {l.level.upper()}: {l.message}"
                for l in logs_raw
            )
            result = await run_diagnosis(
                settings.anthropic_api_key,
                job,
                logs,
                f"Job failed with exit code {exit_code}",
            )
            report = DiagnosisReport(
                job_id=job.id,
                trigger_reason="failure",
                log_snapshot=logs,
                diagnosis=result.get("diagnosis", ""),
                suggested_fix=result.get("suggested_fix", ""),
            )
            db.add(report)
            db.commit()
            alert_msg += f"\n🔍 <b>AI Diagnosis:</b> {result.get('diagnosis', '')}\n💡 <b>Fix:</b> {result.get('suggested_fix', '')}"

        if settings:
            await dispatch_alert(settings, job, alert_msg)

    elif job.status == "ok" and prev_status in ("failing", "late"):
        recovery_msg = f"✅ <b>Watchdog: Job Recovered</b>\n<b>{job.name}</b> is back to healthy."
        if settings:
            await dispatch_alert(settings, job, recovery_msg)

    return {"ok": True, "status": job.status, "job": job.name}


@router.get("/ping/{ping_key}")
async def heartbeat_get(ping_key: str, request: Request, db: Session = Depends(get_db)):
    """GET-based ping for simple curl integrations."""
    return await heartbeat(ping_key, request, db)
