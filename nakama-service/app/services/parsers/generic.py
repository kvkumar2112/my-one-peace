"""
Generic fallback parser using full LLM extraction.
Used when institution-specific table extraction fails.
Sends raw PDF text to Claude Haiku and asks it to extract + categorize transactions.
"""
import json
import pdfplumber
import anthropic
from datetime import datetime
from app.services.parsers import ParsedTransaction
from app.core.config import settings

EXTRACT_PROMPT = """Extract all financial transactions from this bank/credit card statement text.
Return ONLY a JSON array. Each object must have:
  "date": "YYYY-MM-DD",
  "description": "clean merchant or payee name",
  "amount": 1234.50,
  "type": "debit" or "credit",
  "category": one of [food, groceries, transport, fuel, shopping, entertainment,
    utilities, telecom, health, finance, travel, education, housing, salary, transfer, emi, uncategorized],
  "confidence": 0.0 to 1.0

Rules:
- Positive amounts only
- Credits/deposits → type: credit; debits/withdrawals → type: debit
- UPI payments to known merchants (Swiggy, Zomato, Ola) → identify category
- NACH/ACH with lender → category: emi
- Salary credits → category: salary
Return ONLY valid JSON array."""


async def parse(file_path: str) -> list[ParsedTransaction]:
    """Full LLM-based extraction for unknown statement formats."""
    raw_text = _extract_text(file_path)
    if not raw_text.strip():
        return []

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    msg = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": f"{EXTRACT_PROMPT}\n\nStatement text:\n{raw_text[:12000]}"
        }],
    )

    try:
        items = json.loads(msg.content[0].text)
    except (json.JSONDecodeError, IndexError):
        return []

    rows: list[ParsedTransaction] = []
    for item in items:
        try:
            date = datetime.strptime(item["date"], "%Y-%m-%d")
            rows.append(ParsedTransaction(
                date=date,
                description=str(item.get("description", "")),
                raw_narration=str(item.get("description", "")),
                amount=float(item.get("amount", 0)),
                type=str(item.get("type", "debit")),
                category=str(item.get("category", "uncategorized")),
                confidence=float(item.get("confidence", 0.5)),
            ))
        except (KeyError, ValueError):
            continue
    return rows


def _extract_text(file_path: str) -> str:
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"
    return text
