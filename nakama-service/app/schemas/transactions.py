from datetime import datetime
from pydantic import BaseModel


class TransactionCreate(BaseModel):
    amount: float
    description: str
    date: datetime
    type: str  # income | expense | transfer
    transfer_kind: str | None = None  # account_transfer | cc_payment | investment_deployment | savings_instrument
    to_account_id: str | None = None
    category: str | None = None
    subcategory: str | None = None
    account_id: str | None = None
    tags: list[str] = []
    is_recurring: bool = False
    source: str = "manual"


class TransactionUpdate(BaseModel):
    amount: float | None = None
    description: str | None = None
    date: datetime | None = None
    type: str | None = None
    transfer_kind: str | None = None
    to_account_id: str | None = None
    category: str | None = None
    subcategory: str | None = None
    account_id: str | None = None
    tags: list[str] | None = None
    is_recurring: bool | None = None


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    account_id: str | None
    amount: float
    category: str
    subcategory: str | None
    description: str
    date: datetime
    type: str
    transfer_kind: str | None
    to_account_id: str | None
    source: str
    tags: list[str]
    is_recurring: bool
    ai_category_confidence: float | None
    created_at: datetime


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total: int
    skip: int
    limit: int
