import os
import uuid
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/images")
async def upload_images(files: List[UploadFile] = File(...)):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed")

    saved: List[str] = []
    for f in files:
        ext = os.path.splitext(f.filename or "img.jpg")[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        contents = await f.read()
        with open(filepath, "wb") as out:
            out.write(contents)
        saved.append(filename)

    return {"filenames": saved}
