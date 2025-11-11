'use client';

import { BookOpen, CreditCard, FileText, Info, MoreHorizontal, X, Upload } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Document {
  title: string;
  url: string;
}

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState('documents');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // Load documents from localStorage on mount
  useEffect(() => {
    const storedDocs = localStorage.getItem('documents');
    if (storedDocs) {
      setDocuments(JSON.parse(storedDocs));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }
    if (!uploadTitle.trim()) {
      setError('Please enter a title');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadTitle);

      // Get existing index names from localStorage
      const indexNamePdf = localStorage.getItem('index_name_pdf');
      const indexNameOcr = localStorage.getItem('index_name_ocr');
      
      if (indexNamePdf) {
        formData.append('index_name_pdf', indexNamePdf);
      }
      if (indexNameOcr) {
        formData.append('index_name_ocr', indexNameOcr);
      }

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Store index names in localStorage
      if (data.index_name_pdf) {
        localStorage.setItem('index_name_pdf', data.index_name_pdf);
      }
      if (data.index_name_ocr) {
        localStorage.setItem('index_name_ocr', data.index_name_ocr);
      }

      // Add new document to the list
      const newDoc: Document = {
        title: uploadTitle,
        url: data.pdf_url,
      };

      const updatedDocs = [...documents, newDoc];
      setDocuments(updatedDocs);
      localStorage.setItem('documents', JSON.stringify(updatedDocs));

      // Reset form and close modal
      setUploadTitle('');
      setSelectedFile(null);
      setShowUploadModal(false);
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentClick = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Knowledge Base
        </h1>
        <p className="text-gray-600">
          Store and manage all your prep materials in one place
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-3 px-1 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'documents'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Documents
            </button>
            <button
              onClick={() => setActiveTab('cue-card')}
              className={`pb-3 px-1 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'cue-card'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Cue Card
            </button>
          </div>
        </div>
      </div>

      {/* Document Library Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Section Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Document Library
            </h2>
            <Info className="w-4 h-4 text-gray-400" />
          </div>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Upload Document
          </button>
        </div>

        {/* Description */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            We will use the files to provide instant, context-aware assistance during meetings.
          </p>
        </div>

        {/* Documents List */}
        <div className="divide-y divide-gray-200">
          {documents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No documents uploaded yet
            </div>
          ) : (
            documents.map((doc, index) => (
              <div
                key={index}
                onClick={() => handleDocumentClick(doc.url)}
                className="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
              >
                {/* Left Section: Icon and Info */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Document Icon */}
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>

                  {/* Document Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {doc.title}
                    </h3>
                  </div>

                  {/* URL Preview */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 truncate">
                      {doc.url}
                    </p>
                  </div>
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center ml-6">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add delete functionality here if needed
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Upload Document</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadTitle('');
                  setSelectedFile(null);
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Title Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Enter document title"
                  className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* File Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOC, DOCX up to 10MB
                    </p>
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadTitle('');
                  setSelectedFile(null);
                  setError('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}