import asyncio
import logging

from fastapi import APIRouter, Form, HTTPException,Request, UploadFile, File
from app.utils.rate_limiter import limiter
from app.models.schemas import BankInfo, BulkScanItem, BulkScanResponse, ExtractedData, HealthResponse, ScanResponse
from app.utils.cache import get_cached, set_cache
from app.services.pdf_service import extract_text_from_pdf
from app.services.llm_service import extract_with_llm
from app.services.nlp_extractor import (
    clean_and_parse_json,
    extract_by_regex,
    normalize_amount,
    normalize_date,
    normalize_type,
    calculate_confidence,
)
from app.services.bank_parser import detect_bank

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Supported banks list ──────────────────────────────────────────────────────

_SUPPORTED_BANKS = [
    BankInfo(id="vcb",  name="Vietcombank"),
    BankInfo(id="mb",   name="MB Bank"),
    BankInfo(id="tcb",  name="Techcombank"),
    BankInfo(id="bidv", name="BIDV"),
    BankInfo(id="momo", name="MoMo"),
]

# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok", service="ocr")

# ── Banks ─────────────────────────────────────────────────────────────────────

@router.get("/api/v1/ocr/banks", response_model=list[BankInfo])
def get_supported_banks():
    return _SUPPORTED_BANKS

# ── Scan ──────────────────────────────────────────────────────────────────────

@router.post("/api/v1/ocr/scan", response_model=ScanResponse)
@limiter.limit("10/minute")
async def scan_receipt(
    request: Request,
    file: UploadFile = File(...),
    scan_context: str = Form(...),
):
    # 1. Validate MIME type
    content_type = file.content_type or ""
    is_valid = content_type.startswith("image/") or content_type == "application/pdf"
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Only images and PDFs are accepted.",
        )

    # 2. Read bytes
    file_bytes = await file.read()

    # 3. Cache hit — return immediately
    cached = get_cached(file_bytes)
    if cached:
        logger.info("Cache hit for file '%s'", file.filename)
        return ScanResponse(**cached)

    # 4-8. Process + graceful error response on failure
    is_pdf = content_type == "application/pdf"

    try:
        # ── Routing branch ────────────────────────────────────────────────────
        if is_pdf:
            raw_text = extract_text_from_pdf(file_bytes)
            parsed = extract_by_regex(raw_text)
        else:
            raw_text = await extract_with_llm(file_bytes, content_type)
            parsed = clean_and_parse_json(raw_text)

        # ── Normalise fields ──────────────────────────────────────────────────
        extracted_data = ExtractedData(
            amount=normalize_amount(parsed.get("amount")),
            transaction_date=normalize_date(parsed.get("transaction_date")),
            merchant=parsed.get("merchant") or None,
            type=normalize_type(parsed.get("type"), scan_context),
            bank_detected=detect_bank(raw_text),
            confidence=calculate_confidence(parsed, is_pdf=is_pdf),
            error=None,
        )

        result = ScanResponse(
            extracted=extracted_data,
            extracted_text=raw_text,
            suggested_category_id=None,
            default_wallet_id=None,
        )

        # ── Cache & return ────────────────────────────────────────────────────
        set_cache(file_bytes, result.model_dump())
        return result

    except Exception as e:
        logger.error(
            "Extraction failed for file '%s': %s",
            file.filename,
            e,
            exc_info=True,
        )
        # Soft-error: return 200 with error payload so the FE can show UI feedback
        return ScanResponse(
            extracted=ExtractedData(confidence=0.0, error=str(e)),
            extracted_text="",
            suggested_category_id=None,
            default_wallet_id=None,
        )

# ── Bulk Scan ─────────────────────────────────────────────────────────────────

@router.post("/api/v1/ocr/scan/bulk", response_model=BulkScanResponse)
async def scan_bulk(
    request: Request,
    files: list[UploadFile] = File(...),
    scan_context: str = Form("EXPENSE"),
):
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 files per batch.")

    results: list[BulkScanItem] = []
    total = len(files)

    for i, file in enumerate(files):
        filename = file.filename or f"file_{i}"
        content_type = file.content_type or ""
        is_last = (i == total - 1)

        # Validate MIME type
        if not (content_type.startswith("image/") or content_type == "application/pdf"):
            results.append(BulkScanItem(
                status="error",
                filename=filename,
                extracted=ExtractedData(confidence=0.0, error=f"Unsupported type: {content_type}"),
            ))
            continue

        file_bytes = await file.read()
        is_pdf = content_type == "application/pdf"
        cache_hit = False

        # Cache check
        cached = get_cached(file_bytes)
        if cached:
            logger.info("Bulk cache hit: '%s'", filename)
            
            # Bỏ các trường status/filename cũ nếu có (để phòng ngừa rác)
            cached.pop("status", None)
            cached.pop("filename", None)
            
            # Ép trường mới vào
            results.append(BulkScanItem(status="ready", filename=filename, **cached))
            cache_hit = True
        else:
            try:
                if is_pdf:
                    raw_text = extract_text_from_pdf(file_bytes)
                    parsed = extract_by_regex(raw_text)
                else:
                    raw_text = await extract_with_llm(file_bytes, content_type)
                    parsed = clean_and_parse_json(raw_text)

                extracted_data = ExtractedData(
                    amount=normalize_amount(parsed.get("amount")),
                    transaction_date=normalize_date(parsed.get("transaction_date")),
                    merchant=parsed.get("merchant") or None,
                    type=normalize_type(parsed.get("type"), scan_context),
                    bank_detected=detect_bank(raw_text),
                    confidence=calculate_confidence(parsed, is_pdf=is_pdf),
                    error=None,
                )

                item = BulkScanItem(
                    status="ready",
                    filename=filename,
                    extracted=extracted_data,
                    extracted_text=raw_text,
                )
                cache_payload = {
                    "extracted": extracted_data.model_dump(),
                    "extracted_text": raw_text,
                    "suggested_category_id": None,
                    "default_wallet_id": None
                }
                set_cache(file_bytes, cache_payload)
                results.append(item)

            except Exception as exc:
                logger.error("Bulk item '%s' failed: %s", filename, exc, exc_info=True)
                results.append(BulkScanItem(
                    status="error",
                    filename=filename,
                    extracted=ExtractedData(confidence=0.0, error=str(exc)),
                ))

        # Throttle between items to avoid hitting rate limits on free-tier Gemini
        if not is_last and not cache_hit:
            await asyncio.sleep(1.5)

    processed = sum(1 for r in results if r.status == "ready")
    return BulkScanResponse(total=total, processed=processed, results=results)