import re

# Keyword → transfer_kind mapping. Checked BEFORE category rules.
# Matches override type to "transfer" and skip expense categorization.
TRANSFER_RULES: list[tuple[list[str], str]] = [
    # Credit card bill payments (not a new expense — the spend was already recorded per transaction)
    (["creditcard payment", "credit card payment", "cc bill", "cc pmt", "cc payment",
      "hdfc cc", "icici cc", "sbi cc", "axis cc", "kotak cc", "indusind cc",
      "amex payment", "citi card payment", "rbl cc"], "cc_payment"),

    # Loan EMI payments (NACH/ACH auto-debits from bank for loan repayments)
    (["nach dr", "ach dr", "nach debit", "ach debit",
      "loan emi", "home loan emi", "car loan emi", "personal loan emi",
      "emi payment", "emi debit"], "emi_payment"),

    # Investment platform fund transfers (money converts to asset, not consumed)
    (["zerodha", "kite by zerodha", "groww", "upstox", "kuvera", "paytm money",
      "coin by zerodha", "smallcase", "scripbox", "et money", "etmoney",
      "mf purchase", "mutual fund purchase", "sip installment", "sip debit",
      "nifty50 etf", "nifty bees"], "investment_deployment"),

    # Savings instruments (FD, RD, PPF, NPS, EPF — money locked, tracked in holdings)
    (["fd creation", "fixed deposit creation", "fd opening", "rd installment",
      "recurring deposit", "ppf contribution", "ppf transfer", "ppf deposit",
      "nps tier1", "nps tier 1", "nps contribution", "epf contribution",
      "provident fund"], "savings_instrument"),

    # Account-to-account transfers (between own accounts, zero net effect)
    (["self transfer", "own account transfer", "transfer to self",
      "neft to self", "imps to self", "salary transfer",
      "sweep in", "sweep out"], "account_transfer"),
]

# Keyword → expense/income category mapping (only real spend/income)
CATEGORY_RULES: list[tuple[list[str], str]] = [
    # Food & Dining
    (["swiggy", "zomato", "dunzo food", "eatsure", "faasos", "box8", "freshmenu",
      "mcdonald", "domino", "pizza hut", "kfc", "burger king", "subway",
      "starbucks", "cafe coffee", "ccd", "haldiram", "barbeque nation"], "food"),

    # Groceries
    (["bigbasket", "big basket", "blinkit", "grofers", "jiomart", "dmart",
      "d-mart", "reliance fresh", "more supermarket", "spencer", "nature basket",
      "zepto", "instamart"], "groceries"),

    # Transport
    (["ola", "uber", "rapido", "meru",
      "irctc", "indian railways", "railways", "redbus", "makemytrip bus",
      "goibibo bus", "yulu", "bounce", "metro", "bmtc", "best bus"], "transport"),

    # Fuel
    (["petrol", "diesel", "hp petrol", "bharat petroleum", "indian oil",
      "iocl", "hpcl", "bpcl", "fuel", "shell"], "fuel"),

    # Shopping
    (["amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho",
      "snapdeal", "tatacliq", "reliance digital", "croma", "vijay sales",
      "decathlon", "h&m", "zara", "lifestyle", "westside"], "shopping"),

    # Entertainment
    (["netflix", "prime video", "hotstar", "disney", "zee5", "sonyliv",
      "spotify", "gaana", "jiosaavn", "youtube premium", "apple music",
      "pvr", "inox", "cinepolis", "bookmyshow", "ticketnew"], "entertainment"),

    # Utilities
    (["electricity", "bescom", "msedcl", "tata power", "adani electricity",
      "water bill", "bwssb", "gas bill", "mahanagar gas", "indraprastha gas",
      "broadband", "act fibernet", "hathway", "jio fiber",
      "airtel broadband", "tata sky", "dish tv", "dth"], "utilities"),

    # Mobile/Telecom
    (["airtel", "jio", "vi ", "vodafone", "bsnl", "recharge",
      "mobile recharge", "prepaid", "postpaid"], "telecom"),

    # Health
    (["pharmacy", "chemist", "medplus", "apollo pharmacy", "netmeds",
      "1mg", "pharmeasy", "practo", "doctor", "hospital", "clinic",
      "max hospital", "fortis", "manipal", "columbia asia",
      "diagnostic", "lab test", "thyrocare", "lal path"], "health"),

    # Dividend income from stocks / mutual funds
    (["nsdl", "cdsl", "dividend", "div payout", "mutual fund dividend",
      "mf dividend", "equity dividend"], "dividend"),

    # Finance — insurance premiums, bank charges (EMIs moved to TRANSFER_RULES)
    (["insurance premium", "lic premium", "hdfc life", "icici pru",
      "sbi life", "bajaj allianz", "star health premium",
      "home loan", "car loan", "personal loan"], "finance"),

    # Travel
    (["makemytrip", "goibibo", "cleartrip", "yatra", "ixigo",
      "indigo", "air india", "spicejet", "vistara", "go first",
      "akasa air", "hotel", "oyo", "fabhotels", "treebo",
      "airbnb", "taj hotels", "marriott"], "travel"),

    # Education
    (["byjus", "unacademy", "coursera", "udemy", "skillshare",
      "school fee", "college fee", "tuition", "coaching",
      "vedantu", "whitehat jr", "toppr"], "education"),

    # Rent & Housing
    (["rent", "maintenance", "society", "flat rent", "house rent",
      "nobroker", "magicbricks", "99acres", "housing.com"], "housing"),

    # Salary & Income
    (["salary", "wages", "payroll", "stipend", "freelance",
      "consulting fee", "neft cr", "imps cr", "rtgs cr"], "salary"),
]

