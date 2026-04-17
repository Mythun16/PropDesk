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
        # Stream the file directly from FastAPI to Cloudinary
        upload_result = cloudinary.uploader.upload(f.file)
        
        # Generate the f_auto, q_auto optimized URL safely
        optimized_url = cloudinary.CloudinaryImage(upload_result["public_id"]).build_url(
            secure=True,
            fetch_format="auto",
            quality="auto"
        )
        saved.append(optimized_url)

    return {"filenames": saved}
