from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from beanie import PydanticObjectId
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.merchant_rule import MerchantRule
from app.models.user import User
from app.schemas.transactions import (
    TransactionCreate, TransactionUpdate,
    TransactionResponse, TransactionListResponse
)
from app.core.security import get_current_user
from app.services.ml import categorize, detect_transfer, classify_with_accounts

router = APIRouter()


def _tx_response(tx: Transaction) -> TransactionResponse:
    return TransactionResponse(
        id=str(tx.id),
        user_id=str(tx.user_id),
        account_id=str(tx.account_id) if tx.account_id else None,
        amount=tx.amount,
        category=tx.category,
        subcategory=tx.subcategory,
        description=tx.description,
        date=tx.date,
        type=tx.type,
        transfer_kind=tx.transfer_kind,
        to_account_id=str(tx.to_account_id) if tx.to_account_id else None,
        source=tx.source,
        tags=tx.tags,
        is_recurring=tx.is_recurring,
        ai_category_confidence=tx.ai_category_confidence,
        created_at=tx.created_at,
    )


@router.get("/", response_model=TransactionListResponse)
async def list_transactions(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    category: str | None = None,
    account_id: str | None = None,
    type: str | None = None,
    search: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
):
    conditions = [Transaction.user_id == current_user.id]

    if date_from:
        conditions.append(Transaction.date >= date_from)
    if date_to:
        conditions.append(Transaction.date <= date_to)
    if category:
        conditions.append(Transaction.category == category)
    if type:
        conditions.append(Transaction.type == type)
    if account_id:
        conditions.append(Transaction.account_id == PydanticObjectId(account_id))

    query = Transaction.find(*conditions)

    if search:
        query = query.find({"description": {"$regex": search, "$options": "i"}})

    total = await query.count()
    items = await query.sort(-Transaction.date).skip(skip).limit(limit).to_list()

    return TransactionListResponse(
        items=[_tx_response(tx) for tx in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    body: TransactionCreate,
    current_user: User = Depends(get_current_user),
):
    # Auto-detect transfer kind from description (overrides user-supplied type if matched)
    transfer_kind = body.transfer_kind
    tx_type = body.type
    if not transfer_kind:
        detected = detect_transfer(body.description)
        if detected:
            transfer_kind = detected
            tx_type = "transfer"

    category = body.category
    confidence = None
    if not category:
        if tx_type == "transfer":
            category = "transfer"
        else:
            category, confidence = categorize(body.description)

    account_id = PydanticObjectId(body.account_id) if body.account_id else None
    to_account_id = PydanticObjectId(body.to_account_id) if body.to_account_id else None

    tx = Transaction(
        user_id=current_user.id,
        account_id=account_id,
        amount=body.amount,
        category=category,
        subcategory=body.subcategory,
        description=body.description,
        date=body.date,
        type=tx_type,
        transfer_kind=transfer_kind,
        to_account_id=to_account_id,
        source=body.source,
        tags=body.tags,
        is_recurring=body.is_recurring,
        ai_category_confidence=confidence,
    )
    await tx.insert()
    return _tx_response(tx)


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
):
    tx = await Transaction.get(PydanticObjectId(transaction_id))
    if not tx or tx.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _tx_response(tx)


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    body: TransactionUpdate,
    learn: bool = True,
    current_user: User = Depends(get_current_user),
):
    tx = await Transaction.get(PydanticObjectId(transaction_id))
    if not tx or tx.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = body.model_dump(exclude_none=True)
    if "account_id" in update_data and update_data["account_id"]:
        update_data["account_id"] = PydanticObjectId(update_data["account_id"])
    if "to_account_id" in update_data and update_data["to_account_id"]:
        update_data["to_account_id"] = PydanticObjectId(update_data["to_account_id"])
    if update_data:
        await tx.set(update_data)

    # Auto-learn: if user corrected category on a non-transfer, save as merchant rule
    if learn and body.category and body.category not in ("transfer", "uncategorized"):
        keyword = tx.description.lower()[:40].strip()
        existing = await MerchantRule.find_one(
            MerchantRule.user_id == current_user.id,
            MerchantRule.keyword == keyword,
        )
        if existing:
            await existing.set({
                "category": body.category,
                "subcategory": body.subcategory,
                "learned_count": existing.learned_count + 1,
                "last_seen": datetime.now(timezone.utc),
            })
        else:
            await MerchantRule(
                user_id=current_user.id,
                keyword=keyword,
                category=body.category,
                subcategory=body.subcategory,
            ).insert()

    return _tx_response(tx)


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
):
    tx = await Transaction.get(PydanticObjectId(transaction_id))
    if not tx or tx.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await tx.delete()


@router.post("/import")
async def import_transactions(
    file: UploadFile = File(...),
    account_id: str | None = None,
    current_user: User = Depends(get_current_user),
):
    """Upload CSV statement, parse with account-aware classification, return preview.
    Pass account_id (the account this statement belongs to) for best results.
    Does not persist — call POST /transactions after user confirms.
    """
    import pandas as pd
    import io

    # Load user's accounts (for inter-account transfer detection)
    all_accounts = await Account.find(Account.user_id == current_user.id).to_list()
    from_account_type = "savings"
    from_account = None
    for acc in all_accounts:
        if account_id and str(acc.id) == account_id:
            from_account_type = acc.account_type
            from_account = acc
            break

    # Build explicit link_type map: other_account_id → link_type
    explicit_link_map: dict[str, str] = {}
    if from_account:
        for la in from_account.linked_accounts:
            explicit_link_map[la.account_id] = la.link_type

    other_accounts = [
        {
            "id": str(acc.id),
            "type": acc.account_type,
            "match_patterns": acc.match_patterns,
            "explicit_link_type": explicit_link_map.get(str(acc.id)),
        }
        for acc in all_accounts
        if str(acc.id) != account_id
    ]

    # Load user's learned merchant rules
    rules = await MerchantRule.find(MerchantRule.user_id == current_user.id).to_list()
    merchant_rules = [
        {"keyword": r.keyword, "category": r.category, "subcategory": r.subcategory}
        for r in rules
    ]

    content = await file.read()
    filename = file.filename or ""

    if not filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV imports are supported currently")

    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {str(e)}")

    previews = []
    needs_review_count = 0

    for _, row in df.iterrows():
        desc = str(row.get("description", row.get("narration", row.get("details", ""))))

        amount_raw = row.get("amount", row.get("debit", row.get("credit", 0)))
        try:
            amount = float(str(amount_raw).replace(",", "").replace("₹", "").strip())
        except Exception:
            amount = 0.0

        date_raw = row.get("date", row.get("transaction_date", ""))
        try:
            txn_date = pd.to_datetime(date_raw).to_pydatetime()
        except Exception:
            txn_date = datetime.now(timezone.utc)

        result = classify_with_accounts(
            description=desc,
            amount=amount,
            from_account_type=from_account_type,
            other_accounts=other_accounts,
            merchant_rules=merchant_rules,
        )

        if result["needs_review"]:
            needs_review_count += 1

        previews.append({
            "description": desc,
            "amount": abs(amount),
            "date": txn_date.isoformat(),
            "type": result["type"],
            "transfer_kind": result["transfer_kind"],
            "matched_account_id": result["matched_account_id"],
            "category": result["category"],
            "subcategory": result["subcategory"],
            "ai_category_confidence": result["confidence"],
            "needs_review": result["needs_review"],
            "account_id": account_id,
        })

    return {
        "previews": previews,
        "count": len(previews),
        "needs_review_count": needs_review_count,
        "from_account_type": from_account_type,
    }
