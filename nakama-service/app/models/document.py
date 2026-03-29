from datetime import datetime, timezone
from typing import Any
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class BankDocument(Document):
    user_id: PydanticObjectId
    filename: str
    file_path: str
    file_type: str  # pdf | image | csv
    account_id: str | None = None        # which account this statement belongs to
    account_type: str | None = None      # savings | salary | credit | wallet | investment | loan
    parsed_data: list[Any] = Field(default_factory=list)
    status: str = "uploaded"  # uploaded | parsing | parsed | failed
    error: str | None = None
    transactions_created: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "documents"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
        ]
