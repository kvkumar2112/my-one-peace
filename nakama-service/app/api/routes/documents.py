from fastapi import APIRouter, UploadFile, File

router = APIRouter()


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    return {"filename": file.filename, "message": "document uploaded"}


@router.post("/parse")
async def parse_document():
    return {"message": "parse document — OCR + extraction"}


@router.get("/")
def list_documents():
    return {"message": "list documents"}
