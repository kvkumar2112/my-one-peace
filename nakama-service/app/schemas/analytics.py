from pydantic import BaseModel


class MonthDelta(BaseModel):
    value: float
    change: float
    change_pct: float


class DashboardSummary(BaseModel):
    net_worth: float
    net_worth_change_pct: float
    monthly_income: float
    income_change: float
    monthly_spend: float
    spend_change: float
    monthly_invested: float        # investment_deployment transfers this month
    monthly_savings_deployed: float  # savings_instrument transfers this month
    savings_rate: float            # (income - real_spend) / income
    savings_rate_change: float


class SpendingByCategory(BaseModel):
    category: str
    amount: float
    count: int
    pct: float = 0.0


class CashflowPoint(BaseModel):
    month: str  # e.g. "Jan 2026"
    income: float
    expenses: float
    invested: float  # investment_deployment + savings_instrument transfers


class InsightItem(BaseModel):
    type: str  # top_category | increase | unusual | savings_rate
    title: str
    description: str
    severity: str = "info"  # info | warning | danger


class InsightResponse(BaseModel):
    insights: list[InsightItem]
    generated_at: str
