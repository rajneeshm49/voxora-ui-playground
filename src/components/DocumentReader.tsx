import React, { useState, useRef } from "react";
import { FileText, Upload, Volume2, Download, Share2, X } from "lucide-react";
import { SuccessMessage } from "./SuccessMessage";
import { textToSpeech } from "../utils/api";

interface DocumentReaderProps {
  selectedLanguage: string;
  selectedVoice: string;
  rate: number;
  pitch: number;
  ttsEndpoint: "standard" | "cloned";
  selectedClonedVoiceId: string | null;
}

export const DocumentReader: React.FC<DocumentReaderProps> = ({
  selectedLanguage,
  selectedVoice,
  rate,
  pitch,
  ttsEndpoint,
  selectedClonedVoiceId,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [gistText, setGistText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const supportedFormats = [
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".rtf",
    ".odt",
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("File size must be less than 10MB");
        setShowErrorMessage(true);
        return;
      }

      // Check file type
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!supportedFormats.includes(fileExtension)) {
        setErrorMessage(
          `Unsupported file format. Please upload: ${supportedFormats.join(", ")}`
        );
        setShowErrorMessage(true);
        return;
      }

      setSelectedFile(file);
      setExtractedText("");
      setGistText("");
      setAudioUrl(null);
      setIsComplete(false);
      setShowControls(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      // Simulate file input change
      const fakeEvent = {
        target: { files: [file] },
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const processDocument = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setIsProcessing(true);
    setErrorMessage("");

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("document", selectedFile);

      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Call document processing API
      const response = await fetch(
        "https://nsupy9x610.execute-api.ap-south-1.amazonaws.com/dev/process-document",
        {
          method: "POST",
          headers,
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();
      setExtractedText(result.extractedText || "");
      setGistText(result.gist || "");

      setSuccessMessage("Document processed successfully!");
      setShowSuccessMessage(true);
    } catch (error) {
      console.error("Error processing document:", error);
      setErrorMessage(
        `Error processing document: ${
          error instanceof Error ? error.message : "Please try again."
        }`
      );
      setShowErrorMessage(true);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const handleSpeak = async () => {
    if (!gistText.trim()) return;

    if (isSpeaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsSpeaking(false);
      setIsComplete(false);
      setShowControls(false);
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setIsComplete(false);
    setShowControls(false);

    try {
      let audioUrl: string;

      if (ttsEndpoint === "cloned" && selectedClonedVoiceId) {
        // Call cloned TTS API
        const { clonedTextToSpeech } = await import("../utils/api");
        const data = await clonedTextToSpeech(gistText, selectedClonedVoiceId);
        audioUrl = data.audioUrl;
      } else {
        // Call standard TTS API
        const data = await textToSpeech(gistText, selectedVoice, rate, pitch);
        audioUrl = data.audioUrl;
      }

      setAudioUrl(audioUrl);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onloadeddata = () => {
          setIsProcessing(false);
          setIsSpeaking(true);
          audioRef.current?.play();
        };

        audioRef.current.onended = () => {
          setIsSpeaking(false);
          setIsComplete(true);
          setShowControls(true);
        };

        audioRef.current.onerror = () => {
          setErrorMessage("Failed to load audio");
          setShowErrorMessage(true);
          setIsProcessing(false);
          setIsSpeaking(false);
        };

        audioRef.current.load();
      }
    } catch (error: any) {
      console.error("Error:", error);
      setErrorMessage(
        error?.response?.data || "Failed to convert text to speech. Please try again."
      );
      setShowErrorMessage(true);
      setIsProcessing(false);
      setIsSpeaking(false);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const link = document.createElement("a");
      link.href = audioUrl;
      link.download = "document-summary.mp3";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    if (!audioUrl) return;

    const isBlobUrl = audioUrl.startsWith("blob:");

    if (navigator.share && !isBlobUrl) {
      try {
        await navigator.share({
          title: "Document Summary",
          text: "Check out this document summary!",
          url: audioUrl,
        });
      } catch (error: any) {
        if (error.name !== "AbortError") {
          await copyToClipboard();
        }
      }
    } else if (navigator.share && isBlobUrl) {
      try {
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        const file = new File([blob], "document-summary.mp3", { type: "audio/mpeg" });

        await navigator.share({
          title: "Document Summary",
          text: "Check out this document summary!",
          files: [file],
        });
      } catch (error: any) {
        if (error.name !== "AbortError") {
          handleDownload();
          setSuccessMessage("File downloaded! You can now share it manually.");
          setShowSuccessMessage(true);
        }
      }
    } else {
      await copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      if (audioUrl && !audioUrl.startsWith("blob:")) {
        await navigator.clipboard.writeText(audioUrl);
        setSuccessMessage("Audio URL copied to clipboard!");
      } else {
        handleDownload();
        setSuccessMessage("File downloaded! You can now share it manually.");
      }
      setShowSuccessMessage(true);
    } catch (error) {
      handleDownload();
      setSuccessMessage("File downloaded! You can now share it manually.");
      setShowSuccessMessage(true);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setExtractedText("");
    setGistText("");
    setAudioUrl(null);
    setIsComplete(false);
    setShowControls(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <SuccessMessage
        message={successMessage}
        isVisible={showSuccessMessage}
        onClose={() => setShowSuccessMessage(false)}
      />

      <SuccessMessage
        message={errorMessage}
        isVisible={showErrorMessage}
        onClose={() => setShowErrorMessage(false)}
        type="error"
      />

      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <FileText className="h-6 w-6 text-purple-600" />
        Document Reader
      </h3>

      <p className="text-gray-600 mb-6">
        Upload a document and get an AI-generated summary read aloud to you.
      </p>

      {/* File Upload Area */}
      <div className="mb-6">
        {!selectedFile ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop your document here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supported formats: {supportedFormats.join(", ")}
            </p>
            <p className="text-xs text-gray-400">Maximum file size: 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={supportedFormats.join(",")}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-purple-600" />
              <div>
                <p className="font-medium text-gray-800">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Process Button */}
      {selectedFile && !gistText && (
        <div className="mb-6 text-center">
          <button
            onClick={processDocument}
            disabled={isUploading || isProcessing}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            <FileText className="h-5 w-5" />
            {isUploading || isProcessing ? "Processing..." : "Process Document"}
          </button>
        </div>
      )}

      {/* Document Summary */}
      {gistText && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">
            Document Summary
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
            <p className="text-gray-700 leading-relaxed">{gistText}</p>
          </div>

          {/* TTS Controls */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <audio ref={audioRef} className="hidden" />

            <button
              onClick={handleSpeak}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                isProcessing
                  ? "bg-gray-400 cursor-not-allowed"
                  : isSpeaking
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              <Volume2 className="h-5 w-5" />
              {isProcessing ? "Converting..." : isSpeaking ? "Stop" : "Read Summary"}
            </button>

            {showControls && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDownload}
                  disabled={!isComplete || !audioUrl}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    isComplete && audioUrl
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Download className="h-5 w-5" />
                  Download
                </button>

                <button
                  onClick={handleShare}
                  disabled={!isComplete || !audioUrl}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    isComplete && audioUrl
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Share2 className="h-5 w-5" />
                  Share
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Extracted Text (Hidden by default, can be shown for debugging) */}
      {extractedText && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
            View Extracted Text
          </summary>
          <div className="mt-3 bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {extractedText}
            </p>
          </div>
        </details>
      )}
    </div>
  );
};