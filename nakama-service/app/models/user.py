from datetime import datetime, timezone
from typing import Any
from beanie import Document
from pydantic import EmailStr, Field
from pymongo import IndexModel, ASCENDING


class User(Document):
    email: EmailStr
    hashed_password: str
    full_name: str
    currency: str = "INR"
    fy_start: str = "april"
    plan: str = "free"
    notifications: dict[str, Any] = Field(default_factory=lambda: {
        "email_monthly_summary": True,
        "budget_alerts": True,
        "goal_reminders": True,
    })
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True),
        ]
