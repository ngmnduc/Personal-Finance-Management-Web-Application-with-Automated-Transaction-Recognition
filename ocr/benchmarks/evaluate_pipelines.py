"""
=============================================================================
EVALUATE_PIPELINES.PY — BENCHMARK SCRIPT CHO ĐỒ ÁN (CHƯƠNG 6)
=============================================================================

MỤC ĐÍCH:
  So sánh hiệu năng 2 pipeline OCR:
    - LOCAL_EASYOCR : Offline, CPU-bound, không tốn API, luôn sẵn sàng
    - CLOUD_API     : Online, LLM vision (Gemini/Groq/OpenRouter), độ chính xác cao

CÁCH CHẠY:
  Chỉ chạy CLOUD_API (khuyến nghị cho lần test đồ án):
    python evaluate_pipelines.py --mode cloud

  Chỉ chạy LOCAL_EASYOCR:
    python evaluate_pipelines.py --mode local

  Chạy cả 2 (full benchmark, tốn thời gian):
    python evaluate_pipelines.py --mode both

=============================================================================
LƯU Ý QUAN TRỌNG VỀ RATE LIMIT TRƯỚC KHI CHẠY
=============================================================================

[GROQ FREE TIER]
  - Giới hạn: 30 request/phút (RPM), ~14,400 req/ngày
  - Script này dùng delay 6.0s giữa mỗi ảnh → ~10 ảnh/phút → AN TOÀN
  - Nếu muốn nhanh hơn: đổi INTER_IMAGE_DELAY = 4.0 → ~15 ảnh/phút (vẫn OK)
  - KHÔNG giảm xuống dưới 2.5s vì 1 ảnh có thể retry 1-2 lần → dễ vượt 30 RPM

[GEMINI FREE TIER]
  - Giới hạn theo ngày: ~1500 req/ngày, reset lúc 7h sáng VN (0h UTC)
  - Giới hạn per-minute: 15 RPM cho gemini-2.0-flash
  - Nếu Gemini bị 429 → script tự động chuyển sang Groq (không cần lo)
  - Không chạy script 2 lần trong 1 ngày nếu dùng Gemini direct

[OPENROUTER]
  - Chỉ là fallback cuối, không bị gọi nếu Gemini/Groq đang hoạt động
  - Đảm bảo account OR có credit > $0 nếu muốn OR làm việc

[CHIẾN LƯỢC AN TOÀN CHO 36 ẢNH]
  - Với INTER_IMAGE_DELAY = 6.0s:
      36 ảnh × 6s = ~216s = ~3.6 phút tổng thời gian chờ
      Tốc độ thực: ~10 ảnh/phút → dưới 30 RPM Groq rất nhiều
  - Mỗi ảnh tối đa 2 retry × 5s delay = 10s thêm trong worst case
  - Tổng thời gian dự kiến: 5-8 phút cho 36 ảnh CLOUD_API

=============================================================================
"""

import os
import sys
import json
import time
import asyncio
import argparse
import mimetypes
import logging
import statistics
from datetime import datetime
from pathlib import Path
from difflib import SequenceMatcher

logging.basicConfig(level=logging.ERROR)

BENCHMARK_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BENCHMARK_DIR.parent
sys.path.append(str(PROJECT_ROOT))

from app.services.ocr.easy_ocr import LocalEasyOCREngine
from app.services.llm_service import extract_with_llm
from app.services.nlp_extractor import clean_and_parse_json, normalize_amount, normalize_date
from app.services.bank_parser import detect_bank

# =============================================================================
# CẤU HÌNH RATE LIMIT — ĐIỀU CHỈNH TẠI ĐÂY NẾU CẦN
# =============================================================================

# Thời gian chờ (giây) giữa 2 ảnh liên tiếp trong Cloud pipeline
# 6.0s → ~10 ảnh/phút (khuyến nghị, an toàn với Groq 30 RPM)
# 4.0s → ~15 ảnh/phút (chấp nhận được nếu không retry nhiều)
INTER_IMAGE_DELAY = 6.0