INSIGHTS_THRESHOLDS = {
    "increase_pct": 20.0,
    "unusual_multiplier": 2.0,
    "min_spend_for_budget": 2000.0,
}


# Derives transfer_kind based on the account types involved in a transfer.
# from_type = account being imported, to_type = matched destination account.
def _derive_transfer_kind(from_type: str, to_type: str) -> str:
    if to_type == "credit":
        return "cc_payment"
    if to_type == "loan":
        return "emi_payment"
    if to_type == "investment":
        return "investment_deployment"
    return "account_transfer"


def _transfer_kind_to_category(kind: str) -> str:
    """Map transfer_kind → human-readable category stored on the transaction."""
    return {
        "cc_payment": "bill_payment",
        "emi_payment": "emi",
        "investment_deployment": "investment",
        "savings_instrument": "investment",
        "account_transfer": "self_transfer",
        "p2p_received": "transfer",
    }.get(kind, "transfer")


def classify_with_accounts(
    description: str,
    amount: float,
    from_account_type: str,
    other_accounts: list[dict],
    merchant_rules: list[dict],
) -> dict:
    """Account-aware transaction classifier. Call this during import.

    Priority order:
      1. Account pattern match → transfer (kind derived from account types)
      2. User merchant rules → learned category
      3. detect_transfer() keyword match → transfer (investment/savings/cc)
      4. categorize() merchant keyword match → expense category
      5. Unmatched UPI/payment → personal_payment expense (needs_review=True)
      6. Fallback → uncategorized expense (needs_review=True)

    Args:
        description: raw transaction description
        amount: positive = credit (money in), negative = debit (money out)
        from_account_type: type of the account being imported
        other_accounts: list of dicts with keys: id, type, match_patterns
        merchant_rules: list of dicts with keys: keyword, category, subcategory, label

    Returns dict with keys: type, transfer_kind, matched_account_id,
                             category, subcategory, confidence, needs_review
    """
    desc_lower = re.sub(r"[^a-z0-9\s]", " ", description.lower())

    # 1. Account pattern match — explicit link_type wins over type-derived kind
    for acc in other_accounts:
        for pattern in acc.get("match_patterns", []):
            if pattern.lower() in desc_lower:
                kind = acc.get("explicit_link_type") or _derive_transfer_kind(from_account_type, acc["type"])
                category = _transfer_kind_to_category(kind)
                return {
                    "type": "transfer",
                    "transfer_kind": kind,
                    "matched_account_id": acc["id"],
                    "category": category,
                    "subcategory": None,
                    "confidence": 1.0,
                    "needs_review": False,
                }

    # 2. User merchant rules (learned from past corrections)
    for rule in merchant_rules:
        if rule["keyword"].lower() in desc_lower:
            return {
                "type": "expense",
                "transfer_kind": None,
                "matched_account_id": None,
                "category": rule["category"],
                "subcategory": rule.get("subcategory"),
                "confidence": 1.0,
                "needs_review": False,
            }

    # 3. Known transfer keyword detection (EMI, investment platforms, savings instruments)
    transfer_kind = detect_transfer(description)
    if transfer_kind:
        category = _transfer_kind_to_category(transfer_kind)
        return {
            "type": "transfer",
            "transfer_kind": transfer_kind,
            "matched_account_id": None,
            "category": category,
            "subcategory": None,
            "confidence": 0.9,
            "needs_review": False,
        }

    # 4. Known merchant category matching
    category, confidence = categorize(description)
    if category != "uncategorized":
        tx_type = "income" if amount > 0 else "expense"
        return {
            "type": tx_type,
            "transfer_kind": None,
            "matched_account_id": None,
            "category": category,
            "subcategory": None,
            "confidence": confidence,
            "needs_review": False,
        }

    # 5. Unmatched UPI/P2P — flag for user review
    upi_keywords = ["upi", "phonepe", "gpay", "google pay", "paytm", "bhim", "neft", "imps"]
    is_payment_rail = any(k in desc_lower for k in upi_keywords)
    if is_payment_rail:
        if amount > 0:
            # Credit from unknown source — likely split bill or reimbursement
            return {
                "type": "transfer",
                "transfer_kind": "p2p_received",
                "matched_account_id": None,
                "category": "transfer",
                "subcategory": None,
                "confidence": 0.6,
                "needs_review": True,
            }
        else:
            # Debit to unknown person — local vendor, household, etc.
            return {
                "type": "expense",
                "transfer_kind": None,
                "matched_account_id": None,
                "category": "personal_payment",
                "subcategory": None,
                "confidence": 0.5,
                "needs_review": True,
            }

    # 6. Fallback
    tx_type = "income" if amount > 0 else "expense"
    return {
        "type": tx_type,
        "transfer_kind": None,
        "matched_account_id": None,
        "category": "uncategorized",
        "subcategory": None,
        "confidence": 0.0,
        "needs_review": True,
    }


