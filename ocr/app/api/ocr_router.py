from fastapi import APIRouter, UploadFile, File, Form
from app.models.schemas import HealthResponse, BankInfo, ScanResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok", service="ocr")

@router.get("/api/v1/ocr/banks", response_model=list[BankInfo])
def get_supported_banks():
    return [
        BankInfo(code="VCB", name="Vietcombank"),
        BankInfo(code="MB", name="MB Bank"),
        BankInfo(code="TCB", name="Techcombank"),
        BankInfo(code="BIDV", name="BIDV"),
        BankInfo(code="MOMO", name="MoMo"),
    ]

@router.post("/api/v1/ocr/scan", response_model=ScanResponse)
def scan_receipt(
    file: UploadFile = File(...),
    scan_context: str = Form(...)
):
    return ScanResponse(
        success=False,
        message="OCR not implemented yet"
    )