# Số lần retry tối đa mỗi ảnh khi Cloud API thất bại
MAX_RETRIES = 2

# Delay cơ sở khi retry (giây), tăng dần: retry 1 = 5s, retry 2 = 10s
BASE_RETRY_DELAY = 5.0

# Ngưỡng similarity để coi merchant là đúng (0.6 = 60% giống nhau)
MERCHANT_SIMILARITY_THRESHOLD = 0.6

# Các ảnh có merchant không xác định — bỏ qua field merchant khi tính accuracy
SKIP_MERCHANT_EVAL = {"momo_5_ocr.jpg"}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def calculate_string_similarity(a: str, b: str) -> float:
    """Tính độ giống nhau giữa 2 chuỗi, không phân biệt hoa thường."""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, str(a).strip().upper(), str(b).strip().upper()).ratio()


def compute_summary(metrics: dict) -> dict:
    """
    Tính toán đầy đủ các chỉ số từ raw metrics.
    Trả về dict chứa tất cả số liệu cần cho bảng so sánh đồ án.
    """
    latencies = metrics["latency"]
    n = metrics["accuracy_tested_samples"]
    overall_hits = metrics.get("overall_hit", 0)

    def pct(hits):
        return f"{(hits / n) * 100:.1f}%" if n > 0 else "N/A"

    sorted_lat = sorted(latencies)
    p95_idx = int(len(sorted_lat) * 0.95) - 1 if len(sorted_lat) >= 2 else -1

    return {
        "samples_total":    len(latencies) + metrics["errors"],
        "samples_success":  len(latencies),
        "errors":           metrics["errors"],
        "error_rate":       f"{(metrics['errors'] / max(len(latencies) + metrics['errors'], 1)) * 100:.1f}%",
        "availability":     f"{(len(latencies) / max(len(latencies) + metrics['errors'], 1)) * 100:.1f}%",
        "avg_latency":      f"{statistics.mean(latencies):.3f}s" if latencies else "N/A",
        "min_latency":      f"{min(latencies):.3f}s" if latencies else "N/A",
        "max_latency":      f"{max(latencies):.3f}s" if latencies else "N/A",
        "p95_latency":      f"{sorted_lat[p95_idx]:.3f}s" if p95_idx >= 0 else "N/A",
        "stdev_latency":    f"{statistics.stdev(latencies):.3f}s" if len(latencies) >= 2 else "N/A",
        "amount_acc":       pct(metrics["amount_hit"]),
        "date_acc":         pct(metrics["date_hit"]),
        "merchant_acc":     pct(metrics["merchant_hit"]),
        "overall_acc":      pct(overall_hits),
    }


