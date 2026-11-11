import { describe, expect, it, vi } from "vitest";

import { createApiClient, type RefreshTokenStorage } from "./client.js";
import { ApiError } from "./errors.js";

const BASE_URL = "http://api.test/api/v1";
const USER = {
  id: "u1",
  email: "an@example.com",
  name: "An",
  currency: "VND",
  timezone: "Asia/Ho_Chi_Minh",
  createdAt: "2026-11-12T01:00:00.000Z",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authBody(accessToken: string, refreshToken?: string) {
  return { user: USER, accessToken, expiresIn: 900, ...(refreshToken ? { refreshToken } : {}) };
}

const unauthorized = () =>
  json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired access token" } }, 401);

function memoryStorage(
  initial: string | null = null,
): RefreshTokenStorage & { value: string | null } {
  return {
    value: initial,
    get() {
      return Promise.resolve(this.value);
    },
    set(token) {
      this.value = token;
      return Promise.resolve();
    },
    clear() {
      this.value = null;
      return Promise.resolve();
    },
  };
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
}

/** Routes requests by path so tests read like a tiny fake server. */
function fakeServer(routes: Record<string, (init: RequestInit | undefined) => Response>) {
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const path = new URL(urlOf(input)).pathname.replace("/api/v1", "");
    const handler = routes[path];
    if (!handler) {
      return Promise.reject(new Error(`unexpected request ${path}`));
    }
    return Promise.resolve(handler(init));
  });
  const calls = (path: string) =>
    fetchMock.mock.calls.filter(([input]) => urlOf(input).endsWith(path));
  return { fetchMock, calls };
}

function authorizationOf(init: RequestInit | undefined): string | undefined {
  return (init?.headers as Record<string, string> | undefined)?.Authorization;
}

describe("session (web: cookie)", () => {
  it("starts as loading and becomes unauthenticated when there is no cookie", async () => {
    const { fetchMock } = fakeServer({ "/auth/refresh": unauthorized });
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchMock });
    expect(client.session.getState().status).toBe("loading");

    await client.session.restore();

    expect(client.session.getState()).toEqual({ status: "unauthenticated", user: null });
  });

  it("restores an existing session from the cookie and notifies subscribers", async () => {
    const { fetchMock, calls } = fakeServer({ "/auth/refresh": () => json(authBody("a1")) });
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchMock });
    const listener = vi.fn();
    client.session.subscribe(listener);

    await client.session.restore();

    expect(client.session.getState()).toEqual({ status: "authenticated", user: USER });
    expect(listener).toHaveBeenCalled();
    // Web sends an empty body: the httpOnly cookie carries the refresh token.
    expect(calls("/auth/refresh")[0]?.[1]?.body).toBe("{}");
  });

  it("signs in, then sends the access token on API requests", async () => {
    const { fetchMock, calls } = fakeServer({
      "/auth/login": () => json(authBody("a1")),
      "/me": (init) => (authorizationOf(init) === "Bearer a1" ? json(USER) : unauthorized()),
    });
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchMock });

    await client.session.signIn({ email: "an@example.com", password: "secret123" });
    await expect(client.me()).resolves.toEqual(USER);

    expect(authorizationOf(calls("/me")[0]?.[1])).toBe("Bearer a1");
  });

  it("does not try to refresh when the login itself is rejected", async () => {
    const { fetchMock, calls } = fakeServer({ "/auth/login": unauthorized });
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchMock });

    await expect(
      client.session.signIn({ email: "an@example.com", password: "wrong" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(calls("/auth/refresh")).toHaveLength(0);
  });
});

