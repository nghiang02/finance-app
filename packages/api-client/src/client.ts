import {
  apiErrorResponseSchema,
  type AuthResponse,
  authResponseSchema,
  CLIENT_TYPE_HEADER,
  type ClientType,
  healthResponseSchema,
  type HealthResponse,
  type LoginInput,
  type RegisterInput,
  type User,
  userSchema,
} from "@finance/shared";

import { ApiError } from "./errors.js";

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

export interface ApiClientOptions {
  /** Base URL including the version prefix, e.g. "http://localhost:3000/api/v1". */
  baseUrl: string;
  /** Returns the current access token, if any. Wired up in the auth phase. */
  getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>;
  /**
   * "mobile" receives the refresh token in the response body (store it in SecureStore).
   * Web leaves this unset and gets an httpOnly cookie instead.
   */
  clientType?: ClientType;
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

export function createApiClient(options: ApiClientOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);

  async function request<T>(path: string, requestOptions: RequestOptions<T>): Promise<T> {
    const { method = "GET", query, body, schema, signal } = requestOptions;

    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.clientType) {
      headers[CLIENT_TYPE_HEADER] = options.clientType;
    }
    const token = await options.getAccessToken?.();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
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

  return {
    request,
    health: (signal?: AbortSignal): Promise<HealthResponse> =>
      request("/health", { schema: healthResponseSchema, ...(signal ? { signal } : {}) }),

    auth: {
      register: (body: RegisterInput): Promise<AuthResponse> =>
        request("/auth/register", { method: "POST", body, schema: authResponseSchema }),
      login: (body: LoginInput): Promise<AuthResponse> =>
        request("/auth/login", { method: "POST", body, schema: authResponseSchema }),
      /** Mobile passes its stored refresh token; web passes nothing (the cookie is sent). */
      refresh: (refreshToken?: string): Promise<AuthResponse> =>
        request("/auth/refresh", {
          method: "POST",
          body: refreshToken ? { refreshToken } : {},
          schema: authResponseSchema,
        }),
      logout: (refreshToken?: string): Promise<undefined> =>
        request("/auth/logout", {
          method: "POST",
          body: refreshToken ? { refreshToken } : {},
          schema: noContentSchema,
        }),
    },

    me: (signal?: AbortSignal): Promise<User> =>
      request("/me", { schema: userSchema, ...(signal ? { signal } : {}) }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
