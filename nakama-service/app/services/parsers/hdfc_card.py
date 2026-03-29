"""
HDFC Credit Card statement PDF parser.

Text format per transaction line:
  DD/MM/YYYY| HH:MM  DESCRIPTION  [+] [C] AMOUNT  [icon]

The PI category icons are encoded as non-text glyphs (appear as 'C', 'l' etc in extraction).
We extract category from the PI column by comparing text after amount.
Credits (payments) are identified by '+' before the amount.
"""
import re
from datetime import datetime
import pdfplumber
from app.services.parsers import ParsedTransaction

# Regex for a transaction line:
# Group 1: date (DD/MM/YYYY)
# Group 2: time (HH:MM)
# Group 3: description text
# Group 4: '+' if credit/payment (optional)
# Group 5: amount (digits, commas, dot)
TX_RE = re.compile(
    r'^(\d{2}/\d{2}/\d{4})\|\s+(\d{2}:\d{2})\s+(.+?)\s+(\+\s+)?(?:[A-Z]\s+)?([\d,]+\.?\d*)\s*[a-zA-Z]?\s*$'
)


def parse(file_path: str) -> list[ParsedTransaction]:
    rows: list[ParsedTransaction] = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.splitlines():
                line = line.strip()
                m = TX_RE.match(line)
                if not m:
                    continue
                date_str, _time, description, plus_sign, amount_str = m.groups()
                date = _parse_date(date_str)
                amount = _parse_amount(amount_str)
                if not date or not amount or amount <= 0:
                    continue

                description = description.strip()
                is_credit = bool(plus_sign) or _is_payment(description)
                txn_type = "credit" if is_credit else "debit"

                rows.append(ParsedTransaction(
                    date=date, description=description, raw_narration=description,
                    amount=amount, type=txn_type,
                    # HDFC PI icons are lost in text extraction — send to LLM for categorization
                    category="uncategorized", confidence=0.0,
                ))
    return rows


def _is_payment(description: str) -> bool:
    d = description.lower()
    return any(x in d for x in ("cc payment", "payment received", "refund", "reversal"))


def _parse_date(val: str) -> datetime | None:
    try:
        return datetime.strptime(val.strip(), "%d/%m/%Y")
    except ValueError:
        return None


def _parse_amount(val: str) -> float | None:
    val = val.replace(",", "").replace("₹", "").strip()
    try:
        return float(val)
    except ValueError:
        return None
