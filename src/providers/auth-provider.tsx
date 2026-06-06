"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, verifyGoogleIdToken } from "@/lib/api/auth";
import type { UserResponse } from "@/lib/api/types";
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setStoredUser,
} from "@/lib/auth/token-store";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: UserResponse | null;
  error: string | null;
  loginWithGoogleIdToken: (idToken: string) => Promise<UserResponse>;
  refreshMe: () => Promise<UserResponse | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<UserResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setError(null);
    setStatus("unauthenticated");
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getAccessToken() && !getRefreshToken()) {
      setStatus("unauthenticated");
      setUser(null);
      return null;
    }

    setStatus((current) =>
      current === "authenticated" ? "authenticated" : "loading",
    );

    try {
      const currentUser = await getMe();
      setStoredUser(currentUser);
      setUser(currentUser);
      setError(null);
      setStatus("authenticated");
      return currentUser;
    } catch (authError) {
      clearAuthStorage();
      setUser(null);
      setError(
        authError instanceof Error
          ? authError.message
          : "Unable to verify session.",
      );
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  const loginWithGoogleIdToken = useCallback(async (idToken: string) => {
    setStatus("loading");
    try {
      const response = await verifyGoogleIdToken(idToken);
      setUser(response.user);
      setError(null);
      setStatus("authenticated");
      return response.user;
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Login failed.",
      );
      setStatus("unauthenticated");
      throw loginError;
    }
  }, []);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
    void refreshMe();
  }, [refreshMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      error,
      loginWithGoogleIdToken,
      refreshMe,
      logout,
    }),
    [error, loginWithGoogleIdToken, logout, refreshMe, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
