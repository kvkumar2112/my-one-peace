from fastapi import APIRouter, HTTPException, Depends
from beanie import PydanticObjectId
from app.models.account import Account, LinkedAccountRef as LinkedAccountRefModel
from app.models.user import User
from app.schemas.accounts import AccountCreate, AccountUpdate, AccountResponse, LinkedAccountRef
from app.core.security import get_current_user

router = APIRouter()


def _acc_response(acc: Account) -> AccountResponse:
    return AccountResponse(
        id=str(acc.id),
        user_id=str(acc.user_id),
        bank_name=acc.bank_name,
        account_type=acc.account_type,
        nickname=acc.nickname,
        last4=acc.last4,
        balance=acc.balance,
        color_gradient=acc.color_gradient,
        status=acc.status,
        match_patterns=acc.match_patterns,
        linked_accounts=[LinkedAccountRef(account_id=la.account_id, link_type=la.link_type) for la in acc.linked_accounts],
        last_synced=acc.last_synced,
        created_at=acc.created_at,
    )


@router.get("/", response_model=list[AccountResponse])
async def list_accounts(current_user: User = Depends(get_current_user)):
    accounts = await Account.find(Account.user_id == current_user.id).to_list()
    return [_acc_response(a) for a in accounts]


@router.post("/", response_model=AccountResponse, status_code=201)
async def create_account(
    body: AccountCreate,
    current_user: User = Depends(get_current_user),
):
    account = Account(
        user_id=current_user.id,
        bank_name=body.bank_name,
        account_type=body.account_type,
        nickname=body.nickname,
        last4=body.last4,
        balance=body.balance,
        color_gradient=body.color_gradient,
        match_patterns=body.match_patterns,
        linked_accounts=[LinkedAccountRefModel(account_id=la.account_id, link_type=la.link_type) for la in body.linked_accounts],
    )
    await account.insert()
    return _acc_response(account)


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    body: AccountUpdate,
    current_user: User = Depends(get_current_user),
):
    account = await Account.get(PydanticObjectId(account_id))
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Account not found")

    update_data = body.model_dump(exclude_none=True)
    # Keep linked_accounts as plain dicts — Beanie's set() doesn't serialize Pydantic models
    if "linked_accounts" in update_data:
        update_data["linked_accounts"] = [
            {"account_id": la["account_id"], "link_type": la["link_type"]}
            for la in update_data["linked_accounts"]
        ]
    if update_data:
        await account.set(update_data)
    return _acc_response(account)


@router.delete("/{account_id}", status_code=204)
async def delete_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
):
    account = await Account.get(PydanticObjectId(account_id))
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    await account.delete()
