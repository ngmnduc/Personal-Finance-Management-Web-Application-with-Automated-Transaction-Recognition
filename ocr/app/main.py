import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.api.ocr_router import router as ocr_router
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.utils.rate_limiter import limiter
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.recurring_service import process_recurring_incomes

logger = logging.getLogger(__name__)

app = FastAPI(title="Finman OCR Service", version="1.0.0")

# ── APScheduler ───────────────────────────────────────────────────────────────
scheduler = AsyncIOScheduler()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    scheduler.add_job(
        process_recurring_incomes,
        CronTrigger(hour=7, minute=0, timezone="Asia/Ho_Chi_Minh"),
        id="recurring_income_job",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started for Recurring Incomes (7:00 AM VN time)")

@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()
    logger.info("APScheduler shut down")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ocr"}

app.include_router(ocr_router)

@app.get("/")
def root():
    return {"message": "FinTrack OCR Service running"}