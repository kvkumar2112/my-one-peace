from datetime import datetime, timezone
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class Holding(Document):
    user_id: PydanticObjectId
    name: str
    ticker: str | None = None
    type: str  # mutual_fund | stock | etf | ppf_epf | fd | gold
    platform: str | None = None
    quantity: float = 0.0
    avg_buy_price: float = 0.0
    current_price: float = 0.0
    invested_amount: float = 0.0
    current_value: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "holdings"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
        ]
