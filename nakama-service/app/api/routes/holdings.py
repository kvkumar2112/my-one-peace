from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
import tempfile, os
from beanie import PydanticObjectId
from app.models.holding import Holding
from app.models.user import User
from app.schemas.holdings import HoldingCreate, HoldingUpdate, HoldingResponse, PortfolioSummary, AllocationItem
from app.schemas.documents import HoldingImportPreview, ConfirmHoldingImportRequest
from app.core.security import get_current_user

router = APIRouter()


def _holding_response(h: Holding) -> HoldingResponse:
    pnl = h.current_value - h.invested_amount
    pnl_pct = (pnl / h.invested_amount * 100) if h.invested_amount > 0 else 0.0
    return HoldingResponse(
        id=str(h.id),
        user_id=str(h.user_id),
        name=h.name,
        ticker=h.ticker,
        type=h.type,
        platform=h.platform,
        quantity=h.quantity,
        avg_buy_price=h.avg_buy_price,
        current_price=h.current_price,
        invested_amount=h.invested_amount,
        current_value=h.current_value,
        pnl=round(pnl, 2),
        pnl_pct=round(pnl_pct, 2),
        created_at=h.created_at,
    )


@router.get("/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(current_user: User = Depends(get_current_user)):
    holdings = await Holding.find(Holding.user_id == current_user.id).to_list()

    total_value = sum(h.current_value for h in holdings)
    total_invested = sum(h.invested_amount for h in holdings)
    total_pnl = total_value - total_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0.0

    # Allocation by type
    by_type: dict[str, float] = {}
    for h in holdings:
        by_type[h.type] = by_type.get(h.type, 0) + h.current_value

    allocation = [
        AllocationItem(
            type=t,
            value=round(v, 2),
            pct=round(v / total_value * 100, 1) if total_value > 0 else 0.0,
        )
        for t, v in by_type.items()
    ]

    return PortfolioSummary(
        total_value=round(total_value, 2),
        total_invested=round(total_invested, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_pct=round(total_pnl_pct, 2),
        allocation=allocation,
        holdings=[_holding_response(h) for h in holdings],
    )


@router.get("/", response_model=list[HoldingResponse])
async def list_holdings(current_user: User = Depends(get_current_user)):
    holdings = await Holding.find(Holding.user_id == current_user.id).to_list()
    return [_holding_response(h) for h in holdings]


@router.post("/", response_model=HoldingResponse, status_code=201)
async def create_holding(body: HoldingCreate, current_user: User = Depends(get_current_user)):
    holding = Holding(
        user_id=current_user.id,
        **body.model_dump(),
    )
    await holding.insert()
    return _holding_response(holding)


@router.put("/{holding_id}", response_model=HoldingResponse)
async def update_holding(
    holding_id: str,
    body: HoldingUpdate,
    current_user: User = Depends(get_current_user),
):
    holding = await Holding.get(PydanticObjectId(holding_id))
    if not holding or holding.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Holding not found")
    update_data = body.model_dump(exclude_none=True)
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await holding.set(update_data)
    return _holding_response(holding)


@router.delete("/{holding_id}", status_code=204)
async def delete_holding(holding_id: str, current_user: User = Depends(get_current_user)):
    holding = await Holding.get(PydanticObjectId(holding_id))
    if not holding or holding.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Holding not found")
    await holding.delete()


# ── Zerodha Import ────────────────────────────────────────────────────────────

@router.post("/import", response_model=list[HoldingImportPreview])
async def import_holdings_preview(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload Zerodha P&L Excel → return holdings preview (not persisted)."""
    filename = file.filename or ""
    if not filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx / .xls files are supported")

    content = await file.read()

    # Write to temp file (pandas needs a real file path)
    suffix = os.path.splitext(filename)[1]
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        from app.services.parsers.zerodha import parse_holdings
        raw = parse_holdings(tmp_path)
    finally:
        os.unlink(tmp_path)

    previews = []
    for i, h in enumerate(raw):
        invested = h.get("invested_amount", 0.0)
        current = h.get("current_value", 0.0)
        pnl = current - invested
        pnl_pct = (pnl / invested * 100) if invested > 0 else 0.0
        previews.append(HoldingImportPreview(
            index=i,
            name=h["name"],
            ticker=h.get("ticker"),
            type=h["type"],
            platform=h.get("platform"),
            quantity=h.get("quantity", 0.0),
            avg_buy_price=h.get("avg_buy_price", 0.0),
            invested_amount=invested,
            current_value=current,
            pnl=round(pnl, 2),
            pnl_pct=round(pnl_pct, 2),
        ))
    return previews


@router.post("/import/confirm", status_code=status.HTTP_201_CREATED)
async def confirm_holdings_import(
    body: ConfirmHoldingImportRequest,
    current_user: User = Depends(get_current_user),
):
    """Bulk-create holdings from confirmed Zerodha import preview."""
    selected = set(body.selected_indices) if body.selected_indices is not None else set(range(len(body.holdings)))

    created = 0
    for i, h in enumerate(body.holdings):
        if i not in selected:
            continue
        holding = Holding(
            user_id=current_user.id,
            name=h["name"],
            ticker=h.get("ticker"),
            type=h["type"],
            platform=h.get("platform"),
            quantity=h.get("quantity", 0.0),
            avg_buy_price=h.get("avg_buy_price", 0.0),
            current_price=h.get("current_price", 0.0),
            invested_amount=h.get("invested_amount", 0.0),
            current_value=h.get("current_value", 0.0),
        )
        await holding.insert()
        created += 1

    return {"created": created}
