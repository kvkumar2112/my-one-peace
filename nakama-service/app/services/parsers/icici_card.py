"""
ICICI Credit Card statement PDF parser.

Text format per transaction line:
  DD/MM/YYYY  SerNo(10+ digits)  DESCRIPTION [IN]  RewardPts  [IntlAmt]  AMOUNT [CR]

The merchant name sometimes has extra spaces from PDF word-wrapping (e.g. "Apollo P harmacy IN").
We normalize these by collapsing whitespace.
"""
import re
from datetime import datetime
import pdfplumber
from app.services.parsers import ParsedTransaction

# Match: date + serial + description + reward points + optional intl amount + amount + optional CR
TX_RE = re.compile(
    r'^(\d{2}/\d{2}/\d{4})\s+'       # date
    r'(\d{10,})\s+'                    # serial number (10+ digits)
    r'(.+?)\s+'                        # description (greedy-minimal)
    r'(\d+)\s+'                        # reward points
    r'(?:[\d,]+\.\d+\s+)?'            # optional international amount
    r'([\d,]+\.\d{2})\s*(CR)?'        # amount + optional CR
    r'\s*$'
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
                date_str, _serial, raw_narration, _points, amount_str, cr_flag = m.groups()

                date = _parse_date(date_str)
                amount = _parse_amount(amount_str)
                if not date or not amount or amount <= 0:
                    continue

                raw_narration = raw_narration.strip()
                description = _clean_narration(raw_narration)
                txn_type = "credit" if cr_flag else "debit"

                rows.append(ParsedTransaction(
                    date=date, description=description, raw_narration=raw_narration,
                    amount=amount, type=txn_type,
                ))
    return rows


def _clean_narration(raw: str) -> str:
    """Clean ICICI narration:
    'UPI-953961617405-KFC Channasandra IN' → 'KFC Channasandra'
    'DR VAMSI PHARMA IN' → 'DR VAMSI PHARMA'
    """
    # Remove UPI reference prefix
    cleaned = re.sub(r'^UPI-\d+-', '', raw.strip())
    # Remove trailing ' IN' (international flag or end marker)
    cleaned = re.sub(r'\s+IN\s*$', '', cleaned.strip())
    # Normalize extra internal spaces (PDF word-split artifacts)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    return cleaned or raw


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
