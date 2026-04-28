import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, ValidationError, field_validator

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE_PATH = os.path.join(BASE_DIR, ".env")

print(f"DEBUG - Đường dẫn: {ENV_FILE_PATH} | Tồn tại: {os.path.exists(ENV_FILE_PATH)}")

# Ép đọc bằng bảng mã utf-8-sig để loại bỏ ký tự tàng hình (BOM) của Windows
load_dotenv(dotenv_path=ENV_FILE_PATH, override=True, encoding="utf-8-sig")

# TEST TRỰC TIẾP: Kiểm tra xem biến đã thực sự chui vào RAM chưa
test_key = os.getenv("GEMINI_API_KEY")
print(f"DEBUG - Biến GEMINI_API_KEY lấy từ .env: {'Thành công (Có dữ liệu)' if test_key else 'THẤT BẠI (Vẫn rỗng)'}")

class Settings(BaseSettings):
    GEMINI_API_KEY: str = Field(..., description="Primary Gemini API key (required)")
    # Comma-separated list of Gemini keys for rotation, e.g. "key1,key2,key3"
    GEMINI_API_KEYS_RAW: str = Field(default="", alias="GEMINI_API_KEYS", validation_alias="GEMINI_API_KEYS")
    GEMINI_API_KEYS: list[str] = []
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "*"

    @field_validator("GEMINI_API_KEYS", mode="before")
    @classmethod
    def build_key_list(cls, v: object, info: object) -> list[str]:
        """Build rotation list from GEMINI_API_KEYS env var (comma-sep).
        Falls back to singleton [GEMINI_API_KEY] if not provided."""
        raw = os.getenv("GEMINI_API_KEYS", "").strip()
        if raw:
            keys = [k.strip() for k in raw.split(",") if k.strip()]
            if keys:
                return keys
        # Fallback: will be overridden in __init__ after primary key resolves
        return []

    def __init__(self, **data):
        super().__init__(**data)
        # Ensure GEMINI_API_KEYS always has at least the primary key
        if not self.GEMINI_API_KEYS:
            object.__setattr__(self, "GEMINI_API_KEYS", [self.GEMINI_API_KEY])

    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8-sig",
        extra="ignore",
        populate_by_name=True,
    )

try:
    settings = Settings()
    print(f"DEBUG - Gemini key rotation: {len(settings.GEMINI_API_KEYS)} key(s) loaded.")
except ValidationError as e:
    print("Environment Variable Error: Thiếu cấu hình GEMINI_API_KEY.")
    raise e

# RENDER ENV REQUIREMENT: GEMINI_API_KEYS="key1,key2,key3"