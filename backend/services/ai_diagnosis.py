import httpx
import logging
import json

logger = logging.getLogger(__name__)

DIAGNOSIS_PROMPT = """You are an expert DevOps engineer and automation debugger. A monitored automation job has failed or gone late.

Job: {job_name}
Description: {job_description}
Trigger: {trigger_reason}
Schedule: every {schedule_value} {schedule_unit}

Recent log output (last {log_lines} lines):
<logs>
{logs}
</logs>

Analyse the logs and provide:
1. A concise diagnosis of what went wrong (2-4 sentences, plain English, no jargon unless necessary)
2. A concrete suggested fix (specific steps the developer should take)

Respond ONLY with valid JSON in this exact format:
{{
  "diagnosis": "...",
  "suggested_fix": "..."
}}"""


async def run_diagnosis(api_key: str, job, logs: str, trigger_reason: str) -> dict:
    if not api_key:
        return {"diagnosis": "No Anthropic API key configured.", "suggested_fix": "Add your API key in Settings."}

    if job.schedule_type == "interval":
        schedule_unit = "minutes"
        schedule_value = job.schedule_value
    else:
        schedule_unit = "(cron)"
        schedule_value = job.schedule_value

    prompt = DIAGNOSIS_PROMPT.format(
        job_name=job.name,
        job_description=job.description or "No description provided",
        trigger_reason=trigger_reason,
        schedule_value=schedule_value,
        schedule_unit=schedule_unit,
        log_lines=len(logs.splitlines()),
        logs=logs or "(no logs captured)",
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 800,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=30,
            )
            data = response.json()
            text = data["content"][0]["text"].strip()
            # Strip markdown fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
    except Exception as e:
        logger.error(f"AI diagnosis failed: {e}")
        return {
            "diagnosis": f"AI diagnosis failed: {str(e)}",
            "suggested_fix": "Check your Anthropic API key and network connectivity.",
        }
