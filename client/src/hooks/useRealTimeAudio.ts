import { useRef, useState, useCallback, useEffect } from 'react';

interface AudioState {
  isConnected: boolean;
  isListening: boolean;
  transcription: string | null;
  error: string | null;
}

export const useRealTimeAudio = (clientId: string) => {
  const [state, setState] = useState<AudioState>({
    isConnected: false,
    isListening: false,
    transcription: null,
    error: null
  });

  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  const connectWebSocket = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:8001/ws/audio/${clientId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        websocketRef.current = ws;
        setState(prev => ({ ...prev, isConnected: true, error: null }));
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transcription') {
            setState(prev => ({ ...prev, transcription: data.text }));
            console.log('Transcription received:', data.text);
          } else if (data.type === 'listening-started') {
            setState(prev => ({ ...prev, isListening: true }));
          } else if (data.type === 'listening-stopped') {
            setState(prev => ({ ...prev, isListening: false }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket connection failed' }));
        reject(error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        websocketRef.current = null;
        setState(prev => ({ ...prev, isConnected: false, isListening: false }));
      };
    });
  }, [clientId]);

  const startListening = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      audioStreamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && websocketRef.current && isRecordingRef.current) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            if (base64Audio) {
              websocketRef.current?.send(JSON.stringify({
                type: 'audio-chunk',
                audioData: base64Audio
              }));
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Start recording in small chunks
      mediaRecorder.start(100); // 100ms chunks
      isRecordingRef.current = true;

      // Send start listening message
      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'start-listening'
        }));
      }

    } catch (error) {
      console.error('Error starting listening:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start listening'
      }));
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      isRecordingRef.current = false;
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }

      // Send end of audio message
      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'audio-end'
        }));
      }

      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'stop-listening'
        }));
      }

    } catch (error) {
      console.error('Error stopping listening:', error);
    }
  }, []);

  const startContinuousListening = useCallback(async () => {
    await startListening();
  }, [startListening]);

  // Auto-connect when component mounts
  useEffect(() => {
    const initialize = async () => {
      try {
        await connectWebSocket();
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      stopListening();
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [connectWebSocket, stopListening]);

  return {
    ...state,
    startListening,
    stopListening
  };
};
