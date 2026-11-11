import {
  apiErrorResponseSchema,
  type AuthResponse,
  authResponseSchema,
  CLIENT_TYPE_HEADER,
  type ClientType,
  type CreateWalletInput,
  healthResponseSchema,
  type HealthResponse,
  type LoginInput,
  type RegisterInput,
  type UpdateWalletInput,
  type User,
  userSchema,
  type Wallet,
  walletListSchema,
  walletSchema,
} from "@finance/shared";

import { ApiError, isApiError } from "./errors.js";

/**
 * Anything with Zod's `safeParse` shape. Typed structurally so this package
 * does not depend on a specific Zod version.
 */
export interface ResponseSchema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: unknown };
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface RequestOptions<T> {
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
  /** Response body is validated against this schema (from @finance/shared). */
  schema: ResponseSchema<T>;
  signal?: AbortSignal;
}

/** Where a mobile app keeps its refresh token between launches (e.g. expo-secure-store). */
export interface RefreshTokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface SessionState {
  status: SessionStatus;
  user: User | null;
}

export interface ApiClientOptions {
  /** Base URL including the version prefix, e.g. "http://localhost:3000/api/v1". */
  baseUrl: string;
  /**
   * "mobile" receives the refresh token in the response body and keeps it in
   * `refreshTokenStorage`. Web leaves both unset: the httpOnly cookie carries it.
   */
  clientType?: ClientType;
  refreshTokenStorage?: RefreshTokenStorage;
  /**
   * Runs a token refresh exclusively. Web passes a `navigator.locks` wrapper so tabs refresh
   * one after another: the second tab then sends the cookie the first one just rotated,
   * instead of reusing the old token (which the server treats as theft).
   */
  refreshLock?: (run: () => Promise<boolean>) => Promise<boolean>;
  /** Override for tests or custom runtimes. Defaults to the global fetch. */
  fetch?: typeof fetch;
}

/** For endpoints that answer 204 No Content. */
const noContentSchema: ResponseSchema<undefined> = {
  safeParse: (data) =>
    data === undefined
      ? { success: true, data: undefined }
      : { success: false, error: new Error("Expected an empty response") },
};

export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const base = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Built by hand instead of URLSearchParams, which is incomplete on some React Native runtimes.
  const search = Object.entries(query ?? {})
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return `${base}${normalizedPath}${search ? `?${search}` : ""}`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === "") {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  const parsed = apiErrorResponseSchema.safeParse(payload);
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    return new ApiError(status, code, message, details);
  }
  // Not our error format (e.g. a proxy's HTML 502 page).
  return new ApiError(
    status,
    status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST",
    `Request failed with status ${String(status)}`,
  );
}

function isUnauthorized(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}

