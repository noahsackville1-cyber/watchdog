# 🐕 Watchdog

**Self-hosted monitoring for your automation scripts, bots, and pipelines — with AI-powered failure diagnosis.**

Most monitoring tools watch websites. Watchdog watches your background automation: scrapers, trading bots, data pipelines, cron jobs. When something breaks or goes silent, Watchdog tells you what went wrong and how to fix it — in plain English.

![Watchdog Dashboard](https://placeholder.watchdog.dev/screenshot.png)

---

## Features

- **Heartbeat monitoring** — scripts check in via a unique URL when they complete. Watchdog knows if they go silent.
- **Schedule awareness** — define interval or cron schedules. Watchdog alerts when a job is late by more than your grace period.
- **AI failure diagnosis** — when a job fails or disappears, Watchdog reads the recent logs and uses Claude to explain what went wrong and suggest a fix.
- **Log streaming** — scripts push log lines to Watchdog via the API. View them in real time.
- **Alerts** — Telegram and Discord webhooks supported out of the box.
- **Zero cloud dependency** — runs entirely on your own hardware with a single Docker command.

---

## Quick Start

```bash
git clone https://github.com/yourname/watchdog.git
cd watchdog

# Build (compiles frontend + Docker image)
chmod +x build.sh && ./build.sh

# Run
docker compose up -d
```

Open **http://localhost:8000**

---

## Instrumenting your scripts

### 1. Add a job in the dashboard

Give it a name, set the expected schedule (e.g. every 60 minutes), and optionally enable AI diagnosis.

### 2. Ping on completion (Python)

```python
import requests
import time

WATCHDOG_URL = "http://your-server:8000"
PING_KEY = "abc123your_ping_key"

start = time.time()

try:
    # --- your actual job code here ---
    run_scraper()
    exit_code = 0
except Exception as e:
    exit_code = 1
    # push error to logs
    requests.post(f"{WATCHDOG_URL}/api/jobs/{JOB_ID}/logs", json={
        "message": str(e), "level": "error"
    })

duration = time.time() - start
requests.post(f"{WATCHDOG_URL}/ping/{PING_KEY}", params={
    "exit_code": exit_code,
    "duration": round(duration, 2),
    "msg": "Scraper complete" if exit_code == 0 else "Scraper failed",
})
```

### 3. Ping from bash

```bash
# Simple GET ping (success)
curl http://your-server:8000/ping/abc123your_ping_key

# With exit code
curl -X POST "http://your-server:8000/ping/abc123?exit_code=$?&duration=42"
```

### 4. Wrap any cron job

```bash
# crontab example
0 * * * * /usr/local/bin/python /opt/my_scraper.py && curl -s "http://watchdog:8000/ping/abc123?exit_code=0" || curl -s "http://watchdog:8000/ping/abc123?exit_code=1"
```

---

## Sending logs

Logs are displayed in the Watchdog UI and sent to the AI for diagnosis when a failure occurs.

```python
import requests

def log(job_id: int, message: str, level: str = "info"):
    requests.post(f"http://watchdog:8000/api/jobs/{job_id}/logs", json={
        "message": message,
        "level": level,  # info | warning | error
    })

log(1, "Starting database sync...")
log(1, "Fetched 1,234 rows")
log(1, "Connection refused on retry 3", level="error")
```

---

## AI Diagnosis

When a job fails or goes late, Watchdog:

1. Collects the last N log lines (configurable, default 100)
2. Sends them to Claude with context about the job and failure
3. Returns a plain-English diagnosis + suggested fix
4. Delivers this in the Telegram/Discord alert and the dashboard

You can also trigger manual diagnosis from the job detail panel.

**Requires an Anthropic API key** — add yours in Settings. Diagnosis uses `claude-sonnet-4-20250514`.

---

## Configuration

All settings are managed in the dashboard under **Settings**:

| Setting | Description |
|---|---|
| Anthropic API Key | Required for AI diagnosis |
| Telegram Bot Token | From @BotFather |
| Telegram Chat ID | Your personal or group chat ID |
| Discord Webhook URL | From Server Settings → Integrations |
| Max log lines | How many log lines to retain per job |
| Diagnosis log lines | How many lines are sent to the AI |

---

## API Reference

### Heartbeat

```
POST /ping/{ping_key}?exit_code=0&duration=12.3&msg=Done
GET  /ping/{ping_key}
```

### Logs

```
POST /api/jobs/{id}/logs
Body: { "message": "...", "level": "info|warning|error", "run_id": "optional" }

GET /api/jobs/{id}/logs?limit=200
```

### Jobs

```
GET    /api/jobs
POST   /api/jobs
GET    /api/jobs/{id}
PUT    /api/jobs/{id}
DELETE /api/jobs/{id}
POST   /api/jobs/{id}/diagnose   # trigger manual AI diagnosis
GET    /api/jobs/{id}/diagnoses  # list past diagnoses
```

---

## Development

```bash
# Backend (with hot reload)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (in another terminal)
cd frontend
npm install
npm run dev        # proxies /api to localhost:8000
```

---

## Roadmap

- [ ] Email alerts (SMTP)
- [ ] Slack alerts
- [ ] Job run history / uptime graphs
- [ ] Webhook triggers on job events
- [ ] Multi-user support with API keys
- [ ] Mobile-responsive layout

---

## License

MIT
