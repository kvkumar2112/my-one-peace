from datetime import datetime
from pydantic import BaseModel


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    monthly_contribution: float | None = None
    target_date: datetime | None = None
    icon: str | None = None
    color: str | None = None


class GoalUpdate(BaseModel):
    name: str | None = None
    target_amount: float | None = None
    saved_amount: float | None = None
    monthly_contribution: float | None = None
    target_date: datetime | None = None
    icon: str | None = None
    color: str | None = None
    status: str | None = None


class GoalResponse(BaseModel):
    id: str
    user_id: str
    name: str
    target_amount: float
    saved_amount: float
    monthly_contribution: float | None
    target_date: datetime | None
    icon: str | None
    color: str | None
    status: str
    progress_pct: float = 0.0
    created_at: datetime


class ContributionRequest(BaseModel):
    amount: float
