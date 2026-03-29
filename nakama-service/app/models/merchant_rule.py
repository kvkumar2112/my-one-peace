from datetime import datetime, timezone
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class MerchantRule(Document):
    """User-defined category mapping for recurring vendor names.

    When a transaction description contains `keyword`, auto-apply
    the stored category/subcategory instead of guessing.
    Learned from user corrections during import or manual edits.
    """
    user_id: PydanticObjectId
    keyword: str          # lowercased substring to match, e.g. "muniraj", "raju flowers"
    category: str         # e.g. "personal_payment", "food", "housing"
    subcategory: str | None = None  # e.g. "flowers", "household help"
    label: str | None = None        # friendly display name, e.g. "Muniraj - Flower Vendor"
    learned_count: int = 1          # times this rule has been applied
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "merchant_rules"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("keyword", ASCENDING)], unique=True),
        ]
