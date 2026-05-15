import httpx
import logging

logger = logging.getLogger(__name__)


async def send_telegram(token: str, chat_id: str, message: str):
    if not token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML",
            }, timeout=10)
    except Exception as e:
        logger.error(f"Telegram alert failed: {e}")


async def send_discord(webhook_url: str, message: str):
    if not webhook_url:
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(webhook_url, json={"content": message}, timeout=10)
    except Exception as e:
        logger.error(f"Discord alert failed: {e}")


async def dispatch_alert(settings, job, message: str):
    if job.alert_telegram:
        await send_telegram(settings.telegram_bot_token, settings.telegram_chat_id, message)
    if job.alert_discord:
        await send_discord(settings.discord_webhook_url, message)