def print_summary_table(results: dict):
    """In bảng tổng hợp ra terminal với đầy đủ label cột."""
    W = 100
    print("\n" + "=" * W)
    print("        BẢNG TỔNG HỢP SỐ LIỆU THỰC NGHIỆM ĐỐI CHỨNG — CHƯƠNG 6 ĐỒ ÁN")
    print("=" * W)

    # Header nhóm
    print(f"{'':30} {'─── ĐỘ CHÍNH XÁC (ACCURACY) ───':^38}  {'─── ĐỘ TRỄ (LATENCY) ───':^28}  {'─ RELIABILITY ─':^16}")
    print(f"{'Chế độ / Pipeline':30} {'Amount':>8} {'Date':>8} {'Merchant':>10} {'Overall':>10}  "
          f"{'Avg':>7} {'Min':>7} {'Max':>7} {'P95':>7}  "
          f"{'ErrRate':>8} {'Avail':>8}")
    print("-" * W)

    mode_labels = {
        "LOCAL_EASYOCR": "Local EasyOCR (Offline)",
        "CLOUD_API":      "Cloud Vision AI (LLM)"
    }

    for mode, label in mode_labels.items():
        if mode not in results:
            continue
        r = results[mode]
        print(
            f"{label:30} "
            f"{r['amount_acc']:>8} {r['date_acc']:>8} {r['merchant_acc']:>10} {r['overall_acc']:>10}  "
            f"{r['avg_latency']:>7} {r['min_latency']:>7} {r['max_latency']:>7} {r['p95_latency']:>7}  "
            f"{r['error_rate']:>8} {r['availability']:>8}"
        )

    print("=" * W)
    print()

    # Chú thích
    print("CHÚ THÍCH:")
    print("  Overall Accuracy : % ảnh có CẢ 3 trường (amount + date + merchant) đúng đồng thời")
    print("  P95 Latency      : Latency của 95% ảnh xử lý nhanh nhất (loại trừ outlier retry)")
    print(f"  Merchant SKIP    : Các ảnh bị loại khỏi eval merchant: {SKIP_MERCHANT_EVAL}")
    print(f"  Merchant Threshold: similarity >= {MERCHANT_SIMILARITY_THRESHOLD:.0%} được tính là đúng")
    print()

    # Bảng chi tiết từng mode
    for mode, label in mode_labels.items():
        if mode not in results:
            continue
        r = results[mode]
        print(f"  [{label}]")
        print(f"    Tổng ảnh chạy   : {r['samples_total']}  |  Thành công: {r['samples_success']}  |  Lỗi: {r['errors']}")
        print(f"    Độ lệch chuẩn latency: {r['stdev_latency']}")
        print()


def write_markdown_report(mismatch_details: list, results: dict, report_path: Path):
    """Xuất báo cáo .md chi tiết với timestamp và bảng tổng hợp đầy đủ."""
    run_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open(report_path, "w", encoding="utf-8") as rf:
        rf.write(f"# BÁO CÁO THỰC NGHIỆM OCR PIPELINE\n\n")
        rf.write(f"**Thời điểm chạy:** {run_time}  \n")
        rf.write(f"**Script:** `evaluate_pipelines.py`  \n\n")

        # Bảng tổng hợp trong markdown
        rf.write("## BẢNG TỔNG HỢP (SUMMARY)\n\n")
        rf.write("| Chỉ số | Local EasyOCR | Cloud Vision AI |\n")
        rf.write("|:---|:---:|:---:|\n")

        metrics_rows = [
            ("Amount Accuracy",   "amount_acc"),
            ("Date Accuracy",     "date_acc"),
            ("Merchant Accuracy", "merchant_acc"),
            ("**Overall Accuracy**", "overall_acc"),
            ("Avg Latency",       "avg_latency"),
            ("Min Latency",       "min_latency"),
            ("Max Latency",       "max_latency"),
            ("P95 Latency",       "p95_latency"),
            ("Latency Std Dev",   "stdev_latency"),
            ("Error Rate",        "error_rate"),
            ("Availability",      "availability"),
        ]

        local = results.get("LOCAL_EASYOCR", {})
        cloud = results.get("CLOUD_API", {})

        for label, key in metrics_rows:
            lv = local.get(key, "—")
            cv = cloud.get(key, "—")
            rf.write(f"| {label} | {lv} | {cv} |\n")

        rf.write("\n> **Overall Accuracy**: % ảnh đúng CẢ 3 trường đồng thời (amount + date + merchant)\n\n")

        # Bảng mismatch chi tiết
        rf.write("## CHI TIẾT SAI LỆCH (MISMATCH DETAILS)\n\n")
        if not mismatch_details:
            rf.write("_Không có sai lệch nào được ghi nhận._\n")
        else:
            rf.write("| Tệp tin | Pipeline | Trường | Extracted | Expected | Trạng thái |\n")
            rf.write("|:---|:---|:---|:---|:---|:---|\n")
            for detail in mismatch_details:
                fn = detail["filename"]
                m  = detail["mode"]
                rf.write(f"| {fn} | {m} | Số tiền   | {detail['amount']['extracted']}   | {detail['amount']['expected']}   | {detail['amount']['status']} |\n")
                rf.write(f"| {fn} | {m} | Ngày      | {detail['date']['extracted']}     | {detail['date']['expected']}     | {detail['date']['status']} |\n")
                rf.write(f"| {fn} | {m} | Đối tác   | {detail['merchant']['extracted']} | {detail['merchant']['expected']} | {detail['merchant']['status']} |\n")
                rf.write("|---|---|---|---|---|---|\n")

    print(f"\n  Báo cáo chi tiết đã xuất: {report_path.resolve()}")


