import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status, BackgroundTasks
from beanie import PydanticObjectId
from app.models.account import Account
from app.models.document import BankDocument
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.documents import DocumentResponse, ParsedTransactionPreview, ConfirmImportRequest
from app.core.config import settings
from app.core.security import get_current_user
from app.services.parsers import detect_institution
import pdfplumber

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".xlsx", ".xls"}


def _doc_response(doc: BankDocument) -> DocumentResponse:
    return DocumentResponse(
        id=str(doc.id),
        user_id=str(doc.user_id),
        filename=doc.filename,
        file_type=doc.file_type,
        status=doc.status,
        error=doc.error,
        transactions_created=doc.transactions_created,
        parsed_count=len(doc.parsed_data),
        created_at=doc.created_at,
    )


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    account_id: str | None = Form(None),
    current_user: User = Depends(get_current_user),
):
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    # Save file
    user_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(user_dir, stored_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    file_type = "pdf" if ext == ".pdf" else "xlsx"

    # Look up account_type if account_id provided
    account_type: str | None = None
    if account_id:
        acct = await Account.get(PydanticObjectId(account_id))
        if acct and acct.user_id == current_user.id:
            account_type = acct.account_type

    doc = BankDocument(
        user_id=current_user.id,
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        status="uploaded",
        account_id=account_id,
        account_type=account_type,
    )
    await doc.insert()

    # Kick off parsing in background immediately
    background_tasks.add_task(_parse_document, str(doc.id))

    return _doc_response(doc)


async def _parse_document(doc_id: str):
    """Background task: extract + LLM categorize → store in parsed_data."""
    from app.models.account import Account

    doc = await BankDocument.get(PydanticObjectId(doc_id))
    if not doc:
        return

    await doc.set({"status": "parsing"})

    try:
        parsed = await _run_parser(doc.file_path, doc.filename, doc.file_type, doc.account_type)

        # Post-LLM pass: apply account patterns to catch self_transfer / EMI / CC payments
        # that the LLM might classify as generic "transfer"
        accounts = await Account.find(Account.user_id == doc.user_id).to_list()
        account_dicts = [
            {"id": str(a.id), "type": a.account_type, "match_patterns": a.match_patterns or []}
            for a in accounts
            if str(a.id) != doc.account_id  # exclude the source account itself
        ]
        if account_dicts:
            _apply_account_patterns(parsed, doc.account_type, account_dicts)

        parsed_data = [_tx_to_dict(tx) for tx in parsed]
        await doc.set({"status": "parsed", "parsed_data": parsed_data})
    except Exception as e:
        await doc.set({"status": "failed", "parsed_data": [], "error": str(e)})


async def _run_parser(file_path: str, filename: str, file_type: str, account_type: str | None = None):
    from app.services import llm as llm_service

    if file_type == "xlsx":
        # Holdings are handled via /holdings/import — documents route only handles transactions
        return []

    # Detect institution from first page text
    first_page_text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            if pdf.pages:
                first_page_text = pdf.pages[0].extract_text() or ""
    except Exception:
        pass

    institution = detect_institution(filename, first_page_text)

    if institution == "icici_bank":
        from app.services.parsers.icici_bank import parse
        rows = parse(file_path)
    elif institution == "hdfc_card":
        from app.services.parsers.hdfc_card import parse
        rows = parse(file_path)
    elif institution == "icici_card":
        from app.services.parsers.icici_card import parse
        rows = parse(file_path)
    else:
        from app.services.parsers.generic import parse
        rows = await parse(file_path)
        return rows  # generic parser already categorizes via LLM

    # Batch LLM categorization for structured parsers
    # Only send narrations that don't already have a confident category
    needs_llm = [(i, r) for i, r in enumerate(rows) if r.confidence < 0.7]

    if needs_llm:
        # Prefix with direction + account type so LLM applies correct rules
        # e.g. [CREDIT from CREDIT_CARD] → refund; [CREDIT from SAVINGS] → salary
        acct_label = (account_type or "unknown").upper()
        narrations = [
            f"[{'CREDIT' if r.type == 'credit' else 'DEBIT'} from {acct_label}] {r.raw_narration}"
            for _, r in needs_llm
        ]
        categories = await llm_service.categorize_batch(narrations)
        for (i, row), cat in zip(needs_llm, categories):
            row.category = cat.get("category", "uncategorized")
            row.subcategory = cat.get("subcategory")
            row.merchant = cat.get("merchant")
            row.confidence = cat.get("confidence", 0.0)

    return rows


def _apply_account_patterns(rows, from_account_type: str | None, accounts: list[dict]) -> None:
    """Mutate parsed rows in-place: override category where description matches an account pattern.

    Priority over LLM result — account pattern match is high-confidence and account-specific.
    Only overrides if the current category is a generic low-information value.
    """
    import re
    from app.services.ml import _derive_transfer_kind, _transfer_kind_to_category

    overridable = {"transfer", "uncategorized", "finance"}  # LLM categories we're willing to correct

    for row in rows:
        desc_lower = re.sub(r"[^a-z0-9\s]", " ", (row.raw_narration or row.description).lower())
        for acc in accounts:
            for pattern in acc.get("match_patterns", []):
                if pattern.lower() in desc_lower:
                    kind = _derive_transfer_kind(from_account_type or "", acc["type"])
                    category = _transfer_kind_to_category(kind)
                    # Always override for account-pattern matches — confidence is 1.0
                    row.category = category
                    row.confidence = 1.0
                    break
            else:
                continue
            break


def _map_tx_type(raw_type: str, category: str) -> str:
    """Map parser debit/credit + LLM category → Transaction model type."""
    TRANSFER_CATEGORIES = {"transfer", "self_transfer", "emi", "bill_payment", "investment"}
    if raw_type == "debit":
        if category in TRANSFER_CATEGORIES:
            return "transfer"
        return "expense"
    else:  # credit
        if category in ("transfer", "self_transfer"):
            return "transfer"
        return "income"  # salary, refund, dividend, interest — all income


def _tx_to_dict(tx) -> dict:
    return {
        "date": tx.date.isoformat(),
        "description": tx.description,
        "raw_narration": tx.raw_narration,
        "amount": tx.amount,
        "type": tx.type,
        "balance": tx.balance,
        "category": tx.category,
        "subcategory": tx.subcategory,
        "merchant": tx.merchant,
        "confidence": tx.confidence,
    }


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, current_user: User = Depends(get_current_user)):
    doc = await BankDocument.get(PydanticObjectId(doc_id))
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    return _doc_response(doc)


