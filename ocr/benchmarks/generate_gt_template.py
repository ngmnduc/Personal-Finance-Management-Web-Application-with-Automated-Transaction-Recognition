import os
import sys
import json
import asyncio
import mimetypes
from pathlib import Path

# Thêm PROJECT_ROOT vào sys.path để nhận diện package app
BENCHMARK_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BENCHMARK_DIR.parent
sys.path.append(str(PROJECT_ROOT))

# Khởi tạo luồng trích xuất dữ liệu của Cloud API
os.environ["OCR_MODE"] = "CLOUD_API"
from app.services.llm_service import extract_with_llm
from app.services.nlp_extractor import clean_and_parse_json, normalize_amount, normalize_date

async def generate_ground_truth_template():
    image_dir = BENCHMARK_DIR / "sample_images"
    gt_path = BENCHMARK_DIR / "ground_truth.json"
    
    supported_extensions = (".png", ".jpg", ".jpeg", ".webp")
    image_files = [f for f in image_dir.iterdir() if f.suffix.lower() in supported_extensions] if image_dir.exists() else []
    
    if not image_files:
        print(f"Không tìm thấy file ảnh hợp lệ nào inside thư mục {image_dir.resolve()}")
        return

    # Nạp dữ liệu cũ nếu tệp ground_truth.json đã tồn tại để tránh ghi đè mất dữ liệu đã cấu hình
    existing_gt = {}
    if gt_path.exists() and gt_path.stat().st_size > 0:
        try:
            with open(gt_path, "r", encoding="utf-8") as f:
                existing_gt = json.load(f)
        except Exception:
            existing_gt = {}

    print(f"Bắt đầu tự động quét và sinh dữ liệu mẫu cho {len(image_files)} tệp tin...")
    
    for idx, img_path in enumerate(image_files):
        filename = img_path.name
        
        # Bỏ qua nếu file ảnh này đã được định nghĩa đáp án chuẩn từ trước
        if filename in existing_gt:
            print(f"  -> Bỏ qua file: {filename} (Đã có dữ liệu gốc)")
            continue
            
        print(f"  -> Đang phân tích nhãn nháp cho file: {filename} via Cloud Vision API...")
        
        try:
            with open(img_path, "rb") as f:
                img_bytes = f.read()

            mime_type, _ = mimetypes.guess_type(str(img_path))
            mime_type = mime_type or "image/png"

            # Thực thi gọi Inference từ Cloud API để lấy thông tin cấu trúc nháp
            raw_response = await extract_with_llm(img_bytes, mime_type)
            parsed_json = clean_and_parse_json(raw_response)
            
            # Đồng bộ định dạng trường thông tin theo đúng Normalization Chain của hệ thống
            existing_gt[filename] = {
                "amount": int(normalize_amount(parsed_json.get("amount")) or 0),
                "transaction_date": normalize_date(parsed_json.get("transaction_date")) or "1970-01-01",
                "merchant": str(parsed_json.get("merchant") or "UNKNOWN").strip().upper()
            }
            
            # Ghi dữ liệu liên tục xuống ổ đĩa sau mỗi lượt gọi thành công để phòng ngừa rủi ro mất kết nối mạng
            with open(gt_path, "w", encoding="utf-8") as f:
                json.dump(existing_gt, f, ensure_ascii=False, indent=2)

        except Exception as e:
            print(f"  [LỖI TRÍCH XUẤT NHÃN] Tệp {filename} gặp sự cố: {str(e)}")

        # Chốt chặn Throttle Delay Guard bảo vệ Rate Limit
        if idx < len(image_files) - 1:
            await asyncio.sleep(1.5)

    print(f"\nHoàn tất chu trình tự động sinh nhãn nháp. File dữ liệu đã được lưu trữ tại: {gt_path.resolve()}")

if __name__ == "__main__":
    asyncio.run(generate_ground_truth_template())