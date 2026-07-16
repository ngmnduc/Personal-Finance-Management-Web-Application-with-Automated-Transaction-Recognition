"""Recipient name extractor exploiting UPPERCASE unaccented Latin conventions."""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

class RecipientExtractor:
    """Extracts recipient name using uppercase unaccented heuristics."""

    def __init__(self) -> None:
        # Specific to generic label patterns
        self.recipient_keywords: list[str] = [
            r"t[êe]n\s+ng[ưo][ờo]?i\s+th[ụu]\s+h[ưo][ởo]?ng",   # "Tên người thụ hưởng"
            r"ng[ưo][ờo]?i\s+th[ụu]\s+h[ưo][ởo]?ng",             # "Người thụ hưởng"
            r"ng[ưo][ờo]?i\s+nh[ậa]n",                            # "Người nhận"
            r"t[àa]i\s+kho[ảa]n\s+đ[íi]ch",                       # "Tài khoản đích"
            r"beneficiary",
            r"t[êe]n\s+ng[ưo][ờo]?i\s+nh[ậa]n",                  # "Tên người nhận"
            r"đ[ếe]n\s+t[àa]i\s+kho[ảa]n",                        # "Đến tài khoản"
        ]

        # Blacklisted bank and account labels
        self.blacklist_keywords: list[str] = [
            "NGAN HANG", "VIETINBANK", "AGRIBANK", "MBBANK", "TECHCOMBANK",
            "VIETCOMBANK", "BIDV", "TPBANK", "VPBANK", "SACOMBANK",
            "ACB", "HDBANK", "SEABANK", "OCB", "MSB", "LPB", "VIB",
            "SỐ TÀI KHOẢN", "SO TAI KHOAN", "STK", "ACCOUNT",
        ]

    # Internal helpers

    def _is_uppercase_no_accent(self, text: str) -> bool:
        """Check if text is purely uppercase unaccented Latin."""
        if not text:
            return False
        # Reject chars outside A-Z or space
        if not re.match(r"^[A-Z\s]+$", text):
            return False
        # Require alphabetic characters
        if not any(c.isalpha() for c in text):
            return False
        # Reject lowercase or non-ASCII
        if any(c.islower() or ord(c) > 127 for c in text):
            return False
        return True

    def _is_blacklisted(self, text: str) -> bool:
        """Check for blacklisted institution keywords."""
        text_upper = text.upper()
        return any(kw.upper() in text_upper for kw in self.blacklist_keywords)

    def _clean_leading_punctuation(self, text: str) -> str:
        """Strip leading delimiters from OCR text."""
        return re.sub(r"^[:\s\-\=\>\+]+", "", text).strip()

    # Public interface

    def extract(self, raw_text: str) -> Optional[str]:
        """Extract validated recipient name using keyword anchors."""
        if not raw_text:
            return None

        try:
            lines = [ln.strip() for ln in raw_text.split("\n") if ln.strip()]

            for i, line in enumerate(lines):
                for keyword in self.recipient_keywords:
                    match = re.search(keyword, line, re.IGNORECASE)
                    if not match:
                        continue

                    # Inline search candidate
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

                    # Multiline lookahead search
                    for offset in range(1, 5):
                        if i + offset >= len(lines):
                            break

                        lookahead = self._clean_leading_punctuation(lines[i + offset])

                        # Validate uppercase unaccented
                        if not self._is_uppercase_no_accent(lookahead):
                            continue

                        # Validate minimum length
                        if len(lookahead) < 5:
                            continue

                        # Validate word count
                        words = [w for w in lookahead.split() if w]
                        if len(words) < 2:
                            continue

                        # Validate against blacklist
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
