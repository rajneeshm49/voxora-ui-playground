import React, { useState, useRef } from "react";
import {
  Volume2,
  Pause,
  Play,
  Settings,
  RefreshCw,
  Download,
  Share2,
  Globe2,
  Mic,
  User,
} from "lucide-react";
import RecordRTC from "recordrtc";
import axios from "axios";
import { VoiceRecorder } from "./components/VoiceRecorder";
import { ClonedVoiceSelector, ClonedVoice } from "./components/ClonedVoiceSelector";

// Define available languages and their voices
const LANGUAGES = {
  "en-US": {
    name: "English (US)",
    voices: [
      { name: "Joanna", value: "Joanna" },
      { name: "Matthew", value: "Matthew", engine: ["standard", "neural"] },
      { name: "Ivy", value: "Ivy", engine: ["standard", "neural"] },
      { name: "Justin", value: "Justin", engine: ["standard", "neural"] },
      { name: "Kendra", value: "Kendra", engine: ["standard", "neural"] },
      { name: "Kimberly", value: "Kimberly", engine: ["standard", "neural"] },
      { name: "Salli", value: "Salli", engine: ["standard", "neural"] },
      { name: "Joey", value: "Joey", engine: ["standard", "neural"] },
      { name: "Kevin", value: "Kevin", engine: ["standard", "neural"] },
      { name: "Ruth", value: "Ruth", engine: ["standard", "neural"] },
      { name: "Stephen", value: "Stephen", engine: ["standard", "neural"] },
    ],
  },
  "en-GB": {
    name: "English (British)",
    voices: [
      { name: "Amy", value: "Amy", engine: ["standard", "neural"] },
      { name: "Emma", value: "Emma", engine: ["standard", "neural"] },
      { name: "Brian", value: "Brian", engine: ["standard", "neural"] },
      { name: "Arthur", value: "Arthur", engine: ["standard"] },
    ],
  },
  "en-IN": {
    name: "English (Indian)",
    voices: [
      { name: "Aditi", value: "Aditi", engine: ["standard"] },
      { name: "Raveena", value: "Raveena", engine: ["standard"] },
    ],
  },
  "hi-IN": {
    name: "Hindi",
    voices: [{ name: "Aditi", value: "Aditi", engine: ["standard"] }],
  },
  "fr-FR": {
    name: "French (France)",
    voices: [
      { name: "Celine", value: "Celine", engine: ["standard"] },
      { name: "Mathieu", value: "Mathieu", engine: ["standard"] },
    ],
  },
  "de-DE": {
    name: "German",
    voices: [
      { name: "Marlene", value: "Marlene", engine: ["standard"] },
      { name: "Hans", value: "Hans", engine: ["standard"] },
    ],
  },
  "es-ES": {
    name: "Spanish (Spain)",
    voices: [
      { name: "Conchita", value: "Conchita", engine: ["standard"] },
      { name: "Enrique", value: "Enrique", engine: ["standard"] },
    ],
  },
  "ja-JP": {
    name: "Japanese",
    voices: [{ name: "Mizuki", value: "Mizuki", engine: ["standard"] }],
  },
  "zh-CN": {
    name: "Chinese (Mandarin)",
    voices: [{ name: "Zhiyu", value: "Zhiyu", engine: ["standard", "neural"] }],
  },
  "ar-SA": {
    name: "Arabic",
    voices: [{ name: "Zeina", value: "Zeina", engine: ["standard"] }],
  },
  "ar-AE": {
    name: "Arabic (Gulf)",
    voices: [
      { name: "Hala", value: "Hala", engine: ["standard"] },
      { name: "Zayd", value: "Zayd", engine: ["standard"] },
    ],
  },
};

