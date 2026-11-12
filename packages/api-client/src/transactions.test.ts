import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client.js";
import { queryKeys } from "./query-keys.js";
import { normalizeTransactionFilters } from "./react.js";

const TRANSACTION = {
  id: "6f1c2d9e-8a4b-4c3d-9e2f-1a2b3c4d5e6f",
  type: "EXPENSE",
  amount: 45_000,
  walletId: "0b6f7c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e",
  toWalletId: null,
  categoryId: "3c2b1a0f-9e8d-4c7b-8a6f-5e4d3c2b1a0f",
  note: "Phở",
  occurredAt: "2026-11-12T02:30:00.000Z",
  createdAt: "2026-11-12T02:31:00.000Z",
  updatedAt: "2026-11-12T02:31:00.000Z",
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

describe("transactions endpoints", () => {
  it("creates, reads, updates and deletes by id", async () => {
    const created = setup(json(TRANSACTION, 201));
    await created.client.transactions.create({
      type: "EXPENSE",
      amount: 45_000,
      walletId: TRANSACTION.walletId,
      categoryId: TRANSACTION.categoryId,
      occurredAt: "2026-11-12T09:30:00+07:00",
    });
    expect(created.call()).toMatchObject({
      url: "http://api.test/api/v1/transactions",
      method: "POST",
    });

    const read = setup(json(TRANSACTION));
    await expect(read.client.transactions.get(TRANSACTION.id)).resolves.toEqual(TRANSACTION);
    expect(read.call().url).toBe(`http://api.test/api/v1/transactions/${TRANSACTION.id}`);

    const updated = setup(json({ ...TRANSACTION, amount: 50_000 }));
    await updated.client.transactions.update(TRANSACTION.id, { amount: 50_000 });
    expect(updated.call()).toMatchObject({ method: "PATCH", body: '{"amount":50000}' });

    const deleted = setup(new Response(null, { status: 204 }));
    await expect(deleted.client.transactions.remove(TRANSACTION.id)).resolves.toBeUndefined();
    expect(deleted.call()).toMatchObject({ method: "DELETE" });
  });

  it("rejects a non-integer amount from the server (contract check)", async () => {
    const { client } = setup(json({ ...TRANSACTION, amount: 45_000.5 }));
    await expect(client.transactions.get(TRANSACTION.id)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("keeps single-transaction keys under the root key, so one invalidation covers both", () => {
    expect(queryKeys.transaction("x").slice(0, 1)).toEqual([...queryKeys.transactions]);
  });
});

describe("transaction list", () => {
  it("sends filters and cursor as query parameters and skips empty ones", async () => {
    const { client, call } = setup(json({ items: [TRANSACTION], nextCursor: "abc" }));

    await expect(
      client.transactions.list({
        month: "2026-11",
        walletId: TRANSACTION.walletId,
        q: "phở bò",
        cursor: "xyz",
      }),
    ).resolves.toEqual({ items: [TRANSACTION], nextCursor: "abc" });
    expect(call().url).toBe(
      `http://api.test/api/v1/transactions?month=2026-11&walletId=${TRANSACTION.walletId}&q=ph%E1%BB%9F%20b%C3%B2&cursor=xyz`,
    );
  });

  it("normalizes filters so equivalent screens share a cache entry", () => {
    expect(normalizeTransactionFilters({ month: "2026-11", q: "  ", walletId: "" })).toEqual({
      month: "2026-11",
    });
    expect(normalizeTransactionFilters({ month: "2026-11", type: "EXPENSE", q: " phở " })).toEqual({
      month: "2026-11",
      type: "EXPENSE",
      q: "phở",
    });
    expect(queryKeys.transactionList({ month: "2026-11" }).slice(0, 1)).toEqual([
      ...queryKeys.transactions,
    ]);
  });
});
