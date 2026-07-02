"""
CLI trigger for the offline LOCAL_EASYOCR evaluation pipeline.
Usage: python run_benchmark.py <path_to_receipt_image>
"""

import os
import sys

os.environ["OCR_MODE"] = "LOCAL_EASYOCR"

if len(sys.argv) < 2:
    print("Error: Specify path to a target receipt image.")
    print("Usage:  python run_benchmark.py <path>")
    sys.exit(1)

target_image = sys.argv[1]
if not os.path.exists(target_image):
    print(f"Error: Target file not found at '{target_image}'")
    sys.exit(1)


with open(target_image, "rb") as file_stream:
    file_bytes = file_stream.read()

print("================================================================")
print(f"[BENCHMARK] Executing Offline Evaluation Pipeline on: {target_image}")
print("================================================================")


_OCR_DIR = os.path.dirname(os.path.abspath(__file__))
if _OCR_DIR not in sys.path:
    sys.path.insert(0, _OCR_DIR)

from app.services.ocr.easy_ocr import LocalEasyOCREngine
from app.services.nlp_extractor import normalize_amount, normalize_date, normalize_type
from app.services.bank_parser import detect_bank


engine = LocalEasyOCREngine()
parsed, raw_text = engine.run_pipeline(file_bytes)


print("\n========================= RAW OCR TEXT =========================")
print(raw_text)
print("================================================================")

print("\n====================== EXTRACTED FIELDS ======================")
print(f"Amount (Normalized):          {normalize_amount(parsed.get('amount'))}")
print(f"Transaction Date (Normalized):{normalize_date(parsed.get('transaction_date'))}")
print(f"Merchant / Recipient Name:    {parsed.get('merchant')}")
print(f"Detected Bank Context:        {detect_bank(raw_text)}")
print("================================================================")
