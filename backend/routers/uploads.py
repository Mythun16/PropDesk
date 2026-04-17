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
        
        # Build an optimized URL (f_auto, q_auto) using the public ID
        import cloudinary.utils
        optimized_url, _ = cloudinary.utils.cloudinary_url(
            upload_result["public_id"],
            fetch_format="auto",
            quality="auto",
            secure=True
        )
        saved.append(optimized_url)

    return {"filenames": saved}
