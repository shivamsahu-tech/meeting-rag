import fitz  # PyMuPDF
import io
import base64
import requests
import os
import time
import inspect
from PIL import Image
from fastapi import UploadFile, HTTPException
from pathlib import Path
import shutil
from typing import Dict, Any, List
import logging
from dotenv import load_dotenv
from utils.embedding import get_embeddings
from utils.cloudinary_upload import get_image_url  # Import cloudinary function
from utils.image_summary import image_summary  # Import image summary function
from pinecone import ServerlessSpec
from math import ceil
from uuid import uuid4
from utils.db_connections import get_pinecone_connector

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# DEBUG: Check if functions are coroutines
logger.info(f"Is get_image_url async? {inspect.iscoroutinefunction(get_image_url)}")
logger.info(f"Is image_summary async? {inspect.iscoroutinefunction(image_summary)}")

CHUNK_SIZE = 500  # characters per chunk (can adjust)


class DocumentProcessor:
    """PDF processor with text extraction, image processing, and Pinecone upsert"""

    def __init__(self, upload_dir: Path):
        self.upload_dir = upload_dir
        self.upload_dir.mkdir(exist_ok=True)
        self.temp_images_dir = self.upload_dir / "temp_images"
        self.temp_images_dir.mkdir(exist_ok=True)

    async def process_input(self, file: UploadFile) -> Dict[str, Any]:
        """
        Process PDF: extract text and images, get summaries, and upsert to Pinecone
        """
        try:
            logger.info(f"Processing PDF file: {file.filename}")

            # Validate PDF
            if not file.filename.lower().endswith(".pdf"):
                raise HTTPException(status_code=400, detail="Only PDF files are allowed")

            # Save the file
            file_path = await self._save_file(file)
            logger.info("File saved")

            # Extract text and images (synchronous)
            extracted_text, images_data = self._extract_text_and_images(file_path)
            logger.info(f"Text extracted. Found {len(images_data)} images")

            # Chunk text
            text_chunks = self._chunk_text(extracted_text, CHUNK_SIZE)
            logger.info(f"Created {len(text_chunks)} text chunks")

            # Process images: upload to Cloudinary and get summaries (synchronous)
            image_chunks = self._process_images(images_data)
            logger.info(f"Processed {len(image_chunks)} image chunks")

            # Combine all chunks (text + image summaries)
            all_chunks = []
            
            # Add text chunks
            for chunk in text_chunks:
                all_chunks.append({
                    "text": chunk,
                    "image_url": "",
                    "type": "text"
                })
            
            # Add image summary chunks
            all_chunks.extend(image_chunks)

            # Get embeddings for all chunks
            chunk_texts = [chunk["text"] for chunk in all_chunks]
            embeddings = get_embeddings(chunk_texts)
            logger.info(f"Generated embeddings for {len(embeddings)} chunks")

            # Upsert to Pinecone
            index_name = f"pdf-index-{uuid4().hex[:8]}"
            pc = get_pinecone_connector()
            
            vector_data = [
                {
                    "id": f"{index_name}-{i}",
                    "values": emb,
                    "metadata": {
                        "text": chunk["text"],
                        "image_url": chunk["image_url"],
                        "type": chunk["type"]
                    }
                }
                for i, (chunk, emb) in enumerate(zip(all_chunks, embeddings))
            ]

            dimension = 384
            try:
                pc.create_index(
                    name=index_name,
                    dimension=dimension,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                logger.info(f"Created Pinecone index: {index_name}")
            except Exception as e:
                logger.error(f"Error creating Pinecone index: {str(e)}")
                raise

            index = pc.Index(index_name)
            index.upsert(vector_data)
            logger.info("Upserted successfully to Pinecone")

            # Cleanup temp images
            self._cleanup_temp_images()

            return {
                "message": "PDF processed and embeddings upserted to Pinecone",
                "filename": file.filename,
                "file_size": file_path.stat().st_size,
                "file_path": str(file_path),
                "num_text_chunks": len(text_chunks),
                "num_image_chunks": len(image_chunks),
                "total_chunks": len(all_chunks),
                "index_name": index_name
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

    async def _save_file(self, file: UploadFile) -> Path:
        """Save uploaded PDF file"""
        file_path = self.upload_dir / file.filename
        if file_path.exists():
            timestamp = int(time.time())
            name_parts = file_path.stem, str(timestamp), file_path.suffix
            file_path = self.upload_dir / f"{name_parts[0]}_{name_parts[1]}{name_parts[2]}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"PDF saved to: {file_path}")
        return file_path

    def _extract_text_and_images(self, file_path: Path) -> tuple[str, List[Dict]]:
        """Extract text and images from PDF pages"""
        doc = fitz.open(file_path)
        extracted_text = ""
        images_data = []

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Extract text
            page_text = page.get_text()
            extracted_text += f"\n--- Page {page_num + 1} ---\n{page_text}\n"
            
            # Extract images
            image_list = page.get_images(full=True)
            for img_index, img_info in enumerate(image_list):
                try:
                    xref = img_info[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]
                    
                    # Save image temporarily
                    image_filename = f"page{page_num + 1}_img{img_index + 1}.{image_ext}"
                    image_path = self.temp_images_dir / image_filename
                    
                    with open(image_path, "wb") as img_file:
                        img_file.write(image_bytes)
                    
                    images_data.append({
                        "page": page_num + 1,
                        "index": img_index + 1,
                        "path": str(image_path),
                        "filename": image_filename
                    })
                    
                    logger.info(f"Extracted image: {image_filename}")
                
                except Exception as e:
                    logger.warning(f"Failed to extract image {img_index + 1} from page {page_num + 1}: {str(e)}")
                    continue

        doc.close()
        return extracted_text.strip(), images_data

    def _process_images(self, images_data: List[Dict]) -> List[Dict]:
        """Upload images to Cloudinary and get summaries (SYNCHRONOUS - NO ASYNC)"""
        image_chunks = []

        for img_data in images_data:
            try:
                # Upload to Cloudinary (synchronous call)
                logger.info(f"Uploading image: {img_data['filename']} from path: {img_data['path']}")
                
                # Call the function directly without await
                image_url = get_image_url(img_data["path"])
                
                # Debug log
                logger.info(f"Returned image_url type: {type(image_url)}, value: {image_url}")
                
                if not image_url or not isinstance(image_url, str):
                    logger.warning(f"Failed to upload image or invalid URL: {img_data['filename']}")
                    continue
                
                logger.info(f"Successfully uploaded to Cloudinary: {image_url}")
                
                # Get image summary (synchronous call)
                logger.info(f"Getting summary for image: {img_data['filename']}")
                summary = image_summary(image_url)
                
                if summary:
                    image_chunks.append({
                        "text": f"[Image from Page {img_data['page']}]: {summary}",
                        "image_url": image_url,
                        "type": "image"
                    })
                    logger.info(f"Generated summary for image on page {img_data['page']}")
                else:
                    logger.warning(f"Failed to generate summary for image: {img_data['filename']}")
            
            except Exception as e:
                logger.error(f"Error processing image {img_data['filename']}: {str(e)}", exc_info=True)
                continue

        return image_chunks

    def _cleanup_temp_images(self):
        """Clean up temporary image files"""
        try:
            for file in self.temp_images_dir.iterdir():
                if file.is_file():
                    file.unlink()
            logger.info("Cleaned up temporary images")
        except Exception as e:
            logger.warning(f"Error cleaning up temp images: {str(e)}")

    def _chunk_text(self, text: str, chunk_size: int) -> List[str]:
        """Split text into chunks of roughly chunk_size characters"""
        total_chunks = ceil(len(text) / chunk_size)
        return [text[i * chunk_size : (i + 1) * chunk_size] for i in range(total_chunks)]

    def list_files(self) -> list:
        """List uploaded PDF files"""
        files = []
        for file_path in self.upload_dir.iterdir():
            if file_path.is_file() and file_path.suffix.lower() == ".pdf":
                files.append({
                    "filename": file_path.name,
                    "size": file_path.stat().st_size,
                    "path": str(file_path)
                })
        return files


# Initialize processor
UPLOAD_DIR = Path("uploads")
document_processor = DocumentProcessor(UPLOAD_DIR)
