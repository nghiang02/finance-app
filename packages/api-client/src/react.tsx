import type {
  Category,
  CreateCategoryInput,
  CreateTransactionInput,
  CreateWalletInput,
  HealthResponse,
  LoginInput,
  RegisterInput,
  Transaction,
  UpdateCategoryInput,
  UpdateTransactionInput,
  UpdateWalletInput,
  User,
  Wallet,
} from "@finance/shared";
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

/**
 * What the server renders: it never knows the session (the refresh cookie is not sent with
 * page requests), so it is always "loading". A constant object, because React compares
 * snapshots by reference.
 */
const SERVER_SESSION: SessionState = { status: "loading", user: null };
const getServerSession = (): SessionState => SERVER_SESSION;

/** { status: "loading" | "authenticated" | "unauthenticated", user } – re-renders on change. */
export function useSession(): SessionState {
  const { session } = useApiClient();
  // During hydration React uses getServerSession, so the first client render matches the
  // server HTML even if the client already knows the session (e.g. after a hot reload);
  // React then re-renders with the real state. No-op on mobile, which has no server render.
  return useSyncExternalStore(session.subscribe, session.getState, getServerSession);
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

/** All wallets of the signed-in user, each with its current balance. */
export function useWallets(): UseQueryResult<Wallet[], ApiError> {
  const client = useApiClient();
  return useQuery<Wallet[], ApiError>({
    queryKey: queryKeys.wallets,
    queryFn: ({ signal }) => client.wallets.list(signal),
  });
}

/**
 * Wallet mutations refetch the wallet list afterwards: balances are computed by the server,
 * so the client never tries to recalculate them on its own.
 */
function useInvalidateWallets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
}

export function useCreateWallet(): UseMutationResult<Wallet, ApiError, CreateWalletInput> {
  const client = useApiClient();
  const invalidate = useInvalidateWallets();
  return useMutation<Wallet, ApiError, CreateWalletInput>({
    mutationFn: (input) => client.wallets.create(input),
    onSuccess: invalidate,
  });
}

export interface UpdateWalletVariables {
  id: string;
  changes: UpdateWalletInput;
}

export function useUpdateWallet(): UseMutationResult<Wallet, ApiError, UpdateWalletVariables> {
  const client = useApiClient();
  const invalidate = useInvalidateWallets();
  return useMutation<Wallet, ApiError, UpdateWalletVariables>({
    mutationFn: ({ id, changes }) => client.wallets.update(id, changes),
    onSuccess: invalidate,
  });
}

export function useDeleteWallet(): UseMutationResult<undefined, ApiError, string> {
  const client = useApiClient();
  const invalidate = useInvalidateWallets();
  return useMutation<undefined, ApiError, string>({
    mutationFn: (id) => client.wallets.remove(id),
    onSuccess: invalidate,
  });
}

/** Flat list of active categories; nest it with `buildCategoryTree` from @finance/shared. */
export function useCategories(): UseQueryResult<Category[], ApiError> {
  const client = useApiClient();
  return useQuery<Category[], ApiError>({
    queryKey: queryKeys.categories,
    queryFn: ({ signal }) => client.categories.list(signal),
  });
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.categories });
}

export function useCreateCategory(): UseMutationResult<Category, ApiError, CreateCategoryInput> {
  const client = useApiClient();
  const invalidate = useInvalidateCategories();
  return useMutation<Category, ApiError, CreateCategoryInput>({
    mutationFn: (input) => client.categories.create(input),
    onSuccess: invalidate,
  });
}

export interface UpdateCategoryVariables {
  id: string;
  changes: UpdateCategoryInput;
}

export function useUpdateCategory(): UseMutationResult<
  Category,
  ApiError,
  UpdateCategoryVariables
> {
  const client = useApiClient();
  const invalidate = useInvalidateCategories();
  return useMutation<Category, ApiError, UpdateCategoryVariables>({
    mutationFn: ({ id, changes }) => client.categories.update(id, changes),
    onSuccess: invalidate,
  });
}

export interface DeleteCategoryVariables {
  id: string;
  /** Needed only when the category has transactions (first attempt answers 409). */
  replacementId?: string;
}

export function useDeleteCategory(): UseMutationResult<
  undefined,
  ApiError,
  DeleteCategoryVariables
> {
  const client = useApiClient();
  const invalidate = useInvalidateCategories();
  const queryClient = useQueryClient();
  return useMutation<undefined, ApiError, DeleteCategoryVariables>({
    mutationFn: ({ id, replacementId }) => client.categories.remove(id, replacementId),
    // Its transactions moved to the replacement category, so transaction lists change too.
    onSuccess: () =>
      Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
      ]),
  });
}

/** One transaction, e.g. for an edit screen opened from a link. */
export function useTransaction(id: string): UseQueryResult<Transaction, ApiError> {
  const client = useApiClient();
  return useQuery<Transaction, ApiError>({
    queryKey: queryKeys.transaction(id),
    queryFn: ({ signal }) => client.transactions.get(id, signal),
  });
}

/**
 * A transaction changes wallet balances (computed by the server) as well as transaction
 * lists, so both are refetched after every change.
 */
function useInvalidateTransactions() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets }),
    ]);
}

export function useCreateTransaction(): UseMutationResult<
  Transaction,
  ApiError,
  CreateTransactionInput
> {
  const client = useApiClient();
  const invalidate = useInvalidateTransactions();
  return useMutation<Transaction, ApiError, CreateTransactionInput>({
    mutationFn: (input) => client.transactions.create(input),
    onSuccess: invalidate,
  });
}

export interface UpdateTransactionVariables {
  id: string;
  changes: UpdateTransactionInput;
}

export function useUpdateTransaction(): UseMutationResult<
  Transaction,
  ApiError,
  UpdateTransactionVariables
> {
  const client = useApiClient();
  const invalidate = useInvalidateTransactions();
  return useMutation<Transaction, ApiError, UpdateTransactionVariables>({
    mutationFn: ({ id, changes }) => client.transactions.update(id, changes),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction(): UseMutationResult<undefined, ApiError, string> {
  const client = useApiClient();
  const invalidate = useInvalidateTransactions();
  return useMutation<undefined, ApiError, string>({
    mutationFn: (id) => client.transactions.remove(id),
    onSuccess: invalidate,
  });
}
