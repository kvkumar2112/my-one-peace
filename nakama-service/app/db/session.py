from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings


async def init_db():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_name = settings.MONGODB_URL.split("/")[-1]
    database = client[db_name]

    from app.models.user import User
    from app.models.account import Account
    from app.models.transaction import Transaction
    from app.models.budget import Budget
    from app.models.goal import Goal
    from app.models.holding import Holding
    from app.models.document import BankDocument
    from app.models.merchant_rule import MerchantRule

    await init_beanie(
        database=database,
        document_models=[User, Account, Transaction, Budget, Goal, Holding, BankDocument, MerchantRule],
    )
