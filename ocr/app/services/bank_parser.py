"""
Bank detection service.
Identifies the source bank from OCR-extracted text using:
  1. Brand keyword matching (fast)
  2. Structural layout patterns (account number formats, app names)
"""

import re
from app.models.schemas import BankInfo

# Unified Registry (Single Source of Truth)

BANK_REGISTRY: dict[str, dict] = {
    "agribank": {"name": "Agribank", "keywords": ["agribank", "nông nghiệp", "vba", "agribank plus"]},
    "vcb": {"name": "Vietcombank", "keywords": ["vietcombank", "vcb", "ngoại thương", "joint stock commercial bank for foreign trade", "vietcombank.com.vn"]},
    "mb": {"name": "MB Bank", "keywords": ["mb bank", "mbbank", "quân đội", "military commercial joint stock bank", "mb smart bank", "mbmobile"]},
    "tcb": {"name": "Techcombank", "keywords": ["techcombank", "tcb", "kỹ thương", "technological and commercial joint-stock bank", "techcombank.com.vn"]},
    "bidv": {"name": "BIDV", "keywords": ["bidv", "đầu tư và phát triển", "bank for investment and development", "bidv.com.vn", "smartbanking"]},
    "acb": {"name": "ACB", "keywords": ["acb", "á châu", "asia commercial", "acb one"]},
    "vtb": {"name": "VietinBank", "keywords": ["vietinbank", "vietin", "công thương", "vtb", "ipot", "vietinbank ipay"]},
    "vpb": {"name": "VPBank", "keywords": ["vpbank", "vp bank", "việt nam thịnh vượng", "neo", "vpbank neo"]},
    "tpb": {"name": "TPBank", "keywords": ["tpbank", "tp bank", "tiên phong", "tpb", "tập đoàn vàng bạc đá quý đội"]},
    "shb": {"name": "SHB", "keywords": ["shb", "sài gòn - hà nội", "shb mobile"]},
    "hdb": {"name": "HDBank", "keywords": ["hdbank", "hdb", "phát triển nhà", "hdbank tết"]},
    "scb": {"name": "SCB", "keywords": ["scb", "thương mại cổ phần sài gòn"]},
    "stb": {"name": "Sacombank", "keywords": ["sacombank", "stb", "sài gòn thương tín", "sacombank mbanking"]},
    "vib": {"name": "VIB", "keywords": ["vib", "quốc tế", "vietnam international bank", "vib myvib"]},
    "msb": {"name": "MSB", "keywords": ["msb", "hàng hải", "maritime", "msb mbank"]},
    "ocb": {"name": "OCB", "keywords": ["ocb", "phương đông", "orient commercial", "ocb omni"]},
    "tcb_digital": {"name": "LPBank / Cake / Timo", "keywords": ["cake", "timo", "lpb", "lpbank", "bưu điện liên việt", "lienvietpostbank"]},
    "seab": {"name": "SeABank", "keywords": ["seabank", "seab", "đông nam á"]},
    "bab": {"name": "Bac A Bank", "keywords": ["bac a bank", "bắc á"]},
    "bvb": {"name": "BaoViet Bank", "keywords": ["baovietbank", "bảo việt"]},
    "abb": {"name": "ABBank", "keywords": ["abbank", "an bình"]},
    "nab": {"name": "Nam A Bank", "keywords": ["nam a bank", "nam á"]},
    "pgb": {"name": "PG Bank", "keywords": ["pg bank", "petrolimex"]},
    "vab": {"name": "VietABank", "keywords": ["vietabank", "việt á"]},
    "vietbank": {"name": "Vietbank", "keywords": ["vietbank", "việt nam thương tín"]},
    "sgb": {"name": "Saigonbank", "keywords": ["saigonbank", "sài gòn công thương"]},
    "klb": {"name": "Kienlongbank", "keywords": ["kienlongbank", "kiên long"]},
    "vncb": {"name": "CBBank", "keywords": ["cbbank", "xây dựng"]},
    "oceanbank": {"name": "Oceanbank", "keywords": ["oceanbank", "đại dương"]},
    "gpb": {"name": "GPBank", "keywords": ["gpbank", "dầu khí toàn cầu"]},
    "vrb": {"name": "VRB", "keywords": ["vrb", "liên doanh việt - nga"]},
    "ivb": {"name": "Indovina Bank", "keywords": ["indovina", "ivb"]},
    "momo": {"name": "MoMo", "keywords": ["momo", "m_service", "mservice", "ví momo", "momo e-wallet", "momo.vn"]},
    "zalopay": {"name": "ZaloPay", "keywords": ["zalopay", "zalo pay", "vng"]},
    "vnpay": {"name": "VNPay", "keywords": ["vnpay", "vn pay"]},
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
    for bank_id, data in BANK_REGISTRY.items():
        for kw in data["keywords"]:
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

def get_bank_list() -> list[BankInfo]:
    """
    Returns the list of supported banks derived from BANK_REGISTRY.
    Single Source of Truth: adding a bank to BANK_REGISTRY automatically
    exposes it via the /banks API endpoint.
    """
    return [
        BankInfo(id=bank_id, name=data["name"])
        for bank_id, data in BANK_REGISTRY.items()
    ]
