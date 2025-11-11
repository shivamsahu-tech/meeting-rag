import json
import asyncio
import logging
import os
import time
import threading
from dotenv import load_dotenv
from fastapi import WebSocket, WebSocketDisconnect
from deepgram import DeepgramClient
from deepgram.core.events import EventType
from deepgram.extensions.types.sockets import ListenV1SocketClientResponse

load_dotenv()

logger = logging.getLogger("deepgram_handler")
logging.basicConfig(level=logging.INFO)

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "your_api_key_here")


def get_deepgram_client():
    """Lazy init for Deepgram client"""
    if not hasattr(get_deepgram_client, "_client"):
        get_deepgram_client._client = DeepgramClient(api_key=DEEPGRAM_API_KEY)
    return get_deepgram_client._client


async def handle_deepgram_stream(websocket: WebSocket, role: str):
    logger.info(f"🎧 Initializing Deepgram connection for {role}")

    if not DEEPGRAM_API_KEY or DEEPGRAM_API_KEY == "your_api_key_here":
        await websocket.send_json({"error": "Missing DEEPGRAM_API_KEY", "role": role})
        return

    dg_client = get_deepgram_client()
    transcript_queue = asyncio.Queue()
    is_streaming = True
    send_task = None

    try:
        # 🎙️ Create Deepgram context
        dg_context = dg_client.listen.v1.connect(
            model="nova-3",
            encoding="linear16",
            sample_rate=16000,
            channels=1,
            interim_results=True,
            punctuate=True,
            endpointing=10,
        )

        dg_socket = dg_context.__enter__()
        logger.info(f"✅ Deepgram connection established for {role}")

        await websocket.send_json({"status": "ready", "role": role})

        event_loop = asyncio.get_running_loop()

        # 🧠 Callback for messages from Deepgram
        def on_message(message: ListenV1SocketClientResponse) -> None:
            try:
                if hasattr(message, "channel"):
                    alt = message.channel.alternatives
                    if alt and len(alt) > 0:
                        transcript = alt[0].transcript.strip()
                        if not transcript:
                            return

                        is_final = getattr(message, "is_final", False)

                        # ⏱️ Extract timing (Deepgram gives these at chunk-level)
                        chunk_start = getattr(message, "start", None)
                        chunk_end = getattr(message, "end", None)
                        current_time = time.time()

                        # fallback to system time if timestamps unavailable
                        if chunk_start is None:
                            chunk_start = current_time
                        if chunk_end is None:
                            chunk_end = current_time

                        duration_str = f"{chunk_start:.2f}-{chunk_end:.2f}s"
                        tag = "📝 Final" if is_final else "💬 Interim"

                        # 🧩 Push chunk to async queue
                        asyncio.run_coroutine_threadsafe(
                            transcript_queue.put(
                                {
                                    "role": role,
                                    "transcript": transcript,
                                    "is_final": is_final,
                                    "chunk_start": chunk_start,
                                    "chunk_end": chunk_end,
                                }
                            ),
                            event_loop,
                        )

                        # 🪶 Log transcript with timestamp
                        logger.info(f"{tag} [{role}] ({duration_str}) → {transcript}")

            except Exception as e:
                logger.error(
                    f"❌ Error processing Deepgram message for {role}: {e}", exc_info=True
                )

        # 🧷 Register Deepgram socket events
        dg_socket.on(EventType.OPEN, lambda _: logger.info(f"🔊 Deepgram socket open for {role}"))
        dg_socket.on(EventType.MESSAGE, on_message)
        dg_socket.on(EventType.CLOSE, lambda _: logger.info(f"🔒 Deepgram socket closed for {role}"))
        dg_socket.on(EventType.ERROR, lambda e: logger.error(f"❌ Deepgram error for {role}: {e}"))

        # 🧵 Run Deepgram listener in background thread
        threading.Thread(target=lambda: dg_socket.start_listening(), daemon=True).start()

        # 🚀 Task to forward transcripts to frontend
        async def send_transcripts():
            while is_streaming:
                try:
                    data = await asyncio.wait_for(transcript_queue.get(), timeout=1.0)
                    await websocket.send_json(data)
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"Send transcript error: {e}")
                    break

        send_task = asyncio.create_task(send_transcripts())

        # 🎧 Receive raw audio stream from client
        while True:
            msg = await websocket.receive()
            if "bytes" in msg:
                dg_socket.send_media(msg["bytes"])
            elif "text" in msg:
                try:
                    data = json.loads(msg["text"])
                    if data.get("event") == "end":
                        break
                except json.JSONDecodeError:
                    logger.warning(f"⚠️ Non-JSON text from frontend: {msg['text']}")
            await asyncio.sleep(0.001)

    except WebSocketDisconnect:
        logger.info(f"🔌 Disconnected: {role}")

    except Exception as e:
        logger.error(f"❌ Deepgram stream error for {role}: {e}", exc_info=True)
        await websocket.send_json({"error": str(e), "role": role})

    finally:
        is_streaming = False
        if send_task:
            send_task.cancel()
            try:
                await send_task
            except asyncio.CancelledError:
                pass
        try:
            dg_socket.finish()
            dg_context.__exit__(None, None, None)
        except Exception:
            pass
        logger.info(f"🛑 Deepgram stream closed for {role}")
