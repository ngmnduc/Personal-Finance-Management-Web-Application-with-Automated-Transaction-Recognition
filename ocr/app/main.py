import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

os.environ["DYLD_FALLBACK_LIBRARY_PATH"] = "/opt/homebrew/lib"

# Load GTK3 dynamically for WeasyPrint on Windows
if os.name == 'nt' and hasattr(os, 'add_dll_directory'):
    gtk_path = os.environ.get("GTK_WIN_PATH")
    
    if not gtk_path:
        std_path = r"C:\Program Files\GTK3-Runtime Win64\bin"
        if os.path.exists(std_path):
            gtk_path = std_path
            
    if not gtk_path:
        for path in os.environ.get('PATH', '').split(os.pathsep):
            if ('GTK3' in path or 'GTK' in path) and os.path.exists(path):
                gtk_path = path
                break
    
    if gtk_path:
        os.add_dll_directory(gtk_path)
        logger.info(f"Windows: GTK3 library loaded from '{gtk_path}'")
    else:
        logger.warning("Windows: GTK3 library not found. WeasyPrint may fail.")
from app.api.ocr_router import router as ocr_router
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.utils.rate_limiter import limiter
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.recurring_service import process_recurring_incomes, process_recurring_rules

app = FastAPI(title="Finman OCR Service", version="1.0.0")

# APScheduler
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
    scheduler.add_job(
        process_recurring_rules,
        CronTrigger(hour=7, minute=30, timezone="Asia/Ho_Chi_Minh"),
        id="recurring_rules_job",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started: Income job at 7:00 AM, Rules job at 7:30 AM (VN time)")

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