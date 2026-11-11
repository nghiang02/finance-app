"use client";

import { ApiClientProvider, createApiClient, shouldRetryRequest } from "@finance/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Same-origin path; next.config.ts rewrites it to the backend.
const apiClient = createApiClient({ baseUrl: "/api/v1" });

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
