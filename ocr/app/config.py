import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, ValidationError

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
    GEMINI_API_KEYS_RAW: str = Field(default="", alias="GEMINI_API_KEYS")
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "*"

    @property
    def GEMINI_API_KEYS(self) -> list[str]:
        """Convert the raw comma-separated string into a list of keys.
        Falls back to the single GEMINI_API_KEY if the rotation list is empty."""
        raw = self.GEMINI_API_KEYS_RAW.strip()
        if raw:
            keys = [k.strip() for k in raw.split(",") if k.strip()]
            if keys:
                return keys
        return [self.GEMINI_API_KEY]

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