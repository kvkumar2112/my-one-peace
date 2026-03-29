from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from beanie import PydanticObjectId
from app.models.goal import Goal
from app.models.user import User
from app.schemas.goals import GoalCreate, GoalUpdate, GoalResponse, ContributionRequest
from app.core.security import get_current_user

router = APIRouter()


def _goal_response(goal: Goal) -> GoalResponse:
    progress = (goal.saved_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0.0
    return GoalResponse(
        id=str(goal.id),
        user_id=str(goal.user_id),
        name=goal.name,
        target_amount=goal.target_amount,
        saved_amount=goal.saved_amount,
        monthly_contribution=goal.monthly_contribution,
        target_date=goal.target_date,
        icon=goal.icon,
        color=goal.color,
        status=goal.status,
        progress_pct=round(progress, 1),
        created_at=goal.created_at,
    )


@router.get("/", response_model=list[GoalResponse])
async def list_goals(current_user: User = Depends(get_current_user)):
    goals = await Goal.find(Goal.user_id == current_user.id).to_list()
    return [_goal_response(g) for g in goals]


@router.post("/", response_model=GoalResponse, status_code=201)
async def create_goal(body: GoalCreate, current_user: User = Depends(get_current_user)):
    goal = Goal(
        user_id=current_user.id,
        name=body.name,
        target_amount=body.target_amount,
        monthly_contribution=body.monthly_contribution,
        target_date=body.target_date,
        icon=body.icon,
        color=body.color,
    )
    await goal.insert()
    return _goal_response(goal)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    body: GoalUpdate,
    current_user: User = Depends(get_current_user),
):
    goal = await Goal.get(PydanticObjectId(goal_id))
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    update_data = body.model_dump(exclude_none=True)
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await goal.set(update_data)
    return _goal_response(goal)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: str, current_user: User = Depends(get_current_user)):
    goal = await Goal.get(PydanticObjectId(goal_id))
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    await goal.delete()


@router.post("/{goal_id}/contribute", response_model=GoalResponse)
async def contribute_to_goal(
    goal_id: str,
    body: ContributionRequest,
    current_user: User = Depends(get_current_user),
):
    goal = await Goal.get(PydanticObjectId(goal_id))
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    new_saved = goal.saved_amount + body.amount
    status = "completed" if new_saved >= goal.target_amount else goal.status
    await goal.set({"saved_amount": new_saved, "status": status, "updated_at": datetime.now(timezone.utc)})
    return _goal_response(goal)
