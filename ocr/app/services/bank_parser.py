"""
Bank detection service.
Identifies the source bank from OCR-extracted text using:
  1. Brand keyword matching (fast)
  2. Structural layout patterns (account number formats, app names)
"""

import re

# Keyword registry

BANK_KEYWORDS: dict[str, list[str]] = {
    "agribank": ["agribank", "nông nghiệp", "vba", "agribank plus"],
    "vcb": ["vietcombank", "vcb", "ngoại thương", "joint stock commercial bank for foreign trade", "vietcombank.com.vn"],
    "mb": ["mb bank", "mbbank", "quân đội", "military commercial joint stock bank", "mb smart bank", "mbmobile"],
    "tcb": ["techcombank", "tcb", "kỹ thương", "technological and commercial joint-stock bank", "techcombank.com.vn"],
    "bidv": ["bidv", "đầu tư và phát triển", "bank for investment and development", "bidv.com.vn", "smartbanking"],
    "acb": ["acb", "á châu", "asia commercial", "acb one"],
    "vtb": ["vietinbank", "vietin", "công thương", "vtb", "ipot", "vietinbank ipay"],
    "vpb": ["vpbank", "vp bank", "việt nam thịnh vượng", "neo", "vpbank neo"],
    "tpb": ["tpbank", "tp bank", "tiên phong", "tpb", "tập đoàn vàng bạc đá quý đội"],
    "shb": ["shb", "sài gòn - hà nội", "shb mobile"],
    "hdb": ["hdbank", "hdb", "phát triển nhà", "hdbank tết"],
    "scb": ["scb", "thương mại cổ phần sài gòn"],
    "stb": ["sacombank", "stb", "sài gòn thương tín", "sacombank mbanking"],
    "vib": ["vib", "quốc tế", "vietnam international bank", "vib myvib"],
    "msb": ["msb", "hàng hải", "maritime", "msb mbank"],
    "ocb": ["ocb", "phương đông", "orient commercial", "ocb omni"],
    "tcb_digital": ["cake", "timo", "lpb", "lpbank", "bưu điện liên việt", "lienvietpostbank"],
    "seab": ["seabank", "seab", "đông nam á"],
    "bab": ["bac a bank", "bắc á"],
    "bvb": ["baovietbank", "bảo việt"],
    "abb": ["abbank", "an bình"],
    "nab": ["nam a bank", "nam á"],
    "pgb": ["pg bank", "petrolimex"],
    "vab": ["vietabank", "việt á"],
    "vietbank": ["vietbank", "việt nam thương tín"],
    "sgb": ["saigonbank", "sài gòn công thương"],
    "klb": ["kienlongbank", "kiên long"],
    "vncb": ["cbbank", "xây dựng"],
    "oceanbank": ["oceanbank", "đại dương"],
    "gpb": ["gpbank", "dầu khí toàn cầu"],
    "vrb": ["vrb", "liên doanh việt - nga"],
    "ivb": ["indovina", "ivb"],
    "momo": ["momo", "m_service", "mservice", "ví momo", "momo e-wallet", "momo.vn"],
    "zalopay": ["zalopay", "zalo pay", "vng"],
    "vnpay": ["vnpay", "vn pay"]
}

# Layout / structural patterns

# Pattern: (bank_id, compiled regex)
_LAYOUT_PATTERNS: list[tuple[str, re.Pattern]] = [
    # VCB: 16-digit account starting with 007
    ("vcb", re.compile(r"\b007\s*\d{13}\b")),
    # MB: Smart Banking label
    ("mb", re.compile(r"smart\s*banking", re.IGNORECASE)),
    # TCB: Techcombank account format (16 chars, often starts with 19)
    ("tcb", re.compile(r"\b19\d{14}\b")),
    # BIDV: SmartBanking label (their specific branding)
    ("bidv", re.compile(r"bidv\s*smart\s*banking", re.IGNORECASE)),
    # MoMo: phone-linked wallet number block
    ("momo", re.compile(r"s[oố]\s*(đi[eệ]n tho[aạ]i|phone)[:\s]*0[3-9]\d{8}", re.IGNORECASE)),
]

# Public API

def detect_bank_by_keyword(text: str) -> str | None:
    """
    Scan text for known bank brand keywords.

    Returns the bank_id (e.g. 'vcb') on first match, or None.
    """
    normalized = text.lower()
    for bank_id, keywords in BANK_KEYWORDS.items():
        for kw in keywords:
            if kw in normalized:
                return bank_id
    return None

def detect_bank_by_layout(text: str) -> str | None:
    """
    Detect bank via structural patterns (account formats, app labels).

    Returns the bank_id on first match, or None.
    """
    for bank_id, pattern in _LAYOUT_PATTERNS:
        if pattern.search(text):
            return bank_id
    return None

def detect_bank(text: str) -> str | None:
    """
    Primary entry-point: keyword scan first, then layout fallback.

    Returns bank_id string (e.g. 'vcb', 'mb') or None if unrecognised.
    """
    return detect_bank_by_keyword(text) or detect_bank_by_layout(text)
