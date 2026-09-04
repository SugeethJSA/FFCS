"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, apiUrl, setTokens, clearTokens, getAccessToken } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: "MEMBER" | "ADMIN" | "SUPER_ADMIN";
  totalPoints: number;
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; displayName: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { setUser(null); return; }
    try {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) { setUser(null); return; }
      const json = await res.json();
      const u = json.data?.user as AuthUser;
      if (u) {
        setUser(u);
        localStorage.setItem("ffcs_user", JSON.stringify(u));
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const cached = typeof window !== "undefined" ? localStorage.getItem("ffcs_user") : null;
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch {}
    }
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (loginVal: string, password: string) => {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginVal, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.message || "Login failed");
    setTokens(json.data.accessToken, json.data.refreshToken);
    setUser(json.data.user);
    localStorage.setItem("ffcs_user", JSON.stringify(json.data.user));
  };

  const register = async (data: { email: string; username: string; displayName: string; password: string }) => {
    const res = await fetch(apiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.error ? (typeof json.error === "string" ? json.error : JSON.stringify(json.error)) : json.message;
      throw new Error(msg || "Registration failed");
    }
    setTokens(json.data.accessToken, json.data.refreshToken);
    setUser(json.data.user);
    localStorage.setItem("ffcs_user", JSON.stringify(json.data.user));
  };

  const logout = async () => {
    const rt = typeof window !== "undefined" ? localStorage.getItem("ffcs_refresh") : null;
    if (rt) {
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(() => {});
    }
    clearTokens();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
