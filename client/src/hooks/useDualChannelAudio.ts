import { useEffect, useRef, useState } from "react";

type TranscriptChunk = {
  start_time: number | string;
  text: string;
  is_final: boolean;
};

type Transcript = {
  role: "user" | "assistant";
  texts: TranscriptChunk[];
};

export function useDualChannelAudio() {
  const [isConnected, setIsConnected] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeStreamsRef = useRef({ mic: false, media: false });

  const mediaStreamStopped = !mediaStream;
  const micStreamStopped = !micStream;

  const buildWsUrl = () => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = "localhost:8000"; // change if deployed
    return `${protocol}://${host}/ws/dual-channel`;
  };

  useEffect(() => {
    return () => cleanupConnection();
  }, []);

  const cleanupConnection = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      setMicStream(null);
    }
    activeStreamsRef.current = { mic: false, media: false };
  };

  const startMediaStream = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        setError("No audio track in screen share. Make sure to select 'Share audio'.");
        displayStream.getTracks().forEach((t) => t.stop());
        return;
      }

      setMediaStream(displayStream);
      activeStreamsRef.current.media = true;

      displayStream.getVideoTracks()[0].onended = () => stopMediaStream();

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await initWebSocket();
      }
    } catch (err: any) {
      setError(`Media stream error: ${err.message}`);
    }
  };

  const startMicStream = async () => {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(mic);
      activeStreamsRef.current.mic = true;

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await initWebSocket();
      }
    } catch (err: any) {
      setError(`Mic stream error: ${err.message}`);
    }
  };

  const initWebSocket = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(buildWsUrl());
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Dual-channel WebSocket open");
        setIsConnected(true);
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);

          const text =
            raw.text ||
            raw.transcript ||
            raw.channel?.alternatives?.[0]?.transcript ||
            "";
          if (!text.trim()) return;

          const isFinal = raw.is_final ?? raw.isFinal ?? false;
          const role = raw.channel === 0 ? "user" : "assistant";
          const cleaned = text.trim();

          console.log(`transcript for ${role}: ${raw.channel}  : `, cleaned);

          setTranscripts((prev) => {
            const updated = [...prev];
            const startTime = raw.start ?? Date.now();

            const chunk = {
              start_time: startTime,
              text: cleaned,
              is_final: isFinal,
            };

            if (role !== updated[updated.length - 1]?.role) {
              // new speaker
              updated.push({ role, texts: [chunk] });

              // Clean all previous n-1 elements of interim
              for (let i = 0; i < updated.length - 1; i++) {
                const roleObj = { ...updated[i] };
                const finalTexts = roleObj.texts.filter((t) => t.is_final);
                if (finalTexts.length > 0) {
                  updated[i] = { ...roleObj, texts: finalTexts };
                } else {
                  updated.splice(i, 1);
                  i--;
                }
              }
            } else {
              // same speaker
              const roleObj = { ...updated[updated.length - 1] };
              const texts = [...roleObj.texts];
              const lastChunk = texts[texts.length - 1];

              if (lastChunk && Math.abs(Number(lastChunk.start_time) - Number(startTime)) < 0.5) {
                texts[texts.length - 1] = chunk;
              } else {
                texts.push(chunk);
              }

              // Remove interims if current chunk is final
              if (isFinal) {
                for (let i = 0; i < texts.length - 1; i++) {
                  if (!texts[i].is_final) {
                    texts.splice(i, 1);
                    i--;
                  }
                }
              }

              updated[updated.length - 1] = { ...roleObj, texts };
            }

            return updated;
          });
        } catch (err) {
          console.error("Bad WS data:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setError("WebSocket connection error");
        reject(err);
      };

      ws.onclose = (evt) => {
        console.warn("WebSocket closed:", evt.code, evt.reason);
        wsRef.current = null;
        setIsConnected(false);

        if (activeStreamsRef.current.mic || activeStreamsRef.current.media) {
          console.log("Attempting to reconnect...");
          setTimeout(() => initWebSocket().catch(console.error), 2000);
        }
      };
    });
  };

  useEffect(() => {
    if (micStream && mediaStream && wsRef.current?.readyState === WebSocket.OPEN) {
      setupDualChannelAudio();
    }
  }, [micStream, mediaStream]);

  const setupDualChannelAudio = () => {
    if (!micStream || !mediaStream || !wsRef.current) return;

    try {
      if (processorRef.current) processorRef.current.disconnect();
      if (audioCtxRef.current) audioCtxRef.current.close();

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      const micSource = audioCtx.createMediaStreamSource(micStream);
      const mediaSource = audioCtx.createMediaStreamSource(mediaStream);
      const merger = audioCtx.createChannelMerger(2);
      micSource.connect(merger, 0, 0);
      mediaSource.connect(merger, 0, 1);

      const processor = audioCtx.createScriptProcessor(4096, 2, 2);
      processorRef.current = processor;
      merger.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const left = e.inputBuffer.getChannelData(0);
          const right = e.inputBuffer.getChannelData(1);
          const interleaved = interleaveChannels(left, right);
          wsRef.current.send(interleaved);
        }
      };

      console.log("🎧 Dual-channel audio setup complete");
    } catch (err) {
      console.error("Error in setupDualChannelAudio:", err);
      setError("Dual-channel setup failed");
    }
  };

  const interleaveChannels = (left: Float32Array, right: Float32Array): ArrayBuffer => {
    const length = left.length + right.length;
    const result = new Int16Array(length);
    let index = 0;
    for (let i = 0; i < left.length; i++) {
      result[index++] = floatToInt16(left[i]);
      result[index++] = floatToInt16(right[i]);
    }
    return result.buffer;
  };

  const floatToInt16 = (float: number): number => {
    const s = Math.max(-1, Math.min(1, float));
    return s < 0 ? s * 0x8000 : s * 0x7fff;
  };

  const stopMediaStream = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
    activeStreamsRef.current.media = false;
    if (!activeStreamsRef.current.mic) cleanupConnection();
  };

  const stopMicStream = () => {
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      setMicStream(null);
    }
    activeStreamsRef.current.mic = false;
    if (!activeStreamsRef.current.media) cleanupConnection();
  };

  return {
    startMediaStream,
    startMicStream,
    stopMediaStream,
    stopMicStream,
    isConnected,
    transcripts,
    error,
    mediaStream,
    micStream,
    mediaStreamStopped,
    micStreamStopped,
  };
}