@router.get("/{doc_id}/preview", response_model=list[ParsedTransactionPreview])
async def preview_document(doc_id: str, current_user: User = Depends(get_current_user)):
    doc = await BankDocument.get(PydanticObjectId(doc_id))
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "parsed":
        raise HTTPException(status_code=400, detail=f"Document not ready (status: {doc.status})")

    return [
        ParsedTransactionPreview(
            index=i,
            date=datetime.fromisoformat(tx["date"]),
            description=tx["description"],
            raw_narration=tx["raw_narration"],
            amount=tx["amount"],
            type=tx["type"],
            category=tx["category"],
            subcategory=tx.get("subcategory"),
            merchant=tx.get("merchant"),
            confidence=tx["confidence"],
        )
        for i, tx in enumerate(doc.parsed_data)
    ]


@router.post("/{doc_id}/confirm")
async def confirm_import(
    doc_id: str,
    body: ConfirmImportRequest,
    current_user: User = Depends(get_current_user),
):
    doc = await BankDocument.get(PydanticObjectId(doc_id))
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "parsed":
        raise HTTPException(status_code=400, detail="Document not ready for import")

    # Determine which rows to import (all if no selection provided)
    selected_indices = set(body.selected_indices) if body.selected_indices is not None else set(range(len(doc.parsed_data)))

    created = 0
    for i, tx in enumerate(doc.parsed_data):
        if i not in selected_indices:
            continue
        category = body.category_overrides.get(str(i), tx["category"]) if body.category_overrides else tx["category"]
        transaction = Transaction(
            user_id=current_user.id,
            amount=tx["amount"],
            category=category,
            subcategory=tx.get("subcategory"),
            description=tx.get("merchant") or tx["description"],
            date=datetime.fromisoformat(tx["date"]),
            type=_map_tx_type(tx["type"], category),
            source="ocr_import" if doc.file_type == "pdf" else "csv_import",
            document_id=doc.id,
            ai_category_confidence=tx["confidence"],
        )
        await transaction.insert()
        created += 1

    await doc.set({"transactions_created": created})
    return {"created": created, "document_id": doc_id}


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(current_user: User = Depends(get_current_user)):
    docs = await BankDocument.find(BankDocument.user_id == current_user.id).sort(-BankDocument.created_at).to_list()
    return [_doc_response(d) for d in docs]
