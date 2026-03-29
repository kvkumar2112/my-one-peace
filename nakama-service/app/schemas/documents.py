from datetime import datetime
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    user_id: str
    filename: str
    file_type: str
    status: str
    error: str | None = None
    transactions_created: int
    parsed_count: int = 0
    created_at: datetime


class ParsedTransactionPreview(BaseModel):
    index: int
    date: datetime
    description: str
    raw_narration: str
    amount: float
    type: str
    category: str
    subcategory: str | None
    merchant: str | None
    confidence: float


class ConfirmImportRequest(BaseModel):
    selected_indices: list[int] | None = None       # None = import all
    category_overrides: dict[str, str] | None = None  # {"0": "food", "3": "transport"}


class HoldingImportPreview(BaseModel):
    index: int
    name: str
    ticker: str | None
    type: str
    platform: str | None
    quantity: float
    avg_buy_price: float
    invested_amount: float
    current_value: float
    pnl: float
    pnl_pct: float


class ConfirmHoldingImportRequest(BaseModel):
    selected_indices: list[int] | None = None
    holdings: list[dict]   # the preview dicts returned from /holdings/import
