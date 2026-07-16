"""Amount extractor returning raw digit strings."""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

class AmountExtractor:
    """Extractor for transaction amounts from Vietnamese bank receipts."""

    def __init__(self) -> None:
        # Specific to generic label patterns
        self.label_patterns: list[str] = [
            r"s[ốo]\s+ti[ềe]n\s+chuy[ểe]n",        # "Số tiền chuyển"
            r"s[ốo]\s+ti[ềe]n\s+giao\s+d[ịi]ch",   # "Số tiền giao dịch"
            r"s[ốo]\s+ti[ềe]n",                      # "Số tiền"
            r"amount",
            r"value",
        ]

        # Value patterns: suffixed and bare segmented
        self.amount_patterns: list[str] = [
            r"([+-]?\s*\d{1,3}(?:[.,]\d{3})+)\s*(?:VND|VNĐ|vnd|vnđ|đ|d\b)",
            r"([+-]?\s*\d{1,3}(?:[.,]\d{3})+)(?!\d)",
        ]

    # Internal helpers

    def _normalize(self, val: str) -> Optional[str]:
        """Strip formatting to return pure digit string."""
        if not val:
            return None

        # Remove currency suffix
        cleaned = re.sub(r"(?:VND|VNĐ|vnd|vnđ|đ|d\b)", "", val, flags=re.IGNORECASE)
        # Strip sign symbols
        cleaned = re.sub(r"[+-]", "", cleaned)
        # Strip separators and spaces
        cleaned = re.sub(r"[.,\s]", "", cleaned)

        result = cleaned.strip()
        return result if result.isdigit() else None

    # Public interface

    def extract(self, raw_text: str) -> Optional[str]:
        """Extract amount string using 3-strategy waterfall."""
        if not raw_text:
            return None

        try:
            lines = [ln.strip() for ln in raw_text.split("\n") if ln.strip()]

            #  1 Label-anchored search
            for i, line in enumerate(lines):
                for label in self.label_patterns:
                    label_match = re.search(label, line, re.IGNORECASE)
                    if not label_match:
                        continue

                    # Search value on same line
                    after_label = line[label_match.end():].strip()
                    inline_match = re.search(
                        r"(\d{1,3}(?:[.,]\d{3})*(?:\s*(?:VND|VNĐ|vnd|vnđ|đ|d\b))?)",
                        after_label,
                        re.IGNORECASE,
                    )
                    if inline_match:
                        val = inline_match.group(1).strip()
                        if val and any(c.isdigit() for c in val):
                            normalized = self._normalize(val)
                            if normalized:
                                logger.debug(
                                    "AmountExtractor [S1-inline] label=%r → %s", label, normalized
                                )
                                return normalized

                    # Search value on next line
                    if i + 1 < len(lines):
                        next_line = lines[i + 1]

                        for pat in self.amount_patterns:
                            next_match = re.search(pat, next_line, re.IGNORECASE)
                            if next_match:
                                normalized = self._normalize(next_match.group(0))
                                if normalized:
                                    logger.debug(
                                        "AmountExtractor [S1-next] label=%r → %s", label, normalized
                                    )
                                    return normalized

                        # Fallback for plain number line
                        if re.match(
                            r"^[+-]?\s*[\d.,]+\s*(?:VND|VNĐ|vnd|vnđ|đ|d)?$",
                            next_line,
                            re.IGNORECASE,
                        ):
                            normalized = self._normalize(next_line)
                            if normalized:
                                logger.debug(
                                    "AmountExtractor [S1-plain] label=%r → %s", label, normalized
                                )
                                return normalized

            # 2: Global currency-suffixed scan
            currency_match = re.search(self.amount_patterns[0], raw_text, re.IGNORECASE)
            if currency_match:
                normalized = self._normalize(currency_match.group(0))
                if normalized:
                    logger.debug("AmountExtractor [S2-currency] → %s", normalized)
                    return normalized

            # 3: Global bare segmented scan
            for m in re.finditer(self.amount_patterns[1], raw_text):
                candidate = m.group(1).strip()

                # Reject date-shaped segments
                parts = re.split(r"[.,]", candidate)
                if (
                    len(parts) == 3
                    and len(parts[0]) <= 2
                    and len(parts[1]) <= 2
                    and len(parts[2]) == 4
                ):
                    continue

                # Reject invalid digit counts
                digits_only = re.sub(r"[^\d]", "", candidate)
                if 4 <= len(digits_only) <= 12:
                    normalized = self._normalize(candidate)
                    if normalized:
                        logger.debug("AmountExtractor [S3-bare] → %s", normalized)
                        return normalized

        except Exception:
            logger.exception("AmountExtractor.extract() encountered an unexpected error")

        return None
