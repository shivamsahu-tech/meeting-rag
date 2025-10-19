from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from upload_handler import document_processor
import asyncio
import logging
import json

from assembly_handler import assembly_handler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload")
async def upload_pdf(file: UploadFile):
    """
    Endpoint to upload a PDF, extract text, and return text chunks
    """
    result = await document_processor.process_input(file)
    return result

@app.websocket("/ws/audio")
async def audio_websocket(websocket: WebSocket):
    """WebSocket endpoint for receiving audio and sending transcripts"""
    await websocket.accept()
    logger.info("✓ Audio WebSocket connected")

    async def send_transcript(transcript_data):
        try:
            await websocket.send_json(transcript_data)
            logger.info(f"Sent transcript: {transcript_data['text'][:50]}...")
        except Exception as e:
            logger.error(f"Error sending transcript: {e}")

    assembly_handler.set_callback(send_transcript)

    try:
        while True:
            data = await websocket.receive()

            if "bytes" in data:
                await assembly_handler.stream_audio(data["bytes"])

            elif "text" in data:
                try:
                    message = json.loads(data["text"])
                    if "index_name" in message:
                        assembly_handler.set_index_name(message["index_name"])
                        logger.info(f"Index name received: {message['index_name']}")
                except json.JSONDecodeError:
                    pass

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        logger.info("Audio WebSocket closed")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "assemblyai_connected": assembly_handler.is_connected,
        "session_id": assembly_handler.session_id
    }

@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "assemblyai": {
            "connected": assembly_handler.is_connected,
            "session_id": assembly_handler.session_id
        }
    }

@app.on_event("startup")
async def startup_event():
    """Connect to AssemblyAI on startup"""
    logger.info("🚀 Starting up application...")
    try:
        await assembly_handler.connect()
        logger.info("✓ Application startup complete")
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down application...")
    await assembly_handler.close()
    logger.info("✓ Application shutdown complete")