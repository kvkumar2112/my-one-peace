"""
LLM batch categorization using Claude Haiku.
Sends ONLY narration strings (not full PDF text) to minimize token usage.
One API call per document regardless of transaction count.
"""
import json
import logging
import anthropic
from app.core.config import settings

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a financial transaction categorizer for Indian bank and credit card statements.
Each narration is prefixed with the direction AND account type:
  [CREDIT from SAVINGS]     — money received into savings/salary account
  [CREDIT from SALARY]      — money received into salary account
  [CREDIT from CREDIT_CARD] — credit posted on credit card (usually a refund)
  [DEBIT from SAVINGS]      — money sent from savings/salary account
  [DEBIT from CREDIT_CARD]  — purchase charged to credit card
  [CREDIT from UNKNOWN]     — direction known but account type not provided

Given a numbered list of narrations, return a JSON array with one object per narration.

Categories: food, groceries, transport, fuel, shopping, entertainment, utilities,
telecom, health, finance, travel, education, housing, salary, transfer, self_transfer,
emi, refund, bill_payment, investment, dividend, uncategorized

For each narration return exactly:
{"i": 1, "category": "food", "subcategory": "delivery", "merchant": "Swiggy", "confidence": 0.95}

subcategory and merchant may be null if unknown.

Rules for Indian transactions:

CREDIT into SAVINGS or SALARY account:
- NSDL/CDSL/DEPOSITORY anywhere → finance, subcategory: dividend, confidence: 0.95 (these are stock/MF dividend payouts, NOT salary)
- DIVIDEND/DIV anywhere → finance, subcategory: dividend, confidence: 0.95
- NEFT/IMPS/RTGS with company/employer name → salary, confidence: 0.85
- SAL/SALARY/PAYROLL anywhere in narration → salary, confidence: 0.95
- Travel platform name (MakeMyTrip/Goibibo/IndiGo/Cleartrip) as sender = employer paying salary → salary, NOT travel
- REFUND/REVERSAL/CASHBACK → refund, confidence: 0.95
- INTEREST CREDIT/INT CR → finance, subcategory: interest, confidence: 0.9
- Large NEFT from unknown corporate source → salary, confidence: 0.6

CREDIT into CREDIT_CARD account:
- Any merchant name (MakeMyTrip/Amazon/Swiggy etc.) → refund, confidence: 0.9 (card credits are almost always refunds)
- REFUND/REVERSAL/CASHBACK explicitly → refund, confidence: 0.98
- PAYMENT RECEIVED/PAYMENT THANK YOU → bill_payment, confidence: 0.98 (customer paying their CC bill)
- INTEREST/FINANCE CHARGE → finance, subcategory: interest_charge

DEBIT from any account:
- NACH DR / ACH DR / NACH DEBIT (any lender) → emi, confidence: 0.95 (always loan EMI auto-debits)
- UPI to Swiggy/Zomato/EatSure → food, subcategory: delivery
- UPI to Ola/Uber/Rapido → transport, subcategory: ride
- UPI to BigBasket/Blinkit/Zepto/Instamart/DMart → groceries
- UPI to Netflix/Hotstar/Spotify/Prime → entertainment, subcategory: streaming
- UPI to Amazon/Flipkart/Myntra/Ajio → shopping
- MakeMyTrip/Goibibo/Cleartrip/IRCTC → travel
- BILLPAY with BESCOM/MSEDCL/electricity/gas → utilities
- CC PAYMENT / credit card payment → bill_payment, confidence: 0.95
- Zerodha/Groww/Upstox/Kuvera/MF purchase → investment, confidence: 0.95
- Transfer to own/self account → self_transfer, confidence: 0.9
- UPI to unknown handle (random digits, q@ybl) → transfer, confidence: 0.4

General:
- Unknown → uncategorized, confidence: 0.3

Return ONLY a valid JSON array, no markdown fences."""


CHUNK_SIZE = 40  # max narrations per LLM call to avoid token truncation


async def categorize_batch(narrations: list[str]) -> list[dict]:
    """
    Categorize narrations using Haiku. Splits into chunks to avoid truncation.
    Returns list aligned with input (same length, same order).
    """
    if not narrations:
        return []

    if not settings.ANTHROPIC_API_KEY:
        return [{"category": "uncategorized", "subcategory": None, "merchant": None, "confidence": 0.0}
                for _ in narrations]

    results: list[dict] = []
    for chunk_start in range(0, len(narrations), CHUNK_SIZE):
        chunk = narrations[chunk_start:chunk_start + CHUNK_SIZE]
        chunk_results = await _call_llm(chunk, offset=chunk_start)
        results.extend(chunk_results)

    return results


async def _call_llm(narrations: list[str], offset: int = 0) -> list[dict]:
    numbered = "\n".join(f"{offset + i + 1}. {n}" for i, n in enumerate(narrations))

    log.info("LLM categorize: sending narrations %d–%d", offset + 1, offset + len(narrations))

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    msg = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": numbered}],
    )

    raw_response = msg.content[0].text
    log.info("LLM response (%d chars, stop=%s): %s", len(raw_response), msg.stop_reason, raw_response[:300])

    # Strip markdown fences if model added them despite instructions
    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").strip()
        if "```" in cleaned:
            cleaned = cleaned[:cleaned.rfind("```")].strip()

    try:
        results = json.loads(cleaned)
    except (json.JSONDecodeError, IndexError) as e:
        log.error("LLM JSON parse failed: %s | raw: %s", e, raw_response[:300])
        results = []

    by_index: dict[int, dict] = {r["i"]: r for r in results if isinstance(r, dict) and "i" in r}

    return [
        by_index.get(offset + i + 1, {"category": "uncategorized", "subcategory": None, "merchant": None, "confidence": 0.0})
        for i in range(len(narrations))
    ]
