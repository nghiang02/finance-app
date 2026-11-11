import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client.js";

const WALLET = {
  id: "6f1c2d9e-8a4b-4c3d-9e2f-1a2b3c4d5e6f",
  name: "Tiền mặt",
  type: "CASH",
  currency: "VND",
  initialBalance: 0,
  balance: 150_000,
  archived: false,
  createdAt: "2026-11-12T01:00:00.000Z",
  updatedAt: "2026-11-12T01:00:00.000Z",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  const client = createApiClient({ baseUrl: "http://api.test/api/v1", fetch: fetchMock });
  const call = () => {
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    return { url, method: init?.method, body: init?.body };
  };
  return { client, call };
}

describe("wallets endpoints", () => {
  it("lists wallets with their balance", async () => {
    const { client, call } = setup(json([WALLET]));

    await expect(client.wallets.list()).resolves.toEqual([WALLET]);
    expect(call()).toMatchObject({ url: "http://api.test/api/v1/wallets", method: "GET" });
  });

  it("creates, updates and deletes by id", async () => {
    const created = setup(json(WALLET, 201));
    await created.client.wallets.create({ name: "Tiền mặt", type: "CASH" });
    expect(created.call()).toMatchObject({
      method: "POST",
      body: '{"name":"Tiền mặt","type":"CASH"}',
    });

    const updated = setup(json({ ...WALLET, archived: true }));
    await updated.client.wallets.update(WALLET.id, { archived: true });
    expect(updated.call()).toMatchObject({
      url: `http://api.test/api/v1/wallets/${WALLET.id}`,
      method: "PATCH",
      body: '{"archived":true}',
    });

    const deleted = setup(new Response(null, { status: 204 }));
    await expect(deleted.client.wallets.remove(WALLET.id)).resolves.toBeUndefined();
    expect(deleted.call()).toMatchObject({ method: "DELETE" });
  });

  it("rejects a response whose balance is not an integer (contract check)", async () => {
    const { client } = setup(json([{ ...WALLET, balance: 1.5 }]));

    await expect(client.wallets.list()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