describe("automatic refresh on 401", () => {
  it("refreshes an expired access token once and retries the request", async () => {
    let currentToken = "expired";
    const { fetchMock, calls } = fakeServer({
      "/auth/login": () => json(authBody(currentToken)),
      "/auth/refresh": () => {
        currentToken = "fresh";
        return json(authBody("fresh"));
      },
      "/me": (init) => (authorizationOf(init) === "Bearer fresh" ? json(USER) : unauthorized()),
    });
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchMock });
    await client.session.signIn({ email: "an@example.com", password: "secret123" });

    await expect(client.me()).resolves.toEqual(USER);

    expect(calls("/auth/refresh")).toHaveLength(1);
    expect(calls("/me")).toHaveLength(2);
  });

  it("shares one refresh between concurrent requests (no token reuse)", async () => {
    const { fetchMock, calls } = fakeServer({
      "/auth/login": () => json(authBody("expired")),
      "/auth/refresh": () => json(authBody("fresh")),
      "/me": (init) => (authorizationOf(init) === "Bearer fresh" ? json(USER) : unauthorized()),
    });
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchMock });
    await client.session.signIn({ email: "an@example.com", password: "secret123" });

    await Promise.all([client.me(), client.me(), client.me()]);

    expect(calls("/auth/refresh")).toHaveLength(1);
  });

  it("ends the session when the refresh is rejected, and rethrows the original 401", async () => {
    const { fetchMock } = fakeServer({
      "/auth/login": () => json(authBody("expired")),
      "/auth/refresh": unauthorized,
      "/me": unauthorized,
    });
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchMock });
    await client.session.signIn({ email: "an@example.com", password: "secret123" });

    await expect(client.me()).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" });
    expect(client.session.getState()).toEqual({ status: "unauthenticated", user: null });
  });

  it("runs refreshes through refreshLock (web: navigator.locks across tabs)", async () => {
    const { fetchMock } = fakeServer({ "/auth/refresh": () => json(authBody("a1")) });
    const refreshLock = vi.fn((run: () => Promise<boolean>) => run());
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchMock, refreshLock });

    await client.session.restore();

    expect(refreshLock).toHaveBeenCalledTimes(1);
    expect(client.session.getState().status).toBe("authenticated");
  });

  it("shows the sign-in screen (not an endless spinner) when the server is unreachable", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchMock });

    await client.session.restore();

    expect(client.session.getState().status).toBe("unauthenticated");
  });
});

describe("session (mobile: refresh token storage)", () => {
  it("stores the refresh token from sign-in and sends the client type", async () => {
    const storage = memoryStorage();
    const { fetchMock, calls } = fakeServer({ "/auth/register": () => json(authBody("a1", "r1")) });
    const client = createApiClient({
      baseUrl: BASE_URL,
      fetch: fetchMock,
      clientType: "mobile",
      refreshTokenStorage: storage,
    });

    await client.session.signUp({ email: "an@example.com", password: "secret123" });

    expect(storage.value).toBe("r1");
    expect(calls("/auth/register")[0]?.[1]?.headers).toMatchObject({ "x-client-type": "mobile" });
  });

  it("restores from the stored token and saves the rotated one", async () => {
    const storage = memoryStorage("r1");
    const { fetchMock, calls } = fakeServer({ "/auth/refresh": () => json(authBody("a2", "r2")) });
    const client = createApiClient({
      baseUrl: BASE_URL,
      fetch: fetchMock,
      clientType: "mobile",
      refreshTokenStorage: storage,
    });

    await client.session.restore();

    expect(calls("/auth/refresh")[0]?.[1]?.body).toBe('{"refreshToken":"r1"}');
    expect(storage.value).toBe("r2");
    expect(client.session.getState().status).toBe("authenticated");
  });

  it("skips the network entirely when nothing is stored", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = createApiClient({
      baseUrl: BASE_URL,
      fetch: fetchMock,
      clientType: "mobile",
      refreshTokenStorage: memoryStorage(),
    });

    await client.session.restore();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(client.session.getState().status).toBe("unauthenticated");
  });

  it("signs out on the server and wipes the stored token, even when offline", async () => {
    const storage = memoryStorage("r1");
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));
    const client = createApiClient({
      baseUrl: BASE_URL,
      fetch: fetchMock,
      clientType: "mobile",
      refreshTokenStorage: storage,
    });

    await client.session.signOut();

    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe('{"refreshToken":"r1"}');
    expect(storage.value).toBeNull();
    expect(client.session.getState().status).toBe("unauthenticated");
  });

  it("clears a rejected stored token so the app does not retry it on every launch", async () => {
    const storage = memoryStorage("revoked");
    const { fetchMock } = fakeServer({ "/auth/refresh": unauthorized });
    const client = createApiClient({
      baseUrl: BASE_URL,
      fetch: fetchMock,
      clientType: "mobile",
      refreshTokenStorage: storage,
    });

    await client.session.restore();

    expect(storage.value).toBeNull();
  });
});
