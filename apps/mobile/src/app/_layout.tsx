import { ApiClientProvider, shouldRetryRequest } from "@finance/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useState } from "react";
import { useColorScheme } from "react-native";

import { apiClient } from "@/lib/api";

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
          <Stack screenOptions={{ title: "Finance" }} />
        </ThemeProvider>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
