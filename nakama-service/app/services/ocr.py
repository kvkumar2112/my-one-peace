"""
OCR service for extracting text from bank statements, receipts, and financial documents.
Uses EasyOCR for image-based documents and pdfplumber for PDFs.
"""


def extract_from_image(file_path: str) -> str:
    """Extract text from image using EasyOCR."""
    import easyocr
    reader = easyocr.Reader(['en'])
    results = reader.readtext(file_path, detail=0)
    return "\n".join(results)


def extract_from_pdf(file_path: str) -> str:
    """Extract text and tables from PDF using pdfplumber."""
    import pdfplumber
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text


def parse_document(file_path: str, file_type: str) -> str:
    """Route to appropriate extractor based on file type."""
    if file_type in ["jpg", "jpeg", "png"]:
        return extract_from_image(file_path)
    elif file_type == "pdf":
        return extract_from_pdf(file_path)
    raise ValueError(f"Unsupported file type: {file_type}")
