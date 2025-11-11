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

export function useSingleChannelAudio() {
  const [isConnected, setIsConnected] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaWsRef = useRef<WebSocket | null>(null);
  const micWsRef = useRef<WebSocket | null>(null);
  const mediaAudioCtxRef = useRef<AudioContext | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // derived states
  const mediaStreamStopped = !mediaStream;
  const micStreamStopped = !micStream;

  const buildWsUrl = (role: "user" | "assistant") => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = "localhost:8000"; // change if deployed
    return `${protocol}://${host}/ws?role=${role}`;
  };

  useEffect(() => {
    return () => {
      cleanupConnection("media");
      cleanupConnection("mic");
    };
  }, []);

  const cleanupConnection = (type: "media" | "mic") => {
    const wsRef = type === "media" ? mediaWsRef : micWsRef;
    const audioCtxRef = type === "media" ? mediaAudioCtxRef : micAudioCtxRef;
    const processorRef = type === "media" ? mediaProcessorRef : micProcessorRef;
    const stream = type === "media" ? mediaStream : micStream;

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
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      if (type === "media") setMediaStream(null);
      else setMicStream(null);
    }
  };

  const startMediaStream = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setMediaStream(displayStream);
      await setupAudioStream(displayStream, "assistant", mediaWsRef, mediaAudioCtxRef, mediaProcessorRef);
    } catch (err: any) {
      setError(`Media stream error: ${err.message}`);
    }
  };

  const startMicStream = async () => {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(mic);
      await setupAudioStream(mic, "user", micWsRef, micAudioCtxRef, micProcessorRef);
    } catch (err: any) {
      setError(`Mic stream error: ${err.message}`);
    }
  };

  useEffect(() => {
    const chatContainer = document.getElementById("chat-container");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [transcripts]);

  const setupAudioStream = async (
    stream: MediaStream,
    role: "user" | "assistant",
    wsRef: React.MutableRefObject<WebSocket | null>,
    audioCtxRef: React.MutableRefObject<AudioContext | null>,
    processorRef: React.MutableRefObject<ScriptProcessorNode | null>
  ) => {
    const wsUrl = buildWsUrl(role);
    let retryCount = 0;
    const maxRetries = 5;

    const connectWs = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`✅ WebSocket open for ${role}`);
        setIsConnected(true);
        setupAudioProcessing(stream, ws, role, audioCtxRef, processorRef);
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
          // if (!isFinal) return; // ignore interim

          const role = raw.role || "user";
          const cleaned = text.trim();

          // console.log("data :", raw);




setTranscripts((prev) => {
  const updated = [...prev];
  // const roleIndex = updated.length-1;

  // Normalize start time (Deepgram's or fallback)
  const startTime = raw.chunk_start ?? Date.now();

  const chunk = {
    start_time: startTime,
    text:  cleaned,
    is_final: isFinal,
  };

  if (role != updated[updated.length - 1]?.role) {
    // 🆕 No entry for this role yet
    updated.push({ role, texts: [chunk] });

  for (let i = 0; i < updated.length - 1; i++) {
    const roleObj = { ...updated[i] };
    // Keep only final chunks
    const finalTexts = roleObj.texts.filter((t) => t.is_final);

    if (finalTexts.length > 0) {
      updated[i] = { ...roleObj, texts: finalTexts };
    } else {
      // If no final texts remain, remove this conversation
      updated.splice(i, 1);
      i--; // adjust index after removal
    }
  }





  } else {
    const roleObj = { ...updated[updated.length-1] };
    const texts = [...roleObj.texts];
    const lastChunk = texts[texts.length - 1];

    // 🧩 CASE 1: Same role + same start_time → replace last chunk
    if (
      lastChunk && Math.abs(Number(lastChunk.start_time) - Number(startTime)) < 0.5
    ) {
      texts[texts.length - 1] = chunk;
    }
    // 🧩 CASE 2: Different start_time → push new chunk
    else {
      texts.push(chunk);
    }

   if (isFinal) {
  for (let i = 0; i < texts.length - 1; i++) {
    if (!texts[i].is_final) {
      texts.splice(i, 1);
      i--; // adjust index after removal
    }
  }
}

    updated[updated.length-1] = { ...roleObj, texts };





  }

  return updated;
});














        } catch (err) {
          console.error("Bad WS data:", err);
        }
      };

      ws.onerror = (err) => {
        console.error(`❌ WebSocket error for ${role}:`, err);
      };

      ws.onclose = (evt) => {
        console.warn(`🔒 ${role} socket closed:`, evt.code, evt.reason);
        wsRef.current = null;
        setIsConnected(false);
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔁 Retrying ${role} socket (${retryCount}/${maxRetries})...`);
          setTimeout(connectWs, 1000 * retryCount);
        } else {
          setError(`Failed to connect ${role} after ${maxRetries} retries.`);
        }
      };
    };

    connectWs();
  };

  const setupAudioProcessing = (
    stream: MediaStream,
    ws: WebSocket,
    role: "user" | "assistant",
    audioCtxRef: React.MutableRefObject<AudioContext | null>,
    processorRef: React.MutableRefObject<ScriptProcessorNode | null>
  ) => {
    try {
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16 = floatTo16BitPCM(inputData);
          ws.send(int16);
        }
      };

      audioCtxRef.current = audioCtx;
      processorRef.current = processor;
      console.log(`🎧 Audio setup complete for ${role}`);
    } catch (err) {
      console.error(`Error in setupAudioProcessing for ${role}:`, err);
      setError(`Audio setup failed for ${role}`);
    }
  };

  const floatTo16BitPCM = (buffer: Float32Array): ArrayBuffer => {
    const buf = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return buf.buffer;
  };

  return {
    startMediaStream,
    startMicStream,
    stopMediaStream: () => cleanupConnection("media"),
    stopMicStream: () => cleanupConnection("mic"),
    isConnected,
    transcripts,
    error,
    mediaStream,
    micStream,
    mediaStreamStopped,
    micStreamStopped,
  };
}
