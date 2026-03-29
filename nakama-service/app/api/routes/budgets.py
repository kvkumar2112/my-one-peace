from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from beanie import PydanticObjectId
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.budgets import BudgetCreate, BudgetUpdate, BudgetResponse
from app.core.security import get_current_user

router = APIRouter()


def _budget_response(budget: Budget, spent_amount: float = 0.0) -> BudgetResponse:
    return BudgetResponse(
        id=str(budget.id),
        user_id=str(budget.user_id),
        category=budget.category,
        label=budget.label,
        limit_amount=budget.limit_amount,
        period=budget.period,
        icon=budget.icon,
        spent_amount=spent_amount,
        created_at=budget.created_at,
    )


@router.get("/", response_model=list[BudgetResponse])
async def list_budgets(current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    month_end = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc) if now.month == 12 \
        else datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)

    budgets = await Budget.find(Budget.user_id == current_user.id).to_list()

    result = []
    for budget in budgets:
        txns = await Transaction.find(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.category == budget.category,
            Transaction.date >= month_start,
            Transaction.date < month_end,
        ).to_list()
        spent = round(sum(t.amount for t in txns), 2)
        result.append(_budget_response(budget, spent_amount=spent))

    return result


@router.post("/", response_model=BudgetResponse, status_code=201)
async def create_budget(body: BudgetCreate, current_user: User = Depends(get_current_user)):
    budget = Budget(
        user_id=current_user.id,
        category=body.category,
        label=body.label,
        limit_amount=body.limit_amount,
        period=body.period,
        icon=body.icon,
    )
    await budget.insert()
    return _budget_response(budget)


@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: str,
    body: BudgetUpdate,
    current_user: User = Depends(get_current_user),
):
    budget = await Budget.get(PydanticObjectId(budget_id))
    if not budget or budget.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Budget not found")
    update_data = body.model_dump(exclude_none=True)
    if update_data:
        await budget.set(update_data)
    return _budget_response(budget)


@router.delete("/{budget_id}", status_code=204)
async def delete_budget(budget_id: str, current_user: User = Depends(get_current_user)):
    budget = await Budget.get(PydanticObjectId(budget_id))
    if not budget or budget.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Budget not found")
    await budget.delete()
