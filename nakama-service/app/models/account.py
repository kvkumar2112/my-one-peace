from datetime import datetime, timezone
from beanie import Document, PydanticObjectId
from pydantic import BaseModel as PydanticModel, Field
from pymongo import IndexModel, ASCENDING


class LinkedAccountRef(PydanticModel):
    """Directional link: this account funds/pays into another account."""
    account_id: str
    link_type: str  # cc_payment | emi_payment | investment_deployment | account_transfer


class Account(Document):
    user_id: PydanticObjectId
    bank_name: str
    account_type: str  # savings | salary | credit | wallet | investment | loan
    nickname: str | None = None  # e.g. "HDFC Primary Savings", "Zerodha"
    last4: str | None = None
    balance: float = 0.0
    color_gradient: str | None = None
    status: str = "active"  # active | inactive
    # Keywords to recognize this account in transaction descriptions during import.
    # e.g. ["hdfc cc", "hdfc creditcard"] for a credit card account.
    match_patterns: list[str] = Field(default_factory=list)
    # Accounts that this account funds or pays into.
    # e.g. savings → [{hdfc_cc_id, cc_payment}, {home_loan_id, emi_payment}]
    linked_accounts: list[LinkedAccountRef] = Field(default_factory=list)
    last_synced: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "accounts"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
        ]