# =============================================================================
# PIPELINE 1: LOCAL EASYOCR
# =============================================================================

async def run_local_pipeline(image_files, gt_data, summary_metrics, mismatch_details):
    print("\n[VÒNG CHẠY: LOCAL EASYOCR] Kích hoạt luồng trích xuất offline...")
    print(f"  Tổng số ảnh: {len(image_files)} | Không có rate limit | Chạy liên tục\n")

    os.environ["OCR_MODE"] = "LOCAL_EASYOCR"
    local_engine = LocalEasyOCREngine()

    for idx, img_path in enumerate(image_files, 1):
        filename = img_path.name
        expected = gt_data.get(filename)

        print(f"  [{idx:02d}/{len(image_files)}] {filename:35s}", end="", flush=True)

        try:
            with open(img_path, "rb") as f:
                img_bytes = f.read()

            t0 = time.perf_counter()
            parsed_data, raw_text = local_engine.run_pipeline(img_bytes)

            amount   = normalize_amount(parsed_data.get("amount"))
            tx_date  = normalize_date(parsed_data.get("transaction_date"))
            merchant = parsed_data.get("merchant")
            elapsed  = time.perf_counter() - t0

            summary_metrics["LOCAL_EASYOCR"]["latency"].append(elapsed)
            print(f" ✓ {elapsed:.2f}s", flush=True)

            if expected:
                summary_metrics["LOCAL_EASYOCR"]["accuracy_tested_samples"] += 1

                amt_match   = int(amount or 0) == int(expected["amount"])
                date_match  = str(tx_date or "") == str(expected["transaction_date"])
                merch_sim   = calculate_string_similarity(merchant, expected["merchant"])

                # Bỏ qua eval merchant nếu file nằm trong SKIP_MERCHANT_EVAL
                if filename in SKIP_MERCHANT_EVAL:
                    merch_match = True  # không tính vào accuracy
                else:
                    merch_match = merch_sim >= MERCHANT_SIMILARITY_THRESHOLD

                overall_match = amt_match and date_match and merch_match

                if amt_match:     summary_metrics["LOCAL_EASYOCR"]["amount_hit"]   += 1
                if date_match:    summary_metrics["LOCAL_EASYOCR"]["date_hit"]     += 1
                if merch_match:   summary_metrics["LOCAL_EASYOCR"]["merchant_hit"] += 1
                if overall_match: summary_metrics["LOCAL_EASYOCR"]["overall_hit"]  += 1

                if not overall_match:
                    mismatch_details.append({
                        "filename": filename, "mode": "LOCAL_EASYOCR",
                        "amount":   {"extracted": amount,   "expected": expected["amount"],           "status": "OK" if amt_match  else "FAIL"},
                        "date":     {"extracted": tx_date,  "expected": expected["transaction_date"], "status": "OK" if date_match else "FAIL"},
                        "merchant": {"extracted": merchant, "expected": expected["merchant"],         "status": "OK" if merch_match else f"FAIL ({merch_sim:.2f})"},
                    })

        except Exception as e:
            print(f" ✗ Lỗi: {str(e)[:80]}", flush=True)
            summary_metrics["LOCAL_EASYOCR"]["errors"] += 1


# =============================================================================
# PIPELINE 2: CLOUD API
# =============================================================================

