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

# Key rotation

_key_index: int = 0

def get_next_gemini_key() -> str:
    """Return the next Gemini API key in round-robin order."""
    global _key_index
    keys = settings.GEMINI_API_KEYS
    key = keys[_key_index % len(keys)]
    _key_index = (_key_index + 1) % len(keys)
    return key

# Prompt

EXTRACTION_PROMPT = """You are a financial document OCR assistant.
Analyse the provided image of a bank receipt, transaction notification, or payment confirmation.

Return ONLY a single valid JSON object with exactly these keys:

{
  "amount": <integer — the transaction amount in VND, no separators>,
  "transaction_date": "<string — date in YYYY-MM-DD format, or null if not found>",
  "sender_name": "<string — sender name, or null if not found>",
  "receiver_name": "<string — receiver name, or null if not found>",
  "type": "<string — either INCOME or EXPENSE>",
  "description": "<string — short description or note, or null if not found>"
}

Vietnamese field label mapping:
- "sender_name"   matches labels: "Người chuyển", "Người gửi", "Từ", "From", "Bên gửi", "Chủ TK gửi", "Tài khoản nguồn".
- "receiver_name" matches labels: "Người nhận", "Đến", "To", "Bên nhận", "Chủ TK nhận", "Beneficiary", "Tài khoản thụ hưởng".

Rules:
- Do NOT include any text outside the JSON object.
- Do NOT wrap the JSON in markdown code fences.
- If a field cannot be determined, use null.
- "type" MUST be exactly "INCOME" or "EXPENSE".
- "amount" MUST be a plain integer (e.g. 1500000, not "1,500,000").
- Do not attempt to guess or deduce the application owner's identity. Extract raw visible names only.
- If the document indicates a bill payment, invoice, or purchase to a business/shop, map that shop name directly to "receiver_name".
- If only one person's name is visible on the receipt and the transaction "type" is "INCOME", set "sender_name" to null instead of guessing or duplicating.
- If only one person's name is visible on the receipt and the transaction "type" is "EXPENSE", assign that name to "receiver_name" and set "sender_name" to null.
- If the image represents a service payment (e.g., electricity, water, internet, or telecom bills), assign the utility service company/provider name directly to "receiver_name" and set "sender_name" to null. Do not extract customer reference numbers or contract IDs into name fields.
"""

# Gemini

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

# OpenRouter generic caller

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
openrouter_limiter = ProviderRateLimiter(max_calls=10, period_seconds=30.0)
groq_limiter = ProviderRateLimiter(max_calls=10, period_seconds=60.0)

# Groq

async def call_groq(image_bytes: bytes, mime_type: str, model_id: str = "meta-llama/llama-4-scout-17b-16e-instruct") -> str:
    """
    Call Groq Cloud vision model.
    """
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured.")

    import io
    from PIL import Image

    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.thumbnail((1024, 1024))
        out_buf = io.BytesIO()
        img.save(out_buf, format="JPEG", quality=80)
        image_bytes = out_buf.getvalue()
        mime_type = "image/jpeg"
    except Exception as e:
        logger.warning("Failed to compress image for Groq: %s", e)

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
        "temperature": 0.1,
    }

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()

    data = resp.json()
    content: str = data["choices"][0]["message"]["content"]

    if not content:
        raise ValueError(f"Groq model '{model_id}' returned an empty response.")

    return content.strip()

# Fallback chain

async def extract_with_llm(image_bytes: bytes, mime_type: str) -> str:
    """
    Try each model in the fallback chain and return the first successful response.

    Chain order (priority):
      1. Gemini 2.0 Flash (direct, key rotation)   — free tier, fastest
      2. Llama-4-Scout (Groq)                       — free tier, good vision
      3. Llama-4-Maverick (Groq)                    — free tier, stronger fallback
      4. Gemini-2.5-Flash (OpenRouter free)          — free tier OR
      5. Qwen2.5-VL-72B (OpenRouter)                — paid, high quality
      6. GPT-4o-mini (OpenRouter)                   — paid last resort

    Special handling:
      - Gemini 429 (quota/day exceeded) → skip immediately, try free alternatives
      - OpenRouter 402 (no credit)      → skip all remaining OR models
    """
    errors: list[str] = []
    openrouter_out_of_credit = False
    gemini_quota_exceeded = False

    fallback_chain = [
        # (label, call_func, limiter, is_openrouter, is_gemini_direct)
        ("Gemini-2.0-Flash (direct)",
            lambda: call_gemini(image_bytes, mime_type),
            gemini_limiter, False, True),
        ("Llama-4-Scout (Groq)",
            lambda: call_groq(image_bytes, mime_type, "meta-llama/llama-4-scout-17b-16e-instruct"),
            groq_limiter, False, False),
        ("Llama-4-Maverick (Groq)",
            lambda: call_groq(image_bytes, mime_type, "meta-llama/llama-4-maverick-17b-128e-instruct"),
            groq_limiter, False, False),
        ("Gemini-2.5-Flash (OR Free)",
            lambda: call_openrouter(image_bytes, mime_type, "google/gemini-2.5-flash:free"),
            openrouter_limiter, True, False),
        ("Qwen2.5-VL-72B (OR)",
            lambda: call_openrouter(image_bytes, mime_type, "qwen/qwen2.5-vl-72b-instruct"),
            openrouter_limiter, True, False),
        ("GPT-4o-mini (OR)",
            lambda: call_openrouter(image_bytes, mime_type, "openai/gpt-4o-mini"),
            openrouter_limiter, True, False),
    ]

    for label, call_func, limiter, is_openrouter, is_gemini_direct in fallback_chain:
        # Gemini daily quota exhausted — skip remaining direct calls
        if is_gemini_direct and gemini_quota_exceeded:
            logger.warning("LLM fallback: skipping %s — daily quota exhausted", label)
            errors.append(f"{label}: skipped (daily quota)")
            continue

        # OpenRouter out of credit — skip remaining OR models
        if is_openrouter and openrouter_out_of_credit:
            logger.warning("LLM fallback: skipping %s — OpenRouter out of credit", label)
            errors.append(f"{label}: skipped (OpenRouter 402)")
            continue

        try:
            logger.info("LLM fallback: attempting %s", label)
            await limiter.acquire()
            result = await call_func()
            logger.info("LLM fallback: %s succeeded", label)
            return result
        except Exception as exc:
            exc_str = str(exc)

            # Gemini 429 daily quota — skip all direct calls (same project)
            if is_gemini_direct and ("429" in exc_str or "quota" in exc_str.lower()):
                if "PerDay" in exc_str or "free_tier" in exc_str:
                    logger.error(
                        "LLM fallback: %s — daily quota exceeded (resets 7AM VN). "
                        "Switching to free Groq/OR alternatives.", label
                    )
                    gemini_quota_exceeded = True
                else:
                    # Per-minute rate limit — log and continue
                    logger.warning("LLM fallback: %s — per-minute rate limit, continuing", label)

            # OpenRouter 402 — skip all remaining OR models
            elif is_openrouter and "402" in exc_str:
                logger.error(
                    "LLM fallback: %s — 402 Payment Required. "
                    "Skipping all remaining OpenRouter models.", label
                )
                openrouter_out_of_credit = True
            else:
                logger.warning("LLM fallback: %s failed — %s", label, exc)

            errors.append(f"{label}: {exc_str[:120]}")

    raise ValueError(
        "All LLM models failed to process the image.\n" + "\n".join(errors)
    )