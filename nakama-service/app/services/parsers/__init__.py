from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ParsedTransaction:
    date: datetime
    description: str       # cleaned narration / merchant name
    raw_narration: str     # original text as in statement
    amount: float
    type: str              # "debit" | "credit"
    balance: float | None = None
    # filled by LLM categorizer after extraction:
    category: str = "uncategorized"
    subcategory: str | None = None
    merchant: str | None = None
    confidence: float = 0.0


def detect_institution(filename: str, first_page_text: str) -> str:
    """Detect statement institution from filename and first page text."""
    fname = filename.lower()
    text = first_page_text.lower()

    # Excel files → Zerodha P&L exports
    if fname.endswith((".xlsx", ".xls")):
        return "zerodha"

    # ICICI bank savings: "saving account" or "withdrawal amount" in text
    if "icici" in text:
        if "saving account" in text or "withdrawal amount" in text or "deposit amount" in text:
            return "icici_bank"
        return "icici_card"

    # HDFC: credit card has "minimum amount due" or "date & time" header
    if "hdfc" in text:
        if "minimum amount due" in text or "date & time" in text or "credit card" in text:
            return "hdfc_card"
        return "hdfc_bank"

    return "generic"
