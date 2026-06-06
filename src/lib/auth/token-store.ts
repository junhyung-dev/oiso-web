import type { TokenResponse, UserResponse } from "@/lib/api/types";

const ACCESS_TOKEN_KEY = "oiso.access_token";
const REFRESH_TOKEN_KEY = "oiso.refresh_token";
const EXPIRES_AT_KEY = "oiso.access_expires_at";
const USER_KEY = "oiso.user";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getAccessToken() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): UserResponse | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserResponse;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserResponse) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function setTokenBundle(tokens: TokenResponse) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  window.localStorage.setItem(
    EXPIRES_AT_KEY,
    String(Date.now() + tokens.expires_in * 1000),
  );
}

export function clearAuthStorage() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(EXPIRES_AT_KEY);
  window.localStorage.removeItem(USER_KEY);
}
