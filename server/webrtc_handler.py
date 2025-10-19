# import logging
# from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
# from aiortc.contrib.media import MediaRecorder
# import asyncio

# from assembly_handler import assembly_handler

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# class AudioStreamTrack(MediaStreamTrack):
#     """Custom audio track that streams to AssemblyAI"""
#     kind = "audio"
    
#     def __init__(self, track):
#         super().__init__()
#         self.track = track
    
#     async def recv(self):
#         frame = await self.track.recv()
        
#         # Convert frame to bytes and send to AssemblyAI
#         audio_data = frame.to_ndarray().tobytes()
#         assembly_handler.stream_audio(audio_data)
        
#         return frame

# class WebRTCHandler:
#     def __init__(self):
#         self.pc = RTCPeerConnection()
#         self.audio_track = None
        
#         @self.pc.on("track")
#         async def on_track(track):
#             logger.info(f"Track received: {track.kind}")
            
#             if track.kind == "audio":
#                 self.audio_track = AudioStreamTrack(track)
                
#                 # Start receiving audio
#                 while True:
#                     try:
#                         await self.audio_track.recv()
#                     except Exception as e:
#                         logger.error(f"Audio track error: {e}")
#                         break
    
#     async def create_answer(self, offer_sdp: str):
#         """Create WebRTC answer from offer"""
#         # Set remote description
#         await self.pc.setRemoteDescription(
#             RTCSessionDescription(sdp=offer_sdp, type="offer")
#         )
        
#         # Create answer
#         answer = await self.pc.createAnswer()
#         await self.pc.setLocalDescription(answer)
        
#         return {
#             "sdp": self.pc.localDescription.sdp,
#             "type": self.pc.localDescription.type
#         }
    
#     def close(self):
#         """Close peer connection"""
#         if self.pc:
#             asyncio.create_task(self.pc.close())