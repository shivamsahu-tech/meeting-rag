"""
pdf_page_processor.py

End-to-end pipeline for OCR + Embedding + Pinecone Indexing.

Usage:

from pdf_page_processor import process_pdf_to_pinecone

process_pdf_to_pinecone(
    pdf_path="path/to/doc.pdf",
)

Requires helper functions (in same folder):
- cloudinary_upload(path) -> str
- get_embeddings(text_chunks: List[str]) -> List[List[float]]
- get_pinecone_connector() -> pinecone-like client
"""

import io
import json
import os
import time
import uuid
import logging
import shutil
from typing import Callable, Dict, List, Optional, Any
from pinecone import ServerlessSpec
import fitz  # PyMuPDF
import requests
from dotenv import load_dotenv

# === Load Environment ===
load_dotenv()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# === Local imports ===
from utils.cloudinary_upload import get_image_url as cloudinary_upload
from utils.embedding import get_embeddings
from utils.db_connections import get_pinecone_connector
from utils.cloudinary_upload import get_pdf_url
# === Constants ===
OCR_SPACE_URL = "https://api.ocr.space/parse/image"
OCR_API_KEY = os.getenv("OCR_SPACE_API_KEY", "")
KEEP_DEBUG_PAGES = os.getenv("KEEP_DEBUG_PAGES", "0") == "1"


# ==========================================================
# Helper functions
# ==========================================================
def _save_pix_as_png(pix: fitz.Pixmap, out_path: str) -> None:
    """Convert to RGB if has alpha channel, then save as PNG."""
    if pix.alpha:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    pix.save(out_path)


def _retry_request(
    func: Callable[..., requests.Response],
    max_retries: int = 4,
    backoff_factor: float = 1.2,
) -> requests.Response:
    """Generic exponential backoff for HTTP requests."""
    attempt = 0
    while True:
        try:
            attempt += 1
            resp = func()
            resp.raise_for_status()
            return resp
        except Exception as e:
            if attempt > max_retries:
                logger.exception("Max retries reached for request.")
                raise
            wait = backoff_factor * (2 ** (attempt - 1))
            logger.warning("Request failed (attempt %s). Retrying in %.1fs. Error: %s", attempt, wait, e)
            time.sleep(wait)


# ==========================================================
# OCR.space API
# ==========================================================
def call_ocr_space_image_bytes(
    image_bytes: bytes,
    api_key: str = OCR_API_KEY,
    language: str = "eng",
    overlay: bool = True,
    ocr_engine: int = 2,
    is_table: bool = False,
    timeout_seconds: int = 120,
) -> Dict[str, Any]:
    """Send image bytes to OCR.space API and return parsed JSON."""
    assert api_key, "Missing OCR_SPACE_API_KEY"
    files = {"file": ("page.png", image_bytes)}
    data = {
        "apikey": api_key,
        "language": language,
        "isOverlayRequired": "true" if overlay else "false",
        "OCREngine": str(ocr_engine),
        "isCreateSearchablePdf": "false",
        "isTable": "true" if is_table else "false",
    }

    def _post():
        return requests.post(OCR_SPACE_URL, data=data, files=files, timeout=timeout_seconds)

    result = _retry_request(_post, max_retries=4, backoff_factor=1.5).json()

    if result.get("IsErroredOnProcessing"):
        message = result.get("ErrorMessage") or result.get("ErrorDetails") or "Unknown OCR.space error"
        raise RuntimeError(f"OCR.space returned error: {message}")

    return result


