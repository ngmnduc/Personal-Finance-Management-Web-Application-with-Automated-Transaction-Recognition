"""
run_benchmark.py — CLI trigger for the offline LOCAL_EASYOCR evaluation pipeline.

Usage:
    python run_benchmark.py <path_to_receipt_image>

This script **must** set OCR_MODE before importing any application module so
that the environment variable is visible to every module that reads it at
import time.  The ``os.environ`` assignment at the top of this file guarantees
that ordering regardless of how Python resolves the import graph.

Example:
    python run_benchmark.py ocr/tests/samples/vcb_receipt.jpg
"""

import os
import sys

# ── Override OCR mode BEFORE any app imports ──────────────────────────────────
# Programmatically overwrite configuration BEFORE importing application internals.
os.environ["OCR_MODE"] = "LOCAL_EASYOCR"

# ── Argument validation ───────────────────────────────────────────────────────

if len(sys.argv) < 2:
    print("Error: Specify path to a target receipt image.")
    print("Usage:  python run_benchmark.py <path>")
    sys.exit(1)

target_image = sys.argv[1]
if not os.path.exists(target_image):
    print(f"Error: Target file not found at '{target_image}'")
    sys.exit(1)

# ── Load raw bytes ────────────────────────────────────────────────────────────

with open(target_image, "rb") as file_stream:
    file_bytes = file_stream.read()

print("================================================================")
print(f"[BENCHMARK] Executing Offline Evaluation Pipeline on: {target_image}")
print("================================================================")

# ── Import application internals AFTER os.environ is set ─────────────────────
# Add the current directory (ocr) to sys.path so that ``app.*`` imports resolve correctly
# when this script is executed from anywhere.
_OCR_DIR = os.path.dirname(os.path.abspath(__file__))
if _OCR_DIR not in sys.path:
    sys.path.insert(0, _OCR_DIR)

from app.services.ocr.easy_ocr import LocalEasyOCREngine
from app.services.nlp_extractor import normalize_amount, normalize_date, normalize_type
from app.services.bank_parser import detect_bank

# ── Run pipeline ──────────────────────────────────────────────────────────────

engine = LocalEasyOCREngine()
parsed, raw_text = engine.run_pipeline(file_bytes)

# ── Print results ─────────────────────────────────────────────────────────────

print("\n========================= RAW OCR TEXT =========================")
print(raw_text)
print("================================================================")

print("\n====================== EXTRACTED FIELDS ======================")
print(f"Amount (Normalized):          {normalize_amount(parsed.get('amount'))}")
print(f"Transaction Date (Normalized):{normalize_date(parsed.get('transaction_date'))}")
print(f"Merchant / Recipient Name:    {parsed.get('merchant')}")
print(f"Detected Bank Context:        {detect_bank(raw_text)}")
print("================================================================")
