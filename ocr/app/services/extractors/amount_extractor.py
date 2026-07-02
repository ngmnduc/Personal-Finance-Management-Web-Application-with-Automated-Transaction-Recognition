"""
Amount extractor for Vietnamese bank transfer receipts.

Contract:
    - ``extract()`` returns a raw digit string (e.g. ``"780000"``) or ``None``.
    - Thousand separators (dots / commas) are removed during normalisation here,
      but the final cast to ``int`` is left to the router's ``normalize_amount()``.
      This keeps the extractor layer decoupled from the schema type.
"""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

class AmountExtractor:
    """Extractor for transaction amounts from Vietnamese bank receipts."""

    def __init__(self) -> None:
# Label-anchor patterns
        # Ordered from most-specific to most-generic to minimise false positives.
        self.label_patterns: list[str] = [
            r"s[ốo]\s+ti[ềe]n\s+chuy[ểe]n",        # "Số tiền chuyển"
            r"s[ốo]\s+ti[ềe]n\s+giao\s+d[ịi]ch",   # "Số tiền giao dịch"
            r"s[ốo]\s+ti[ềe]n",                      # "Số tiền"
            r"amount",
            r"value",
        ]

# Value patterns
        # [0] Currency-suffixed:  "100.000 VND", "100,000 VNĐ", "50,000đ"
        # [1] Bare segmented:     "100.000", "1,500,000"  (no currency suffix)
        self.amount_patterns: list[str] = [
            r"([+-]?\s*\d{1,3}(?:[.,]\d{3})+)\s*(?:VND|VNĐ|vnd|vnđ|đ|d\b)",
            r"([+-]?\s*\d{1,3}(?:[.,]\d{3})+)(?!\d)",
        ]

# Internal helpers

    def _normalize(self, val: str) -> Optional[str]:
        """Strip formatting characters and return a pure digit string.

        Examples::

            "780,000 VND"  → "780000"
            "+1.500.000 đ" → "1500000"
            "abc"          → None

        Note:
            Thousand separators are removed here; the downstream
            ``normalize_amount()`` call in the router will cast to ``int``.
        """
        if not val:
            return None

        # Remove currency units
        cleaned = re.sub(r"(?:VND|VNĐ|vnd|vnđ|đ|d\b)", "", val, flags=re.IGNORECASE)
        # Remove sign characters
        cleaned = re.sub(r"[+-]", "", cleaned)
        # Remove thousand separators and whitespace
        cleaned = re.sub(r"[.,\s]", "", cleaned)

        result = cleaned.strip()
        return result if result.isdigit() else None

# Public interface

    def extract(self, raw_text: str) -> Optional[str]:
        """Extract the transaction amount from raw OCR text as a digit string.

        Three-strategy waterfall:
          1. Label-anchored same-line or next-line search (highest precision).
          2. Global scan for currency-suffixed amounts.
          3. Global scan for bare segmented numbers, with date-shape filter.

        Args:
            raw_text: Raw multi-line string from the OCR engine.

        Returns:
            Normalised digit string (e.g. ``"780000"``), or ``None`` if not found.
        """
        if not raw_text:
            return None

        try:
            lines = [ln.strip() for ln in raw_text.split("\n") if ln.strip()]

# Strategy 1: label-anchored search
            for i, line in enumerate(lines):
                for label in self.label_patterns:
                    label_match = re.search(label, line, re.IGNORECASE)
                    if not label_match:
                        continue

                    # 1a. Look for value on the same line after the label
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

                    # 1b. Look for value on the immediate next line
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

                        # Plain number line fallback (e.g. "780000" on its own line)
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

# Strategy 2: global currency-suffixed scan
            currency_match = re.search(self.amount_patterns[0], raw_text, re.IGNORECASE)
            if currency_match:
                normalized = self._normalize(currency_match.group(0))
                if normalized:
                    logger.debug("AmountExtractor [S2-currency] → %s", normalized)
                    return normalized

# Strategy 3: global bare-segmented number scan
            for m in re.finditer(self.amount_patterns[1], raw_text):
                candidate = m.group(1).strip()

                # Reject date-shaped patterns: DD.MM.YYYY  (2, 2, 4 segments)
                parts = re.split(r"[.,]", candidate)
                if (
                    len(parts) == 3
                    and len(parts[0]) <= 2
                    and len(parts[1]) <= 2
                    and len(parts[2]) == 4
                ):
                    continue

                # Reject implausibly small/large raw digit counts
                digits_only = re.sub(r"[^\d]", "", candidate)
                if 4 <= len(digits_only) <= 12:
                    normalized = self._normalize(candidate)
                    if normalized:
                        logger.debug("AmountExtractor [S3-bare] → %s", normalized)
                        return normalized

        except Exception:
            logger.exception("AmountExtractor.extract() encountered an unexpected error")

        return None
