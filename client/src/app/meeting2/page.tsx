'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Video,
  Mic,
  MicOff,
  Send,
  Copy,
  RotateCcw,
  Globe,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Search,
  BookOpen,
  ExternalLink,
  X,
} from 'lucide-react';
import {  useSingleChannelAudio } from '@/hooks/useSingleChannelAudio';
import { useDualChannelAudio } from '@/hooks/useDualChannelAudio';
import { useGetResponse } from '@/hooks/useGetResponse';

export default function MeetingUI() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isArtifactsOpen, setIsArtifactsOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(30);
  const [rightWidth, setRightWidth] = useState(15);
  const [inputValue, setInputValue] = useState('');
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [isDocSearchActive, setIsDocSearchActive] = useState(true);
  const [activeTab, setActiveTab] = useState<'web' | 'docs'>('docs');
  const [agents, setAgents] = useState<Array<{ title: string; query: string}>>([
    { title: 'AI Answer', query: 'Answer the last question asked by assistant.' },
    {title: "Summarize Meeting", query: "Provide a concise summary of the meeting so far."},
    {title: "Counter Point", query: "Counter the last question asked by the ass"}
  ]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);





  const searchParams = useSearchParams();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Use the dual-channel audio hook
  const {
    mediaStream,
    micStream,
    isConnected,
    mediaStreamStopped,
    micStreamStopped,
    transcripts,
    startMediaStream,
    stopMediaStream,
    startMicStream,
    stopMicStream,
    error: audioError,
  } = useSingleChannelAudio();

  // Use the get response hook
  const {
    llmChats,
    webResults,
    docResults,
    isLoading,
    error: responseError,
    getResponse,
    clearError,
  } = useGetResponse();

  // Preview modal state (null = closed)
  const [previewDoc, setPreviewDoc] = useState<null | {
    page_image_url?: string;
    pdf_url?: string;
    page_number?: number;
    ocr_text_excerpt?: string;
  }>(null);

  // zoom toggle for modal image
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
  transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  console.log("Transcripts updated: ", transcripts);
}, [transcripts]);

  useEffect(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [transcripts]);

  // Update video element when media stream changes
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    } else if (videoRef.current && !mediaStream) {
      videoRef.current.srcObject = null;
    }
  }, [mediaStream]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [llmChats]);

  // Close preview on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewDoc(null);
        setIsZoomed(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Handle stream start/stop
  const handleStreamToggle = async () => {
    if (mediaStream) {
      stopMediaStream();
    } else {
      await startMediaStream();
    }
  };

  const handleMicToggle = async () => {
    if (micStream) {
      stopMicStream();
    } else {
      await startMicStream();
    }
  };

  // Handle send message
  const handleSendMessage = async (query : string = inputValue) => {
    
    console.log("Sending query:", query);

    // Call getResponse with current state
    await getResponse({
      transcripts,
      isWebSearchActive,
      isDocSearchActive,
      userQuery: query,
    });
  };

  // Open preview modal for a doc result
  const openPreview = (result: any) => {
    setPreviewDoc(result);
    setIsZoomed(false);
  };

  // Open pdf at specific page in a new tab
  const openPdfAtPage = (pdf_url?: string, page_number?: number) => {
    if (!pdf_url) return;
    // Many viewers support the #page= syntax
    const url = page_number ? `${pdf_url}#page=${page_number}` : pdf_url;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left Column - Video & Conversations */}
      <div
        className="flex flex-col bg-[#1e293b] border-r border-gray-700"
        style={{ width: `${leftWidth}%` }}
      >
        {/* Video Section */}
        <div className="relative bg-[#1e293b] flex items-center justify-center" style={{ height: '280px' }}>
          {mediaStream ? (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              autoPlay
              muted
              playsInline
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Video className="w-16 h-16 text-gray-600" />
            </div>
          )}

          {/* Picture in Picture Icon */}
          <button className="absolute top-3 right-3 bg-white rounded p-1.5 hover:bg-gray-100 z-10">
            <Maximize2 className="w-4 h-4 text-gray-700" />
          </button>

          {/* Connection Status */}
          {isConnected && (
            <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              Live
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-1 py-1 bg-gray-600 border-t border-gray-700">
          <button
            onClick={handleStreamToggle}
            className="flex items-center justify-center gap-2 w-[48%] bg-white text-gray-700 rounded hover:bg-gray-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Video className="w-4 h-4" />
            {mediaStream ? 'Stop Stream' : 'Connect to meeting'}
          </button>

          <button
            onClick={handleMicToggle}
            className="flex items-center gap-2 justify-center px-4 w-[48%] bg-white text-gray-700 rounded hover:bg-gray-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {micStream ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {micStream ? 'Disconnect Mic' : 'Connect Microphone'}
          </button>
        </div>

        {/* Error Display */}
        {audioError && (
          <div className="px-4 py-2 bg-red-100 text-red-700 text-xs border-t border-red-200">
            {audioError}
          </div>
        )}

        {/* Transcripts/Conversations Section */}
         





















<div
  id="chat-container"
  className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto chat-container font-sans"
>
  <div className="p-6 space-y-5">
    {transcripts.length === 0 ? (
      <div className="text-center text-gray-400 text-sm py-10 italic">
        Transcripts will appear here when streams are active 🎙️
      </div>
    ) : (
      transcripts.map((conv, idx) => (
        <div key={idx} className="space-y-2">
          <div
            className={`flex flex-col ${
              conv.role === "user" ? "items-end" : "items-start"
            }`}
          >
            {/* Speaker Label */}
            <div className="text-xs text-gray-500 font-semibold mb-1 tracking-wide">
              {conv.role === "user" ? "🎤 You" : "📺 Screen"}
            </div>

            {/* Chat Bubble */}
            <div
              className={`rounded-2xl px-4 py-3 shadow-sm border transition-all duration-300 ease-in-out
                ${
                  conv.role === "user"
                    ? "bg-blue-100 border-blue-200 hover:bg-blue-200"
                    : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                } max-w-[85%] whitespace-pre-wrap`}
            >
              {conv.texts.map((chunk, i) => (
                <span
                  key={i}
                  className={`inline-block transition-opacity duration-200 ${
                    chunk.is_final
                      ? "text-gray-800"
                      : "italic text-gray-600 opacity-60"
                  }`}
                >
                   {chunk.text + " "}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))
    )}
    <div ref={transcriptEndRef} />
  </div>
</div>




















      </div>

      {/* Resizer for left */}
      <div
        className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize"
        onMouseDown={(e: React.MouseEvent) => {
          e.preventDefault();
          const startX = e.pageX;
          const startWidth = leftWidth;

          const onMouseMove = (e: MouseEvent) => {
            const delta = ((e.pageX - startX) / window.innerWidth) * 100;
            const newWidth = Math.max(20, Math.min(60, startWidth + delta));
            setLeftWidth(newWidth);
          };

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
      />

      {/* Middle Column - Chat */}
      <div
        className="flex flex-col bg-white"
        style={{ width: `${100 - leftWidth - (isArtifactsOpen ? rightWidth : 0)}%` }}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded">
              <Copy className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded">
              <RotateCcw className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded">
              <Maximize2 className="w-4 h-4 text-gray-600" />
            </button>

            {/* Search Toggles */}
            <div className="flex items-center gap-2 ml-4 border-l pl-4">
              <button
                onClick={() => setIsWebSearchActive(!isWebSearchActive)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isWebSearchActive
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                <Search className="w-3 h-3" />
                Web Search
              </button>
              <button
                onClick={() => setIsDocSearchActive(!isDocSearchActive)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isDocSearchActive
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                Doc Search
              </button>
            </div>
          </div>
          <button className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600" >Exit</button>
        </div>

        {/* Error Display */}
        {responseError && (
          <div className="px-4 py-2 bg-red-100 text-red-700 text-sm border-b border-red-200 flex items-center justify-between">
            <span>{responseError}</span>
            <button onClick={clearError} className="text-red-700 hover:text-red-900">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto space-y-4">
            {llmChats.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-gray-500 text-lg font-medium mb-2">No conversation yet</p>
                <p className="text-gray-400 text-sm">Start speaking or type a message to begin</p>
                {isConnected && <p className="text-green-600 text-sm mt-2 font-medium">✓ Listening...</p>}
              </div>
            ) : (
              llmChats.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="bg-gray-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-2xl text-sm">{msg.content}</div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 bg-gray-100 p-5 rounded-2xl ">
                      <div
                        className="flex-1 text-gray-800  text-sm leading-relaxed prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                      />
                      <div className="flex gap-1 mt-1">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span>Getting response...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className='flex justify-center' >
            {agents.map((agent, idx) => (<div
              key={idx}
              onClick={() =>  handleSendMessage(agent.query)}
              className="inline-block text-white bg-gray-500 text-xs px-3 py-1  rounded-md mr-2 mb-2 cursor-pointer hover:bg-gray-600"
            >
              {agent.title}
            </div>
          ))}
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask for any session related query, answer, assistance ..."
                  className="w-full px-4 py-3 pr-20 border text-black border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-400 bg-white"
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Globe className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                className="p-3 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resizer for right */}
      {isArtifactsOpen && (
        <div
          className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize relative"
          onMouseDown={(e: React.MouseEvent) => {
            e.preventDefault();
            const startX = e.pageX;
            const startWidth = rightWidth;

            const onMouseMove = (e: MouseEvent) => {
              const delta = ((startX - e.pageX) / window.innerWidth) * 100;
              const newWidth = Math.max(15, Math.min(40, startWidth + delta));
              setRightWidth(newWidth);
            };

            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setIsArtifactsOpen(!isArtifactsOpen)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-50 shadow-sm z-10"
          >
            <ChevronRight className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      )}

      {/* Right Column - Artifacts */}
      {isArtifactsOpen && (
        <div
          className="bg-white border-l border-gray-200 overflow-hidden flex flex-col"
          style={{ width: `${rightWidth}%` }}
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Citations & Sources</h3>
              <button onClick={() => setIsArtifactsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('web')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === 'web' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Search className="w-3 h-3" />
                Web ({webResults.length})
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === 'docs' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileText className="w-3 h-3" />
                Docs ({docResults.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'web' ? (
              <div className="space-y-2">
                {webResults.length === 0 ? (
                  <p className="text-gray-400 text-xs italic">No web results yet. Enable web search and ask a question.</p>
                ) : (
                  webResults.map((result, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer border border-blue-200">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-600 mt-0.5">#{idx + 1}</span>
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-700 hover:underline break-all flex-1"
                        >
                          {result.title}
                        </a>
                      </div>
                      {result.snippet && <p className="text-xs text-gray-600 ml-5 mt-1">{result.snippet}</p>}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {docResults.length === 0 ? (
                  <p className="text-gray-400 text-xs italic">No document results yet. Enable doc search and ask a question.</p>
                ) : (
                  docResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition cursor-pointer flex items-start gap-3"
                      onClick={() => openPreview(result)}
                    >
                      <div className="flex-shrink-0">
                        {/* PDF icon - clicking should open PDF at page (stop propagation) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPdfAtPage(result.pdf_url, result.page_number);
                          }}
                          className="p-2 bg-white rounded-md border border-gray-200 hover:bg-gray-50"
                          title="Open PDF at this page"
                        >
                          <FileText className="w-4 h-4 text-green-600" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-medium text-green-700 break-all">
                            {result.pdf_url ? new URL(result.pdf_url).pathname.split('/').pop() : 'Document'}
                          </div>
                          {result.page_number && <div className="text-xs text-gray-500 ml-2">Page {result.page_number}</div>}
                        </div>

                        {result.ocr_text_excerpt && (
                          <p className="text-xs text-gray-700 leading-relaxed mb-2 line-clamp-3">{result.ocr_text_excerpt}</p>
                        )}

                        {result.page_image_url && (
                          <img
                            src={result.page_image_url}
                            alt={`Page ${result.page_number}`}
                            className="w-28 h-auto rounded-md border border-gray-200 hover:shadow-md transition"
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle button when artifacts closed */}
      {!isArtifactsOpen && (
        <button
          onClick={() => setIsArtifactsOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-l-lg p-2 hover:bg-gray-50 shadow-md"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      )}

      {/* Preview Modal (rendered at root level, high z-index) */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setPreviewDoc(null);
            setIsZoomed(false);
          }}
        >
          <div
            className={`bg-white rounded-lg shadow-2xl overflow-auto relative transition-transform ${
              isZoomed ? 'scale-105' : 'scale-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-green-600" />
                <div className="text-sm font-medium text-gray-800">
                  {previewDoc.pdf_url ? new URL(previewDoc.pdf_url).pathname.split('/').pop() : 'Document'}
                </div>
                {previewDoc.page_number && <div className="text-xs text-gray-500 ml-2">Page {previewDoc.page_number}</div>}
              </div>

              <div className="flex items-center gap-2">
                {previewDoc.pdf_url && (
                  <button
                    onClick={() => openPdfAtPage(previewDoc.pdf_url, previewDoc.page_number)}
                    className="flex items-center text-black gap-2 text-xs px-2 py-1 bg-gray-50 border rounded hover:bg-gray-100"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open PDF
                  </button>
                )}

                <button
                  onClick={() => {
                    setPreviewDoc(null);
                    setIsZoomed(false);
                  }}
                  className="p-2 rounded hover:bg-gray-100"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-4 flex flex-col items-center gap-4">
              {previewDoc.page_image_url ? (
                <img
                  src={previewDoc.page_image_url}
                  alt={`Page ${previewDoc.page_number}`}
                  className={`max-h-[70vh] object-contain transition-transform cursor-zoom-in ${isZoomed ? 'scale-125 cursor-zoom-out' : ''}`}
                  onClick={() => setIsZoomed((s) => !s)}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">No preview image available for this page.</div>
              )}

             
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
