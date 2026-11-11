import { apiErrorResponseSchema, healthResponseSchema, type HealthResponse } from "@finance/shared";

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
  /** Override for tests or custom runtimes. Defaults to the global fetch. */
  fetch?: typeof fetch;
}

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
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
