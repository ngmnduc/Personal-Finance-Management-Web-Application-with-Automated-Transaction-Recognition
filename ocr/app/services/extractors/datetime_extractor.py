"""
Transaction datetime extractor for Vietnamese bank transfer receipts.

Contract:
    ``extract()`` returns a normalised datetime string in one of these formats:
      - ``"DD-MM-YYYY HH:mm:ss"``
      - ``"DD-MM-YYYY HH:mm"``
      - ``"DD-MM-YYYY"``
    or ``None`` if no recognisable datetime is found.

Dot vs colon time ambiguity:
    Vietnamese bank receipts sometimes print times with dots as separators
    (e.g. ``13.06.06`` for 13:06:06).  The ``_normalize()`` method explicitly
    detects such tokens by their structure (two or three dot-delimited 2-digit
    segments) and routes them to the time component before attempting date
    classification, preventing misidentification as a date fragment.
"""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

class DatetimeExtractor:
    """Extractor for transaction datetime from Vietnamese bank receipts."""

    def __init__(self) -> None:
# Label-anchor patterns
        self.label_patterns: list[str] = [
            r"ng[àa]y\s+giao\s+d[ịi]ch",        # "Ngày giao dịch"
            r"ng[àa]y,\s+gi[ờo]",               # "Ngày, giờ"
            r"th[ờo]i\s+gian",                  # "Thời gian"
            r"ng[àa]y\s+th[ựu]c\s+hi[ệe]n",    # "Ngày thực hiện"
            r"ng[àa]y\s+t[ạa]o",               # "Ngày tạo"
            r"ng[àa]y\b",                        # bare "Ngày"
        ]

# Datetime patterns (longest/most precise first)
        # All patterns tolerate both colon (:) and dot (.) as time separators
        # since OCR engines often confuse the two on certain receipt fonts.
        self.datetime_patterns: list[str] = [
            # dd/mm/yyyy hh:mm:ss  or  dd-mm-yyyy hh:mm:ss
            r"\b\d{2}[/\-]\d{2}[/\-]\d{4}\s+\d{2}[.:]\d{2}[.:]\d{2}\b",

            # dd/mm/yyyy hh:mm  or  dd-mm-yyyy hh:mm
            r"\b\d{2}[/\-]\d{2}[/\-]\d{4}\s+\d{2}[.:]\d{2}\b",

            # hh:mm:ss dd/mm/yyyy  (time before date)
            r"\b\d{2}[.:]\d{2}[.:]\d{2}\s+\d{2}[/\-]\d{2}[/\-]\d{4}\b",

            # hh:mm dd/mm/yyyy  (time before date)
            r"\b\d{2}[.:]\d{2}\s+\d{2}[/\-]\d{2}[/\-]\d{4}\b",

            # yyyy-mm-dd hh:mm:ss
            r"\b\d{4}-\d{2}-\d{2}\s+\d{2}[.:]\d{2}[.:]\d{2}\b",

            # dd/mm/yyyy  or  dd-mm-yyyy  (date only)
            r"\b\d{2}[/\-]\d{2}[/\-]\d{4}\b",

            # yyyy-mm-dd  (date only)
            r"\b\d{4}-\d{2}-\d{2}\b",
        ]

# Internal helpers

    @staticmethod
    def _looks_like_dot_time(token: str) -> bool:
        """Return True if ``token`` resembles a dot-separated time string.

        Matches patterns like ``13.06.06`` (HH.mm.ss) or ``13.06`` (HH.mm).
        These must be classified as *time* before the surrounding part-classifier
        attempts to treat them as date fragments.

        Rules:
          - Contains at least one dot.
          - Has exactly 2 or 3 dot-delimited segments.
          - Every segment is 1–2 digits.
          - No slash or dash is present (those indicate a date).
        """
        if "." not in token or "/" in token or "-" in token:
            return False
        segments = token.split(".")
        if len(segments) not in (2, 3):
            return False
        return all(re.match(r"^\d{1,2}$", s) for s in segments)

    def _normalize(self, val: str) -> Optional[str]:
        """Normalise a raw datetime match to ``DD-MM-YYYY [HH:mm[:ss]]``.

        Handles:
          - Slash → dash conversion in the date component.
          - ``YYYY-MM-DD`` reordering to ``DD-MM-YYYY``.
          - Dot → colon conversion in the time component.
          - OCR-printed dot-time tokens (``13.06.06``) correctly classified as
            time, not mistaken for a date fragment.
          - Time-before-date ordering (the method reorders to date-first output).
        """
        if not val:
            return None

        parts = val.strip().split()
        date_str: Optional[str] = None
        time_str: Optional[str] = None

        for part in parts:
# Explicit dot-time detection (MUST come first)
            # e.g. "13.06.06" → time_str  (NOT a date fragment)
            if self._looks_like_dot_time(part):
                time_str = part
                continue

# Date classification
            if "/" in part or "-" in part:
                # A colon inside a slash/dash token means it's actually a time
                if ":" in part:
                    time_str = part
                else:
                    date_str = part
                continue

# Colon-separated time
            if ":" in part:
                time_str = part
                continue

        # Single-token fallback: the whole value is just a date
        if date_str is None and time_str is None and len(parts) == 1:
            date_str = parts[0]

# Normalise date component
        if date_str:
            date_str = date_str.replace("/", "-")
            # Convert YYYY-MM-DD → DD-MM-YYYY
            iso_match = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", date_str)
            if iso_match:
                year, month, day = iso_match.groups()
                date_str = f"{day}-{month}-{year}"

# Normalise time component
        if time_str:
            time_str = time_str.replace(".", ":")

# Assemble output
        if date_str and time_str:
            return f"{date_str} {time_str}"
        if date_str:
            return date_str

        # Last resort: return the raw match so it at least reaches the router
        return val

# Public interface

    def extract(self, raw_text: str) -> Optional[str]:
        """Extract the transaction datetime from raw OCR text.

        Two-strategy waterfall:
          1. Label-anchored search: scan for Vietnamese label keywords, then
             look on the same line (after the label) and the immediate next line.
          2. Global scan: iterate ``datetime_patterns`` in precision order
             (longest/most-specific first) across the full text.

        Args:
            raw_text: Raw multi-line string from the OCR engine.

        Returns:
            Normalised datetime string (e.g. ``"17-06-2026 13:45:00"``),
            or ``None`` if not found.
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

                    # 1a. Search remainder of the same line after the label
                    after_label = line[label_match.end():].strip()
                    for pattern in self.datetime_patterns:
                        m = re.search(pattern, after_label, re.IGNORECASE)
                        if m:
                            result = self._normalize(m.group(0))
                            if result:
                                logger.debug(
                                    "DatetimeExtractor [S1-inline] label=%r → %r",
                                    label, result,
                                )
                                return result

                    # 1b. Search the immediate next line
                    if i + 1 < len(lines):
                        next_line = lines[i + 1]
                        for pattern in self.datetime_patterns:
                            m = re.search(pattern, next_line, re.IGNORECASE)
                            if m:
                                result = self._normalize(m.group(0))
                                if result:
                                    logger.debug(
                                        "DatetimeExtractor [S1-next] label=%r → %r",
                                        label, result,
                                    )
                                    return result

# Strategy 2: global precision-ordered scan
            for pattern in self.datetime_patterns:
                m = re.search(pattern, raw_text, re.IGNORECASE)
                if m:
                    result = self._normalize(m.group(0))
                    if result:
                        logger.debug("DatetimeExtractor [S2-global] → %r", result)
                        return result

        except Exception:
            logger.exception("DatetimeExtractor.extract() encountered an unexpected error")

        return None
