import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, ValidationError

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE_PATH = os.path.join(BASE_DIR, ".env")

print(f"DEBUG - Env Path: {ENV_FILE_PATH} | Exists: {os.path.exists(ENV_FILE_PATH)}")

# Force reading with utf-8-sig to remove hidden BOM characters on Windows
load_dotenv(dotenv_path=ENV_FILE_PATH, override=True, encoding="utf-8-sig")

# Direct test: verify that the environment variable is loaded into memory
test_key = os.getenv("GEMINI_API_KEY")
print(f"DEBUG - GEMINI_API_KEY from .env: {'Success (Has data)' if test_key else 'FAIL (Empty)'}")

class Settings(BaseSettings):
    GEMINI_API_KEY: str = Field(..., description="Primary Gemini API key (required)")
    # Comma-separated list of Gemini keys for rotation, e.g. "key1,key2,key3"
    GEMINI_API_KEYS_RAW: str = Field(default="", alias="GEMINI_API_KEYS")
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    PORT: int = 8001
    ALLOWED_ORIGINS: str = "*"
    BE_SERVICE_URL: str = "http://localhost:3000"
    INTERNAL_SECRET: str = "change_this_secret"

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
    print("Environment Variable Error: Missing GEMINI_API_KEY configuration.")
    raise e

# RENDER ENV REQUIREMENT: GEMINI_API_KEYS="key1,key2,key3"