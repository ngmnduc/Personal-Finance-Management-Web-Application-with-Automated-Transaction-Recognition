#  OCR Service (Python FastAPI)

## Setup
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# GEMINI_API_KEY, GROQ_API_KEY và OPENROUTER_API_KEY

uvicorn app.main:app --reload --port 8000


