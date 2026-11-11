import type { RefreshTokenStorage } from "@finance/api-client";
import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "finance.refresh_token";

/**
 * The refresh token is the only long-lived secret on the phone (30 days), so it goes to the
 * OS keychain (iOS) / Keystore-backed storage (Android), not AsyncStorage (plain files).
 * The access token stays in memory and is never written anywhere.
 */
export const secureTokenStorage: RefreshTokenStorage = {
  get: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  set: (token) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
};
