"""
NLP / text normalisation layer.
Handles two input streams:
  - LLM stream  → clean_and_parse_json()
  - PDF stream  → extract_by_regex()

Both outputs are normalised through shared helpers before being
returned to the router.
"""

import re
import json
from datetime import datetime, date
from typing import Any


# ── JSON extraction (LLM stream) ──────────────────────────────────────────────

def clean_and_parse_json(raw_text: str) -> dict:
    """
    Strip prose around JSON and parse the first JSON object block found.

    LLMs sometimes wrap their answer in markdown fences or add explanations.
    This extracts just the `{...}` block robustly.

    Args:
        raw_text: Raw string returned by the LLM.

    Returns:
        Parsed dict.

    Raises:
        ValueError: If no valid JSON object is found.
    """
    # Remove markdown code fences if present
    cleaned = re.sub(r"```(?:json)?", "", raw_text).strip()

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in LLM response: {raw_text[:200]!r}")

    try:
        return json.loads(match.group())
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON parse error: {exc}. Raw block: {match.group()[:200]!r}") from exc


# ── Regex extraction (PDF stream) ─────────────────────────────────────────────

# Matches amounts like "1,500,000", "1500000", "1.500.000", "1500000 đ", "VND 1,500,000"
_AMOUNT_RE = re.compile(
    r"(?:vnd|vnđ|đ|₫)?\s*([\d]{1,3}(?:[.,]\d{3})+|\d{4,})\s*(?:vnd|vnđ|đ|₫)?",
    re.IGNORECASE,
)

# ISO-style and common Vietnamese date formats
_DATE_RE = re.compile(
    r"""
    (?:                        # group of alternatives
        \d{4}[-/]\d{1,2}[-/]\d{1,2}   # YYYY-MM-DD / YYYY/MM/DD
      | \d{1,2}[-/]\d{1,2}[-/]\d{4}   # DD-MM-YYYY / DD/MM/YYYY
      | \d{1,2}[-/]\d{1,2}[-/]\d{2}   # DD-MM-YY
    )
    """,
    re.VERBOSE,
)

_INCOME_KEYWORDS = re.compile(
    r"\b(?:nhận|thu nhập|tiền vào|cộng|credit|income|deposit|nạp|hoàn tiền|refund)\b",
    re.IGNORECASE,
)
_EXPENSE_KEYWORDS = re.compile(
    r"\b(?:thanh toán|chuyển khoản|rút|mua|chi|trừ|debit|expense|payment|withdraw|purchase)\b",
    re.IGNORECASE,
)


def extract_by_regex(raw_text: str) -> dict:
    """
    Extract structured fields from plain PDF text using regex.

    Returns a dict with the same shape expected from the LLM:
    {amount, transaction_date, merchant, type, description}
    """
    # Amount: take the first (and usually largest) hit
    amount: Any = None
    amount_match = _AMOUNT_RE.search(raw_text)
    if amount_match:
        amount = amount_match.group(1)  # still a raw string; normalised later

    # Date
    transaction_date: str | None = None
    date_match = _DATE_RE.search(raw_text)
    if date_match:
        transaction_date = date_match.group()

    # Type via keyword scan
    tx_type: str | None = None
    if _INCOME_KEYWORDS.search(raw_text):
        tx_type = "INCOME"
    elif _EXPENSE_KEYWORDS.search(raw_text):
        tx_type = "EXPENSE"

    # Merchant: first non-blank line that isn't a date / pure-number
    merchant: str | None = None
    for line in raw_text.splitlines():
        stripped = line.strip()
        if (
            stripped
            and len(stripped) > 3
            and not re.fullmatch(r"[\d\s.,:/\\-]+", stripped)
        ):
            merchant = stripped
            break

    return {
        "amount": amount,
        "transaction_date": transaction_date,
        "merchant": merchant,
        "type": tx_type,
        "description": None,
    }


# ── Normalisation helpers ─────────────────────────────────────────────────────

def normalize_amount(raw: Any) -> int:
    """
    Strip all non-digit characters and coerce to int.

    Examples:
        "1,500,000 đ" → 1500000
        1500000.0     → 1500000
        None          → 0
    """
    if raw is None:
        return 0
    cleaned = re.sub(r"[^\d]", "", str(raw))
    return int(cleaned) if cleaned else 0


def normalize_date(raw: str | None) -> str:
    """
    Parse a raw date string to YYYY-MM-DD.
    Falls back to today's date if the input is None or unparseable.
    """
    if not raw:
        return date.today().isoformat()

    # Try common formats
    for fmt in (
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%d-%m-%y",
        "%d/%m/%y",
        "%m/%d/%Y",
    ):
        try:
            return datetime.strptime(raw.strip(), fmt).date().isoformat()
        except ValueError:
            continue

    # Last resort: let dateutil handle it if installed, else today
    try:
        from dateutil import parser as du_parser  # type: ignore
        return du_parser.parse(raw, dayfirst=True).date().isoformat()
    except Exception:
        return date.today().isoformat()


def normalize_type(raw: str | None, scan_context: str) -> str:
    """
    Map raw type string (from LLM or regex) to INCOME or EXPENSE.

    Falls back to scan_context hint (e.g. "EXPENSE") provided by the caller.
    """
    _map = {
        "income": "INCOME",
        "thu": "INCOME",
        "nhận": "INCOME",
        "credit": "INCOME",
        "expense": "EXPENSE",
        "chi": "EXPENSE",
        "debit": "EXPENSE",
        "payment": "EXPENSE",
        "purchase": "EXPENSE",
    }

    if raw:
        normalised = raw.strip().lower()
        # Direct enum match
        if normalised in ("income", "expense"):
            return normalised.upper()
        for key, value in _map.items():
            if key in normalised:
                return value

    # Fall back to caller-supplied context
    ctx = (scan_context or "").strip().upper()
    if ctx in ("INCOME", "EXPENSE"):
        return ctx

    return "EXPENSE"  # safe default


# ── Confidence scoring ────────────────────────────────────────────────────────

def calculate_confidence(extracted: dict, is_pdf: bool = False) -> float:
    """
    Heuristic confidence score in [0.0, 1.0].

    PDF path is high-confidence by nature (structured digital text).
    LLM path accumulates score based on successfully extracted fields.
    """
    if is_pdf:
        return 0.95

    score = 0.0

    # Core fields weighted by importance
    if extracted.get("amount") and extracted["amount"] != 0:
        score += 0.35
    if extracted.get("transaction_date"):
        score += 0.25
    if extracted.get("type") in ("INCOME", "EXPENSE"):
        score += 0.20
    if extracted.get("merchant"):
        score += 0.10
    if extracted.get("description"):
        score += 0.10

    return round(min(score, 1.0), 2)
