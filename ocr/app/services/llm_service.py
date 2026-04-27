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

async def call_gemini(image_bytes: bytes, mime_type: str) -> str:
    """
    Call Gemini 2.0 Flash with vision.

    Returns raw LLM response string.
    Raises Exception on API or content error.
    """
    genai.configure(api_key=settings.GEMINI_API_KEY)
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

    Args:
        image_bytes: Raw image bytes.
        mime_type:   MIME type string, e.g. "image/jpeg".

    Returns:
        Raw text from the LLM (expected to be a JSON string).

    Raises:
        ValueError: If every model in the chain fails.
    """
    errors: list[str] = []

    for label, factory in _FALLBACK_CHAIN:
        try:
            logger.info("LLM call: attempting %s", label)
            result = await factory(image_bytes, mime_type)
            logger.info("LLM call: %s succeeded", label)
            return result
        except Exception as exc:  # noqa: BLE001
            err_str = str(exc)
            logger.warning("LLM call: %s failed — %s", label, exc)
            errors.append(f"{label}: {exc}")

            if "400" in err_str and "429" not in err_str:
                logger.error("Non-retryable error, stopping chain: %s", exc)
                break
            
            # 429 hoặc 5xx → thử provider tiếp theo (đã có limiter handle)
            continue
        

    raise ValueError(
        "All LLM models failed to process the image.\n" + "\n".join(errors)
    )
