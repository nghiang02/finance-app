import { createApiClient } from "@finance/api-client";
import Constants from "expo-constants";

import { secureTokenStorage } from "@/lib/secure-token-storage";

/**
 * EXPO_PUBLIC_API_URL wins (staging/production builds). In development the backend is
 * assumed to run on the same machine as Metro, so a physical phone on the same Wi-Fi
 * reaches your computer instead of its own "localhost".
 */
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    return fromEnv;
  }
  // hostUri looks like "192.168.1.20:8081" (the Metro dev server).
  const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${devHost ?? "localhost"}:3000/api/v1`;
}

export const apiBaseUrl = resolveApiBaseUrl();

// "mobile": the server returns the refresh token in the body and we keep it in SecureStore.
export const apiClient = createApiClient({
  baseUrl: apiBaseUrl,
  clientType: "mobile",
  refreshTokenStorage: secureTokenStorage,
});
