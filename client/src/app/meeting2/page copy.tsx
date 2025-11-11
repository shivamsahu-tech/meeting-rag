  'use client';
  import React, { useState, useRef, useEffect } from 'react';
  import { useSearchParams } from 'next/navigation';
  import { Video, Mic, MicOff, Send, Copy, RotateCcw, Globe, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
  import { useDualChannelAudio } from '@/hooks/useDualChannelAudio';

  export default function MeetingUI() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isArtifactsOpen, setIsArtifactsOpen] = useState(true);
    const [leftWidth, setLeftWidth] = useState(30);
    const [rightWidth, setRightWidth] = useState(15);
    const [inputValue, setInputValue] = useState('');
    const [chatMessages, setChatMessages] = useState<{ type: 'user' | 'assistant'; content: string }[]>([]);
    const [serperResults, setSerperResults] = useState<{ title: string; link: string }[]>([]);
    
    const searchParams = useSearchParams();
    const indexName = searchParams.get('index_name') || '';
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
      error,
    } = useDualChannelAudio();

      useEffect(() => {
      const chatContainer = document.getElementById("chat-container");
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
    }, [chatMessages]);

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
    const handleSendMessage = () => {
      if (!inputValue.trim()) return;
      
      // Add user message to chat
      // This is for manual text input, not audio transcription
      setInputValue('');
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

            {/* Stream Status Indicators at Bottom */}
            {/* <div className="absolute bottom-2 left-2 right-2 flex gap-2">
              {mediaStreamStopped && (
                <div className="bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  Stream Stopped
                </div>
              )}
              {micStreamStopped && (
                <div className="bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  <MicOff className="w-3 h-3" />
                  Mic Stopped
                </div>
              )}
            </div> */}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-1 py-1 bg-gray-600 border-t border-gray-700">
            <button 
              onClick={handleStreamToggle}
              className="flex items-center justify-center gap-2 w-[48%] bg-white text-gray-700 rounded hover:bg-gray-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              // disabled={!indexName}
            >
              <Video className="w-4 h-4" />
              {mediaStream ? 'Stop Stream' : 'Connect to meeting'}
            </button>
            
            <button 
              onClick={handleMicToggle}
              className="flex items-center gap-2  justify-center px-4 w-[48%] bg-white text-gray-700 rounded hover:bg-gray-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              // disabled={!indexName}
            >
              {micStream ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {micStream ? 'Disconnect Mic' : 'Connect Microphone'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-4 py-2 bg-red-100 text-red-700 text-xs border-t border-red-200">
              {error}
            </div>
          )}

          {/* Transcripts/Conversations Section */}
          <div className="flex-1 bg-white chat-container overflow-y-auto">
            <div className="p-4 space-y-4">
              {transcripts.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  Transcripts will appear here when streams are active
                </div>
              ) : (
                transcripts.map((conv, idx) => (
                  <div key={idx} className="space-y-2">
                    {conv.role === 'user' ? (
                      <div className="flex flex-col items-start">
                        <div className="text-xs text-gray-500 font-medium mb-1">
                          🎤 You
                        </div>
                        <div className="bg-blue-100 rounded-lg p-3 text-sm text-gray-800 max-w-[85%]">
                          {conv.text}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <div className="text-xs text-gray-500 font-medium mb-1">
                          📺 Screen
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-800 max-w-[85%]">
                          {conv.text}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
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
            </div>
            <button className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600">
              Exit
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto space-y-4">
              {chatMessages.length === 0 ? (
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
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className="space-y-2">
                    {msg.type === 'user' ? (
                      <div className="flex justify-end">
                        <div className="bg-gray-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-2xl text-sm">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div 
                          className="flex-1 text-gray-800 text-sm leading-relaxed whitespace-pre-line"
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
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask for any session related query, answer, assistance ..."
                    className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-400 bg-white"
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
                  onClick={handleSendMessage}
                  className="p-3 bg-gray-200 rounded-lg hover:bg-gray-300"
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
            className="bg-white border-l border-gray-200 overflow-y-auto"
            style={{ width: `${rightWidth}%` }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Artifacts/Citations</h3>
                <button 
                  onClick={() => setIsArtifactsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {serperResults.length === 0 ? (
                  <p className="text-gray-400 text-xs italic">No citations yet. Citations will appear here when transcripts are processed.</p>
                ) : (
                  serperResults.map((result, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer">
                      <span className="text-xs font-medium text-blue-600">#{idx + 1}</span>
                      <a 
                        href={result.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline break-all flex-1"
                      >
                        {result.title}
                      </a>
                    </div>
                  ))
                )}
              </div>
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
      </div>
    );
  }
