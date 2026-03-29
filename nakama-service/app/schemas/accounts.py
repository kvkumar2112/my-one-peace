from datetime import datetime
from pydantic import BaseModel


class LinkedAccountRef(BaseModel):
    account_id: str
    link_type: str  # cc_payment | emi_payment | investment_deployment | account_transfer


class AccountCreate(BaseModel):
    bank_name: str
    account_type: str  # savings | salary | credit | wallet | investment | loan
    nickname: str | None = None
    last4: str | None = None
    balance: float = 0.0
    color_gradient: str | None = None
    match_patterns: list[str] = []
    linked_accounts: list[LinkedAccountRef] = []


class AccountUpdate(BaseModel):
    bank_name: str | None = None
    account_type: str | None = None
    nickname: str | None = None
    last4: str | None = None
    balance: float | None = None
    color_gradient: str | None = None
    status: str | None = None
    match_patterns: list[str] | None = None
    linked_accounts: list[LinkedAccountRef] | None = None


class AccountResponse(BaseModel):
    id: str
    user_id: str
    bank_name: str
    account_type: str
    nickname: str | None
    last4: str | None
    balance: float
    color_gradient: str | None
    status: str
    match_patterns: list[str]
    linked_accounts: list[LinkedAccountRef]
    last_synced: datetime | None
    created_at: datetime
