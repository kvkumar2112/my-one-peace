from datetime import datetime
from pydantic import BaseModel


class HoldingCreate(BaseModel):
    name: str
    ticker: str | None = None
    type: str  # mutual_fund | stock | etf | ppf_epf | fd | gold
    platform: str | None = None
    quantity: float = 0.0
    avg_buy_price: float = 0.0
    current_price: float = 0.0
    invested_amount: float = 0.0
    current_value: float = 0.0


class HoldingUpdate(BaseModel):
    name: str | None = None
    ticker: str | None = None
    type: str | None = None
    platform: str | None = None
    quantity: float | None = None
    avg_buy_price: float | None = None
    current_price: float | None = None
    invested_amount: float | None = None
    current_value: float | None = None


class HoldingResponse(BaseModel):
    id: str
    user_id: str
    name: str
    ticker: str | None
    type: str
    platform: str | None
    quantity: float
    avg_buy_price: float
    current_price: float
    invested_amount: float
    current_value: float
    pnl: float = 0.0
    pnl_pct: float = 0.0
    created_at: datetime


class AllocationItem(BaseModel):
    type: str
    value: float
    pct: float


class PortfolioSummary(BaseModel):
    total_value: float
    total_invested: float
    total_pnl: float
    total_pnl_pct: float
    allocation: list[AllocationItem]
    holdings: list[HoldingResponse]
