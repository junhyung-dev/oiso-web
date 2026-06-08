import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  setTokenBundle,
} from "@/lib/auth/token-store";
import type { ApiError, TokenResponse } from "@/lib/api/types";

export class ApiClientError extends Error {
  status: number;
  reason: string;

  constructor(status: number, reason: string) {
    super(reason);
    this.name = "ApiClientError";
    this.status = status;
    this.reason = reason;
  }
}

const rawBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:8000";

export const API_BASE_URL = rawBaseUrl.endsWith("/v1")
  ? rawBaseUrl
  : `${rawBaseUrl}/v1`;

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

async function parseError(response: Response) {
  try {
    const body = (await response.json()) as Partial<ApiError>;
    return body.reason || response.statusText || "API request failed.";
  } catch {
    return response.statusText || "API request failed.";
  }
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    clearAuthStorage();
    return false;
  }

  const tokens = (await response.json()) as TokenResponse;
  setTokenBundle(tokens);
  return true;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { auth = false, retryOnUnauthorized = true, headers, ...init } = options;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Content-Type") && !(init.body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    } else if (!getRefreshToken()) {
      throw new ApiClientError(401, "Login is required.");
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: requestHeaders,
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }
  }

  if (!response.ok) {
    throw new ApiClientError(response.status, await parseError(response));
  }

  const text = await response.text();
  if (!text) return undefined as T;

  const data = JSON.parse(text) as T | ApiError;
  if (
    data &&
    typeof data === "object" &&
    "success" in data &&
    data.success === false
  ) {
    throw new ApiClientError(response.status, data.reason);
  }

  return data as T;
}

export function toQueryString(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}
