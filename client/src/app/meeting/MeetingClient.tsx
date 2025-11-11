"use client";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useEffect } from "react";

interface TranscriptResponse {
  transcript: string;
  context: string;
  llm_response: string;
}

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

export default function MeetingClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [responses, setResponses] = useState<TranscriptResponse[]>([]);
  const [serperResults, setSerperResults] = useState<SerperResult[]>([]);
  const [error, setError] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const [index_name, setIndexName] = useState<string>("");
  const searchParams = useSearchParams();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const API_URL = 'http://localhost:8000';

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [responses]);

  // Setup index name from URL params
  useEffect(() => {
    const indexNameParam = searchParams.get("index_name");
    if (indexNameParam) {
      setIndexName(indexNameParam);
      console.log("Index name loaded:", indexNameParam);
    } else {
      setError("No index_name found in URL. Please upload a PDF first.");
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (processorRef.current) processorRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [searchParams]);

  // --- Start Screen Share ---
  const startScreenShare = async () => {
    try {
      setError("");
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
        setError("No audio track found. Make sure to share tab audio.");
        displayStream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) stream.getTracks().forEach((t) => t.stop());
      setStream(displayStream);
      if (videoRef.current) videoRef.current.srcObject = displayStream;

      // Stop when user ends sharing
      displayStream.getVideoTracks()[0].onended = () => {
        console.log("Screen sharing stopped");
        stopStreaming();
      };

      await setupAudioStreaming(displayStream);
    } catch (err: any) {
      console.error("Error starting screen share:", err);
      setError(err.message || "Failed to start screen share");
    }
  };

  // --- Stop everything ---
  const stopStreaming = () => {
    if (wsRef.current) wsRef.current.close();
    if (processorRef.current) processorRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
    setIsConnected(false);
  };

  // --- Setup Audio + WebSocket Streaming ---
  const setupAudioStreaming = async (displayStream: MediaStream) => {
    const ws = new WebSocket('ws://localhost:8000/ws/audio');

    ws.onopen = () => {
      console.log("✓ WebSocket connected");
      ws.send(JSON.stringify({ type: "init", index_name }));
      setIsConnected(true);
      setError("");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📝 Received:", data);

      if (data.type === "complete") {
        console.log("✅ Got result from server");

        // Add new LLM response
        setResponses((prev) => [
          ...prev,
          {
            transcript: data.transcript,
            context: data.context,
            llm_response: data.llm_response,
          },
        ]);

        // Update Serper sidebar
        if (data.serper_response && Array.isArray(data.serper_response)) {
          setSerperResults(data.serper_response);
        }
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setError("WebSocket connection error");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    wsRef.current = ws;

    // Wait until WebSocket is ready
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          clearInterval(check);
          resolve(true);
        }
      }, 100);
    });

    // Setup Audio Context for PCM stream
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const audioTrack = displayStream.getAudioTracks()[0];
    const mediaStream = new MediaStream([audioTrack]);
    const source = audioContext.createMediaStreamSource(mediaStream);

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (ws.readyState === WebSocket.OPEN) {
        const audioData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          const s = Math.max(-1, Math.min(1, audioData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        try {
          ws.send(int16Data.buffer);
        } catch (err) {
          console.error("Error sending audio:", err);
        }
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    console.log("🎤 Audio streaming started");
  };

  // --- UI ---
  return (
    <div className="flex h-screen bg-gray-100">
      {/* LEFT: Screen + Controls */}
      <div className="w-1/3 flex flex-col border-r border-gray-300 bg-white">
        <div className="h-2/3 bg-black relative flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            autoPlay
            muted
          />
          {!stream && (
            <div className="absolute text-center">
              <div className="text-white font-semibold text-lg mb-2">
                Ready to Start
              </div>
              <div className="text-gray-300 text-sm">
                Click below to share your screen with audio
              </div>
            </div>
          )}
          {isConnected && (
            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Live Transcription
            </div>
          )}
        </div>

        <div className="h-1/3 flex flex-col items-center justify-center bg-gray-50 p-4">
          <button
            onClick={startScreenShare}
            disabled={isConnected}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              isConnected
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {isConnected ? "🎙️ Streaming..." : "Start Screen Share"}
          </button>

          {isConnected && (
            <button
              onClick={stopStreaming}
              className="mt-3 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              Stop Streaming
            </button>
          )}

          {error && (
            <div className="mt-3 text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* MIDDLE: Conversation */}
      <div className="w-1/2 bg-gray-50 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Conversation</h2>
            {responses.length > 0 && (
              <span className="text-sm text-gray-500">
                {responses.length}{" "}
                {responses.length === 1 ? "exchange" : "exchanges"}
              </span>
            )}
          </div>

          <div className="space-y-6">
            {responses.map((response, index) => (
              <div key={index} className="space-y-4">
                {/* User transcript */}
                <div className="flex justify-start">
                  <div className="max-w-[75%] bg-blue-500 text-white p-4 rounded-2xl rounded-tl-sm shadow-md">
                    <p className="leading-relaxed">{response.transcript}</p>
                  </div>
                </div>

                {/* LLM response */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[75%] bg-white text-gray-800 p-4 rounded-2xl rounded-tr-sm shadow-md border border-gray-200 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: response.llm_response }}
                  />
                </div>
              </div>
            ))}
            {responses.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-gray-500 text-lg font-medium mb-2">
                  No conversation yet
                </p>
                <p className="text-gray-400 text-sm">
                  Start speaking and the conversation will appear here
                </p>
                {isConnected && (
                  <p className="text-green-600 text-sm mt-2 font-medium">
                    ✓ Listening...
                  </p>
                )}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* RIGHT: Serper Sidebar */}
      <div className="w-[20%] border-l border-gray-300 bg-white p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
          🌐 Web Results
        </h3>

        {serperResults.length > 0 ? (
          <ul className="space-y-4">
            {serperResults.slice(0, 6).map((res, idx) => (
              <li key={idx} className="text-sm">
                <a
                  href={res.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-medium hover:underline"
                >
                  {res.title}
                </a>
                <p className="text-gray-600 mt-1">{res.snippet}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm italic">No web results yet.</p>
        )}
      </div>
    </div>
  );
}
