"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (selectedFile.type !== "application/pdf") {
        setError("Please select a valid PDF file");
        setFile(null);
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const uploadPDF = async () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${res.statusText}`);
      }

      const data = await res.json();
      setSuccess(true);
      
      setTimeout(() => {
        router.push(`/meeting?index_name=${data.index_name}`);
      }, 1000);
    } catch (err) {
      console.error("Error uploading PDF:", err);
      setError(err instanceof Error ? err.message : "Failed to upload PDF. Please try again.");
      setUploadProgress(0);
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    setUploading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-4 mb-4">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Upload PDF
          </h1>
          <p className="text-gray-600 text-center mt-2">
            Upload your PDF document for processing
          </p>
        </div>

        {/* File Input Area */}
        <div className="mb-6">
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              file
                ? "border-green-400 bg-green-50"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100"
            }`}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <FileText className="w-12 h-12 text-green-500 mb-2" />
                <p className="text-sm font-medium text-gray-700 text-center px-4">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF (max 10MB)
                </p>
              </div>
            )}
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm font-medium text-indigo-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <XCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">Upload successful! Redirecting...</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {file && !uploading && !success && (
            <button
              onClick={resetUpload}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all duration-200"
            >
              Clear
            </button>
          )}
          <button
            onClick={uploadPDF}
            disabled={!file || uploading || success}
            className={`flex-1 px-6 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center ${
              !file || uploading || success
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Complete
              </>
            ) : (
              "Upload & Process"
            )}
          </button>
        </div>

        {/* File Requirements */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Supported format: PDF only • Maximum file size: 10MB
          </p>
        </div>
      </div>
    </div>
  );
}