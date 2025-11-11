import os
from pathlib import Path
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
from cloudinary import CloudinaryImage
from datetime import datetime
import uuid
import fitz  # PyMuPDF for PDF preview rendering
import tempfile
import shutil

# ==========================================================
# Setup Cloudinary
# ==========================================================
def _setup_cloudinary():
    """Locate .env and configure Cloudinary."""
    current_dir = Path(__file__).resolve().parent
    env_path = None

    # Find .env in parent directories
    for parent in [current_dir] + list(current_dir.parents):
        p = parent / ".env"
        if p.exists():
            env_path = p
            break

    load_dotenv(dotenv_path=env_path) if env_path else load_dotenv()

    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    )

    if not all([
        os.getenv("CLOUDINARY_CLOUD_NAME"),
        os.getenv("CLOUDINARY_API_KEY"),
        os.getenv("CLOUDINARY_API_SECRET"),
    ]):
        raise ValueError("Cloudinary credentials missing in .env")


# ==========================================================
# Image Upload
# ==========================================================
def get_image_url(image_path: str) -> str:
    """Upload an image to Cloudinary and return secure URL."""
    _setup_cloudinary()
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    public_id = f"{Path(image_path).stem}_{uuid.uuid4().hex[:6]}"
    try:
        res = cloudinary.uploader.upload(
            image_path,
            public_id=public_id,
            unique_filename=False,
            overwrite=True,
        )
        return CloudinaryImage(res["public_id"]).build_url(secure=True)
    except Exception as e:
        print(f"❌ Image upload failed: {e}")
        return None


# ==========================================================
# PDF Upload (with Preview)
# ==========================================================
def get_pdf_url(pdf_path: str, dpi: int = 150) -> dict:
    """
    Upload a PDF to Cloudinary (as raw) and optionally upload a first-page preview.
    Returns dict with 'pdf_url', 'pdf_public_id', and optional 'preview_url'.
    """
    _setup_cloudinary()
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    base_name = Path(pdf_path).stem
    uid = uuid.uuid4().hex[:8]
    public_id = f"{base_name}_{uid}"

    pdf_url, preview_url = None, None

    # Upload PDF correctly as raw
    try:
        pdf_res = cloudinary.uploader.upload(
            pdf_path,
            resource_type="raw",  # ✅ allows proper PDF viewing
            public_id=public_id,
            unique_filename=False,
            overwrite=True,
        )
        pdf_url = pdf_res.get("secure_url")
    except Exception as e:
        print(f"❌ PDF upload failed: {e}")
        return {"pdf_url": None, "pdf_public_id": None, "preview_url": None}

    return pdf_url

# ==========================================================
# Example Usage
# ==========================================================
# if __name__ == "__main__":
#     img_url = get_image_url("/home/shivamsahu/Downloads/penguine.png")
#     print("🖼️ Image URL:", img_url)

#     pdf_data = get_pdf_url("/home/shivamsahu/Downloads/resume.pdf")
#     print("📄 PDF URL:", pdf_data["pdf_url"])

