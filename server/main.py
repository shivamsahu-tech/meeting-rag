from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from upload_handler import document_processor
import asyncio
import logging
import json
import struct
from uuid import uuid4
from utils.delete_index import delete_index_after_delay
# from assembly_handler import assembly_handler
# from deepgram_handler import deepgram_handler
from deepgram_handler import handle_deepgram_stream
from fastapi.responses import JSONResponse
from retrieve_response import retrieve_response_pipeline
from deepgram_handler_dual import handle_deepgram_dual_channel
# Configure logging with more detail
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from auth.controllers import login_user, sign_up_user, UserOutModel, LoginModel, SignUpModel, logout_user, get_current_user
from auth.db import connect_db, disconnect_db



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_pdf(file: UploadFile, index_name_text: str | None = None, index_name_ocr: str | None = None):
    if not index_name_text:
        index_name_text = f"pdf-index-{uuid4().hex[:8]}"
    if not index_name_ocr:
        index_name_ocr = f"ocr-index-{uuid4().hex[:8]}"

    logger.info(f"Using index name: {index_name_text} for text embeddings")
    logger.info(f"Using index name: {index_name_ocr} for OCR embeddings")
    result = await document_processor.process_input(file, index_name_ocr, index_name_text)
    # asyncio.create_task(delete_index_after_delay(index_name, delay=600))
    return JSONResponse(
        content={
            "success": True,
            "index_name_pdf": result["index_name_text"],
            "index_name_ocr": result["index_name_ocr"],
            "pdf_url": result["pdf_url"],
            "message": "Upload complete",
        },
        status_code=200,
    )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    role = websocket.query_params.get("role", "unknown")
    logger.info(f"WebSocket connected: {role}")

    try:
        # Delegate all logic to handler
        await handle_deepgram_stream(websocket, role)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {role}")

    except Exception as e:
        logger.error(f"Error in WebSocket endpoint for {role}: {e}", exc_info=True)
        await websocket.close()

    finally:
        logger.info(f"Connection closed for {role}")


@app.websocket("/ws/dual-channel")
async def websocket_dual_channel_endpoint(websocket: WebSocket):
    """
    Single WebSocket endpoint for dual-channel audio processing.
    Receives interleaved stereo audio: Channel 0 (user), Channel 1 (assistant).
    """
    await websocket.accept()
    logger.info("WebSocket connected: dual-channel mode")

    try:
        await handle_deepgram_dual_channel(websocket)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: dual-channel")

    except Exception as e:
        logger.error(f"Error in dual-channel WebSocket endpoint: {e}", exc_info=True)
        try:
            await websocket.close()
        except:
            pass

    finally:
        logger.info("Dual-channel connection closed")


@app.post("/retrieve-response")
async def retrieve_response(request: Request):
    try:
        # Try to parse JSON body
        body_bytes = await request.body()
        if not body_bytes:
            logger.error("Empty request body")
            return JSONResponse(status_code=400, content={"error": "Empty request body"})

        try:
            data = json.loads(body_bytes)
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received: {body_bytes[:200]!r}")
            return JSONResponse(status_code=400, content={"error": "Invalid JSON payload"})

        logger.info(f"Received /retrieve-response with data: {data}")

        # Extract parameters safely
        index_name_pdf = data.get("index_name_pdf")
        index_name_ocr = data.get("index_name_ocr")
        conversations = data.get("conversations", [])
        query = data.get("query", "")
        isWebSearchOn = data.get("isWebSearchOn", False)
        isDocSearchOn = data.get("isDocSearchOn", False)



        # Pass everything to your retrieval pipeline
        response = await retrieve_response_pipeline(
            index_name_pdf=index_name_pdf,
            index_name_ocr=index_name_ocr,
            conversations=conversations,
            query=query,
            isWebSearchOn=isWebSearchOn,
            isDocSearchOn=isDocSearchOn,
        )

        return {"status": "success", "data": response}

    except Exception as e:
        logger.exception("Error in /retrieve-response")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)},
        )


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Deepgram Transcription Service"
    }

@app.get("/health")
async def health():
    """Detailed health check"""
    import os
    deepgram_key_set = bool(os.getenv("DEEPGRAM_API_KEY") and os.getenv("DEEPGRAM_API_KEY") != "your_api_key_here")
    return {
        "status": "healthy",
        "service": "Deepgram Transcription Service",
        "deepgram_api_key_set": deepgram_key_set
    }

@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("=" * 80)
    logger.info(" Starting up application...")
    logger.info("=" * 80)
    logger.info(" Application startup complete")
    # await connect_db()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("=" * 80)
    logger.info(" Shutting down application...")
    logger.info("=" * 80)
    logger.info(" Application shutdown complete")
    await disconnect_db()







@app.post("/login-user")
async def login_endpoint(payload: LoginModel, response: Response):
    return await login_user(payload, response)

@app.post("/signup-user")
async def sign_up_endpoint(payload: SignUpModel, response: Response):
    print("Sign-up endpoint called")
    return await sign_up_user(payload, response)

@app.post("/logout-user")
async def logout_endpoint(response: Response):
    return await logout_user(response)

@app.get("/get-current-user")
async def get_current_user_endpoint(request: Request):
    print("Get current user endpoint called")
    return await get_current_user(request)