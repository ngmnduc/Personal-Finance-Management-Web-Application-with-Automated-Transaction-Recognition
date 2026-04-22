"""
PDF text extraction service.
Uses pdfplumber to reliably pull text from digital PDFs,
bypassing the LLM vision pipeline entirely.
"""

from io import BytesIO

import pdfplumber


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract and concatenate all text from a PDF.

    Args:
        file_bytes: Raw bytes of the PDF file.

    Returns:
        A single string with text from all pages joined by newlines.

    Raises:
        ValueError: If the PDF cannot be opened or yields no text.
    """
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
