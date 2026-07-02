"""
Recipient name extractor for Vietnamese bank transfer receipts.

Contract:
    Vietnamese bank receipts print the beneficiary name in UPPERCASE, unaccented
    Latin characters (e.g. "NGUYEN THI HUYEN").  This extractor exploits that
    strict typographic convention to discriminate the name from surrounding noise,
    bank labels, and accented Vietnamese text.

    ``extract()`` returns the validated uppercase name string, or ``None``.
"""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

class RecipientExtractor:
    """Extractor for recipient names from Vietnamese bank receipts.

    The core heuristic: recipient names are printed in UPPERCASE WITHOUT ACCENTS.
    Any line containing lowercase letters OR Vietnamese diacritics is rejected,
    which cleanly separates names from bank labels and surrounding OCR noise.
    """

    def __init__(self) -> None:
# Anchor keyword patterns
        # Each pattern matches a Vietnamese (or English) label that precedes
        # the recipient name field.  Ordered from most-specific to least.
        self.recipient_keywords: list[str] = [
            r"t[êe]n\s+ng[ưo][ờo]?i\s+th[ụu]\s+h[ưo][ởo]?ng",   # "Tên người thụ hưởng"
            r"ng[ưo][ờo]?i\s+th[ụu]\s+h[ưo][ởo]?ng",             # "Người thụ hưởng"
            r"ng[ưo][ờo]?i\s+nh[ậa]n",                            # "Người nhận"
            r"t[àa]i\s+kho[ảa]n\s+đ[íi]ch",                       # "Tài khoản đích"
            r"beneficiary",
            r"t[êe]n\s+ng[ưo][ờo]?i\s+nh[ậa]n",                  # "Tên người nhận"
            r"đ[ếe]n\s+t[àa]i\s+kho[ảa]n",                        # "Đến tài khoản"
        ]

# Blacklisted tokens
        # Bank / institution names and account-number labels that must never
        # be returned as a recipient name even when they happen to be uppercase.
        self.blacklist_keywords: list[str] = [
            "NGAN HANG", "VIETINBANK", "AGRIBANK", "MBBANK", "TECHCOMBANK",
            "VIETCOMBANK", "BIDV", "TPBANK", "VPBANK", "SACOMBANK",
            "ACB", "HDBANK", "SEABANK", "OCB", "MSB", "LPB", "VIB",
            "SỐ TÀI KHOẢN", "SO TAI KHOAN", "STK", "ACCOUNT",
        ]

# Internal helpers

    def _is_uppercase_no_accent(self, text: str) -> bool:
        """Return True iff ``text`` is strictly uppercase unaccented Latin.

        Conditions (all must hold):
          - Every character is an ASCII uppercase letter (A–Z) or a space.
          - At least one alphabetic character is present.
          - The string contains **no** lowercase letters.
          - The string contains **no** accented / non-ASCII characters.

        This triple guard explicitly rejects:
          - Accented Vietnamese text (e.g. "Nguyễn Thị Huyền")
          - Mixed-case labels (e.g. "Techcombank")
          - Digit-only strings
        """
        if not text:
            return False
        # Reject if any char is outside the set [A-Z, space]
        if not re.match(r"^[A-Z\s]+$", text):
            return False
        # Require at least one alphabetic character
        if not any(c.isalpha() for c in text):
            return False
        # Belt-and-suspenders: reject any lowercase or non-ASCII char
        if any(c.islower() or ord(c) > 127 for c in text):
            return False
        return True

    def _is_blacklisted(self, text: str) -> bool:
        """Return True if ``text`` contains any blacklisted institution keyword."""
        text_upper = text.upper()
        return any(kw.upper() in text_upper for kw in self.blacklist_keywords)

    def _clean_leading_punctuation(self, text: str) -> str:
        """Strip leading delimiter characters commonly OCR'd around field values."""
        return re.sub(r"^[:\s\-\=\>\+]+", "", text).strip()

# Public interface

    def extract(self, raw_text: str) -> Optional[str]:
        """Extract the recipient name from raw OCR text.

        Algorithm:
          For each anchor keyword found on a line:
            1. Try to find a valid name on the **same line** (after the keyword).
            2. Look-ahead up to **4 lines forward** for a valid name.
          The first candidate that passes all four validation conditions is returned.

        Validation conditions (all must pass for a candidate to be accepted):
          A. ``_is_uppercase_no_accent()`` — strictly uppercase unaccented Latin only.
          B. Minimum length ≥ 5 characters (rejects short OCR artefacts).
          C. Minimum 2 whitespace-separated words (typical "FIRST LAST" structure).
          D. ``_is_blacklisted()`` is False.

        Args:
            raw_text: Raw multi-line string from the OCR engine.

        Returns:
            Validated uppercase recipient name, or ``None`` if not found.
        """
        if not raw_text:
            return None

        try:
            lines = [ln.strip() for ln in raw_text.split("\n") if ln.strip()]

            for i, line in enumerate(lines):
                for keyword in self.recipient_keywords:
                    match = re.search(keyword, line, re.IGNORECASE)
                    if not match:
                        continue

                    # 1. Same-line candidate (text following the keyword)
                    after_keyword = line[match.end():].strip()
                    cleaned_inline = self._clean_leading_punctuation(after_keyword)

                    if (
                        cleaned_inline
                        and self._is_uppercase_no_accent(cleaned_inline)
                        and not self._is_blacklisted(cleaned_inline)
                    ):
                        logger.debug(
                            "RecipientExtractor [inline] keyword=%r → %r",
                            keyword, cleaned_inline,
                        )
                        return cleaned_inline

                    # 2. Multi-line look-ahead (up to 4 lines forward)
                    for offset in range(1, 5):
                        if i + offset >= len(lines):
                            break

                        lookahead = self._clean_leading_punctuation(lines[i + offset])

                        # Condition A: uppercase unaccented Latin only
                        if not self._is_uppercase_no_accent(lookahead):
                            continue

                        # Condition B: minimum length
                        if len(lookahead) < 5:
                            continue

                        # Condition C: at least two words
                        words = [w for w in lookahead.split() if w]
                        if len(words) < 2:
                            continue

                        # Condition D: not a blacklisted institution token
                        if self._is_blacklisted(lookahead):
                            continue

                        logger.debug(
                            "RecipientExtractor [lookahead+%d] keyword=%r → %r",
                            offset, keyword, lookahead,
                        )
                        return lookahead

        except Exception:
            logger.exception("RecipientExtractor.extract() encountered an unexpected error")

        return None
