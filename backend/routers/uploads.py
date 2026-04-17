from typing import List
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, UploadFile, File, HTTPException
router = APIRouter(prefix="/api/uploads", tags=["Uploads"])


@router.post("/images")
async def upload_images(files: List[UploadFile] = File(...)):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed")

    saved: List[str] = []
    for f in files:
        contents = await f.read()
        
        # Stream the image file contents directly to Cloudinary
        # This will automatically read from the CLOUDINARY_URL in your .env
        upload_result = cloudinary.uploader.upload(contents)
        
        # Cloudinary provides a 'secure_url' which is the permanent HTTPS web link
        saved.append(upload_result["secure_url"])

    return {"filenames": saved}
