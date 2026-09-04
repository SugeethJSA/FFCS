// Central API client for FFCS backend – handles JWT refresh queue & static export compatibility

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

// token storage keys
const ACCESS_KEY = "ffcs_access";
const REFRESH_KEY = "ffcs_refresh";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  // sync to chrome.storage for ffcs-extension (meet.google.com)
  try {
    const w = window as any;
    if (w?.chrome?.storage?.local) {
      w.chrome.storage.local.set({ ffcs_access: access, ffcs_api_base: API_BASE, ffcs_frontend_base: window.location.origin });
    }
    // also persist bases for save.js bridge
    localStorage.setItem("ffcs_api_base", API_BASE);
    localStorage.setItem("ffcs_frontend_base", window.location.origin);
  } catch {}
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("ffcs_user");
  try {
    const w = window as any;
    if (w?.chrome?.storage?.local) w.chrome.storage.local.remove(["ffcs_access"]);
  } catch {}
}

// Refresh queue – prevents parallel refresh storms
let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  if (refreshing) return refreshing;
  const rt = getRefreshToken();
  if (!rt) return null;
  refreshing = fetch(apiUrl("/api/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rt }),
  })
    .then(async (r) => {
      if (!r.ok) throw new Error("refresh failed");
      const j = await r.json();
      const newAccess: string = j.data?.accessToken;
      const newRefresh: string = j.data?.refreshToken;
      if (newAccess && newRefresh) setTokens(newAccess, newRefresh);
      return newAccess || null;
    })
    .catch(() => {
      clearTokens();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");

  let res = await fetch(apiUrl(path), { ...init, headers });

  // auto-refresh on 401 (once)
  if (res.status === 401 && token && getRefreshToken() && !path.includes("/auth/refresh") && !path.includes("/auth/login")) {
    const newToken = await refreshAccess();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(apiUrl(path), { ...init, headers });
    }
  }
  return res;
}

// Helper for JSON + error shape { success, data, error }
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.error || json.message || `Request failed (${res.status})`;
    const err: any = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    err.status = res.status;
    err.info = json;
    throw err;
  }
  return json as T;
}
