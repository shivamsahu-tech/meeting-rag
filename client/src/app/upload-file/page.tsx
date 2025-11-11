"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, XCircle, Loader2, Trash } from "lucide-react";

interface UploadedFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [indexName, setIndexName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const API_URL = 'http://localhost:8000';
  useEffect(() => {
    if (window.innerWidth < 900) {
      alert("Please use a larger screen (laptop or desktop).");
      router.push("/"); 
    }
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter((f) => {
        if (f.type !== "application/pdf") {
          setError("Only PDF files are allowed");
          return false;
        }
        if (f.size > 10 * 1024 * 1024) {
          setError("Each file must be smaller than 10MB");
          return false;
        }
        return true;
      });

      setFiles((prev) => [
        ...prev,
        ...validFiles.map((f) => ({
          file: f,
          progress: 0,
          status: "pending" as const,
        })),
      ]);
      setError(null);
    }
  };

  const uploadAll = async () => {
    setUploading(true);
    setError(null);

    // Keep a local copy of index name for all uploads in this session
    let currentIndexName = indexName;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.status === "success") continue;

      try {
        setFiles(prev =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "uploading", progress: 0 } : f))
        );

        const formData = new FormData();
        formData.append("file", file.file);

        // Always use latest known index name
        if (currentIndexName) formData.append("index_name", currentIndexName);

        const res = await fetch(`${API_URL}/upload`, {
          method: "POST",
          body: formData,
        });


        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Upload failed");
        }

        const data = await res.json();

        // If backend returns a new index name, update both local and React state
        if (!currentIndexName && data.index_name) {
          currentIndexName = data.index_name;
          setIndexName(data.index_name);
        }

        setFiles(prev =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "success", progress: 100 } : f
          )
        );

      } catch (err) {
        console.error("Error uploading file:", err);
        setFiles(prev =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error",
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : f
          )
        );
      }
    }

    setUploading(false);  
};


  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const startMeeting = () => {
    if (indexName) {
      router.push(`/meeting?index_name=${indexName}`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-4 mb-4">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Upload PDFs
          </h1>
          <p className="text-gray-600 text-center mt-2">
            Upload one or more PDFs to process together
          </p>
        </div>

        {/* File Input */}
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all mb-6"
        >
          <Upload className="w-10 h-10 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 text-center">
            <span className="font-semibold text-indigo-600">Click to upload</span> or drag multiple PDFs
          </p>
          <input
            id="file-upload"
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate w-48">{f.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(f.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {f.status === "uploading" && (
                      <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${f.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {f.status === "success" && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
                {f.status === "error" && (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                {f.status === "pending" && (
                  <button onClick={() => removeFile(i)}>
                    <Trash className="w-5 h-5 text-gray-400 hover:text-red-500 transition-colors" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={uploadAll}
            disabled={uploading || files.length === 0}
            className={`flex-1 px-6 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center ${
              uploading || files.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload PDFs"
            )}
          </button>

          <button
            onClick={startMeeting}
            disabled={!indexName}
            className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
              indexName
                ? "bg-green-500 text-white hover:bg-green-600 shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Start Meeting
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-6 border-t border-gray-200 pt-4">
          Supported format: PDF only • Max 10MB each
        </p>
      </div>
    </div>
  );
}
