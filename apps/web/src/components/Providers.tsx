"use client";

import { ApiClientProvider, createApiClient, shouldRetryRequest } from "@finance/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Tabs share the refresh-token cookie. Refreshing one tab at a time means the next tab sends
 * the cookie the previous one just rotated, instead of the old one (which the server treats
 * as a stolen token and revokes the whole session).
 */
function refreshLock(run: () => Promise<boolean>): Promise<boolean> {
  if (typeof navigator === "undefined" || !("locks" in navigator)) {
    return run();
  }
  return navigator.locks.request("finance-auth-refresh", run);
}

// Same-origin path; next.config.ts rewrites it to the backend. Web has no refreshTokenStorage:
// the refresh token stays in an httpOnly cookie that JavaScript cannot read.
const apiClient = createApiClient({ baseUrl: "/api/v1", refreshLock });

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetryRequest },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** New client per server render, one shared client in the browser (Next.js TanStack Query guide). */
function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );
}
