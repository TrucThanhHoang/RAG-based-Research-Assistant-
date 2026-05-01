"use client";

import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";

import { getMe, login, register } from "@/lib/api";
import { TokenResponse, User } from "@/lib/types";

type AuthContextValue = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  loading: boolean;
  loginWithPassword: (payload: { email: string; password: string }) => Promise<void>;
  registerUser: (payload: { email: string; password: string; full_name: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "rag-auth";

function persistAuth(data: TokenResponse | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (data === null) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function AuthProvider({ children }: { children: import("react").ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setLoading(false);
      return;
    }

    const parsed = JSON.parse(raw) as TokenResponse;
    setToken(parsed.access_token);
    setRefreshToken(parsed.refresh_token);
    setUser(parsed.user);

    getMe(parsed.access_token)
      .then((resolvedUser) => setUser(resolvedUser))
      .catch(() => {
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        persistAuth(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function applyAuth(data: TokenResponse) {
    setToken(data.access_token);
    setRefreshToken(data.refresh_token);
    setUser(data.user);
    persistAuth(data);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      refreshToken,
      user,
      loading,
      async loginWithPassword(payload) {
        const data = await login(payload);
        await applyAuth(data);
      },
      async registerUser(payload) {
        const data = await register(payload);
        await applyAuth(data);
      },
      logout() {
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        persistAuth(null);
      },
    }),
    [loading, refreshToken, token, user],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
