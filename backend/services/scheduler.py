from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from croniter import croniter
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def get_next_expected(job) -> datetime | None:
    """Return the datetime when this job was last expected to run."""
    if not job.last_ping:
        return None

    if job.schedule_type == "interval":
        try:
            interval_minutes = float(job.schedule_value)
            return job.last_ping + timedelta(minutes=interval_minutes)
        except ValueError:
            return None
    elif job.schedule_type == "cron":
        try:
            cron = croniter(job.schedule_value, job.last_ping)
            return cron.get_next(datetime)
        except Exception:
            return None
    return None


async def check_jobs():
    from database import SessionLocal
    from models import Job, LogEntry, Settings, DiagnosisReport
    from services.alerts import dispatch_alert
    from services.ai_diagnosis import run_diagnosis

    db = SessionLocal()
    try:
        settings = db.query(Settings).first()
        jobs = db.query(Job).filter(Job.paused == False).all()
        now = datetime.utcnow()

        for job in jobs:
            if job.status in ("waiting",) and job.last_ping is None:
                continue  # Never pinged yet, skip

            expected = get_next_expected(job)
            if expected is None:
                continue

            grace_deadline = expected + timedelta(minutes=job.grace_period)

            if now > grace_deadline and job.status == "ok":
                # Job is now late
                logger.warning(f"Job '{job.name}' is late (expected by {grace_deadline})")
                job.status = "late"
                db.commit()

                # Build alert message
                msg = (
                    f"⚠️ <b>Watchdog: Job Late</b>\n"
                    f"<b>{job.name}</b> hasn't checked in.\n"
                    f"Expected by: {grace_deadline.strftime('%Y-%m-%d %H:%M')} UTC\n"
                )

                if job.ai_diagnosis_enabled and settings:
                    logs = "\n".join(
                        f"[{e.timestamp.strftime('%H:%M:%S')}] {e.level.upper()}: {e.message}"
                        for e in db.query(LogEntry)
                        .filter(LogEntry.job_id == job.id)
                        .order_by(LogEntry.timestamp.desc())
                        .limit(settings.diagnosis_log_lines if settings else 100)
                        .all()[::-1]
                    )
                    result = await run_diagnosis(
                        settings.anthropic_api_key if settings else "",
                        job,
                        logs,
                        "Job went late — failed to check in on schedule",
                    )
                    report = DiagnosisReport(
                        job_id=job.id,
                        trigger_reason="late",
                        log_snapshot=logs,
                        diagnosis=result.get("diagnosis", ""),
                        suggested_fix=result.get("suggested_fix", ""),
                    )
                    db.add(report)
                    db.commit()
                    msg += f"\n🔍 <b>AI Diagnosis:</b> {result.get('diagnosis', '')}\n💡 <b>Fix:</b> {result.get('suggested_fix', '')}"

                if settings:
                    await dispatch_alert(settings, job, msg)

    except Exception as e:
        logger.error(f"Scheduler check failed: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(check_jobs, "interval", minutes=1, id="job_checker", replace_existing=True)
    scheduler.start()
    logger.info("Watchdog scheduler started")
