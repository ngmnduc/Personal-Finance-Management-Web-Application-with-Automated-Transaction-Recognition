"""
Extracts text from digital PDFs using pdfplumber, bypassing the vision LLM.
"""

from io import BytesIO

import pdfplumber

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract and concatenate all text from a PDF."""
    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            pages_text = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text.strip())

        if not pages_text:
            raise ValueError("PDF contains no extractable text (may be image-based).")

        return "\n".join(pages_text)

    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Failed to open or parse PDF: {exc}") from exc
