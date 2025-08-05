import React, { useState, useEffect } from "react";
import { User, Play, Pause, Trash2, RefreshCw } from "lucide-react";
import { Modal } from "./Modal";
import { SuccessMessage } from "./SuccessMessage";

export interface ClonedVoice {
  id: string;
  name: string;
  createdAt: string;
  sampleUrl?: string;
  status: "processing" | "ready" | "failed";
}

interface ClonedVoiceSelectorProps {
  selectedVoiceId: string | null;
  onVoiceSelect: (voiceId: string | null) => void;
  onVoiceDelete: (voiceId: string) => void;
  clonedVoices: ClonedVoice[];
  onRefresh: () => Promise<void>;
}

export const ClonedVoiceSelector: React.FC<ClonedVoiceSelectorProps> = ({
  selectedVoiceId,
  onVoiceSelect,
  onVoiceDelete,
  clonedVoices,
  onRefresh,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    voiceId: string;
    voiceName: string;
  }>({
    isOpen: false,
    voiceId: "",
    voiceName: "",
  });

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Error fetching cloned voices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaySample = (voice: ClonedVoice) => {
    if (!voice.sampleUrl) return;

    if (playingVoiceId === voice.id) {
      // Stop current playback
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setPlayingVoiceId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    // Create new audio element
    const audio = new Audio(voice.sampleUrl);
    audio.onended = () => setPlayingVoiceId(null);
    audio.onerror = () => {
      console.error("Error playing audio sample");
      setPlayingVoiceId(null);
    };

    setAudioElement(audio);
    setPlayingVoiceId(voice.id);
    audio.play().catch((error) => {
      console.error("Error playing audio:", error);
      setPlayingVoiceId(null);
    });
  };

  const openDeleteModal = (voiceId: string, voiceName: string) => {
    setDeleteModal({
      isOpen: true,
      voiceId,
      voiceName,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      voiceId: "",
      voiceName: "",
    });
  };

  const confirmDeleteVoice = async () => {
    const { voiceId } = deleteModal;
    console.log("Attempting to delete voice with ID:", voiceId);

    if (!voiceId) {
      console.error("Voice ID is undefined or empty");
      setErrorMessage("Error: Voice ID is missing. Cannot delete voice.");
      setShowErrorMessage(true);
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `https://nsupy9x610.execute-api.ap-south-1.amazonaws.com/dev/delete-voice?voiceId=${voiceId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      console.log("Voice deleted successfully");

      onVoiceDelete(voiceId);
      setSuccessMessage(
        `Voice "${deleteModal.voiceName}" deleted successfully!`
      );
      setShowSuccessMessage(true);
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting voice:", error);
      setErrorMessage(
        `Error deleting voice: ${
          error instanceof Error ? error.message : "Please try again."
        }`
      );
      setShowErrorMessage(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: ClonedVoice["status"]) => {
    switch (status) {
      case "ready":
        return "text-green-600 bg-green-100";
      case "processing":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusText = (status: ClonedVoice["status"]) => {
    switch (status) {
      case "ready":
        return "Ready";
      case "processing":
        return "Processing";
      case "failed":
        return "Failed";
      default:
        return "Unknown";
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
      />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <User className="h-6 w-6 text-purple-600" />
          Cloned Voices
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 text-gray-600 hover:text-purple-600 transition-colors disabled:opacity-50"
          title="Refresh voices"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">Loading voices...</span>
        </div>
      ) : clonedVoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No cloned voices found.</p>
          <p className="text-sm">Record your voice to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* None option */}
          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedVoiceId === null
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => onVoiceSelect(null)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-800">Default Voices</h4>
                <p className="text-sm text-gray-600">Use standard AI voices</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedVoiceId === null && (
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                )}
              </div>
            </div>
          </div>

          {/* Cloned voices */}
          {}
          {clonedVoices.map((voice) => (
            <div
              key={voice.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedVoiceId === voice.id
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300"
              } ${voice.status !== "ready" ? "opacity-60" : ""}`}
              onClick={() =>
                voice.status === "ready" ? onVoiceSelect(voice.id) : undefined
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-800">{voice.name}</h4>
                    {/* <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                        voice.status
                      )}`}
                    >
                      {getStatusText(voice.status)}
                    </span> */}
                  </div>
                  <p className="text-sm text-gray-600">
                    Created: {voice.createdAt}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {voice.status === "ready" && voice.sampleUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySample(voice);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Play sample"
                    >
                      {playingVoiceId === voice.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteModal(voice.id, voice.name);
                    }}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete voice"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {selectedVoiceId === voice.id && voice.status === "ready" && (
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        title="Delete Voice"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the voice{" "}
            <strong>"{deleteModal.voiceName}"</strong>?
          </p>
          <p className="text-sm text-red-600">This action cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={closeDeleteModal}
              disabled={isDeleting}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteVoice}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Deleting..." : "Delete Voice"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
