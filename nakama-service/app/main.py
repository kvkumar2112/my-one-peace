import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.db.session import init_db

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    import os
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    await init_db()
    yield


app = FastAPI(
    title="Nakama Service",
    description="My One Peace — Personal Finance Backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.routes import auth, transactions, documents, analytics, accounts, budgets, goals, holdings, merchant_rules

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["accounts"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["transactions"])
app.include_router(budgets.router, prefix="/api/v1/budgets", tags=["budgets"])
app.include_router(goals.router, prefix="/api/v1/goals", tags=["goals"])
app.include_router(holdings.router, prefix="/api/v1/holdings", tags=["holdings"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(merchant_rules.router, prefix="/api/v1/merchant-rules", tags=["merchant-rules"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "nakama-service"}
