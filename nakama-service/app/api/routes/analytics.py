from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.holding import Holding
from app.models.user import User
from app.schemas.analytics import (
    DashboardSummary, SpendingByCategory, CashflowPoint, InsightResponse, InsightItem
)
from app.core.security import get_current_user
from app.services.ml import generate_spending_insights

router = APIRouter()


def _month_range(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return start, end


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    cur_start, cur_end = _month_range(now.year, now.month)
    prev_month = now.month - 1 if now.month > 1 else 12
    prev_year = now.year if now.month > 1 else now.year - 1
    prev_start, prev_end = _month_range(prev_year, prev_month)

    # Accounts total balance
    accounts = await Account.find(Account.user_id == current_user.id).to_list()
    account_balance = sum(a.balance for a in accounts)

    # Holdings total value
    holdings = await Holding.find(Holding.user_id == current_user.id).to_list()
    holdings_value = sum(h.current_value for h in holdings)
    net_worth = account_balance + holdings_value

    # Current month transactions
    cur_txns = await Transaction.find(
        Transaction.user_id == current_user.id,
        Transaction.date >= cur_start,
        Transaction.date < cur_end,
    ).to_list()

    monthly_income = sum(t.amount for t in cur_txns if t.type == "income")
    monthly_spend = sum(t.amount for t in cur_txns if t.type == "expense")
    monthly_invested = sum(
        t.amount for t in cur_txns
        if t.type == "transfer" and t.transfer_kind == "investment_deployment"
    )
    monthly_savings_deployed = sum(
        t.amount for t in cur_txns
        if t.type == "transfer" and t.transfer_kind == "savings_instrument"
    )

    # Previous month
    prev_txns = await Transaction.find(
        Transaction.user_id == current_user.id,
        Transaction.date >= prev_start,
        Transaction.date < prev_end,
    ).to_list()

    prev_income = sum(t.amount for t in prev_txns if t.type == "income")
    prev_spend = sum(t.amount for t in prev_txns if t.type == "expense")

    savings_rate = ((monthly_income - monthly_spend) / monthly_income * 100) if monthly_income > 0 else 0.0
    prev_savings_rate = ((prev_income - prev_spend) / prev_income * 100) if prev_income > 0 else 0.0

    return DashboardSummary(
        net_worth=round(net_worth, 2),
        net_worth_change_pct=0.0,
        monthly_income=round(monthly_income, 2),
        income_change=round(monthly_income - prev_income, 2),
        monthly_spend=round(monthly_spend, 2),
        spend_change=round(monthly_spend - prev_spend, 2),
        monthly_invested=round(monthly_invested, 2),
        monthly_savings_deployed=round(monthly_savings_deployed, 2),
        savings_rate=round(savings_rate, 1),
        savings_rate_change=round(savings_rate - prev_savings_rate, 1),
    )


@router.get("/spending", response_model=list[SpendingByCategory])
async def get_spending(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    if not date_from:
        date_from = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    if not date_to:
        date_to = now

    txns = await Transaction.find(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        Transaction.date >= date_from,
        Transaction.date <= date_to,
    ).to_list()

    by_cat: dict[str, float] = {}
    by_cat_count: dict[str, int] = {}
    for t in txns:
        by_cat[t.category] = by_cat.get(t.category, 0.0) + t.amount
        by_cat_count[t.category] = by_cat_count.get(t.category, 0) + 1

    total = sum(by_cat.values())
    result = []
    for cat, amount in sorted(by_cat.items(), key=lambda x: x[1], reverse=True):
        result.append(SpendingByCategory(
            category=cat,
            amount=round(amount, 2),
            count=by_cat_count[cat],
            pct=round(amount / total * 100, 1) if total > 0 else 0.0,
        ))
    return result


@router.get("/cashflow", response_model=list[CashflowPoint])
async def get_cashflow(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    result = []

    for i in range(months - 1, -1, -1):
        month = now.month - i
        year = now.year
        while month <= 0:
            month += 12
            year -= 1

        start, end = _month_range(year, month)
        txns = await Transaction.find(
            Transaction.user_id == current_user.id,
            Transaction.date >= start,
            Transaction.date < end,
        ).to_list()

        income = sum(t.amount for t in txns if t.type == "income")
        expenses = sum(t.amount for t in txns if t.type == "expense")
        invested = sum(
            t.amount for t in txns
            if t.type == "transfer" and t.transfer_kind in ("investment_deployment", "savings_instrument")
        )

        result.append(CashflowPoint(
            month=start.strftime("%b %Y"),
            income=round(income, 2),
            expenses=round(expenses, 2),
            invested=round(invested, 2),
        ))

    return result


@router.get("/insights", response_model=InsightResponse)
async def get_insights(current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    cur_start, cur_end = _month_range(now.year, now.month)
    prev_month = now.month - 1 if now.month > 1 else 12
    prev_year = now.year if now.month > 1 else now.year - 1
    prev_start, prev_end = _month_range(prev_year, prev_month)

    cur_txns = await Transaction.find(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        Transaction.date >= cur_start,
        Transaction.date < cur_end,
    ).to_list()

    prev_txns = await Transaction.find(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        Transaction.date >= prev_start,
        Transaction.date < prev_end,
    ).to_list()

    income_txns = await Transaction.find(
        Transaction.user_id == current_user.id,
        Transaction.type == "income",
        Transaction.date >= cur_start,
        Transaction.date < cur_end,
    ).to_list()

    cur_by_cat: dict[str, float] = {}
    for t in cur_txns:
        cur_by_cat[t.category] = cur_by_cat.get(t.category, 0.0) + t.amount

    prev_by_cat: dict[str, float] = {}
    for t in prev_txns:
        prev_by_cat[t.category] = prev_by_cat.get(t.category, 0.0) + t.amount

    total_income = sum(t.amount for t in income_txns)
    total_spend = sum(cur_by_cat.values())

    raw_insights = generate_spending_insights(cur_by_cat, prev_by_cat, total_income, total_spend)
    insight_items = [InsightItem(**i) for i in raw_insights]

    return InsightResponse(
        insights=insight_items,
        generated_at=now.isoformat(),
    )


@router.get("/forecast")
async def get_forecast(current_user: User = Depends(get_current_user)):
    return {"forecast": "ML forecast coming in Phase 4"}
