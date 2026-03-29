from datetime import datetime
from pydantic import BaseModel


class BudgetCreate(BaseModel):
    category: str
    label: str
    limit_amount: float
    period: str = "monthly"
    icon: str | None = None


class BudgetUpdate(BaseModel):
    category: str | None = None
    label: str | None = None
    limit_amount: float | None = None
    period: str | None = None
    icon: str | None = None


class BudgetResponse(BaseModel):
    id: str
    user_id: str
    category: str
    label: str
    limit_amount: float
    period: str
    icon: str | None
    spent_amount: float = 0.0
    created_at: datetime