def detect_transfer(description: str) -> str | None:
    """Check if a transaction description matches a known transfer pattern.

    Returns transfer_kind string if matched, else None.
    When this returns a value, the transaction type should be set to "transfer".
    """
    desc_lower = description.lower()
    desc_lower = re.sub(r"[^a-z0-9\s]", " ", desc_lower)

    for keywords, transfer_kind in TRANSFER_RULES:
        for keyword in keywords:
            if keyword in desc_lower:
                return transfer_kind

    return None


def categorize(description: str) -> tuple[str, float]:
    """Keyword-based transaction categorizer for Indian merchants.
    Returns (category, confidence) where confidence is 0.0-1.0.
    Does NOT detect transfers — call detect_transfer() first.
    """
    desc_lower = description.lower()
    desc_lower = re.sub(r"[^a-z0-9\s]", " ", desc_lower)

    for keywords, category in CATEGORY_RULES:
        for keyword in keywords:
            if keyword in desc_lower:
                return (category, 0.9)

    return ("uncategorized", 0.0)


# Keep backward-compatible alias
def categorize_transaction(description: str) -> str:
    category, _ = categorize(description)
    return category


def generate_spending_insights(
    current_month_by_cat: dict,
    prev_month_by_cat: dict,
    total_income: float,
    total_spend: float,
) -> list:
    """Generate rules-based spending insights."""
    insights = []

    sorted_cats = sorted(current_month_by_cat.items(), key=lambda x: x[1], reverse=True)
    for cat, amount in sorted_cats[:3]:
        insights.append({
            "type": "top_category",
            "title": f"Top spend: {cat.capitalize()}",
            "description": f"You spent \u20b9{amount:,.0f} on {cat} this month",
            "severity": "info",
        })

    for cat, amount in current_month_by_cat.items():
        prev = prev_month_by_cat.get(cat, 0)
        if prev > 0:
            change_pct = ((amount - prev) / prev) * 100
            if change_pct > INSIGHTS_THRESHOLDS["increase_pct"]:
                insights.append({
                    "type": "increase",
                    "title": f"{cat.capitalize()} spending up {change_pct:.0f}%",
                    "description": f"\u20b9{amount:,.0f} vs \u20b9{prev:,.0f} last month",
                    "severity": "warning",
                })

    if total_income > 0:
        savings_rate = ((total_income - total_spend) / total_income) * 100
        if savings_rate < 20:
            insights.append({
                "type": "savings_rate",
                "title": f"Low savings rate: {savings_rate:.0f}%",
                "description": "Try to save at least 20% of your income",
                "severity": "warning",
            })
        else:
            insights.append({
                "type": "savings_rate",
                "title": f"Good savings rate: {savings_rate:.0f}%",
                "description": f"You saved \u20b9{(total_income - total_spend):,.0f} this month",
                "severity": "info",
            })

    return insights


def forecast_spending(transactions: list) -> dict:
    """Placeholder — replace with time-series model (Prophet, ARIMA, etc.)"""
    return {"forecast": "ML forecast coming soon"}
