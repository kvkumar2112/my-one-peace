from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def list_transactions():
    return {"message": "list transactions"}


@router.post("/")
def create_transaction():
    return {"message": "create transaction"}


@router.get("/{transaction_id}")
def get_transaction(transaction_id: int):
    return {"message": f"get transaction {transaction_id}"}


@router.put("/{transaction_id}")
def update_transaction(transaction_id: int):
    return {"message": f"update transaction {transaction_id}"}


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int):
    return {"message": f"delete transaction {transaction_id}"}