# ==========================================================
# Main processing pipeline
# ==========================================================
def process_pdf_to_pinecone(
    pdf_path: str,
    index_name: str,
    namespace: Optional[str] = None,
    thumbnail_width: int = 600,
    dpi: int = 150,
    language: str = "eng",
    chunk_size_chars: int = 1600,
) -> Dict[str, Any]:
    """
    1. Render each PDF page as PNG
    2. Upload to Cloudinary
    3. OCR via OCR.space (with word coordinates)
    4. Compute embeddings per text chunk
    5. Upsert embeddings to Pinecone

    Returns summary + per-page metadata.
    """
    assert os.path.exists(pdf_path), f"PDF not found: {pdf_path}"
    doc_id = str(uuid.uuid4())
    logger.info("Processing PDF: %s  (doc_id=%s)", pdf_path, doc_id)

    # --- Open PDF ---
    doc = fitz.open(pdf_path)
    total_pages = doc.page_count
    logger.info("Total pages: %d", total_pages)

    # --- Initialize containers ---
    pages_meta: List[Dict[str, Any]] = []
    text_chunks: List[str] = []
    chunk_to_page_idx: List[int] = []

    tmp_dir = os.path.join("/tmp", f"pdf_process_{doc_id}")
    os.makedirs(tmp_dir, exist_ok=True)

    try:
        for page_num in range(total_pages):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(matrix=fitz.Matrix(dpi / 72.0, dpi / 72.0))
            img_path = os.path.join(tmp_dir, f"page_{page_num + 1}.png")
            _save_pix_as_png(pix, img_path)

            # Upload image to Cloudinary
            try:
                img_url = cloudinary_upload(img_path)
            except Exception as e:
                logger.error("Cloudinary upload failed for page %d: %s", page_num + 1, e)
                img_url = None

            # OCR this page
            with open(img_path, "rb") as f:
                img_bytes = f.read()

            try:
                ocr_result = call_ocr_space_image_bytes(img_bytes, api_key=OCR_API_KEY, language=language)
            except Exception as e:
                logger.error("OCR failed for page %d: %s", page_num + 1, e)
                ocr_result = {"IsErroredOnProcessing": True, "ErrorMessage": str(e)}

            # Parse OCR data
            text = ""
            words = []
            avg_conf = None

            if not ocr_result.get("IsErroredOnProcessing"):
                parsed = ocr_result.get("ParsedResults", [])
                if parsed:
                    pr = parsed[0]
                    text = pr.get("ParsedText", "") or ""
                    overlay = pr.get("TextOverlay", {})
                    for line in overlay.get("Lines", []):
                        for w in line.get("Words", []):
                            words.append({
                                "word": w.get("WordText"),
                                "x": w.get("Left"),
                                "y": w.get("Top"),
                                "w": w.get("Width"),
                                "h": w.get("Height"),
                                "confidence": w.get("Confidence"),
                            })
                    confs = [w["confidence"] for w in words if w.get("confidence") is not None]
                    if confs:
                        avg_conf = sum(confs) / len(confs)

            page_meta = {
                "doc_id": doc_id,
                "page_number": page_num + 1,
                "page_image_url": img_url,
                "ocr_text": text,
                "ocr_words": words,
                "ocr_mean_confidence": avg_conf,
            }
            pages_meta.append(page_meta)

            # Chunk text for embeddings
            clean_text = text.strip() or f"[no text extracted from page {page_num + 1}]"
            for i in range(0, len(clean_text), chunk_size_chars):
                chunk = clean_text[i : i + chunk_size_chars]
                text_chunks.append(chunk)
                chunk_to_page_idx.append(len(pages_meta) - 1)

        # --- Embedding ---
        logger.info("Embedding %d text chunks...", len(text_chunks))
        vectors = get_embeddings(text_chunks)
        pinecone_client = get_pinecone_connector()

        # --- Prepare upserts ---
        pdf_url = get_pdf_url(pdf_path)
        logger.info("PDF uploaded to Cloudinary: %s", pdf_url)
        upserts = []
        for i, (vec, txt) in enumerate(zip(vectors, text_chunks)):
            pmeta = pages_meta[chunk_to_page_idx[i]]
            meta = {
                "doc_id": str(pmeta.get("doc_id", "")),
                "page_number": int(pmeta.get("page_number", 0)),
                "page_image_url": str(pmeta.get("page_image_url", "")),
                "pdf_url": str(pdf_url),
                "ocr_text_excerpt": txt[:500] if txt else "",
                "ocr_mean_confidence": float(pmeta.get("ocr_mean_confidence") or 0.0),
                "ocr_words": json.dumps(pmeta.get("ocr_words", []))
            }
            upserts.append({
                "id": f"{doc_id}_p{pmeta.get('page_number', 0)}_c{i}",
                "values": vec,
                "metadata": meta,
            })
        
        logger.info("Upserting %d vectors to Pinecone index '%s'...", len(upserts), index_name)

        try:
            embed_dim = len(vectors[0]) if vectors else 768
            if index_name not in pinecone_client.list_indexes().names():
                pinecone_client.create_index(
                    name=index_name,
                    dimension=embed_dim,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
            pinecone_client.Index(index_name).upsert(vectors=upserts, namespace=namespace)

        except Exception as e:
            logger.exception("Failed to upsert to Pinecone: %s", e)
        logger.info("Upsert completed.")



        summary = {
            "doc_id": doc_id,
            "pdf_path": pdf_path,
            "total_pages": total_pages,
            "total_embeddings_upserted": len(upserts),
            "index_name": index_name,
            "namespace": namespace,
            "pages": pages_meta,
        }

        logger.info("✅ Processing completed successfully.")
        return {
            "index_name": index_name,
            "pdf_url": pdf_url,
        }

    finally:
        # Cleanup temp files unless KEEP_DEBUG_PAGES=1
        if not KEEP_DEBUG_PAGES:
            shutil.rmtree(tmp_dir, ignore_errors=True)
            logger.info("🧹 Temporary files cleaned up: %s", tmp_dir)
        else:
            logger.info("⚠️ Debug mode enabled — temp files kept at %s", tmp_dir)



