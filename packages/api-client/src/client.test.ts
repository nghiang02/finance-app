import { describe, expect, it, vi } from "vitest";

import { buildUrl, createApiClient } from "./client.js";
import { ApiError } from "./errors.js";

const BASE_URL = "http://localhost:3000/api/v1/";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup() {
  const fetchMock = vi.fn<typeof fetch>();
  const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchMock });
  return { client, fetchMock };
}

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) {
      return error;
    }
    throw error;
  }
  throw new Error("expected the request to fail");
}

describe("buildUrl", () => {
  it("joins base URL and path without double slashes", () => {
    expect(buildUrl("http://api.test/api/v1/", "/health")).toBe("http://api.test/api/v1/health");
    expect(buildUrl("http://api.test/api/v1", "health")).toBe("http://api.test/api/v1/health");
  });

  it("encodes query params and skips undefined values", () => {
    expect(
      buildUrl("http://api.test", "/transactions", {
        month: "2026-11",
        q: "cà phê & bánh",
        walletId: undefined,
        limit: 20,
      }),
    ).toBe(
      "http://api.test/transactions?month=2026-11&q=c%C3%A0%20ph%C3%AA%20%26%20b%C3%A1nh&limit=20",
    );
  });
});

describe("createApiClient – requests", () => {
  it("GETs and validates the response with the shared schema", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(jsonResponse({ status: "ok" }));

    await expect(client.health()).resolves.toEqual({ status: "ok" });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://localhost:3000/api/v1/health");
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({ Accept: "application/json" });
    expect(init?.body).toBeNull();
  });

  it("serializes a JSON body", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(jsonResponse({ status: "ok" }, 201));
    const schema = { safeParse: (data: unknown) => ({ success: true as const, data }) };

    await client.request("/items", { method: "POST", body: { amount: 25_000 }, schema });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.body).toBe('{"amount":25000}');
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("turns the API error format into an ApiError with code and details", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: { issues: [{ path: "amount", message: "Too small" }] },
          },
        },
        400,
      ),
    );

    const error = await captureError(client.health());

    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      details: { issues: [{ path: "amount", message: "Too small" }] },
    });
  });

  it("handles error bodies that are not in the API format (e.g. a proxy HTML page)", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(new Response("<html>Bad Gateway</html>", { status: 502 }));

    expect(await captureError(client.health())).toMatchObject({
      status: 502,
      code: "INTERNAL_ERROR",
    });
  });

  it("rejects a successful response that does not match the schema", async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(jsonResponse({ status: "maybe" }));

    expect(await captureError(client.health())).toMatchObject({
      status: 200,
      code: "INVALID_RESPONSE",
    });
  });

  it("reports NETWORK_ERROR (status 0) when the server is unreachable", async () => {
    const { client, fetchMock } = setup();
    const cause = new TypeError("fetch failed");
    fetchMock.mockRejectedValue(cause);

    const error = await captureError(client.health());

    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
    expect(error.cause).toBe(cause);
  });

  it("rethrows cancellations untouched so TanStack Query can ignore them", async () => {
    const { client, fetchMock } = setup();
    const controller = new AbortController();
    controller.abort();
    const abortError = new DOMException("Aborted", "AbortError");
    fetchMock.mockRejectedValue(abortError);

    await expect(client.health(controller.signal)).rejects.toBe(abortError);
  });
});
