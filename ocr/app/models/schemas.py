from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    service: str

class BankInfo(BaseModel):
    code: str
    name: str

class ScanResponse(BaseModel):
    success: bool
    message: str