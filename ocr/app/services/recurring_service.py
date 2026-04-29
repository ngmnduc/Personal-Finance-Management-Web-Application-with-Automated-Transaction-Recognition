import logging
import httpx
from datetime import date
from app.config import settings

logger = logging.getLogger(__name__)


async def process_recurring_incomes() -> None:
    """
    Gọi Node.js BE để lấy danh sách recurring incomes đến hạn hôm nay,
    sau đó gọi từng API /process để tạo giao dịch thực tế.

    - 1 item lỗi KHÔNG làm sập cả process.
    - KHÔNG ghi thẳng vào DB — mọi thao tác đi qua Node.js API.
    """
    headers = {"X-Internal-Secret": settings.INTERNAL_SECRET}
    base_url = settings.BE_SERVICE_URL.rstrip("/")

    logger.info(
        "Recurring income job started — checking due incomes for day %d",
        date.today().day,
    )

    # ── Step 1: Lấy danh sách due today ──────────────────────────────────────
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

    # ── Step 2: Xử lý từng item (1 lỗi không dừng cả batch) ─────────────────
    for item in items:
        item_id   = item.get("id", "<unknown>")
        item_name = item.get("name", "<unnamed>")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
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
