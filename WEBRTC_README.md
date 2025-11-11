# WebRTC Audio Streaming Implementation

This implementation adds WebRTC audio streaming capabilities to your Meeting RAG application, allowing you to stream audio from the client to the server in real-time.

## Features

- **Real-time Audio Streaming**: Stream audio from client to server using WebRTC
- **WebSocket Signaling**: Uses WebSocket for WebRTC signaling between client and server
- **Audio Recording**: Server automatically records incoming audio streams
- **Connection Management**: Handles connection states and error recovery
- **Modern UI**: Clean interface with connection status indicators

## Architecture

### Client Side (Next.js)
- **WebRTC Hook** (`src/hooks/useWebRTC.ts`): Manages WebRTC peer connection and audio streaming
- **Meeting Page** (`src/app/meeting/page.tsx`): UI for controlling audio streaming
- **Audio Capture**: Uses `getUserMedia` to capture microphone audio with noise suppression

### Server Side (FastAPI)
- **WebRTC Handler** (`webrtc_handler.py`): Manages WebRTC connections and audio processing
- **WebSocket Endpoint** (`/ws/webrtc/{client_id}`): Handles signaling between client and server
- **Audio Recording**: Automatically records incoming audio streams to WAV files

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   ./setup.sh
   ```

2. **Start the Server**:
   ```bash
   cd server
   source venv/bin/activate
   python main.py
   ```

3. **Start the Client**:
   ```bash
   cd client
   npm run dev
   ```

4. **Access the Application**:
   - Open http://localhost:3000/meeting
   - Click "Start Audio Stream" to begin streaming audio
   - The server will automatically record the audio stream

## API Endpoints

### WebSocket
- `ws://localhost:8000/ws/webrtc/{client_id}` - WebRTC signaling endpoint

### HTTP
- `GET /webrtc/health` - Health check for WebRTC service
- `GET /` - Server status
- `GET /health` - General health check

## Usage

1. **Start Audio Streaming**:
   - Click the "Start Audio Stream" button
   - Grant microphone permissions when prompted
   - The connection status will show "connected" when successful

2. **Monitor Connection**:
   - Connection status is displayed in real-time
   - Error messages appear if there are issues
   - Audio files are automatically saved on the server

3. **Stop Streaming**:
   - Click "Stop Audio Stream" to end the session
   - All resources are automatically cleaned up

## Technical Details

### Audio Configuration
- **Sample Rate**: 44.1kHz
- **Echo Cancellation**: Enabled
- **Noise Suppression**: Enabled
- **Auto Gain Control**: Enabled

### WebRTC Configuration
- **ICE Servers**: Google STUN servers
- **Codec**: Opus (default)
- **Transport**: WebRTC over WebSocket signaling

### File Output
- **Format**: WAV files
- **Location**: Server root directory
- **Naming**: `audio_{client_id}_{uuid}.wav`

## Troubleshooting

### Common Issues

1. **Microphone Permission Denied**:
   - Ensure browser has microphone access
   - Check browser permissions for localhost

2. **WebSocket Connection Failed**:
   - Verify server is running on port 8000
   - Check firewall settings

3. **WebRTC Connection Failed**:
   - Check network connectivity
   - Verify STUN servers are accessible

### Debug Information

- Check browser console for client-side errors
- Server logs show connection status and errors
- Use `/webrtc/health` endpoint to check service status

## Security Considerations

- WebRTC connections are peer-to-peer after initial signaling
- Audio streams are encrypted in transit
- Client IDs are generated with timestamps and random strings
- No persistent storage of connection data

## Future Enhancements

- Real-time audio processing and analysis
- Multiple client support
- Audio quality monitoring
- Integration with meeting transcription
- Audio compression and optimization
