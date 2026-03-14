"""
ML service for transaction categorization and spending forecast.
"""


def categorize_transaction(description: str) -> str:
    """Categorize a transaction based on its description."""
    # Placeholder — replace with trained model or rule-based classifier
    keywords = {
        "food": ["swiggy", "zomato", "restaurant", "cafe", "grocery"],
        "transport": ["uber", "ola", "petrol", "metro", "bus"],
        "utilities": ["electricity", "water", "gas", "broadband", "mobile"],
        "entertainment": ["netflix", "spotify", "movie", "prime"],
        "investment": ["mutual fund", "sip", "stocks", "zerodha", "groww"],
    }
    desc_lower = description.lower()
    for category, terms in keywords.items():
        if any(term in desc_lower for term in terms):
            return category
    return "others"


def forecast_spending(transactions: list) -> dict:
    """Basic ML forecast for next month's spending."""
    # Placeholder — replace with time-series model (Prophet, ARIMA, etc.)
    return {"forecast": "ML forecast coming soon"}
