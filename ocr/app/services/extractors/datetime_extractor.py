"""Datetime extractor with dot/colon ambiguity resolution."""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

class DatetimeExtractor:
    """Extractor for transaction datetime from Vietnamese bank receipts."""

    def __init__(self) -> None:
        # Label anchor patterns
        self.label_patterns: list[str] = [
            r"ng[àa]y\s+giao\s+d[ịi]ch",        # "Ngày giao dịch"
            r"ng[àa]y,\s+gi[ờo]",               # "Ngày, giờ"
            r"th[ờo]i\s+gian",                  # "Thời gian"
            r"ng[àa]y\s+th[ựu]c\s+hi[ệe]n",    # "Ngày thực hiện"
            r"ng[àa]y\s+t[ạa]o",               # "Ngày tạo"
            r"ng[àa]y\b",                        # bare "Ngày"
        ]

        # Datetime patterns sorted by precision
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
        """Check if token resembles dot-separated time."""
        if "." not in token or "/" in token or "-" in token:
            return False
        segments = token.split(".")
        if len(segments) not in (2, 3):
            return False
        return all(re.match(r"^\d{1,2}$", s) for s in segments)

    def _normalize(self, val: str) -> Optional[str]:
        """Normalize match to DD-MM-YYYY HH:mm:ss format."""
        if not val:
            return None

        parts = val.strip().split()
        date_str: Optional[str] = None
        time_str: Optional[str] = None

        for part in parts:
            # Explicit dot-time detection first
            if self._looks_like_dot_time(part):
                time_str = part
                continue

            # Date classification
            if "/" in part or "-" in part:
                # Handle time mistaken as date
                if ":" in part:
                    time_str = part
                else:
                    date_str = part
                continue

            # Colon-separated time
            if ":" in part:
                time_str = part
                continue

        # Single token fallback as date
        if date_str is None and time_str is None and len(parts) == 1:
            date_str = parts[0]

        # Normalize date component
        if date_str:
            date_str = date_str.replace("/", "-")
            # Convert YYYY-MM-DD to DD-MM-YYYY
            iso_match = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", date_str)
            if iso_match:
                year, month, day = iso_match.groups()
                date_str = f"{day}-{month}-{year}"

        # Normalize time component
        if time_str:
            time_str = time_str.replace(".", ":")

        # Assemble output
        if date_str and time_str:
            return f"{date_str} {time_str}"
        if date_str:
            return date_str

        # Return raw match as fallback
        return val

    # Public interface

    def extract(self, raw_text: str) -> Optional[str]:
        """Extract datetime using two-strategy waterfall."""
        if not raw_text:
            return None

        try:
            lines = [ln.strip() for ln in raw_text.split("\n") if ln.strip()]

            # Strategy 1: Label-anchored search
            for i, line in enumerate(lines):
                for label in self.label_patterns:
                    label_match = re.search(label, line, re.IGNORECASE)
                    if not label_match:
                        continue

                    # Search inline after label
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

                    # Search on next line
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

            # Strategy 2: Global precision-ordered scan
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
