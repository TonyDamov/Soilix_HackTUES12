import React, { createContext, useContext, useState } from "react";
import { apiRequest, getBearerAuthHeaders } from "../config/api";

type User = {
  email: string;
  id: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
};

type AuthResponse = {
  message: string;
  display_name: string;
  refresh_token: string;
  access_token: string;
};

type SignupResponse = {
  message: string;
  display_name: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error("Email and password are required");
    }

    const response = await apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email: normalizedEmail, password },
    });

    if (!response.access_token || !response.refresh_token) {
      throw new Error("Login response did not include session tokens");
    }

    setUser({
      id: normalizedEmail,
      email: normalizedEmail,
      displayName: response.display_name || getDisplayNameFallback(normalizedEmail),
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    });
  };

  const signup = async (email: string, password: string, confirmPassword: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password || !confirmPassword) {
      throw new Error("All fields are required");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    await apiRequest<SignupResponse>("/api/auth/signup", {
      method: "POST",
      body: {
        email: normalizedEmail,
        password,
        display_name: getDisplayNameFallback(normalizedEmail),
      },
    });
  };

  const logout = async () => {
    if (user?.accessToken) {
      try {
        await apiRequest<{ message: string }>("/api/auth/logout", {
          method: "POST",
          body: { access_token: user.accessToken },
          headers: getBearerAuthHeaders(user.accessToken),
        });
      } catch {
        // Even if the backend logout fails, we still end the local session.
      }
    }

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function getDisplayNameFallback(email: string) {
  return email.split("@")[0] || "Gardener";
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
