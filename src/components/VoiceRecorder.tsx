import React, { useState, useRef } from "react";
import { Mic, Square, Play, Pause, Upload, Trash2 } from "lucide-react";
import { SuccessMessage } from "./SuccessMessage";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, name: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceName, setVoiceName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setRecordedAudio(url);
        recordedBlobRef.current = blob;

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Error accessing microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioRef.current && recordedAudio) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const deleteRecording = () => {
    setRecordedAudio(null);
    setIsPlaying(false);
    setRecordingTime(0);
    setVoiceName("");
    recordedBlobRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const uploadVoice = async () => {
    if (!recordedBlobRef.current || !voiceName.trim()) {
      alert("Please provide a voice name and record audio first.");
      return;
    }
    setIsUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append(
        "audio",
        recordedBlobRef.current,
        `${voiceName.trim()}.wav`
      );
      formData.append("name", voiceName.trim());
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        "https://nsupy9x610.execute-api.ap-south-1.amazonaws.com/dev/upload-voice",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      console.log("Voice upload successful:", result);

      onRecordingComplete(recordedBlobRef.current, voiceName.trim());

      // Reset form
      deleteRecording();
      setSuccessMessage(`Voice "${voiceName.trim()}" uploaded successfully!`);
      setShowSuccessMessage(true);

      // Also trigger refresh in parent component to show updated voices
      // The success message will show in both components
    } catch (error) {
      console.error("Error uploading voice:", error);
      setSuccessMessage(
        `Error uploading voice: ${
          error instanceof Error ? error.message : "Please try again."
        }`
      );
      setShowSuccessMessage(true);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 relative">
      <SuccessMessage
        message={successMessage}
        isVisible={showSuccessMessage}
        onClose={() => setShowSuccessMessage(false)}
      />

      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Mic className="h-6 w-6 text-purple-600" />
        Record Your Voice
      </h3>

      <div className="space-y-4">
        {/* Voice Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voice Name
          </label>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="Enter a name for your voice..."
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isRecording}
          />
        </div>

        {/* Recording Controls */}
        <div className="flex flex-col items-center space-y-4">
          {/* Timer */}
          {(isRecording || recordedAudio) && (
            <div className="text-2xl font-mono text-gray-700">
              {formatTime(recordingTime)}
            </div>
          )}

          {/* Recording Button */}
          <div className="flex gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isUploading}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Mic className="h-5 w-5" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Square className="h-5 w-5" />
                Stop Recording
              </button>
            )}
          </div>

          {/* Playback Controls */}
          {recordedAudio && (
            <div className="flex gap-3">
              <button
                onClick={playRecording}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isPlaying ? "Pause" : "Play"}
              </button>

              <button
                onClick={deleteRecording}
                disabled={isUploading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}

          {/* Upload Button */}
          {recordedAudio && (
            <button
              onClick={uploadVoice}
              disabled={!voiceName.trim() || isUploading}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5" />
              {isUploading ? "Uploading..." : "Upload Voice"}
            </button>
          )}
        </div>

        {/* Hidden audio element for playback */}
        {recordedAudio && (
          <audio
            ref={audioRef}
            src={recordedAudio}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}
      </div>
    </div>
  );
};
