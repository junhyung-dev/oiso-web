import { apiRequest } from "@/lib/api/client";
import type { AuthResponse, TokenResponse, UserResponse } from "@/lib/api/types";
import { setStoredUser, setTokenBundle } from "@/lib/auth/token-store";

export async function verifyGoogleIdToken(idToken: string) {
  const response = await apiRequest<AuthResponse>("/auth/google/verify", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });

  setTokenBundle(response.tokens);
  setStoredUser(response.user);
  return response;
}

export async function refreshToken(refreshToken: string) {
  const response = await apiRequest<TokenResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  setTokenBundle(response);
  return response;
}

export function getMe() {
  return apiRequest<UserResponse>("/auth/me", { auth: true });
}
