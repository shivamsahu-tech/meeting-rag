# Meeting RAG Server

A FastAPI server for handling file uploads and processing meeting data with BLIP image captioning.

## Setup

1. Create and activate virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
# Copy the example environment file
cp env_example.txt .env

# Edit .env and add your Hugging Face API token
HUGGINGFACE_API_TOKEN=your_actual_token_here
```

## Getting Hugging Face API Token

1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up/Login to your account
3. Go to Settings → Access Tokens
4. Create a new token with "Read" permissions
5. Copy the token and add it to your `.env` file

## Running the Server

```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will be available at `http://localhost:8000`

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `POST /upload` - Upload a file (supports PDF with image captioning)
- `GET /files` - List uploaded files

## Features

- **PDF Processing**: Extracts text and images from PDF files
- **Image Captioning**: Uses BLIP model via Hugging Face API to generate captions for images
- **Error Handling**: Comprehensive error handling and logging
- **CORS Support**: Configured for Next.js client integration

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Example Response for PDF Upload

```json
{
  "message": "File uploaded successfully",
  "filename": "document.pdf",
  "file_size": 1024000,
  "pdf_processing": {
    "total_pages": 3,
    "extracted_text": "--- Page 1 ---\nDocument content...",
    "images_found": 2,
    "images_data": [
      {
        "page": 1,
        "image_index": 0,
        "extracted_text": "A diagram showing the system architecture",
        "image_format": "png"
      }
    ],
    "processing_status": "completed"
  }
}
```
