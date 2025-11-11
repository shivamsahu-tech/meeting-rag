'use client';
import { useState, useEffect } from 'react';
import { Calendar, Sparkles, Trash2, Info, X, FileText, Check } from 'lucide-react';

interface Document {
  title: string;
  url: string;
}

interface Session {
  id: string;
  title: string;
  documents: Document[];
  createdAt: string;
  lastAccessed: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showNewSessionModal, setShowNewSessionModal] = useState<boolean>(false);
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    // Load documents from localStorage
    const storedDocs = localStorage.getItem('documents');
    if (storedDocs) {
      setDocuments(JSON.parse(storedDocs) as Document[]);
    }

    // Load sessions from localStorage
    const storedSessions = localStorage.getItem('sessions');
    if (storedSessions) {
      setSessions(JSON.parse(storedSessions) as Session[]);
    }
  }, []);

  const handleCreateSession = (): void => {
    if (!sessionTitle.trim()) {
      alert('Please enter a session title');
      return;
    }

    if (selectedDocs.length === 0) {
      alert('Please select at least one document');
      return;
    }

    const newSession: Session = {
      id: Date.now().toString(),
      title: sessionTitle,
      documents: selectedDocs,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
    };

    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    localStorage.setItem('sessions', JSON.stringify(updatedSessions));

    // Redirect to meeting page with session data
    const sessionData = encodeURIComponent(JSON.stringify(newSession));
    window.location.href = `/meeting2?session=${sessionData}`;
  };

  const handleJoinSession = (session: Session): void => {
    // Update last accessed time
    const updatedSessions = sessions.map(s => 
      s.id === session.id 
        ? { ...s, lastAccessed: new Date().toISOString() }
        : s
    );
    setSessions(updatedSessions);
    localStorage.setItem('sessions', JSON.stringify(updatedSessions));

    // Redirect to meeting page
    const sessionData = encodeURIComponent(JSON.stringify(session));
    window.location.href = `/meeting2?session=${sessionData}`;
  };

  const handleDeleteSession = (sessionId: string): void => {
    if (confirm('Are you sure you want to delete this session?')) {
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      localStorage.setItem('sessions', JSON.stringify(updatedSessions));
    }
  };

  const toggleDocumentSelection = (doc: Document): void => {
    setSelectedDocs(prev => {
      const isSelected = prev.some(d => d.url === doc.url);
      if (isSelected) {
        return prev.filter(d => d.url !== doc.url);
      } else {
        return [...prev, doc];
      }
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex-1 bg-gray-50 p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Sessions
        </h1>
        <p className="text-gray-600">
          Review, resume, or start fresh
        </p>
      </div>

      {/* Sessions Library Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Section Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Sessions Library
            </h2>
            <Info className="w-4 h-4 text-gray-400" />
          </div>
          {sessions.length > 0 && (
            <button 
              onClick={() => setShowNewSessionModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              Start Session
            </button>
          )}
        </div>

        {/* Sessions List */}
        <div className="divide-y divide-gray-200">
          {sessions.length === 0 ? (
            <div className="p-12 text-center">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No sessions yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first session to get started
              </p>
              <button
                onClick={() => setShowNewSessionModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Create Session
              </button>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {session.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Created {formatDate(session.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{session.documents.length} document{session.documents.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {session.documents.map((doc, idx) => (
                        <span 
                          key={idx}
                          className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                        >
                          {doc.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleJoinSession(session)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Join Meeting
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Session
              </h2>
              <button
                onClick={() => {
                  setShowNewSessionModal(false);
                  setSessionTitle('');
                  setSelectedDocs([]);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Session Title */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Title
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="Enter session title..."
                  className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Document Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Documents ({selectedDocs.length} selected)
                </label>
                {documents.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No documents available</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Upload documents to your knowledge store first
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc, idx) => {
                      const isSelected = selectedDocs.some(d => d.url === doc.url);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleDocumentSelection(doc)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <FileText className={`w-5 h-5 ${
                                isSelected ? 'text-blue-600' : 'text-gray-400'
                              }`} />
                              <span className={`font-medium ${
                                isSelected ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {doc.title}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewSessionModal(false);
                  setSessionTitle('');
                  setSelectedDocs([]);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!sessionTitle.trim() || selectedDocs.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}