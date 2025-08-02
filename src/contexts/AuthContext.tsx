import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";

interface User {
  email: string;
  id?: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on app load
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("authUser");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Error parsing saved user data:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      }
    }
    setIsLoading(false);
  }, []);

  const saveAuthData = (authToken: string, userData: User) => {
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("authUser", JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const clearAuthData = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setToken(null);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(
        "https://nsupy9x610.execute-api.ap-south-1.amazonaws.com/dev/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();
      console.log("email", email, data);
      const userData = { email, ...data.user };
      saveAuthData(data.token, userData);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      console.log("Attempting registration with:", { email });

      const response = await axios.post(
        "https://nsupy9x610.execute-api.ap-south-1.amazonaws.com/dev/auth/register",
        { email, password },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Registration successful:", response.data);
      const userData = { email, ...response.data.user };
      saveAuthData(response.data.token, userData);
    } catch (error: any) {
      console.log("--------", error);
      if (axios.isAxiosError(error)) {
        console.error("Axios error response:", error.response?.data);

        const message =
          error.response?.data?.message ||
          `HTTP ${error.response?.status}: ${error.response?.statusText}` ||
          "Registration failed";
        throw new Error(message);
      } else {
        console.error("Unexpected error:", error);
        throw new Error("Something went wrong during registration.");
      }
    }
  };

  const googleLogin = async (idToken: string) => {
    try {
      console.log("Attempting login with:", { idToken });

      const response = await fetch(
        "https://nsupy9x610.execute-api.ap-south-1.amazonaws.com/dev/auth/google",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken }),
        }
      );

      console.log("Google login response status:", response.status);

      const data = await response.json(); // Read once here

      if (!response.ok) {
        console.error("Google login failed:", data);
        throw new Error(data.message || "Google login failed");
      }

      console.log("Login successful:", data);

      const userData = { email: data.email || "", ...data.user };
      saveAuthData(data.token, userData);
    } catch (error) {
      console.error("Google login error:", error);
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Network error: Please check your internet connection and try again."
        );
      }
      throw error;
    }
  };

  const logout = () => {
    clearAuthData();
    console.log("Attempting Google login");
  };

  const value = {
    user,
    token,
    login,
    register,
    googleLogin,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
