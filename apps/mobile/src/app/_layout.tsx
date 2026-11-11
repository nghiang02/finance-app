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

function RootNavigator() {
  const { status } = useSession();
  const signedIn = status === "authenticated";

  useEffect(() => {
    if (status !== "loading") {
      SplashScreen.hide();
    }
  }, [status]);

  // Protected groups: when `signedIn` flips, Expo Router moves to the other group and drops
  // the history of the one that became unavailable (no "back" into the app after sign-out).
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
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
          <RootNavigator />
        </ThemeProvider>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
