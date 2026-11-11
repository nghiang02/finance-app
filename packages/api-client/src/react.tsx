import type { HealthResponse, LoginInput, RegisterInput, User } from "@finance/shared";
import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useEffect, useSyncExternalStore } from "react";

import type { ApiClient, SessionState } from "./client.js";
import type { ApiError } from "./errors.js";
import { queryKeys } from "./query-keys.js";

const ApiClientContext = createContext<ApiClient | null>(null);

export interface ApiClientProviderProps {
  client: ApiClient;
  children: ReactNode;
}

/**
 * Makes one ApiClient available to every hook below it (web and mobile create their own),
 * and restores the previous session (cookie or stored refresh token) when the app starts.
 */
export function ApiClientProvider({ client, children }: ApiClientProviderProps) {
  useEffect(() => {
    void client.session.restore();
  }, [client]);

  return <ApiClientContext value={client}>{children}</ApiClientContext>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error("useApiClient must be used inside <ApiClientProvider>");
  }
  return client;
}

/** { status: "loading" | "authenticated" | "unauthenticated", user } – re-renders on change. */
export function useSession(): SessionState {
  const { session } = useApiClient();
  return useSyncExternalStore(session.subscribe, session.getState, session.getState);
}

export function useSignIn(): UseMutationResult<User, ApiError, LoginInput> {
  const client = useApiClient();
  return useMutation<User, ApiError, LoginInput>({
    mutationFn: (input) => client.session.signIn(input),
  });
}

export function useSignUp(): UseMutationResult<User, ApiError, RegisterInput> {
  const client = useApiClient();
  return useMutation<User, ApiError, RegisterInput>({
    mutationFn: (input) => client.session.signUp(input),
  });
}

export function useSignOut() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<undefined, ApiError>({
    mutationFn: async () => {
      await client.session.signOut();
      return undefined;
    },
    // Drop every cached query so the next user never sees the previous user's data.
    onSettled: () => {
      queryClient.clear();
    },
  });
}

export function useHealth(): UseQueryResult<HealthResponse, ApiError> {
  const client = useApiClient();
  return useQuery<HealthResponse, ApiError>({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => client.health(signal),
  });
}
