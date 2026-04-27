from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.api.ocr_router import router as ocr_router
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.utils.rate_limiter import limiter

app = FastAPI(title="Finman OCR Service", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ocr"}

app.include_router(ocr_router)

@app.get("/")
def root():
    return {"message": "FinTrack OCR Service running"}