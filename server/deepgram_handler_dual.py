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

logger = logging.getLogger("deepgram_dual_handler")
logging.basicConfig(level=logging.INFO)

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "your_api_key_here")


def get_deepgram_client():
    """Lazy init for Deepgram client"""
    if not hasattr(get_deepgram_client, "_client"):
        get_deepgram_client._client = DeepgramClient(api_key=DEEPGRAM_API_KEY)
    return get_deepgram_client._client


async def handle_deepgram_dual_channel(websocket: WebSocket):
    """
    Handle dual-channel (stereo) audio input over one WebSocket connection.
    Channel 0 = user mic, Channel 1 = assistant/system output
    """
    logger.info("Initializing Deepgram dual-channel connection")

    if not DEEPGRAM_API_KEY or DEEPGRAM_API_KEY == "your_api_key_here":
        await websocket.send_json({"error": "Missing DEEPGRAM_API_KEY"})
        return

    dg_client = get_deepgram_client()
    transcript_queue = asyncio.Queue()
    is_streaming = True
    send_task = None

    try:
        # Create Deepgram connection (multichannel enabled)
        dg_context = dg_client.listen.v1.connect(
            model="nova-3",
            encoding="linear16",
            sample_rate=16000,
            channels=2,        # stereo input
            multichannel=True, # allow independent channel recognition
            interim_results=True,
            punctuate=True,
            endpointing=10,
        )

        dg_socket = dg_context.__enter__()
        logger.info("Deepgram dual-channel connection established")

        await websocket.send_json({"status": "ready", "mode": "dual-channel"})

        event_loop = asyncio.get_running_loop()

        # Process messages from Deepgram
        def on_message(message: ListenV1SocketClientResponse) -> None:
            try:
                if hasattr(message, "channel"):
                    alt = message.channel.alternatives
                    if alt and len(alt) > 0:
                        transcript = alt[0].transcript.strip()
                        if not transcript:
                            return

                        is_final = getattr(message, "is_final", False)
                        channel_index = getattr(message, "channel_index", [0, 2])
                        channel_num = channel_index[0] if isinstance(channel_index, list) else 0

                        role = "user" if channel_num == 0 else "assistant"

                        # Optional timing data
                        chunk_start = getattr(message, "start", time.time())
                        chunk_end = getattr(message, "end", time.time())
                        duration_str = f"{chunk_start:.2f}-{chunk_end:.2f}s"
                        tag = "Final" if is_final else "Interim"

                        # Push transcript to queue
                        asyncio.run_coroutine_threadsafe(
                            transcript_queue.put(
                                {
                                    "role": role,
                                    "transcript": transcript,
                                    "is_final": is_final,
                                    "channel": channel_num,
                                    "chunk_start": chunk_start,
                                    "chunk_end": chunk_end,
                                }
                            ),
                            event_loop,
                        )

                        logger.info(f"{tag} [{role}] ({duration_str}) → {transcript}")

            except Exception as e:
                logger.error(f"Error processing Deepgram message: {e}", exc_info=True)

        # 🧷 Register Deepgram socket events
        dg_socket.on(EventType.OPEN, lambda _: logger.info("Deepgram dual socket open"))
        dg_socket.on(EventType.MESSAGE, on_message)
        dg_socket.on(EventType.CLOSE, lambda _: logger.info("Deepgram dual socket closed"))
        dg_socket.on(EventType.ERROR, lambda e: logger.error(f"Deepgram error: {e}"))

        # Background listening thread
        threading.Thread(target=lambda: dg_socket.start_listening(), daemon=True).start()

        # Background sender for transcripts
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

        # Receive binary (audio) + control messages from frontend
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
                    logger.warning(f"Non-JSON text: {msg['text']}")
            await asyncio.sleep(0.001)

    except WebSocketDisconnect:
        logger.info("🔌 Disconnected: dual-channel")

    except Exception as e:
        logger.error(f"Deepgram dual stream error: {e}", exc_info=True)
        await websocket.send_json({"error": str(e), "mode": "dual-channel"})

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
        logger.info("Deepgram dual-channel stream closed")
