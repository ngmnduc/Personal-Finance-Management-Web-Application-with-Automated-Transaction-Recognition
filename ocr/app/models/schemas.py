from pydantic import BaseModel


class ExtractedData(BaseModel):
    amount: int | None = None
    transaction_date: str | None = None
    merchant: str | None = None
    type: str | None = None
    bank_detected: str | None = None
    confidence: float = 0.0
    error: str | None = None


class ScanResponse(BaseModel):
    extracted: ExtractedData
    extracted_text: str = ""
    suggested_category_id: str | None = None
    default_wallet_id: str | None = None


class BankInfo(BaseModel):
    id: str
    name: str


class HealthResponse(BaseModel):
    status: str
    service: str