async def run_cloud_pipeline(image_files, gt_data, summary_metrics, mismatch_details):
    total = len(image_files)
    est_minutes = (total * INTER_IMAGE_DELAY) / 60

    print("\n[VÒNG CHẠY: CLOUD VISION AI] Kích hoạt luồng LLM...")
    print(f"  Tổng số ảnh     : {total}")
    print(f"  Delay giữa ảnh  : {INTER_IMAGE_DELAY}s  →  ~{60/INTER_IMAGE_DELAY:.0f} ảnh/phút  (Groq limit: 30 RPM)")
    print(f"  Thời gian ước tính: {est_minutes:.1f} phút (chưa tính retry)")
    print(f"  Max retry/ảnh   : {MAX_RETRIES} lần | Delay retry: {BASE_RETRY_DELAY}s, {BASE_RETRY_DELAY*2}s\n")

    os.environ["OCR_MODE"] = "CLOUD_API"

    for idx, img_path in enumerate(image_files, 1):
        filename = img_path.name
        expected = gt_data.get(filename)

        print(f"  [{idx:02d}/{total}] {filename:35s}", end="", flush=True)

        try:
            with open(img_path, "rb") as f:
                img_bytes = f.read()

            mime_type, _ = mimetypes.guess_type(str(img_path))
            mime_type = mime_type or "image/png"

            # ── Retry logic với exponential delay ──────────────────────────
            # Chỉ đo thời gian xử lý thực (trừ sleep chờ retry)
            total_sleep_time = 0.0
            raw_response     = None
            t0               = time.perf_counter()

            for attempt in range(MAX_RETRIES):
                try:
                    raw_response = await extract_with_llm(img_bytes, mime_type)
                    break  # Thành công → thoát vòng retry
                except Exception as e:
                    if attempt < MAX_RETRIES - 1:
                        # Exponential backoff: 5s, 10s
                        sleep_dur = BASE_RETRY_DELAY * (attempt + 1)
                        print(f"\n    ↻ Retry {attempt+1}/{MAX_RETRIES-1} sau {sleep_dur:.0f}s (lỗi: {str(e)[:60]})", flush=True)
                        await asyncio.sleep(sleep_dur)
                        total_sleep_time += sleep_dur
                        print(f"  [{idx:02d}/{total}] {filename:35s}", end="", flush=True)
                    else:
                        raise e  # Hết retry → raise để outer except bắt

            # Latency thực = tổng thời gian - thời gian ngủ chờ retry
            elapsed = (time.perf_counter() - t0) - total_sleep_time

            parsed_json = clean_and_parse_json(raw_response)

            amount   = normalize_amount(parsed_json.get("amount"))
            tx_date  = normalize_date(parsed_json.get("transaction_date"))
            merchant = parsed_json.get("merchant")

            summary_metrics["CLOUD_API"]["latency"].append(elapsed)
            print(f" ✓ {elapsed:.2f}s", flush=True)

            if expected:
                summary_metrics["CLOUD_API"]["accuracy_tested_samples"] += 1

                amt_match  = int(amount or 0) == int(expected["amount"])
                date_match = str(tx_date or "") == str(expected["transaction_date"])
                merch_sim  = calculate_string_similarity(merchant, expected["merchant"])

                if filename in SKIP_MERCHANT_EVAL:
                    merch_match = True
                else:
                    merch_match = merch_sim >= MERCHANT_SIMILARITY_THRESHOLD

                overall_match = amt_match and date_match and merch_match

                if amt_match:     summary_metrics["CLOUD_API"]["amount_hit"]   += 1
                if date_match:    summary_metrics["CLOUD_API"]["date_hit"]     += 1
                if merch_match:   summary_metrics["CLOUD_API"]["merchant_hit"] += 1
                if overall_match: summary_metrics["CLOUD_API"]["overall_hit"]  += 1

                if not overall_match:
                    mismatch_details.append({
                        "filename": filename, "mode": "CLOUD_API",
                        "amount":   {"extracted": amount,   "expected": expected["amount"],           "status": "OK" if amt_match  else "FAIL"},
                        "date":     {"extracted": tx_date,  "expected": expected["transaction_date"], "status": "OK" if date_match else "FAIL"},
                        "merchant": {"extracted": merchant, "expected": expected["merchant"],         "status": "OK" if merch_match else f"FAIL ({merch_sim:.2f})"},
                    })

        except Exception as e:
            print(f" ✗ Lỗi: {str(e)[:80]}", flush=True)
            summary_metrics["CLOUD_API"]["errors"] += 1

        # ── Delay giữa ảnh để tránh vượt rate limit ──────────────────────
        # Chỉ sleep nếu còn ảnh tiếp theo
        if idx < total:
            print(f"     ⏱  Chờ {INTER_IMAGE_DELAY}s để tránh rate limit Groq...", flush=True)
            await asyncio.sleep(INTER_IMAGE_DELAY)


