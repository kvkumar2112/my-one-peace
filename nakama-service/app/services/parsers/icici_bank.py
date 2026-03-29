"""
ICICI Bank savings/salary account PDF parser.

Column x-ranges (approximate, varies slightly by PDF version):
  Date:                x0 ~ 61
  Transaction Remarks: x0 ~ 190–390 (multi-line narration)
  Withdrawal Amount:   x0 ~ 390–455
  Deposit Amount:      x0 ~ 456–520
  Balance:             x0 ~ 521–590

Direction detection strategy:
  Primary:  balance delta — if balance increased vs previous row → credit, else debit.
  Fallback: x-position of the transaction amount column.
"""
import re
from datetime import datetime
import pdfplumber
from app.services.parsers import ParsedTransaction

DATE_RE = re.compile(r'^\d{2}\.\d{2}\.\d{4}$')

# x-position boundary separating Withdrawal (left) from Deposit (right) columns
DEPOSIT_X_THRESHOLD = 456


def parse(file_path: str) -> list[ParsedTransaction]:
    rows: list[ParsedTransaction] = []
    prev_balance: float | None = None

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_rows, prev_balance = _parse_page(page, prev_balance)
            rows.extend(page_rows)

    return rows


def _parse_page(page, prev_balance: float | None) -> tuple[list[ParsedTransaction], float | None]:
    words = page.extract_words(x_tolerance=3, y_tolerance=3)
    if not words:
        return [], prev_balance

    # Group words into logical lines by their top (y) coordinate
    lines: dict[float, list[dict]] = {}
    for w in words:
        top = round(w["top"], 1)
        lines.setdefault(top, []).append(w)
    sorted_tops = sorted(lines.keys())

    # Find all anchor lines — lines containing a DD.MM.YYYY date
    # Each anchor = (top_y, date_str, [(x0, amount_value), ...])
    anchors: list[tuple[float, str, list[tuple[float, float]]]] = []
    for top in sorted_tops:
        line_words = sorted(lines[top], key=lambda w: w["x0"])
        texts = [w["text"] for w in line_words]
        date_str = next((t for t in texts if DATE_RE.match(t)), None)
        if not date_str:
            continue

        amount_words = [(w["x0"], w["text"]) for w in line_words if w["x0"] > 390]
        xy_amounts: list[tuple[float, float]] = []
        for x0, text in amount_words:
            v = _parse_amount(text)
            if v is not None:
                xy_amounts.append((x0, v))

        anchors.append((top, date_str, xy_amounts))

    # Build transactions
    results: list[ParsedTransaction] = []
    for idx, (top, date_str, xy_amounts) in enumerate(anchors):
        next_top = anchors[idx + 1][0] if idx + 1 < len(anchors) else float("inf")

        # Narration: words with x0 between 185–390, in y-range of this anchor
        narration_words = []
        for t in sorted_tops:
            if t < top - 15 and idx > 0:
                continue
            if t >= next_top:
                break
            for w in lines[t]:
                if 185 <= w["x0"] <= 390:
                    narration_words.append((t, w["x0"], w["text"]))

        narration_words.sort(key=lambda x: (x[0], x[1]))
        narration = " ".join(w[2] for w in narration_words).strip()
        if not narration:
            continue

        date = _parse_date(date_str)
        if not date:
            continue

        tx_amount, is_credit, balance = _extract_direction(xy_amounts, prev_balance)
        if tx_amount is None or tx_amount == 0:
            if balance is not None:
                prev_balance = balance
            continue

        results.append(ParsedTransaction(
            date=date,
            description=narration,
            raw_narration=narration,
            amount=tx_amount,
            type="credit" if is_credit else "debit",
            balance=balance,
        ))
        if balance is not None:
            prev_balance = balance

    return results, prev_balance


def _extract_direction(
    xy_amounts: list[tuple[float, float]],
    prev_balance: float | None,
) -> tuple[float | None, bool | None, float | None]:
    """
    Returns (tx_amount, is_credit, balance).

    Priority:
    1. If 3 amounts found (withdrawal, deposit, balance):
       - Use the non-zero one; if both non-zero use balance delta.
    2. If 2 amounts found (tx_amount, balance):
       - Use balance delta (primary), x-position (fallback).
    3. If 1 amount found: treat as balance only, no transaction.
    """
    if not xy_amounts:
        return None, None, None

    sorted_xy = sorted(xy_amounts, key=lambda x: x[0])  # sort by x position
    values = [v for _, v in sorted_xy]
    x_pos = [x for x, _ in sorted_xy]

    if len(values) >= 3:
        # Three columns: withdrawal, deposit, balance
        withdrawal, deposit, balance = values[0], values[1], values[2]
        if deposit > 0 and withdrawal == 0:
            return deposit, True, balance
        if withdrawal > 0 and deposit == 0:
            return withdrawal, False, balance
        # Both non-zero — use balance delta as tiebreaker
        if prev_balance is not None:
            is_credit = balance > prev_balance
            return (deposit if is_credit else withdrawal), is_credit, balance
        return withdrawal, False, balance  # conservative fallback

    elif len(values) == 2:
        tx_amount, balance = values[0], values[1]

        # Primary: balance delta
        if prev_balance is not None:
            is_credit = balance > prev_balance
            return tx_amount, is_credit, balance

        # Fallback: x-position (deposit column starts right of DEPOSIT_X_THRESHOLD)
        is_credit = x_pos[0] >= DEPOSIT_X_THRESHOLD
        return tx_amount, is_credit, balance

    else:
        # Only one value — assume it's the balance, no transaction amount
        return None, None, values[0]


def _parse_date(val: str) -> datetime | None:
    try:
        return datetime.strptime(val.strip(), "%d.%m.%Y")
    except ValueError:
        return None


def _parse_amount(val: str) -> float | None:
    val = val.replace(",", "").replace("₹", "").strip()
    try:
        return float(val)
    except ValueError:
        return None
