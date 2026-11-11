import { ApiClientProvider, shouldRetryRequest, useSession } from "@finance/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";

import { apiClient } from "@/lib/api";

// Keep the splash screen up while the stored session is restored, so the user never sees
// the sign-in screen flash before being sent to the home screen.
void SplashScreen.preventAutoHideAsync();

/** Hides the splash screen once we know whether a stored session exists. */
function SplashGate() {
  const { status } = useSession();
  useEffect(() => {
    if (status !== "loading") {
      SplashScreen.hide();
    }
  }, [status]);
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // One QueryClient for the app's lifetime (useState keeps it across re-renders).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: shouldRetryRequest } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <SplashGate />
          {/* Each group's layout decides whether the user may be there (see (app) and (auth)). */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="(auth)" />
          </Stack>
        </ThemeProvider>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
