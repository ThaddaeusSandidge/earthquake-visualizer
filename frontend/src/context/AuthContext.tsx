import axios from "axios";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";

interface AuthContextType {
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  );
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const router = useRouter();

  useEffect(() => {
    if (token) {
      console.log("Token updated, saving to localStorage:", token);
      localStorage.setItem("token", token);
    } else {
      console.log("Token is null, clearing localStorage");
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    // Optional: Verify token on load
    const verifyToken = async () => {
      if (token) {
        try {
          console.log("Verifying token:", token);
          const response = await axios.post(
            `${apiUrl}/verify-token`,
            {}, // Empty body
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          console.log("Token verification response:", response.data);
          if (!response.data.valid) throw new Error("Token invalid");
        } catch (err) {
          console.error("Error verifying token:", err);
          localStorage.removeItem("token");
          setToken(null);
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
    };

    verifyToken();
  }, [token, apiUrl]);

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Helper function to include token in headers
export const axiosWithAuth = (token: string | null) => {
  return axios.create({
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
};
