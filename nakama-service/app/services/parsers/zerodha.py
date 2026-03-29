"""
Zerodha P&L Excel parser (Kite equity/F&O + Coin mutual funds).

For equity/MF sheets: maps open positions to the Holding model.
For F&O sheets: extracts summary P&L (realized + unrealized - charges) as a
single "F&O Trading" entry — individual contracts are not imported.
"""
import re
import pandas as pd


def parse_holdings(file_path: str) -> list[dict]:
    """Parse Zerodha P&L Excel → list of holding dicts ready to create Holding docs."""
    xl = pd.ExcelFile(file_path)
    holdings: list[dict] = []

    for sheet_name in xl.sheet_names:
        if sheet_name == "Other Debits and Credits":
            continue

        # F&O sheet: extract summary P&L only
        if "F&O" in sheet_name or "fno" in sheet_name.lower():
            fno = _extract_fno_summary(file_path, sheet_name)
            if fno:
                holdings.append(fno)
            continue

        df = _read_sheet(file_path, sheet_name)
        if df is None or df.empty:
            continue

        for _, row in df.iterrows():
            symbol = _val(row, "Symbol")
            if not symbol or pd.isna(symbol):
                continue

            open_qty = _float(row, "Open Quantity") or 0.0
            if open_qty <= 0:
                continue  # closed position, nothing to import

            isin = _val(row, "ISIN") or ""
            holding_type = _detect_type(str(symbol), str(isin))

            if holding_type == "fno":
                continue  # individual F&O contracts skipped; handled via summary above

            open_value = _float(row, "Open Value") or 0.0
            unrealized_pnl = _float(row, "Unrealized P&L") or 0.0
            # For open-only positions Buy Value is 0; derive invested from current value minus unrealized P&L
            buy_value = _float(row, "Buy Value") or 0.0
            invested = buy_value if buy_value > 0 else (open_value - unrealized_pnl)
            avg_buy = invested / open_qty if open_qty > 0 else 0.0

            holdings.append({
                "name": str(symbol),
                "ticker": str(symbol),
                "type": holding_type,
                "platform": "Zerodha",
                "quantity": open_qty,
                "avg_buy_price": round(avg_buy, 4),
                "current_price": 0.0,
                "invested_amount": round(invested, 2),
                "current_value": round(open_value, 2),
            })

    return holdings


def _extract_fno_summary(file_path: str, sheet_name: str) -> dict | None:
    """Read the F&O summary section and return a single P&L summary holding."""
    raw = pd.read_excel(file_path, sheet_name=sheet_name, header=None)

    realized_pnl = 0.0
    unrealized_pnl = 0.0
    charges = 0.0

    for _, row in raw.iterrows():
        vals = [v for v in row.values if not pd.isna(v)]
        if len(vals) >= 2:
            label = str(vals[0]).strip()
            try:
                val = float(vals[1])
            except (ValueError, TypeError):
                continue
            if label == "Realized P&L":
                realized_pnl = val
            elif label == "Unrealized P&L":
                unrealized_pnl = val
            elif label == "Charges":
                charges = val

    net_pnl = realized_pnl + unrealized_pnl - charges
    if realized_pnl == 0.0 and unrealized_pnl == 0.0:
        return None

    # invested_amount = charges paid (cost of trading)
    # current_value = charges + net result (so pnl = current - invested = net_pnl)
    return {
        "name": "F&O Trading",
        "ticker": None,
        "type": "fno",
        "platform": "Zerodha",
        "quantity": 0.0,
        "avg_buy_price": 0.0,
        "current_price": 0.0,
        "invested_amount": round(charges, 2),
        "current_value": round(charges + net_pnl, 2),
    }


def _read_sheet(file_path: str, sheet_name: str) -> pd.DataFrame | None:
    """Find the header row and read data below it."""
    # Read a chunk to locate the header
    raw = pd.read_excel(file_path, sheet_name=sheet_name, header=None, nrows=60)
    header_row = None
    for i, row in raw.iterrows():
        vals = [str(v).strip() for v in row if not pd.isna(v)]
        if "Symbol" in vals and "ISIN" in vals:
            header_row = i
            break
    if header_row is None:
        return None
    return pd.read_excel(file_path, sheet_name=sheet_name, header=header_row)


def _detect_type(symbol: str, isin: str) -> str:
    # Mutual funds: ISIN starts with INF
    if isin.upper().startswith("INF"):
        return "mutual_fund"
    # ETFs: common suffix patterns on NSE
    if any(symbol.upper().endswith(s) for s in ["BEES", "ETF"]):
        return "etf"
    # F&O: options/futures contract naming (e.g. NIFTY25APR24400CE, HDFCBANK26APR850PE)
    if re.search(r'\d{2}(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d+[CP]E$', symbol.upper()):
        return "fno"
    if re.search(r'\d{2}(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d+FUT$', symbol.upper()):
        return "fno"
    # Numeric-only style like NIFTY2560524200PE
    if re.search(r'\d{5,}[CP]E$', symbol.upper()):
        return "fno"
    return "stock"


def _val(row: pd.Series, col: str) -> str | None:
    for c in row.index:
        if str(c).strip() == col:
            v = row[c]
            return None if pd.isna(v) else str(v).strip()
    return None


def _float(row: pd.Series, col: str) -> float | None:
    for c in row.index:
        if str(c).strip() == col:
            v = row[c]
            if pd.isna(v):
                return None
            try:
                return float(v)
            except (ValueError, TypeError):
                return None
    return None
