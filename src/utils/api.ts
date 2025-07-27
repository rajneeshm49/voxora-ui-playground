// API utility functions with JWT token handling

import axios from "axios";

const API_BASE_URL =
  "https://nsupy9x610.execute-api.ap-south-1.amazonaws.com/dev";

export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth headers for protected endpoints
axiosInstance.interceptors.request.use((config) => {
  const tokenHeaders = getAuthHeaders();
  if (tokenHeaders && config.headers) {
    Object.assign(config.headers, tokenHeaders);
  }
  return config;
});

export const apiRequest = async (
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    data?: any;
    headers?: any;
    requireAuth?: boolean;
    responseType?: "json" | "blob";
  } = {}
) => {
  const {
    method = "GET",
    data,
    headers = {},
    requireAuth = true,
    responseType = "json",
  } = options;

  try {
    const response = await axiosInstance.request({
      url: endpoint,
      method,
      data,
      headers,
      responseType,
    });

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data?.message ||
          `HTTP error! status: ${error.response.status}`
      );
    }
    throw new Error("Network or CORS error");
  }
};

// export const apiRequest = async (
//   endpoint: string,
//   options: RequestInit = {},
//   requireAuth: boolean = true
// ) => {
//   const url = `${API_BASE_URL}${endpoint}`;

//   const headers = requireAuth
//     ? {
//         ...getAuthHeaders(),
//         ...options.headers,
//       }
//     : {
//         "Content-Type": "application/json",
//         ...options.headers,
//       };
//   console.log("url is", url, "headers", headers);
//   const response = await fetch(url, {
//     ...options,
//     headers,
//   });
//   console.log("response", response);
//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(
//       errorData.message || `HTTP error! status: ${response.status}`
//     );
//   }

//   return response.json();
// };
const convertToSSML = (value: number): string => {
  if (value === 1) return "medium";

  const percentage = Math.round((value - 1) * 100);
  return `${percentage > 0 ? "+" : ""}${percentage}%`;
};

const base64ToBlob = (base64: string) => {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: "audio/mp3" });
};
// Specific API functions
export const textToSpeech = async (
  text: string,
  voice: string,
  rate: number,
  pitch: number
) => {
  // const ssmlText = `<speak><prosody rate="${
  //   rate === 1 ? "medium" : rate > 1 ? "fast" : "slow"
  // }" pitch="${
  //   pitch === 1 ? "medium" : pitch > 1 ? "high" : "low"
  // }">${text}</prosody></speak>`;
  const data = {
    text: `<speak><prosody rate=\"${convertToSSML(
      rate
    )}\" pitch=\"${convertToSSML(pitch)}\">${text}</prosody></speak>`,
    language: "en-US",
    voice,
    engine: "standard",
  };

  const response = await axios.post(
    "https://nsupy9x610.execute-api.ap-south-1.amazonaws.com/dev/tts",
    data,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.data) {
    throw new Error("There is some error");
  }
  const audioBlob = base64ToBlob(response.data);
  const url = URL.createObjectURL(audioBlob);
  return { audioUrl: url };
  // return apiRequest(
  //   "/tts",
  //   {
  //     method: "POST",
  //     body: JSON.stringify({
  //       text: ssmlText,
  //       language: "en-US",
  //       voice,
  //       engine: "standard",
  //     }),
  //   },
  //   false
  // ); // Don't require auth for basic TTS
};

export const clonedTextToSpeech = async (text: string, voiceId: string) => {
  return apiRequest("/text-to-speech", {
    method: "POST",
    data: {
      text,
      voiceId,
    },
  });
};

export const uploadVoice = async (formData: FormData) => {
  const token = localStorage.getItem("authToken");
  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/upload-voice`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
};

export const fetchClonedVoices = async () => {
  return apiRequest("/list-voices?category=cloned", {
    method: "GET",
    requireAuth: true,
  });
};

export const deleteVoice = async (voiceId: string) => {
  return apiRequest(`/delete-voice?voiceId=${voiceId}`, {
    method: "DELETE",
  });
};
