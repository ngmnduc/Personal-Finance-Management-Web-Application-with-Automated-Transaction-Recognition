"""
LLM vision service with Gemini → Qwen (OpenRouter) → GPT-4o-mini fallback chain.

All models are instructed to return a single raw JSON object — no prose,
no markdown fences — to make downstream parsing reliable.
"""

import base64
import logging
from typing import Any
from app.utils.rate_limiter import ProviderRateLimiter
import google.generativeai as genai  # type: ignore
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ── Key rotation ──────────────────────────────────────────────────────────────

_key_index: int = 0


def get_next_gemini_key() -> str:
    """Return the next Gemini API key in round-robin order."""
    global _key_index
    keys = settings.GEMINI_API_KEYS
    key = keys[_key_index % len(keys)]
    _key_index = (_key_index + 1) % len(keys)
    return key

# ── Prompt ────────────────────────────────────────────────────────────────────

EXTRACTION_PROMPT = """You are a financial document OCR assistant.
Analyse the provided image of a bank receipt, transaction notification, or payment confirmation.

Return ONLY a single valid JSON object with exactly these keys:

{
  "amount": <integer — the transaction amount in VND, no separators>,
  "transaction_date": "<string — date in YYYY-MM-DD format, or null if not found>",
  "merchant": "<string — merchant or sender/receiver name, or null if not found>",
  "type": "<string — either INCOME or EXPENSE>",
  "description": "<string — short description or note, or null if not found>"
}

Rules:
- Do NOT include any text outside the JSON object.
- Do NOT wrap the JSON in markdown code fences.
- If a field cannot be determined, use null.
- "type" MUST be exactly "INCOME" or "EXPENSE".
- "amount" MUST be a plain integer (e.g. 1500000, not "1,500,000").
"""

# ── Gemini ────────────────────────────────────────────────────────────────────

async def call_gemini(image_bytes: bytes, mime_type: str, api_key: str | None = None) -> str:
    """
    Call Gemini 2.0 Flash with vision using the provided (or next-in-rotation) key.

    Returns raw LLM response string.
    Raises Exception on API or content error.
    """
    key = api_key or get_next_gemini_key()
    genai.configure(api_key=key)
    model = genai.GenerativeModel("gemini-2.0-flash")

    image_part = {
        "mime_type": mime_type,
        "data": image_bytes,
    }

    response = model.generate_content([EXTRACTION_PROMPT, image_part])

    if not response.text:
        raise ValueError("Gemini returned an empty response.")

    return response.text.strip()


# ── OpenRouter generic caller ─────────────────────────────────────────────────

async def call_openrouter(image_bytes: bytes, mime_type: str, model_id: str) -> str:
    """
    Call any OpenRouter-hosted vision model.

    Uses the OpenAI-compatible chat/completions endpoint.
    Raises httpx.HTTPStatusError or ValueError on failure.
    """
    if not settings.OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not configured.")

    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{b64_image}"

    payload: dict[str, Any] = {
        "model": model_id,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": EXTRACTION_PROMPT},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
        "max_tokens": 512,
        "temperature": 0.1,
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fintrack.app",   # recommended by OpenRouter
        "X-Title": "Finman OCR",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()

    data = resp.json()
    content: str = data["choices"][0]["message"]["content"]

    if not content:
        raise ValueError(f"OpenRouter model '{model_id}' returned an empty response.")

    return content.strip()

gemini_limiter = ProviderRateLimiter(max_calls=15, period_seconds=60.0)
openrouter_limiter = ProviderRateLimiter(max_calls=20, period_seconds=60.0)

async def call_gemini_with_limit(img: bytes, mt: str) -> str:
    await gemini_limiter.acquire()
    return await call_gemini(img, mt)

async def call_openrouter_with_limit(img: bytes, mt: str, model_id: str) -> str:
    await openrouter_limiter.acquire()
    return await call_openrouter(img, mt, model_id)

# ── Fallback chain ────────────────────────────────────────────────────────────

_FALLBACK_CHAIN = [
    ("Gemini 2.0 Flash",    lambda img, mt: call_gemini_with_limit(img, mt)),
    ("Qwen2.5-VL-72B (OR)", lambda img, mt: call_openrouter_with_limit(img, mt, "qwen/qwen2.5-vl-72b-instruct")),
    ("GPT-4o-mini (OR)",    lambda img, mt: call_openrouter_with_limit(img, mt, "openai/gpt-4o-mini")),
]



async def extract_with_llm(image_bytes: bytes, mime_type: str) -> str:
    """
    Try each model in the fallback chain and return the first successful response.

    Strategy:
      1. Try ALL Gemini keys in round-robin (skip on 429, stop on non-retryable).
      2. If all Gemini keys fail → fall through to OpenRouter (Qwen → GPT-4o-mini).

    Args:
        image_bytes: Raw image bytes.
        mime_type:   MIME type string, e.g. "image/jpeg".

    Returns:
        Raw text from the LLM (expected to be a JSON string).

    Raises:
        ValueError: If every model in the chain fails.
    """
    errors: list[str] = []
    global _key_index  # must be declared before first read/write
    num_keys = len(settings.GEMINI_API_KEYS)

    # ── Phase 1: cycle through every Gemini key ──
    for attempt in range(num_keys):
        key = settings.GEMINI_API_KEYS[(_key_index + attempt) % num_keys]
        try:
            logger.info("Gemini attempt %d/%d (key …%s)", attempt + 1, num_keys, key[-6:])
            await gemini_limiter.acquire()
            result = await call_gemini(image_bytes, mime_type, api_key=key)
            logger.info("Gemini succeeded on attempt %d", attempt + 1)
            # Advance the global index so the next request starts from a fresh key
            _key_index = (_key_index + attempt + 1) % num_keys
            return result
        except Exception as exc:
            err_str = str(exc)
            logger.warning("Gemini key …%s failed: %s", key[-6:], exc)
            errors.append(f"Gemini[{attempt}]: {exc}")

            if "429" in err_str or "quota" in err_str.lower() or "rate" in err_str.lower():
                logger.info("Gemini rate limited, trying next key")
                continue  # try next Gemini key

            if "400" in err_str:
                logger.error("Non-retryable Gemini error, skipping to OpenRouter")
                break  # bad prompt / image — no point retrying other keys

    # ── Phase 2: OpenRouter fallback chain ──
    openrouter_models = [
        ("Qwen2.5-VL-72B (OR)", "qwen/qwen2.5-vl-72b-instruct"),
        ("GPT-4o-mini (OR)",    "openai/gpt-4o-mini"),
    ]

    for label, model_id in openrouter_models:
        try:
            logger.info("LLM fallback: attempting %s", label)
            await openrouter_limiter.acquire()
            result = await call_openrouter(image_bytes, mime_type, model_id)
            logger.info("LLM fallback: %s succeeded", label)
            return result
        except Exception as exc:
            err_str = str(exc)
            logger.warning("LLM fallback: %s failed — %s", label, exc)
            errors.append(f"{label}: {exc}")

            if "400" in err_str and "429" not in err_str:
                logger.error("Non-retryable error from %s, stopping chain", label)
                break

    raise ValueError(
        "All LLM models failed to process the image.\n" + "\n".join(errors)
    )
