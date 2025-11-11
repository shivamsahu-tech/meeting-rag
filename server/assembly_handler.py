import logging
import asyncio
import json
import os
from typing import Callable, Optional
from utils.retrieval import get_context
import websockets
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")

class AssemblyAIHandler:
    def __init__(self):
        self.ws = None
        self.is_connected = False
        self.on_transcript_callback: Optional[Callable] = None
        self.current_transcript = ""
        self.silence_task = None
        self._receive_task = None
        self.session_id = None
        self.index_name: Optional[str] = None  # 🟢 ADDED

    # 🟢 New method: set index name
    def set_index_name(self, index_name: str):
        """Set the index_name for this streaming session."""
        self.index_name = index_name
        logger.info(f"Index name set to: {self.index_name}")

    def set_callback(self, callback: Callable):
        """Set callback function to send transcripts"""
        self.on_transcript_callback = callback

    async def _receive_messages(self):
        """Receive messages from AssemblyAI v3 API"""
        try:
            async for message in self.ws:
                data = json.loads(message)
                msg_type = data.get('type')

                if msg_type == "Begin":
                    self.session_id = data.get('id')
                    expires_at = data.get('expires_at')
                    logger.info(f"✓ Session began: ID={self.session_id}, ExpiresAt={datetime.fromtimestamp(expires_at)}")
                    self.is_connected = True

                elif msg_type == "Turn":
                    transcript = data.get('transcript', '')
                    formatted = data.get('turn_is_formatted', False)

                    if transcript:
                        if formatted:
                            # Final formatted transcript
                            logger.info(f"FINAL: {transcript}")
                            self.current_transcript = transcript

                            # Reset silence timer
                            if self.silence_task:
                                self.silence_task.cancel()

                            # Start 2 second silence detection
                            self.silence_task = asyncio.create_task(self.detect_silence())
                        else:
                            # Partial transcript
                            logger.info(f"PARTIAL: {transcript}")

                elif msg_type == "Termination":
                    audio_duration = data.get('audio_duration_seconds', 0)
                    session_duration = data.get('session_duration_seconds', 0)
                    logger.info(f"Session Terminated: Audio Duration={audio_duration}s, Session Duration={session_duration}s")
                    self.is_connected = False
                    break

        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket connection closed")
            self.is_connected = False
        except Exception as e:
            logger.error(f"Error receiving messages: {e}")
            self.is_connected = False

    async def detect_silence(self):
        """Detect 2 seconds of silence and send transcript"""
        try:
            await asyncio.sleep(2)

            # If we reach here, 2 seconds passed without new transcript
            if self.current_transcript and self.on_transcript_callback:
                print("goint ot send the data to frontend")
                # 🟢 Pass index_name to get_context
                context_result = await get_context(
                    self.current_transcript,
                    index_name=self.index_name
                )
                print("data to send ", context_result)
                await self.on_transcript_callback({
                    "type": "complete",
                    "transcript": context_result["transcript"],
                    "context": context_result["context"],
                    "llm_response": context_result["llm_response"],
                    "serper_response": context_result["serper_response"]
                })
                logger.info(f"Sent complete transcript for index '{self.index_name}': {self.current_transcript}")
                self.current_transcript = ""
        except asyncio.CancelledError:
            pass

    async def connect(self):
        """Connect to AssemblyAI v3 streaming service"""
        if not self.is_connected:
            try:
                url = "wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&format_turns=true"
                self.ws = await websockets.connect(
                    url,
                    additional_headers={"Authorization": ASSEMBLYAI_API_KEY}
                )
                self._receive_task = asyncio.create_task(self._receive_messages())
                logger.info("Connected to AssemblyAI v3 API")
            except Exception as e:
                logger.error(f"Failed to connect to AssemblyAI: {e}")
                raise

    async def stream_audio(self, audio_data: bytes):
        """Send audio chunk to AssemblyAI"""
        if self.is_connected and self.ws:
            try:
                await self.ws.send(audio_data)
            except Exception as e:
                logger.error(f"Error streaming audio: {e}")

    async def close(self):
        """Close the streaming connection"""
        if self.ws:
            try:
                terminate_message = {"type": "Terminate"}
                await self.ws.send(json.dumps(terminate_message))
                await asyncio.sleep(0.5)
                await self.ws.close()
            except Exception as e:
                logger.error(f"Error closing connection: {e}")

        if self._receive_task:
            self._receive_task.cancel()

        self.is_connected = False

# Global instance
assembly_handler = AssemblyAIHandler()
