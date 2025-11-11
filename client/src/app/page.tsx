'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/hooks/useRedux';

export default function HomePage() {
  const router = useRouter();
  const [showNotice, setShowNotice] = useState(true);




  const handleContinue = () => {
    setShowNotice(false);
    router.replace('/upload-file');
  };

  if (!showNotice) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="bg-white border border-gray-200 shadow-xl rounded-2xl w-full max-w-3xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            ⚙️ Meeting-RAG MVP Project Notice
          </h1>
          <p className="text-gray-600 text-sm">
            Please read carefully before continuing
          </p>
        </div>

        {/* Intro */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 mb-5">
          <p className="text-gray-700 text-sm leading-relaxed">
            This is an <strong>MVP project</strong> that is currently running on
            a free-tier server environment. Our vector embedding, image
            summarization, and LLM APIs, along with storage services like
            Pinecone and Cloudinary, are all operating under free limits. Because
            of that, <strong className=' text-red-700' >please avoid uploading large or heavy PDF files</strong>{' '}
            to maintain stability and prevent processing delays.
          </p>
        </div>

        {/* Features */}
        <div className="mb-5">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
            🌟 Key Features
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm leading-relaxed">
            <li>
              This application allows you to <strong>upload multiple documents</strong>{' '}
              at once. Each PDF is processed internally through multiple steps —
              including <strong>text extraction</strong>,{' '}
              <strong>image extraction</strong>,{' '}
              <strong>image upload to Cloudinary</strong>,{' '}
              <strong>chunking</strong>, and{' '}
              <strong>embedding generation using the gemini-embedding-001 model</strong>.
            </li>
            <li>
              The extracted text embeddings, metadata, and image URLs are
              securely stored in <strong>Pinecone</strong> for efficient semantic
              retrieval during query time.
            </li>
            <li>
              After processing, you can <strong>join a meeting session</strong>{' '}
              where someone can ask you questions. During the meeting, you can
              share your browser tab’s screen, and the website automatically
              captures the tab’s audio stream.
            </li>
            <li>
              The captured audio is transmitted in real-time to the backend via{' '}
              <strong>WebSocket</strong>. The backend then connects to{' '}
              <strong>AssemblyAI’s streaming transcription API</strong>, which
              transcribes the audio live.
            </li>
            <li>
              When the system detects a <strong>2-second pause</strong> in speech,
              the most recent transcription segment is sent for intelligent
              processing. It is first <strong>embedded</strong> and then used to
              perform <strong>cosine similarity</strong> search against the
              stored document vectors in Pinecone.
            </li>
            <li>
              The top relevant chunks (both text and image summaries) are passed
              to an <strong>LLM</strong>, which generates a contextual and
              structured <strong>HTML response</strong>. The response may also
              include relevant image URLs for visual context.
            </li>
            <li>
              The system additionally uses the <strong>Serper API</strong> to
              perform a lightweight web search, retrieving external snippets to
              enrich the final answer if needed.
            </li>
            <li>
              Finally, everything — the transcription, web context, and document
              knowledge — is sent back to the frontend and displayed instantly.
              This ensures that, <strong>without any manual effort</strong>, the
              system automatically fetches and presents the most relevant
              information to answer your question comprehensively.
            </li>
            <li>
              Your data will be automatically deleted from pinecone after 10 minutes of upload.
            </li>
          </ul>
        </div>

        {/* Links */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 text-sm text-gray-700">
          <p className="mb-2">
            📂 <strong>GitHub Repository:</strong>{' '}
            <a
              href="https://github.com/shivamsahu-tech/meeting-rag"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              github.com/shivamsahu-tech/meeting-rag
            </a>
          </p>
          <p>
            🎥 <strong>Demo Video:</strong>{' '}
            <a
              href="https://drive.google.com/file/d/1Rb2EUpAvPW76HS4v95NpJkHZrPaoXXw7/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              Watch on Google Drive
            </a>
          </p>
        </div>

        {/* Technical Summary */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5 text-sm text-gray-700 leading-relaxed">
          <p>
            🔧 <strong>Technical Summary:</strong> This project demonstrates a
            complete Retrieval-Augmented Generation (RAG) workflow with real-time
            transcription, semantic retrieval, and LLM integration. It combines
            <strong> AssemblyAI</strong> for audio processing,{' '}
            <strong>Google Gemini embeddings</strong> for vector representation,
            <strong> Pinecone</strong> for similarity search, and{' '}
            <strong>Serper API</strong> for dynamic web context retrieval.
          </p>
        </div>

        {/* Notice */}
        <div className="text-gray-600 text-sm mb-6 leading-relaxed">
          ⚠️ Since this project relies on free-tier APIs and storage, you may
          experience slower response times or temporary unavailability during
          high usage. Please be patient and considerate while testing.
        </div>

        <div className="text-gray-600 text-sm mb-6 leading-relaxed">
          ⚠️ only works on desktop browsers that support screen and audio
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            className="px-6 sm:px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all"
          >
            Okay, Continue →
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500">
          Built with ❤️ by{' '}
          <a
            href="https://github.com/shivamsahu-tech"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-blue-600"
          >
            Shivam Sahu
          </a>
        </div>
      </div>
    </div>
  );
}
