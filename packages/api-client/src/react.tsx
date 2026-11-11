import type { HealthResponse } from "@finance/shared";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";

import type { ApiClient } from "./client.js";
import type { ApiError } from "./errors.js";
import { queryKeys } from "./query-keys.js";

const ApiClientContext = createContext<ApiClient | null>(null);

export interface ApiClientProviderProps {
  client: ApiClient;
  children: ReactNode;
}

/** Makes one ApiClient available to every hook below it (web and mobile create their own). */
export function ApiClientProvider({ client, children }: ApiClientProviderProps) {
  return <ApiClientContext value={client}>{children}</ApiClientContext>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error("useApiClient must be used inside <ApiClientProvider>");
  }
  return client;
}

export function useHealth(): UseQueryResult<HealthResponse, ApiError> {
  const client = useApiClient();
  return useQuery<HealthResponse, ApiError>({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => client.health(signal),
  });
}
