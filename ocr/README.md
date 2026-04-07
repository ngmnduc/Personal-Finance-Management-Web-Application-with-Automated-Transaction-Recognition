# FinTrack — OCR Service (Python FastAPI)

## Setup
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# Điền GEMINI_API_KEY và OPENROUTER_API_KEY

uvicorn app.main:app --reload --port 8000

## Endpoints
| Method | Path | Mô tả |
|---|---|---|
| GET | /health | Health check |
| POST | /api/v1/ocr/scan | Scan 1 ảnh hoặc PDF |
| POST | /api/v1/ocr/scan/bulk | Scan batch tối đa 20 |
| GET | /api/v1/ocr/banks | Danh sách bank hỗ trợ |

## Deploy
Render free tier — Python service riêng với e/.
