"""
Local OCR engine using EasyOCR + custom regex extractors.

This module is activated when ``settings.OCR_MODE == "LOCAL_EASYOCR"``.
It is intentionally **free of any cloud/network dependencies** — useful for:
  - Local development without a Gemini API key.
  - Air-gapped / cost-sensitive deployments.
  - Benchmarking / regression testing against the cloud pipeline.

Field mapping contract (matches ``ExtractedData`` schema):
  amount           ← AmountExtractor   (raw digit string; downstream calls normalize_amount())
  merchant         ← RecipientExtractor (recipient / beneficiary name)
  transaction_date ← DatetimeExtractor  (normalized datetime string)
  type             ← None               (downstream normalize_type() will use scan_context hint)
"""

from __future__ import annotations

import logging
from typing import Optional

import easyocr

from app.services.extractors.amount_extractor import AmountExtractor
from app.services.extractors.recipient_extractor import RecipientExtractor
from app.services.extractors.datetime_extractor import DatetimeExtractor

logger = logging.getLogger(__name__)


class LocalEasyOCREngine:
    """Wraps the local EasyOCR inference pipeline with rule-based field extractors.

    The reader is initialised **once** at construction time (CPU-only, no GPU
    drivers required).  Subsequent calls to :meth:`run_pipeline` are stateless
    and thread-safe for read operations.
    """

    def __init__(self) -> None:
        logger.info("Initialising LocalEasyOCREngine (CPU mode, languages: vi, en) …")
        # Default to CPU execution to avoid dependencies on external GPU drivers.
        self.reader = easyocr.Reader(["vi", "en"], gpu=False)
        self.amount_extractor = AmountExtractor()
        self.recipient_extractor = RecipientExtractor()
        self.datetime_extractor = DatetimeExtractor()
        logger.info("LocalEasyOCREngine ready.")

    def run_pipeline(self, image_bytes: bytes) -> tuple[dict, str]:
        """Process raw image bytes in-memory, extract text, and apply rule-based field matchers.

        EasyOCR accepts ``bytes`` directly — no temporary file is written to disk.

        Args:
            image_bytes: Raw bytes of the uploaded image file (JPEG, PNG, etc.).

        Returns:
            A tuple of:
              - ``parsed_data`` (dict): Keys align with the ``ExtractedData`` schema::

                    {
                        "amount":           Optional[str],   # raw digit string, e.g. "780000"
                        "merchant":         Optional[str],   # uppercase unaccented name
                        "transaction_date": Optional[str],   # e.g. "17-06-2026 13:45:00"
                        "type":             None,            # resolved by downstream normalize_type()
                    }

              - ``raw_text`` (str): Full OCR output joined by newlines (for caching / audit).
        """
        logger.debug("Running EasyOCR inference on %d bytes …", len(image_bytes))
        results: list[str] = self.reader.readtext(image_bytes, detail=0)
        raw_text: str = "\n".join(results)
        logger.debug("EasyOCR produced %d text segments.", len(results))

        parsed_data: dict = {
            # amount → raw digit string; normalize_amount() in the router converts to int
            "amount": self.amount_extractor.extract(raw_text),

            # merchant field maps the bank receipt's recipient / beneficiary name
            "merchant": self.recipient_extractor.extract(raw_text),

            # transaction_date → normalized datetime string (DD-MM-YYYY HH:mm:ss)
            "transaction_date": self.datetime_extractor.extract(raw_text),

            # type is intentionally left as None so normalize_type() can apply
            # the caller-supplied scan_context hint (e.g. "EXPENSE" from the FE)
            "type": None,
        }

        logger.info(
            "LocalEasyOCR extraction complete | amount=%s | merchant=%s | date=%s",
            parsed_data["amount"],
            parsed_data["merchant"],
            parsed_data["transaction_date"],
        )

        return parsed_data, raw_text