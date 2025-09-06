import { getApiUrl } from "./config";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

function base64UrlDecode(input: string): string {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = input.length % 4;
  if (pad) input += "=".repeat(4 - pad);
  try {
    return decodeURIComponent(
      atob(input)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    try { return atob(input); } catch { return ""; }
  }
}

export function parseJwtPayload<T = any>(token: string | null): T | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const json = base64UrlDecode(parts[1] || "");
  try { return JSON.parse(json) as T; } catch { return null; }
}

export function getAccessTokenExp(): number | null {
  const access = getAccessToken();
  const payload = parseJwtPayload<{ exp?: number }>(access);
  return payload?.exp ?? null;
}

export function isAccessTokenExpired(skewSeconds = 10): boolean {
  const exp = getAccessTokenExp();
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return exp - now <= skewSeconds;
}

export function setTokens(access: string, refresh: string) {
  try {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  } catch {}
}

export function getAccessToken(): string | null {
  try { return localStorage.getItem(ACCESS_KEY); } catch { return null; }
}

export function getRefreshToken(): string | null {
  try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
}

export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

export function getAuthHeaders(): HeadersInit {
  const access = getAccessToken();
  return access ? { Authorization: `Bearer ${access}` } : {};
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(getApiUrl("/api/users/token/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const access = data?.access as string | undefined;
    if (access) {
      setTokens(access, refresh);
      return access;
    }
  } catch {}
  return null;
}

export async function ensureFreshAccessToken(): Promise<string | null> {
  if (!isAccessTokenExpired(20)) return getAccessToken();
  return await refreshAccessToken();
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  let token = await ensureFreshAccessToken();
  const headers: HeadersInit = {
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      const retryHeaders: HeadersInit = {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      };
      return fetch(input, { ...init, headers: retryHeaders });
    }
  }
  return res;
}
