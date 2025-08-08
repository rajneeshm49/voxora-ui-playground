import React, { useState, useRef, useEffect } from "react";
import {
  Volume2,
  Download,
  Share2,
  Settings,
  RefreshCw,
  Globe2,
  Mic,
  User,
  LogIn,
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { AuthModal } from "./components/AuthModal";
import { UserMenu } from "./components/UserMenu";
import { VoiceRecorder } from "./components/VoiceRecorder";
import {
  ClonedVoiceSelector,
  ClonedVoice,
} from "./components/ClonedVoiceSelector";
import {
  textToSpeech,
  clonedTextToSpeech,
  fetchClonedVoices as apiFetchClonedVoices,
  uploadVoice as apiUploadVoice,
  deleteVoice as apiDeleteVoice,
} from "./utils/api";
import {
  SuccessMessage,
  SuccessMessageProps,
} from "./components/SuccessMessage";
import { AxiosError } from "axios";

// Language and voice configurations
type LanguageKey =
  | "en-US"
  | "es-ES"
  | "fr-FR"
  | "de-DE"
  | "it-IT"
  | "pt-BR"
  | "ru-RU"
  | "ja-JP"
  | "ko-KR"
  | "zh-CN";

interface Voice {
  name: string;
  value: string;
  engine: "standard" | "neural";
}

interface Language {
  name: string;
  voices: Voice[];
}

const LANGUAGES: Record<LanguageKey, Language> = {
  "en-US": {
    name: "English (US)",
    voices: [
      { name: "Joanna (Female)", value: "Joanna", engine: "neural" },
      { name: "Matthew (Male)", value: "Matthew", engine: "neural" },
      { name: "Amy (Female)", value: "Amy", engine: "neural" },
      { name: "Brian (Male)", value: "Brian", engine: "neural" },
      { name: "Emma (Female)", value: "Emma", engine: "neural" },
      { name: "Justin (Male)", value: "Justin", engine: "neural" },
      { name: "Kendra (Female)", value: "Kendra", engine: "neural" },
      { name: "Kimberly (Female)", value: "Kimberly", engine: "neural" },
      { name: "Salli (Female)", value: "Salli", engine: "neural" },
      { name: "Joey (Male)", value: "Joey", engine: "neural" },
      { name: "Ivy (Female)", value: "Ivy", engine: "neural" },
    ],
  },
  "es-ES": {
    name: "Spanish (Spain)",
    voices: [
      { name: "Conchita (Female)", value: "Conchita", engine: "neural" },
      { name: "Enrique (Male)", value: "Enrique", engine: "neural" },
      { name: "Lucia (Female)", value: "Lucia", engine: "neural" },
    ],
  },
  "fr-FR": {
    name: "French (France)",
    voices: [
      { name: "Celine (Female)", value: "Celine", engine: "neural" },
      { name: "Mathieu (Male)", value: "Mathieu", engine: "neural" },
      { name: "Lea (Female)", value: "Lea", engine: "neural" },
    ],
  },
  "de-DE": {
    name: "German (Germany)",
    voices: [
      { name: "Marlene (Female)", value: "Marlene", engine: "neural" },
      { name: "Hans (Male)", value: "Hans", engine: "neural" },
      { name: "Vicki (Female)", value: "Vicki", engine: "neural" },
    ],
  },
  "it-IT": {
    name: "Italian (Italy)",
    voices: [
      { name: "Carla (Female)", value: "Carla", engine: "neural" },
      { name: "Giorgio (Male)", value: "Giorgio", engine: "neural" },
      { name: "Bianca (Female)", value: "Bianca", engine: "neural" },
    ],
  },
  "pt-BR": {
    name: "Portuguese (Brazil)",
    voices: [
      { name: "Vitoria (Female)", value: "Vitoria", engine: "neural" },
      { name: "Ricardo (Male)", value: "Ricardo", engine: "neural" },
      { name: "Camila (Female)", value: "Camila", engine: "neural" },
    ],
  },
  "ru-RU": {
    name: "Russian (Russia)",
    voices: [
      { name: "Tatyana (Female)", value: "Tatyana", engine: "neural" },
      { name: "Maxim (Male)", value: "Maxim", engine: "neural" },
    ],
  },
  "ja-JP": {
    name: "Japanese (Japan)",
    voices: [
      { name: "Mizuki (Female)", value: "Mizuki", engine: "neural" },
      { name: "Takumi (Male)", value: "Takumi", engine: "neural" },
    ],
  },
  "ko-KR": {
    name: "Korean (South Korea)",
    voices: [{ name: "Seoyeon (Female)", value: "Seoyeon", engine: "neural" }],
  },
  "zh-CN": {
    name: "Chinese (Mandarin)",
    voices: [{ name: "Zhiyu (Female)", value: "Zhiyu", engine: "neural" }],
  },
};

function App() {
  const { user, isLoading: authLoading } = useAuth();
  const [text, setText] = useState("");
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageKey>("en-US");
  const [selectedVoice, setSelectedVoice] = useState("Joanna");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  // const [error, setError] = useState("");
  const [currentEngine, setCurrentEngine] = useState<"standard" | "neural">(
    "neural"
  );
  const [activeTab, setActiveTab] = useState<"tts" | "record" | "voices">(
    "tts"
  );
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [selectedClonedVoiceId, setSelectedClonedVoiceId] = useState<
    string | null
  >(null);
  const [useClonedVoice, setUseClonedVoice] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [type, setSuccessMessageType] = useState<"success" | "error">(
    "success"
  );
  const [ttsEndpoint, setTtsEndpoint] = useState<"standard" | "cloned">(
    "standard"
  );

  const audioRef = useRef<HTMLAudioElement>(null);
  const maxCharacters = 250;

  // Fetch cloned voices on component mount
  useEffect(() => {
    if (user) {
      fetchClonedVoices();
    }
  }, [user]);

  const fetchClonedVoices = async () => {
    console.log("user", user);
    if (!user) return;

    try {
      const data = await apiFetchClonedVoices("cloned");
      console.log("API Response:", data);

      // Transform the API response to match our interface
      const transformedVoices: ClonedVoice[] = data.voices.map(
        (voice: any) => ({
          id: voice.voice_id,
          name: voice.name,
          createdAt: voice.createdAt,
          status: voice.status || "ready",
        })
      );
      setClonedVoices(transformedVoices);

      // If we have ready voices and none is selected, select the first one
      const readyVoices = transformedVoices.filter(
        (voice) => voice.status === "ready"
      );
      if (readyVoices.length > 0 && !selectedClonedVoiceId) {
        setSelectedClonedVoiceId(readyVoices[0].id);
      }
    } catch (error) {
      console.error("Error fetching cloned voices:", error);
    }
  };

  const findEngine = (voiceValue: string) => {
    for (const lang of Object.values(LANGUAGES)) {
      const voice = lang.voices.find((v) => v.value === voiceValue);
      if (voice) {
        setCurrentEngine(voice.engine);
        return;
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length <= maxCharacters) {
      setText(newText);
      setErrorMessage("");
      // setError("");
    } else {
      setErrorMessage(`Text exceeds ${maxCharacters} characters`);
      setShowErrorMessage(true);
      setSuccessMessageType("error");
    }
  };

  const handleSpeak = async () => {
    if (!text.trim()) return;

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

    // Require login for cloned TTS endpoint
    if (ttsEndpoint === "cloned" && !user) {
      setShowAuthModal(true);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setIsComplete(false);
    setShowControls(false);

    let audioUrl: string;

    try {
      if (ttsEndpoint === "cloned" && selectedClonedVoiceId) {
        // Call cloned TTS API
        const data = await clonedTextToSpeech(text, selectedClonedVoiceId);
        audioUrl = data.audioUrl;
      } else {
        // Call standard TTS API
        const data = await textToSpeech(text, selectedVoice, rate, pitch);
        console.log("data", data);
        audioUrl = data.audioUrl;
      }

      setAudioUrl(audioUrl);
      console.log(audioRef.current, "audioRef.current");
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        console.log("Setting audio src to:", audioUrl);
        audioRef.current.onloadeddata = () => {
          console.log("Audio loaded successfully");
          setIsLoading(false);
          setIsSpeaking(true);
          audioRef.current?.play();
        };

        audioRef.current.onended = () => {
          console.log("Audio playback ended");
          setIsSpeaking(false);
          setIsComplete(true);
          setShowControls(true);
        };

        audioRef.current.onerror = () => {
          console.error("Audio element error");
          setErrorMessage("Failed to load audio");
          setIsLoading(false);
          setIsSpeaking(false);
        };

        // Try to load the audio
        audioRef.current.load();
      }
    } catch (error: any) {
      console.error("Error:", error);
      setErrorMessage(
        `${error?.response?.data}` ||
          `Failed to convert text to speech. Please try again.`
      );
      setShowErrorMessage(true);
      setSuccessMessageType("error");
      setIsLoading(false);
      setIsSpeaking(false);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const link = document.createElement("a");
      link.href = audioUrl;
      link.download = "speech.mp3";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    if (!audioUrl) return;

    // Check if the URL is a blob URL (local to browser)
    const isBlobUrl = audioUrl.startsWith("blob:");

    if (navigator.share && !isBlobUrl) {
      // For regular URLs, use native sharing
      try {
        await navigator.share({
          title: "Generated Speech",
          text: "Check out this generated speech!",
          url: audioUrl,
        });
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error sharing:", error);
          // Fallback to clipboard
          await copyToClipboard();
        }
      }
    } else if (navigator.share && isBlobUrl) {
      // For blob URLs, we need to share the file directly
      try {
        // Convert blob URL back to blob
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        const file = new File([blob], "speech.mp3", { type: "audio/mpeg" });

        await navigator.share({
          title: "Generated Speech",
          text: "Check out this generated speech!",
          files: [file],
        });
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error sharing file:", error);
          // Fallback to download
          handleDownload();
          setSuccessMessage("File downloaded! You can now share it manually.");
          setShowSuccessMessage(true);
          setSuccessMessageType("success");
        }
      }
    } else {
      // Fallback: copy URL to clipboard or download
      await copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      if (audioUrl && !audioUrl.startsWith("blob:")) {
        await navigator.clipboard.writeText(audioUrl);
        setSuccessMessage("Audio URL copied to clipboard!");
      } else {
        // For blob URLs, we can't copy the URL, so download instead
        handleDownload();
        setSuccessMessage("File downloaded! You can now share it manually.");
      }
      setShowSuccessMessage(true);
      setSuccessMessageType("success");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      // Final fallback - just download
      handleDownload();
      setSuccessMessage("File downloaded! You can now share it manually.");
      setShowSuccessMessage(true);
      setSuccessMessageType("success");
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob, name: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("audio", audioBlob, `${name}.wav`);
      formData.append("name", name);

      const result = await apiUploadVoice(formData);
      console.log("Voice upload successful:", result);

      // Refresh the cloned voices list
      await fetchClonedVoices();

      // Switch to voices tab to show the uploaded voice
      setActiveTab("voices");
    } catch (error) {
      console.error("Error uploading voice:", error);
      alert("Failed to upload voice. Please try again.");
    }
  };

  const handleClonedVoiceSelect = (voiceId: string | null) => {
    setSelectedClonedVoiceId(voiceId);

    if (voiceId) {
      // When a cloned voice is selected, switch to the cloned TTS endpoint
      setTtsEndpoint("cloned");
    } else {
      // When no cloned voice is selected, switch back to the standard TTS endpoint
      // and reset the standard voice to a default (e.g., Joanna)
      setTtsEndpoint("standard");
      setSelectedVoice("Joanna");
    }

    // Always switch to the TTS tab when a voice is selected or deselected
    setActiveTab("tts");
  };

  const handleClonedVoiceDelete = async (voiceId: string) => {
    if (!user) return;

    try {
      await apiDeleteVoice(voiceId);

      // Remove the voice from local state
      setClonedVoices((prev) => prev.filter((voice) => voice.id !== voiceId));

      // If the deleted voice was selected, clear the selection and switch to standard
      if (selectedClonedVoiceId === voiceId) {
        setSelectedClonedVoiceId(null);
        setTtsEndpoint("standard");
        setSelectedVoice("Joanna"); // Reset to a default standard voice
      }
    } catch (error) {
      console.error("Error deleting voice:", error);
      alert("Failed to delete voice. Please try again.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header Section */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Free Text to Speech Converter
              </h1>
              <p className="text-gray-600">
                Convert your text to speech instantly using your own voice
              </p>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Section */}
      <main className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-8 border border-gray-100">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("tts")}
              className={`flex-1 px-6 py-4 text-center font-medium transition-all duration-200 ${
                activeTab === "tts"
                  ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <Volume2 className="h-5 w-5 mx-auto mb-1" />
              Text to Speech
            </button>

            <button
              onClick={() => {
                if (!user) {
                  setShowAuthModal(true);
                } else {
                  setActiveTab("record");
                }
              }}
              className={`flex-1 px-6 py-4 text-center font-medium transition-all duration-200 ${
                activeTab === "record"
                  ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <Mic className="h-5 w-5 mx-auto mb-1" />
              Record Voice
              {!user && (
                <span className="block text-xs text-gray-500">
                  Login Required
                </span>
              )}
            </button>

            <button
              onClick={() => {
                if (!user) {
                  setShowAuthModal(true);
                } else {
                  setActiveTab("voices");
                }
              }}
              className={`flex-1 px-6 py-4 text-center font-medium transition-all duration-200 ${
                activeTab === "voices"
                  ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <User className="h-5 w-5 mx-auto mb-1" />
              My Voices
              {!user && (
                <span className="block text-xs text-gray-500">
                  Login Required
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Features</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>
              <strong>Natural-Sounding Voices:</strong> High-quality AI voices
              for clear, natural-sounding speech.
            </li>
            <li>
              <strong>Voice Cloning:</strong> Clone your own voice for a
              personalized text-to-speech experience.
            </li>
            <li>
              <strong>Download and Share:</strong> Download your generated
              speech as an MP3 file and share it with others.
            </li>
            <li>
              <strong>No Login Required:</strong> Use the standard
              text-to-speech features without creating an account.
            </li>
            <li>
              <strong>Multiple Languages:</strong> Support for a wide variety of
              languages and accents.
            </li>
          </ul>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            How it Works
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>
              <strong>Enter Text:</strong> Type or paste the text you want to
              convert into the text box.
            </li>
            <li>
              <strong>Choose a Voice:</strong> Select from a wide range of
              standard voices or use your own cloned voice.
            </li>
            <li>
              <strong>Generate Speech:</strong> Click the "Speak" button to
              generate the audio.
            </li>
            <li>
              <strong>Download and Share:</strong> Once the audio is generated,
              you can download it as an MP3 file or share it with others.
            </li>
          </ol>
        </div>

        <div className="relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md z-10 p-4">
            <SuccessMessage
              message={successMessage}
              isVisible={showSuccessMessage}
              onClose={() => setShowSuccessMessage(false)}
            />
            <SuccessMessage
              message={errorMessage}
              isVisible={showErrorMessage}
              onClose={() => setShowErrorMessage(false)}
              type={type}
            />
          </div>
        </div>
        {activeTab === "tts" && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            {/* TTS Endpoint Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                TTS Service
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="ttsEndpoint"
                    value="standard"
                    checked={ttsEndpoint === "standard"}
                    onChange={(e) => {
                      setTtsEndpoint(e.target.value as "standard" | "cloned");
                      if (e.target.value === "standard") {
                        setSelectedClonedVoiceId(null);
                        setSelectedVoice("Joanna");
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Standard TTS</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="ttsEndpoint"
                    value="cloned"
                    checked={ttsEndpoint === "cloned"}
                    onChange={(e) => {
                      if (!user) {
                        setShowAuthModal(true);
                        return;
                      }
                      setTtsEndpoint(e.target.value as "standard" | "cloned");
                      // Auto-select first available cloned voice
                      const readyVoices = clonedVoices.filter(
                        (voice) => voice.status === "ready"
                      );
                      if (readyVoices.length > 0) {
                        setSelectedClonedVoiceId(readyVoices[0].id);
                        // Don't set selectedVoice for cloned voices
                      }
                    }}
                    disabled={
                      !user ||
                      clonedVoices.filter((voice) => voice.status === "ready")
                        .length === 0
                    }
                    className="mr-2"
                  />
                  <span
                    className={`${
                      !user ||
                      clonedVoices.filter((voice) => voice.status === "ready")
                        .length === 0
                        ? "text-gray-400"
                        : "text-gray-700"
                    }`}
                  >
                    Cloned Voice TTS
                    {!user && " (Login Required)"}
                    {user &&
                      clonedVoices.filter((voice) => voice.status === "ready")
                        .length === 0 &&
                      " (No voices available)"}
                  </span>
                </label>
              </div>
            </div>

            <textarea
              className="w-full h-40 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="Enter your text here..."
              value={text}
              onChange={handleChange}
            />

            <div
              className={`${
                text.length > maxCharacters ? "text-red-500" : "text-gray-500"
              }`}
            >
              {text.length} / {maxCharacters}
            </div>

            {/* Voice Controls */}
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Language selector - only for standard TTS */}
                {ttsEndpoint === "standard" && (
                  <div className="flex items-center gap-2">
                    <Globe2 className="h-5 w-5 text-gray-600" />
                    <select
                      className="w-full sm:flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={selectedLanguage}
                      onChange={(e) =>
                        setSelectedLanguage(e.target.value as LanguageKey)
                      }
                    >
                      {Object.entries(LANGUAGES).map(([code, lang]) => (
                        <option key={code} value={code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Voice selector */}
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <select
                    className={`${
                      ttsEndpoint === "standard" ? "flex-1" : "w-full"
                    } p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    value={
                      ttsEndpoint === "cloned"
                        ? selectedClonedVoiceId || ""
                        : selectedVoice
                    }
                    onChange={(e) => {
                      if (ttsEndpoint === "cloned") {
                        setSelectedClonedVoiceId(e.target.value);
                      } else {
                        setSelectedVoice(e.target.value);
                        findEngine(e.target.value);
                      }
                    }}
                  >
                    {ttsEndpoint === "cloned"
                      ? clonedVoices
                          .filter((voice) => voice.status === "ready")
                          .map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name}
                            </option>
                          ))
                      : LANGUAGES[selectedLanguage].voices.map((voice) => (
                          <option key={voice.value} value={voice.value}>
                            {voice.name}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              {/* Rate and Pitch controls */}
              {ttsEndpoint === "standard" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <RefreshCw className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-700">Rate: {rate}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <Volume2 className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-700">Pitch: {pitch}</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={pitch}
                      onChange={(e) => setPitch(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col items-center gap-4">
              <audio ref={audioRef} className="hidden" />

              <button
                onClick={handleSpeak}
                disabled={isLoading || text.length === 0 || errorMessage !== ""}
                className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
                  isLoading || text.length === 0 || errorMessage !== ""
                    ? "bg-gray-400 cursor-not-allowed"
                    : isSpeaking
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                <Volume2 className="h-5 w-5" />
                {isLoading ? "Converting..." : isSpeaking ? "Stop" : "Speak"}
              </button>

              {showControls && (
                <div className="w-full space-y-4">
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
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "record" &&
          (user ? (
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <Mic className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Sign In Required
              </h3>
              <p className="text-gray-600 mb-4">
                Please sign in to record and upload your voice
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Sign In
              </button>
            </div>
          ))}

        {activeTab === "voices" &&
          (user ? (
            <ClonedVoiceSelector
              selectedVoiceId={selectedClonedVoiceId}
              onVoiceSelect={handleClonedVoiceSelect}
              onVoiceDelete={handleClonedVoiceDelete}
              clonedVoices={clonedVoices}
              onRefresh={fetchClonedVoices}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Sign In Required
              </h3>
              <p className="text-gray-600 mb-4">
                Please sign in to view and manage your cloned voices
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Sign In
              </button>
            </div>
          ))}
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

export default App;
