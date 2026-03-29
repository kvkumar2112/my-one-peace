"""
Partial reset — clears transaction data only, preserves users and accounts.
Run from nakama-service/ directory:

    python scripts/reset_db.py

Use --full to also wipe users and accounts (full factory reset).

    python scripts/reset_db.py --full
"""
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = "mongodb://localhost:27017/my_one_peace"
DB_NAME = "my_one_peace"

# Cleared on normal reset — transaction data only
TRANSACTION_COLLECTIONS = [
    "transactions",
    "documents",
    "merchant_rules",
    "budgets",
    "goals",
    "holdings",
]

# Only wiped with --full
IDENTITY_COLLECTIONS = [
    "users",
    "accounts",
]


async def reset(full: bool = False):
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    existing = await db.list_collection_names()

    target = TRANSACTION_COLLECTIONS + (IDENTITY_COLLECTIONS if full else [])
    to_drop = [c for c in target if c in existing]

    if not to_drop:
        print("Nothing to drop. Already clean.")
        client.close()
        return

    print(f"Connected to: {MONGODB_URL}")
    if full:
        print("⚠️  FULL reset — this will wipe users and accounts too.")
    else:
        print("Partial reset — users and accounts will be preserved.")
    print(f"Collections to drop: {', '.join(to_drop)}")
    print()
    confirm = input("Type 'yes' to confirm: ").strip().lower()
    if confirm != "yes":
        print("Aborted.")
        client.close()
        sys.exit(0)

    for name in to_drop:
        await db.drop_collection(name)
        print(f"  dropped: {name}")

    print("\nDone.")
    client.close()


if __name__ == "__main__":
    full = "--full" in sys.argv
    asyncio.run(reset(full=full))