function App() {
  type LanguageKey = keyof typeof LANGUAGES;
  const maxCharacters = 250;
  const [text, setText] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageKey>("en-US");
  const [engine, setEngine] = useState("standard");
  const [selectedVoice, setSelectedVoice] = useState(
    LANGUAGES["en-US"].voices[0].value
  );
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tts' | 'record' | 'voices'>('tts');
  const [selectedClonedVoiceId, setSelectedClonedVoiceId] = useState<string | null>(null);
  const [useClonedVoice, setUseClonedVoice] = useState(false);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dummy cloned voices data - replace with actual API call
  const dummyClonedVoices: ClonedVoice[] = [
    {
      id: '1',
      name: 'My Voice Clone',
      createdAt: '2024-01-15T10:30:00Z',
      status: 'ready',
      sampleUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
    },
    {
      id: '2',
      name: 'Professional Voice',
      createdAt: '2024-01-14T15:45:00Z',
      status: 'ready',
      sampleUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
    },
    {
      id: '3',
      name: 'Casual Voice',
      createdAt: '2024-01-13T09:20:00Z',
      status: 'processing',
    },
    {
      id: '4',
      name: 'Failed Voice',
      createdAt: '2024-01-12T14:10:00Z',
      status: 'failed',
    }
  ];

  // Fetch cloned voices
  const fetchClonedVoices = async () => {
    setIsLoadingVoices(true);
    try {
      // Simulate API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      setClonedVoices(dummyClonedVoices);
    } catch (error) {
      console.error('Error fetching cloned voices:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  // Load cloned voices on component mount
  React.useEffect(() => {
    fetchClonedVoices();
  }, []);

  React.useEffect(() => {
    if (!useClonedVoice) {
      setSelectedVoice(LANGUAGES[selectedLanguage].voices[0].value);
    }
  }, [selectedLanguage]);

  // Update selected voice when switching to cloned voices
  React.useEffect(() => {
    if (useClonedVoice) {
      const readyVoices = clonedVoices.filter(voice => voice.status === 'ready');
      if (readyVoices.length > 0) {
        setSelectedVoice(readyVoices[0].id);
        setSelectedClonedVoiceId(readyVoices[0].id);
      }
    } else {
      setSelectedVoice(LANGUAGES[selectedLanguage].voices[0].value);
      setSelectedClonedVoiceId(null);
    }
  }, [useClonedVoice, clonedVoices]);

  const base64ToBlob = (base64: string) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: "audio/mp3" });
  };

  const findEngine = (val: string) => {
    const aa = LANGUAGES[selectedLanguage].voices.find(
      (voice) => voice.value == val
    );
    setEngine(aa?.engine?.[0] || "standard");
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    setText(input);

    if (input.length > maxCharacters) {
      setError(`Maximum ${maxCharacters} characters allowed.`);
    } else {
      setError("");
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob, name: string) => {
    try {
      // Simulate API call to upload voice for cloning
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-sample.wav');
      formData.append('name', name);
      
      // Replace with actual API endpoint
      console.log('Uploading voice for cloning:', { name, audioBlob });
      
      // Refresh cloned voices after upload
      await fetchClonedVoices();
      
      // Switch to voices tab after successful upload
      setActiveTab('voices');
    } catch (error) {
      console.error('Error uploading voice:', error);
    }
  };

  const handleClonedVoiceSelect = (voiceId: string | null) => {
    setSelectedClonedVoiceId(voiceId);
    setUseClonedVoice(voiceId !== null);
    if (voiceId) {
      setSelectedVoice(voiceId);
    }
  };

  const handleClonedVoiceDelete = (voiceId: string) => {
    setClonedVoices(prev => prev.filter(voice => voice.id !== voiceId));
    if (selectedClonedVoiceId === voiceId) {
      setSelectedClonedVoiceId(null);
      setUseClonedVoice(false);
      setSelectedVoice(LANGUAGES[selectedLanguage].voices[0].value);
    }
  };

  const handleSpeak = async () => {
    if (isSpeaking && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
      setShowControls(false);
      return;
    }

    if (!text.trim()) {
      setError("Please enter some text to convert to speech");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      setIsComplete(false);
      setAudioUrl(null);
      setShowControls(true);

      let data;
      
      if (useClonedVoice && selectedClonedVoiceId) {
        // Use cloned voice
        data = {
          text,
          clonedVoiceId: selectedClonedVoiceId,
          rate,
          pitch,
        };
      } else {
        // Use standard voice
        data = {
          text: `<speak><prosody rate=\"${convertToSSML(
            rate
          )}\" pitch=\"${convertToSSML(pitch)}\">${text}</prosody></speak>`,
          language: selectedLanguage,
          voice: selectedVoice,
          engine,
        };
      }

      const response = await axios.post(
        "https://nsupy9x610.execute-api.ap-south-1.amazonaws.com/dev/tts",
        data,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data) {
        const audioBlob = base64ToBlob(response.data);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setIsComplete(true);

        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          setIsSpeaking(true);

          audioRef.current.onended = () => {
            setIsSpeaking(false);
            setProgress(100);
          };
        }
      } else {
        throw new Error("No audio data received from the server");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to convert text to speech"
      );
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const convertToSSML = (value: number): string => {
    if (value === 1) return "medium";

    const percentage = Math.round((value - 1) * 100);
    return `${percentage > 0 ? "+" : ""}${percentage}%`;
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement("a");
      a.href = audioUrl;
      a.download = "speech.mp3";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleShare = async () => {
    if (audioUrl) {
      try {
        const blob = await fetch(audioUrl).then((r) => r.blob());
        const file = new File([blob], "speech.mp3", { type: "audio/mp3" });

        if (navigator.share) {
          await navigator.share({
            files: [file],
            title: "Text to Speech Audio",
            text: "Check out this audio generated from text!",
          });
        } else {
          alert("Web Share API is not supported in your browser");
        }
      } catch (error) {
        console.error("Error sharing:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            <Volume2 className="h-8 w-8 text-purple-600" />
            Voxora
          </h1>
          <p className="text-gray-600">
            Convert text to speech with AI voices or create your own voice clone
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('tts')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'tts'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Volume2 className="h-5 w-5 mx-auto mb-1" />
              Text to Speech
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'record'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Mic className="h-5 w-5 mx-auto mb-1" />
              Record Voice
            </button>
            <button
              onClick={() => setActiveTab('voices')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'voices'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <User className="h-5 w-5 mx-auto mb-1" />
              My Voices
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'tts' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Voice Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="voiceType"
                    checked={!useClonedVoice}
                    onChange={() => {
                      setUseClonedVoice(false);
                      setSelectedClonedVoiceId(null);
                    }}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Standard AI Voices</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="voiceType"
                    checked={useClonedVoice}
                    onChange={() => {
                      const readyVoices = clonedVoices.filter(voice => voice.status === 'ready');
                      if (readyVoices.length > 0) {
                        setUseClonedVoice(true);
                      }
                    }}
                    disabled={clonedVoices.filter(voice => voice.status === 'ready').length === 0}
                    className="mr-2"
                  />
                  <span className={`${clonedVoices.filter(voice => voice.status === 'ready').length === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                    Cloned Voice {clonedVoices.filter(voice => voice.status === 'ready').length === 0 && '(No voices available)'}
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

            <div className={`${text.length > maxCharacters ? "text-red-500" : "text-gray-500"}`}>
              {text.length} / {maxCharacters}
            </div>

            {/* Voice Controls */}
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Language selector - only for standard voices */}
                {!useClonedVoice && (
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
                    className={`${!useClonedVoice ? 'flex-1' : 'w-full'} p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    value={selectedVoice}
                    onChange={(e) => {
                      setSelectedVoice(e.target.value);
                      if (useClonedVoice) {
                        setSelectedClonedVoiceId(e.target.value);
                      } else {
                        findEngine(e.target.value);
                      }
                    }}
                  >
                    {useClonedVoice ? (
                      clonedVoices
                        .filter(voice => voice.status === 'ready')
                        .map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name}
                          </option>
                        ))
                    ) : (
                      LANGUAGES[selectedLanguage].voices.map((voice) => (
                        <option key={voice.value} value={voice.value}>
                          {voice.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Rate and Pitch controls */}
              {!useClonedVoice && (
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
                disabled={isLoading || text.length === 0 || error !== ""}
                className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
                  isLoading || text.length === 0 || error !== ""
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

        {activeTab === 'record' && (
          <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
        )}

        {activeTab === 'voices' && (
          <ClonedVoiceSelector
            selectedVoiceId={selectedClonedVoiceId}
            onVoiceSelect={handleClonedVoiceSelect}
            onVoiceDelete={handleClonedVoiceDelete}
            clonedVoices={clonedVoices}
            onRefresh={fetchClonedVoices}
          />
        )}
      </div>
    </div>
  );
}

export default App;
