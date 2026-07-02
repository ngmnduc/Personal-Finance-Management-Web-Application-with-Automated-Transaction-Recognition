import os
import hashlib
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, ValidationError

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(dotenv_path=ENV_FILE_PATH, override=True, encoding="utf-8-sig")

test_key = os.getenv("GEMINI_API_KEY")
if test_key:
    key_hint = test_key[:6] + "..." + test_key[-4:]
    key_hash = hashlib.sha256(test_key.encode()).hexdigest()[:8]
    print(f"DEBUG - Active GEMINI_KEY: {key_hint} (hash: {key_hash})")

class Settings(BaseSettings):
    GEMINI_API_KEY: str = Field(..., description="Primary Gemini API key")
    GEMINI_API_KEYS_RAW: str = Field(default="", alias="GEMINI_API_KEYS")
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    GROQ_API_KEY: str = ""
    PORT: int = 8001
    ALLOWED_ORIGINS: str = "*"
    BE_SERVICE_URL: str = "http://localhost:3000"
    INTERNAL_SECRET: str = "change_this_secret"
    OCR_MODE: str = "CLOUD_API"

    @property
    def GEMINI_API_KEYS(self) -> list[str]:
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
    print("Environment Variable Error: Missing GEMINI_API_KEY configuration.")
    raise e