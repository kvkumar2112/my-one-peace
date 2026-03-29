from datetime import datetime, timezone
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class Goal(Document):
    user_id: PydanticObjectId
    name: str
    target_amount: float
    saved_amount: float = 0.0
    monthly_contribution: float | None = None
    target_date: datetime | None = None
    icon: str | None = None
    color: str | None = None
    status: str = "active"  # active | completed | paused
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "goals"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
        ]
