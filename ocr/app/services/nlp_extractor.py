"""NLP normalisation layer for LLM and PDF extraction streams."""

import re
import json
import unicodedata
from datetime import datetime, date
from typing import Any

# Placeholder for demo. Dynamically fetch in production.

def normalize_text_for_matching(text: str) -> str:
    if not text:
        return ""
    text = text.strip().upper()
    text = text.replace("Đ", "D")
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return text

# JSON extraction (LLM stream)

def clean_and_parse_json(raw_text: str, owner_name: str | None = None) -> dict:
    """Extract JSON object from LLM response reliably."""
    start_idx = raw_text.find('{')
    end_idx = raw_text.rfind('}')

    if start_idx == -1 or end_idx == -1 or start_idx > end_idx:
        raise ValueError(f"No JSON object found in LLM response: {raw_text[:200]!r}")

    json_str = raw_text[start_idx:end_idx + 1]

    try:
        parsed_dict = json.loads(json_str)
        parsed_dict = json.loads(json_str)
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON parse error: {exc}. Raw block: {json_str[:200]!r}") from exc
        raise ValueError(f"JSON parse error: {exc}. Raw block: {json_str[:200]!r}") from exc

    tx_type = parsed_dict.get("type")
    sender_name   = parsed_dict.pop("sender_name", None)
    receiver_name = parsed_dict.pop("receiver_name", None)

    final_merchant = None

    owner_identities = set()
    if owner_name:
        owner_identities.add(normalize_text_for_matching(owner_name))

    if tx_type == "INCOME":
        norm_sender = normalize_text_for_matching(sender_name) if sender_name else ""
        if norm_sender and norm_sender not in owner_identities:
            final_merchant = sender_name

    elif tx_type == "EXPENSE":
        norm_receiver = normalize_text_for_matching(receiver_name) if receiver_name else ""
        if norm_receiver and norm_receiver not in owner_identities:
            final_merchant = receiver_name
        else:
            norm_sender = normalize_text_for_matching(sender_name) if sender_name else ""
            if norm_sender and norm_sender not in owner_identities:
                final_merchant = sender_name

    parsed_dict["merchant"] = final_merchant
    return parsed_dict

# Regex extraction (PDF stream)

# Matches amounts like "1,500,000", "1500000", "1.500.000", "1500000 đ", "VND 1,500,000"
_AMOUNT_RE = re.compile(
    r"(?:vnd|vnđ|đ|₫)?\s*([\d]{1,3}(?:[.,]\d{3})+|\d{4,})\s*(?:vnd|vnđ|đ|₫)?",
    re.IGNORECASE,
)

# date formats
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
    """Extract structured fields from PDF text using regex."""
    # Extract amount
    amount: Any = None
    amount_match = _AMOUNT_RE.search(raw_text)
    if amount_match:
        amount = amount_match.group(1)  # still a raw string; normalised later

    # Extract date
    transaction_date: str | None = None
    date_match = _DATE_RE.search(raw_text)
    if date_match:
        transaction_date = date_match.group()

    # Extract transaction type
    tx_type: str | None = None
    if _INCOME_KEYWORDS.search(raw_text):
        tx_type = "INCOME"
    elif _EXPENSE_KEYWORDS.search(raw_text):
        tx_type = "EXPENSE"

    # Extract merchant
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

# Normalisation helpers

def normalize_amount(raw: Any) -> int:
    """Strip non-digits and coerce to int."""
    if raw is None:
        return 0
    cleaned = re.sub(r"[^\d]", "", str(raw))
    return int(cleaned) if cleaned else 0

def normalize_date(raw: str | None) -> str:
    """Parse date string to YYYY-MM-DD format."""
    if not raw:
        return date.today().isoformat()

    # Clean spacing
    cleaned = re.sub(r"\s+", " ", raw.strip())

    # Extract date prefix
    match = re.match(
        r"^("
        r"\d{1,2}[/\-]\d{1,2}[/\-]\d{4}\s+\d{1,2}[.:]\d{1,2}[.:]\d{1,2}"
        r"|\d{1,2}[/\-]\d{1,2}[/\-]\d{4}\s+\d{1,2}[.:]\d{1,2}"
        r"|\d{4}[/\-]\d{1,2}[/\-]\d{1,2}\s+\d{1,2}[.:]\d{1,2}[.:]\d{1,2}"
        r"|\d{4}[/\-]\d{1,2}[/\-]\d{1,2}"
        r"|\d{1,2}[/\-]\d{1,2}[/\-]\d{4}"
        r"|\d{1,2}[/\-]\d{1,2}[/\-]\d{2}"
        r")",
        cleaned,
        re.IGNORECASE
    )
    if match:
        cleaned = match.group(1)

    # Try common formats
    for fmt in (
        # Full datetime formats
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H.%M.%S",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H.%M.%S",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y %H.%M",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y %H.%M",
        "%Y-%m-%d %H:%M:%S",
        
        # Standalone date formats
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%d-%m-%y",
        "%d/%m/%y",
        "%m/%d/%Y",
    ):
        try:
            return datetime.strptime(cleaned, fmt).date().isoformat()
        except ValueError:
            continue

    # Fallback to dateutil or today
    try:
        from dateutil import parser as du_parser  # type: ignore
        return du_parser.parse(raw, dayfirst=True).date().isoformat()
    except Exception:
        return date.today().isoformat()

def normalize_type(raw: str | None, scan_context: str) -> str:
    """Map raw type to INCOME or EXPENSE."""
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

    # Fallback to provided context
    ctx = (scan_context or "").strip().upper()
    if ctx in ("INCOME", "EXPENSE"):
        return ctx

    return "EXPENSE"  # safe default

# Confidence scoring

def calculate_confidence(extracted: dict, is_pdf: bool = False) -> float:
    """Calculate heuristic confidence score."""
    if is_pdf:
        return 0.95

    score = 0.0

    # Weight core fields
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
