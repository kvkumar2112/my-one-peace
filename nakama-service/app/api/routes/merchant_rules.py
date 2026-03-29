from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from beanie import PydanticObjectId
from pydantic import BaseModel
from app.models.merchant_rule import MerchantRule
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter()


class MerchantRuleCreate(BaseModel):
    keyword: str
    category: str
    subcategory: str | None = None
    label: str | None = None


class MerchantRuleUpdate(BaseModel):
    category: str | None = None
    subcategory: str | None = None
    label: str | None = None


class MerchantRuleResponse(BaseModel):
    id: str
    keyword: str
    category: str
    subcategory: str | None
    label: str | None
    learned_count: int
    last_seen: datetime


def _rule_response(r: MerchantRule) -> MerchantRuleResponse:
    return MerchantRuleResponse(
        id=str(r.id),
        keyword=r.keyword,
        category=r.category,
        subcategory=r.subcategory,
        label=r.label,
        learned_count=r.learned_count,
        last_seen=r.last_seen,
    )


@router.get("/", response_model=list[MerchantRuleResponse])
async def list_merchant_rules(current_user: User = Depends(get_current_user)):
    rules = await MerchantRule.find(MerchantRule.user_id == current_user.id).to_list()
    return [_rule_response(r) for r in rules]


@router.post("/", response_model=MerchantRuleResponse, status_code=201)
async def create_merchant_rule(
    body: MerchantRuleCreate,
    current_user: User = Depends(get_current_user),
):
    keyword = body.keyword.lower().strip()
    existing = await MerchantRule.find_one(
        MerchantRule.user_id == current_user.id,
        MerchantRule.keyword == keyword,
    )
    if existing:
        # Upsert — update category if rule already exists
        await existing.set({
            "category": body.category,
            "subcategory": body.subcategory,
            "label": body.label,
            "last_seen": datetime.now(timezone.utc),
        })
        return _rule_response(existing)

    rule = MerchantRule(
        user_id=current_user.id,
        keyword=keyword,
        category=body.category,
        subcategory=body.subcategory,
        label=body.label,
    )
    await rule.insert()
    return _rule_response(rule)


@router.put("/{rule_id}", response_model=MerchantRuleResponse)
async def update_merchant_rule(
    rule_id: str,
    body: MerchantRuleUpdate,
    current_user: User = Depends(get_current_user),
):
    rule = await MerchantRule.get(PydanticObjectId(rule_id))
    if not rule or rule.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rule not found")

    update_data = body.model_dump(exclude_none=True)
    if update_data:
        await rule.set(update_data)
    return _rule_response(rule)


@router.delete("/{rule_id}", status_code=204)
async def delete_merchant_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user),
):
    rule = await MerchantRule.get(PydanticObjectId(rule_id))
    if not rule or rule.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rule not found")
    await rule.delete()