export function createApiClient(options: ApiClientOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const storage = options.refreshTokenStorage;

  // The access token lives only in memory: never in localStorage, where any script could read it.
  let accessToken: string | null = null;
  let state: SessionState = { status: "loading", user: null };
  const listeners = new Set<() => void>();
  let refreshInFlight: Promise<boolean> | null = null;

  function setState(next: SessionState): void {
    state = next;
    for (const listener of listeners) {
      listener();
    }
  }

  /** One HTTP round trip, no retry. */
  async function send<T>(path: string, requestOptions: RequestOptions<T>): Promise<T> {
    const { method = "GET", query, body, schema, signal } = requestOptions;

    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.clientType) {
      headers[CLIENT_TYPE_HEADER] = options.clientType;
    }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetchImpl(buildUrl(options.baseUrl, path, query), {
        method,
        headers,
        body: body === undefined ? null : JSON.stringify(body),
        signal: signal ?? null,
      });
    } catch (error) {
      // Cancellation (e.g. TanStack Query unmounting) is not a network failure.
      if (signal?.aborted) {
        throw error;
      }
      throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the server", undefined, {
        cause: error,
      });
    }

    const payload = await readBody(response);
    if (!response.ok) {
      throw toApiError(response.status, payload);
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(
        response.status,
        "INVALID_RESPONSE",
        "Unexpected response from server",
        undefined,
        { cause: parsed.error },
      );
    }
    return parsed.data;
  }

  async function applySession(session: AuthResponse): Promise<User> {
    accessToken = session.accessToken;
    if (storage && session.refreshToken) {
      await storage.set(session.refreshToken);
    }
    setState({ status: "authenticated", user: session.user });
    return session.user;
  }

  async function endSession(): Promise<void> {
    accessToken = null;
    await storage?.clear();
    setState({ status: "unauthenticated", user: null });
  }

  async function performRefresh(): Promise<boolean> {
    const storedToken = storage ? await storage.get() : null;
    if (storage && !storedToken) {
      await endSession();
      return false;
    }
    try {
      const session = await send("/auth/refresh", {
        method: "POST",
        body: storedToken ? { refreshToken: storedToken } : {},
        schema: authResponseSchema,
      });
      await applySession(session);
      return true;
    } catch (error) {
      if (isUnauthorized(error)) {
        await endSession();
        return false;
      }
      // Offline or server error: keep whatever we have and let the caller decide.
      throw error;
    }
  }

  /** Every caller that needs a refresh at the same time shares one request. */
  function refreshSession(): Promise<boolean> {
    refreshInFlight ??= (
      options.refreshLock ? options.refreshLock(performRefresh) : performRefresh()
    ).finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  /**
   * Authenticated request: on 401 (expired access token) refresh once and retry.
   * If the refresh fails the session ends and the original 401 is rethrown.
   */
  async function request<T>(path: string, requestOptions: RequestOptions<T>): Promise<T> {
    try {
      return await send(path, requestOptions);
    } catch (error) {
      if (!isUnauthorized(error) || !(await refreshSession())) {
        throw error;
      }
      return send(path, requestOptions);
    }
  }

  const session = {
    getState: (): SessionState => state,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Called once at app start: turns a stored refresh token (or cookie) into a session. */
    async restore(): Promise<void> {
      if (state.status === "authenticated") {
        return;
      }
      try {
        await refreshSession();
      } catch {
        // Could not reach the server; show the sign-in screen rather than a spinner forever.
        if (state.status === "loading") {
          setState({ status: "unauthenticated", user: null });
        }
      }
    },

    async signIn(input: LoginInput): Promise<User> {
      return applySession(
        await send("/auth/login", { method: "POST", body: input, schema: authResponseSchema }),
      );
    },

    async signUp(input: RegisterInput): Promise<User> {
      return applySession(
        await send("/auth/register", { method: "POST", body: input, schema: authResponseSchema }),
      );
    },

    /** Revokes the session on the server (best effort) and always clears it locally. */
    async signOut(): Promise<void> {
      const storedToken = storage ? await storage.get() : null;
      try {
        await send("/auth/logout", {
          method: "POST",
          body: storedToken ? { refreshToken: storedToken } : {},
          schema: noContentSchema,
        });
      } catch {
        // Offline: the local session still ends; the server token expires on its own.
      }
      await endSession();
    },
  };

  return {
    request,
    session,
    health: (signal?: AbortSignal): Promise<HealthResponse> =>
      request("/health", { schema: healthResponseSchema, ...(signal ? { signal } : {}) }),
    me: (signal?: AbortSignal): Promise<User> =>
      request("/me", { schema: userSchema, ...(signal ? { signal } : {}) }),

    wallets: {
      list: (signal?: AbortSignal): Promise<Wallet[]> =>
        request("/wallets", { schema: walletListSchema, ...(signal ? { signal } : {}) }),
      create: (body: CreateWalletInput): Promise<Wallet> =>
        request("/wallets", { method: "POST", body, schema: walletSchema }),
      update: (id: string, body: UpdateWalletInput): Promise<Wallet> =>
        request(`/wallets/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body,
          schema: walletSchema,
        }),
      remove: (id: string): Promise<undefined> =>
        request(`/wallets/${encodeURIComponent(id)}`, {
          method: "DELETE",
          schema: noContentSchema,
        }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
