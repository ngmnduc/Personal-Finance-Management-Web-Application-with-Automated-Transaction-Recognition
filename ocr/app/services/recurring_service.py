import logging
import httpx
from datetime import date
from app.config import settings

logger = logging.getLogger(__name__)


async def process_recurring_incomes() -> None:
    """
    Fetch due recurring incomes from Node.js BE and process each one.
    - Single failure does NOT abort the batch.
    - All operations go through Node.js API (never direct DB writes).
    """
    headers = {"X-Internal-Secret": settings.INTERNAL_SECRET}
    base_url = settings.BE_SERVICE_URL.rstrip("/")

    logger.info(
        "Recurring income job started — checking due incomes for day %d",
        date.today().day,
    )

    # ── Step 1: Fetch due-today list ──────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{base_url}/api/v1/recurring-incomes/due-today",
                headers=headers,
            )
    except Exception as e:
        logger.error("Failed to reach BE service for due-today list: %s", e)
        return

    if response.status_code != 200:
        logger.error(
            "due-today endpoint returned unexpected status %d: %s",
            response.status_code,
            response.text,
        )
        return

    items: list[dict] = response.json().get("data", [])
    logger.info("Found %d recurring income(s) due today", len(items))

    if not items:
        return

    # ── Step 2: Process each item (fault-tolerant) ────────────────────────────
    async with httpx.AsyncClient(timeout=30.0) as client:
        for item in items:
            item_id   = item.get("id", "<unknown>")
            item_name = item.get("name", "<unnamed>")
            try:
                process_resp = await client.post(
                    f"{base_url}/api/v1/recurring-incomes/{item_id}/process",
                    headers=headers,
                )

                if process_resp.status_code == 200:
                    logger.info("Processed recurring income: %s (id=%s)", item_name, item_id)
                else:
                    logger.error(
                        "Failed to process recurring income %s (id=%s): status=%d body=%s",
                        item_name,
                        item_id,
                        process_resp.status_code,
                        process_resp.text,
                    )
            except Exception as e:
                logger.error(
                    "Exception while processing recurring income %s (id=%s): %s",
                    item_name,
                    item_id,
                    e,
                )
                continue

    logger.info("Recurring income job finished")


async def process_recurring_rules() -> None:
    """
    Fetch all active recurring EXPENSE rules that are due today from the Node.js BE,
    then trigger each one to create a real transaction.

    - 1 item failing DOES NOT abort the entire batch.
    - NEVER writes to DB directly; all operations go through Node.js API.
    """
    headers  = {"X-Internal-Secret": settings.INTERNAL_SECRET}
    base_url = settings.BE_SERVICE_URL.rstrip("/")

    logger.info("Recurring rules job started — fetching rules due today")

    # ── Step 1: Get due-today list ────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{base_url}/api/v1/recurring/rules/due-today",
                headers=headers,
            )
    except Exception as e:
        logger.error("Failed to reach BE service for due-today rules: %s", e)
        return

    if response.status_code != 200:
        logger.error(
            "due-today (rules) endpoint returned unexpected status %d: %s",
            response.status_code,
            response.text,
        )
        return

    items: list[dict] = response.json().get("data", [])
    logger.info("Found %d recurring rule(s) due today", len(items))

    if not items:
        return

    # ── Step 2: Process each rule individually (fault-tolerant) ───────────────
    async with httpx.AsyncClient(timeout=30.0) as client:
        for item in items:
            item_id      = item.get("id", "<unknown>")
            item_merchant = item.get("merchant", "<unknown>")
            try:
                process_resp = await client.post(
                    f"{base_url}/api/v1/recurring/rules/{item_id}/process",
                    headers=headers,
                )

                if process_resp.status_code == 200:
                    logger.info(
                        "Processed recurring rule: %s (id=%s)",
                        item_merchant,
                        item_id,
                    )
                else:
                    logger.error(
                        "Failed to process recurring rule %s (id=%s): status=%d body=%s",
                        item_merchant,
                        item_id,
                        process_resp.status_code,
                        process_resp.text,
                    )
            except Exception as e:
                logger.error(
                    "Exception while processing recurring rule %s (id=%s): %s",
                    item_merchant,
                    item_id,
                    e,
                )
                continue

    logger.info("Recurring rules job finished")
