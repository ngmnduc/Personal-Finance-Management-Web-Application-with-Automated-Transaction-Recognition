import os
import sys
import json
import time
import asyncio
import mimetypes
import logging
from pathlib import Path
from difflib import SequenceMatcher

logging.basicConfig(level=logging.ERROR)

BENCHMARK_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BENCHMARK_DIR.parent
sys.path.append(str(PROJECT_ROOT))

# Import các thành phần xử lý từ hệ thống core
from app.services.ocr.easy_ocr import LocalEasyOCREngine
from app.services.llm_service import extract_with_llm
from app.services.nlp_extractor import clean_and_parse_json, normalize_amount, normalize_date
from app.services.bank_parser import detect_bank

def calculate_string_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, str(a).strip().upper(), str(b).strip().upper()).ratio()

async def run_evaluation_pipeline():
    image_dir = BENCHMARK_DIR / "sample_images"
    gt_path = BENCHMARK_DIR / "ground_truth.json"

    if not gt_path.exists():
        print(f"Lỗi hệ thống: Không tìm thấy tệp đáp án gốc tại {gt_path}")
        return

    with open(gt_path, "r", encoding="utf-8") as f:
        gt_data = json.load(f)

    # Lọc và nạp toàn bộ danh sách tệp tin ảnh hiện có trong thư mục vật lý
    supported_extensions = (".png", ".jpg", ".jpeg", ".webp")
    image_files = [f for f in image_dir.iterdir() if f.suffix.lower() in supported_extensions] if image_dir.exists() else []

    if not image_files:
        print(f"Lỗi hệ thống: Không tìm thấy file ảnh hợp lệ nào trong thư mục {image_dir.resolve()}")
        return

    print(f"Khởi động chương trình đối chứng thực nghiệm trên {len(image_files)} tệp tin quét từ thư mục...")
    
    summary_metrics = {
        "LOCAL_EASYOCR": {"latency": [], "amount_hit": 0, "date_hit": 0, "merchant_hit": 0, "accuracy_tested_samples": 0, "errors": 0},
        "CLOUD_API": {"latency": [], "amount_hit": 0, "date_hit": 0, "merchant_hit": 0, "accuracy_tested_samples": 0, "errors": 0}
    }

    # ==========================================================================
    # LUỒNG VẬN HÀNH 1: LOCAL_EASYOCR PIPELINE
    # ==========================================================================
    print("\n[VÒNG CHẠY 1/2] Đang kích hoạt luồng xử lý trích xuất Local EasyOCR...")
    os.environ["OCR_MODE"] = "LOCAL_EASYOCR"
    local_engine = LocalEasyOCREngine()

    for img_path in image_files:
        filename = img_path.name
        expected = gt_data.get(filename) # Quét ngược tìm đáp án trong Map dữ liệu

        print(f"  -> Đang xử lý file: {filename} | Đã cấu hình Ground Truth: {expected is not None}")

        try:
            with open(img_path, "rb") as f:
                img_bytes = f.read()

            t0 = time.perf_counter()
            parsed_data, raw_text = local_engine.run_pipeline(img_bytes)
            
            amount = normalize_amount(parsed_data.get("amount"))
            tx_date = normalize_date(parsed_data.get("transaction_date"))
            merchant = parsed_data.get("merchant")
            elapsed = time.perf_counter() - t0
            
            summary_metrics["LOCAL_EASYOCR"]["latency"].append(elapsed)

            # Chỉ thực hiện chấm điểm độ chính xác nếu tệp tin có khai báo đáp án trong JSON
            if expected:
                summary_metrics["LOCAL_EASYOCR"]["accuracy_tested_samples"] += 1
                if int(amount) == int(expected["amount"]):
                    summary_metrics["LOCAL_EASYOCR"]["amount_hit"] += 1
                if str(tx_date) == str(expected["transaction_date"]):
                    summary_metrics["LOCAL_EASYOCR"]["date_hit"] += 1
                if calculate_string_similarity(merchant, expected["merchant"]) >= 0.6:
                    summary_metrics["LOCAL_EASYOCR"]["merchant_hit"] += 1

        except Exception as e:
            print(f"  [LỖI THỰC THI LOCAL] File {filename} thất bại: {str(e)}")
            summary_metrics["LOCAL_EASYOCR"]["errors"] += 1

    # ==========================================================================
    # LUỒNG VẬN HÀNH 2: CLOUD_API PIPELINE
    # ==========================================================================
    print("\n[VÒNG CHẠY 2/2] Đang kích hoạt luồng xử lý trích xuất Cloud Vision AI...")
    os.environ["OCR_MODE"] = "CLOUD_API"

    for idx, img_path in enumerate(image_files):
        filename = img_path.name
        expected = gt_data.get(filename)

        print(f"  -> Đang gửi file: {filename} lên Cloud API...")

        try:
            with open(img_path, "rb") as f:
                img_bytes = f.read()

            mime_type, _ = mimetypes.guess_type(str(img_path))
            mime_type = mime_type or "image/png"

            t0 = time.perf_counter()
            raw_response = await extract_with_llm(img_bytes, mime_type)
            parsed_json = clean_and_parse_json(raw_response)
            
            amount = normalize_amount(parsed_json.get("amount"))
            tx_date = normalize_date(parsed_json.get("transaction_date"))
            merchant = parsed_json.get("merchant")
            elapsed = time.perf_counter() - t0

            summary_metrics["CLOUD_API"]["latency"].append(elapsed)

            if expected:
                summary_metrics["CLOUD_API"]["accuracy_tested_samples"] += 1
                if int(amount) == int(expected["amount"]):
                    summary_metrics["CLOUD_API"]["amount_hit"] += 1
                if str(tx_date) == str(expected["transaction_date"]):
                    summary_metrics["CLOUD_API"]["date_hit"] += 1
                if calculate_string_similarity(merchant, expected["merchant"]) >= 0.6:
                    summary_metrics["CLOUD_API"]["merchant_hit"] += 1

        except Exception as e:
            print(f"  [LỖI THỰC THI CLOUD] File {filename} thất bại: {str(e)}")
            summary_metrics["CLOUD_API"]["errors"] += 1

        if idx < len(image_files) - 1:
            await asyncio.sleep(1.5)

    # ==========================================================================
    # XUẤT BÁO CÁO KẾT QUẢ ĐỐI CHỨNG HIỆU NĂNG
    # ==========================================================================
    print("\n" + "="*80)
    print("             BẢNG TỔNG HỢP SỐ LIỆU THỰC NGHIỆM ĐỐI CHỨNG (CHAPTER 6)")
    print("="*80)
    print(f"{'Phương án Ingestion':<25} | {'Thời gian TB':<12} | {'Độ chính xác các trường dữ liệu (%) *':<40}")
    print(f"{'':<25} | {'(Latency)':<12} | {'Số tiền (Amount)':<12} {'Ngày tháng':<12} {'Đối tác (Merch)':<12}")
    print("-"*80)

    for mode in ["LOCAL_EASYOCR", "CLOUD_API"]:
        latencies = summary_metrics[mode]["latency"]
        avg_lat = f"{sum(latencies) / len(latencies):.3f}s" if latencies else "N/A"
        
        total_acc_tested = summary_metrics[mode]["accuracy_tested_samples"]
        
        amt_acc = f"{(summary_metrics[mode]['amount_hit'] / total_acc_tested) * 100:.1f}%" if total_acc_tested > 0 else "0.0%"
        date_acc = f"{(summary_metrics[mode]['date_hit'] / total_acc_tested) * 100:.1f}%" if total_acc_tested > 0 else "0.0%"
        merch_acc = f"{(summary_metrics[mode]['merchant_hit'] / total_acc_tested) * 100:.1f}%" if total_acc_tested > 0 else "0.0%"

        print(f"{mode:<25} | {avg_lat:<12} | {amt_acc:<12} {date_acc:<12} {merch_acc:<12}")
    print("="*80)
    print(f"(*) Chỉ số độ chính xác tính trên tổng số file cấu hình đáp án gốc thực tế.")

if __name__ == "__main__":
    asyncio.run(run_evaluation_pipeline())