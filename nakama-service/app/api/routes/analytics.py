from fastapi import APIRouter

router = APIRouter()


@router.get("/summary")
def get_summary():
    return {"message": "financial summary"}


@router.get("/spending")
def get_spending_breakdown():
    return {"message": "spending breakdown by category"}


@router.get("/trends")
def get_trends():
    return {"message": "income vs expense trends"}


@router.get("/forecast")
def get_forecast():
    return {"message": "ML-based spending forecast"}
