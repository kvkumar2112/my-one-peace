from datetime import datetime, timezone
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class Budget(Document):
    user_id: PydanticObjectId
    category: str
    label: str
    limit_amount: float
    period: str = "monthly"  # monthly | weekly
    icon: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "budgets"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
        ]