# =============================================================================
# MAIN
# =============================================================================

async def run_evaluation_pipeline(mode: str = "cloud"):
    image_dir = BENCHMARK_DIR / "sample_images"
    gt_path   = BENCHMARK_DIR / "ground_truth.json"

    if not gt_path.exists():
        print(f"Lỗi: Không tìm thấy ground_truth.json tại {gt_path}")
        return

    with open(gt_path, "r", encoding="utf-8") as f:
        gt_data = json.load(f)

    supported_extensions = (".png", ".jpg", ".jpeg", ".webp")
    image_files = sorted([
        f for f in image_dir.iterdir()
        if f.suffix.lower() in supported_extensions
    ]) if image_dir.exists() else []

    if not image_files:
        print("Không tìm thấy file ảnh hợp lệ trong thư mục sample_images/")
        return

    print("=" * 70)
    print("  BENCHMARK OCR PIPELINE — CHƯƠNG 6 ĐỒ ÁN")
    print("=" * 70)
    print(f"  Thư mục ảnh : {image_dir}")
    print(f"  Tổng ảnh    : {len(image_files)}")
    print(f"  Ground truth: {len(gt_data)} entries")
    print(f"  Mode chạy   : {mode.upper()}")
    print(f"  Thời điểm   : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Khởi tạo metrics — thêm overall_hit so với bản cũ
    summary_metrics = {
        "LOCAL_EASYOCR": {"latency": [], "amount_hit": 0, "date_hit": 0,
                          "merchant_hit": 0, "overall_hit": 0,
                          "accuracy_tested_samples": 0, "errors": 0},
        "CLOUD_API":     {"latency": [], "amount_hit": 0, "date_hit": 0,
                          "merchant_hit": 0, "overall_hit": 0,
                          "accuracy_tested_samples": 0, "errors": 0},
    }
    mismatch_details = []

    # Chạy pipeline theo mode
    if mode in ("local", "both"):
        await run_local_pipeline(image_files, gt_data, summary_metrics, mismatch_details)

    if mode in ("cloud", "both"):
        await run_cloud_pipeline(image_files, gt_data, summary_metrics, mismatch_details)

    # Tổng hợp kết quả
    computed_results = {}
    if mode in ("local", "both"):
        computed_results["LOCAL_EASYOCR"] = compute_summary(summary_metrics["LOCAL_EASYOCR"])
    if mode in ("cloud", "both"):
        computed_results["CLOUD_API"]     = compute_summary(summary_metrics["CLOUD_API"])

    # In bảng ra terminal
    print_summary_table(computed_results)

    # Xuất báo cáo markdown (có timestamp trong tên file để không bị ghi đè)
    ts          = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = BENCHMARK_DIR / f"mismatch_report_{ts}.md"
    write_markdown_report(mismatch_details, computed_results, report_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OCR Pipeline Benchmark")
    parser.add_argument(
        "--mode",
        choices=["local", "cloud", "both"],
        default="cloud",
        help="Pipeline cần chạy: 'local' (EasyOCR), 'cloud' (LLM API), 'both' (cả hai). Mặc định: cloud"
    )
    args = parser.parse_args()
    asyncio.run(run_evaluation_pipeline(mode=args.mode))