from datetime import datetime, timezone
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class Transaction(Document):
    user_id: PydanticObjectId
    account_id: PydanticObjectId | None = None
    amount: float
    category: str = "uncategorized"
    subcategory: str | None = None
    description: str
    date: datetime
    type: str  # income | expense | transfer
    transfer_kind: str | None = None  # account_transfer | cc_payment | investment_deployment | savings_instrument
    to_account_id: PydanticObjectId | None = None  # other leg of an internal transfer
    source: str = "manual"  # manual | csv_import | ocr_import
    tags: list[str] = Field(default_factory=list)
    is_recurring: bool = False
    document_id: PydanticObjectId | None = None
    ai_category_confidence: float | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "transactions"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("date", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("category", ASCENDING)]),
        ]
