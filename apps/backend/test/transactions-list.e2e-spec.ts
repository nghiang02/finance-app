import {
  apiErrorResponseSchema,
  categoryListSchema,
  transactionPageSchema,
  transactionSchema,
  walletSchema,
} from "@finance/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestApp, registerUser, type TestApp, type TestUser } from "./support.js";
import { getTestDatabaseUrl } from "./test-database.js";

const databaseUrl = getTestDatabaseUrl();

describe.skipIf(!databaseUrl)("Transaction list (integration, real database)", () => {
  let t: TestApp;
  let an: TestUser;
  let cashId: string;
  let bankId: string;
  let categories: Map<string, string>;

  beforeEach(async () => {
    t = await createTestApp(databaseUrl ?? "");
    an = await registerUser(t, "an@example.com");
    cashId = await createWallet(an, "Tiền mặt", "CASH");
    bankId = await createWallet(an, "Ngân hàng", "BANK");
    categories = await categoryIds(an);
  });

  afterEach(async () => {
    await t.app.close();
  });

  async function createWallet(user: TestUser, name: string, type: string): Promise<string> {
    const res = await t
      .http()
      .post("/api/v1/wallets")
      .set("Authorization", user.auth)
      .send({ name, type, initialBalance: 10_000_000 });
    return walletSchema.parse(res.body).id;
  }

  async function categoryIds(user: TestUser): Promise<Map<string, string>> {
    const res = await t.http().get("/api/v1/categories").set("Authorization", user.auth);
    return new Map(categoryListSchema.parse(res.body).map((c) => [c.name, c.id]));
  }

  function category(name: string): string {
    const id = categories.get(name);
    if (!id) {
      throw new Error(`Category ${name} not found`);
    }
    return id;
  }

  async function add(user: TestUser, body: Record<string, unknown>): Promise<string> {
    const res = await t
      .http()
      .post("/api/v1/transactions")
      .set("Authorization", user.auth)
      .send(body);
    expect(res.status).toBe(201);
    return transactionSchema.parse(res.body).id;
  }

  function expense(occurredAt: string, categoryName: string, note?: string, amount = 10_000) {
    return add(an, {
      type: "EXPENSE",
      amount,
      walletId: cashId,
      categoryId: category(categoryName),
      occurredAt,
      ...(note && { note }),
    });
  }

  async function list(query: Record<string, string>, user: TestUser = an) {
    const res = await t
      .http()
      .get("/api/v1/transactions")
      .query(query)
      .set("Authorization", user.auth);
    expect(res.status).toBe(200);
    return transactionPageSchema.parse(res.body);
  }

  it("uses the user's month boundaries (Asia/Ho_Chi_Minh)", async () => {
    const lastMinuteOfOctober = await expense("2026-10-31T23:59:00+07:00", "Ăn uống");
    const firstMinuteOfNovember = await expense("2026-11-01T00:01:00+07:00", "Ăn uống");
    const lastMinuteOfNovember = await expense("2026-11-30T23:59:00+07:00", "Ăn uống");
    const firstMinuteOfDecember = await expense("2026-12-01T00:00:00+07:00", "Ăn uống");

    const november = await list({ month: "2026-11" });
    expect(november.items.map((item) => item.id)).toEqual([
      lastMinuteOfNovember,
      firstMinuteOfNovember,
    ]);
    expect(november.nextCursor).toBeNull();
    expect((await list({ month: "2026-10" })).items.map((i) => i.id)).toEqual([
      lastMinuteOfOctober,
    ]);
    expect((await list({ month: "2026-12" })).items.map((i) => i.id)).toEqual([
      firstMinuteOfDecember,
    ]);
  });

  it("pages through every transaction once, even with equal timestamps", async () => {
    const ids = new Set<string>();
    for (let index = 0; index < 5; index++) {
      ids.add(await expense("2026-11-12T09:00:00+07:00", "Ăn uống")); // same instant
    }
    ids.add(await expense("2026-11-13T09:00:00+07:00", "Ăn uống"));
    ids.add(await expense("2026-11-11T09:00:00+07:00", "Ăn uống"));

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await list({ month: "2026-11", limit: "3", ...(cursor ? { cursor } : {}) });
      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
      pages++;
    } while (cursor && pages < 10);

    expect(pages).toBe(3);
    expect(seen).toHaveLength(7);
    expect(new Set(seen)).toEqual(ids);
    const page = await list({ month: "2026-11" });
    const times = page.items.map((item) => item.occurredAt);
    expect(times).toEqual([...times].sort().reverse()); // newest first
  });

  it("filters by wallet including incoming transfers", async () => {
    const lunch = await expense("2026-11-12T12:00:00+07:00", "Ăn uống");
    const topUp = await add(an, {
      type: "TRANSFER",
      amount: 500_000,
      walletId: bankId,
      toWalletId: cashId,
      occurredAt: "2026-11-12T08:00:00+07:00",
    });
    const salary = await add(an, {
      type: "INCOME",
      amount: 15_000_000,
      walletId: bankId,
      categoryId: category("Lương"),
      occurredAt: "2026-11-05T10:00:00+07:00",
    });

    expect((await list({ month: "2026-11", walletId: cashId })).items.map((i) => i.id)).toEqual([
      lunch,
      topUp,
    ]);
    expect((await list({ month: "2026-11", walletId: bankId })).items.map((i) => i.id)).toEqual([
      topUp,
      salary,
    ]);
    expect((await list({ month: "2026-11", type: "INCOME" })).items.map((i) => i.id)).toEqual([
      salary,
    ]);
  });

  it("filters by a parent category including its children", async () => {
    const food = await expense("2026-11-12T12:00:00+07:00", "Ăn uống");
    const coffee = await expense("2026-11-12T09:00:00+07:00", "Cà phê");
    await expense("2026-11-12T08:00:00+07:00", "Di chuyển");

    const byParent = await list({ month: "2026-11", categoryId: category("Ăn uống") });
    expect(byParent.items.map((i) => i.id)).toEqual([food, coffee]);
    const byChild = await list({ month: "2026-11", categoryId: category("Cà phê") });
    expect(byChild.items.map((i) => i.id)).toEqual([coffee]);
  });

  it("searches the note and the category name, case-insensitively", async () => {
    const pho = await expense("2026-11-12T12:00:00+07:00", "Ăn uống", "Phở bò Hà Nội");
    const latte = await expense("2026-11-12T09:00:00+07:00", "Cà phê", "Latte");
    await expense("2026-11-12T08:00:00+07:00", "Di chuyển", "Grab");

    // Only ASCII letters change case here: folding "ở"/"Ở" depends on the database locale.
    expect((await list({ month: "2026-11", q: "PHở bò" })).items.map((i) => i.id)).toEqual([pho]);
    expect((await list({ month: "2026-11", q: "cà phê" })).items.map((i) => i.id)).toEqual([latte]);
  });

  it("leaves out deleted transactions and other users' transactions", async () => {
    const kept = await expense("2026-11-12T12:00:00+07:00", "Ăn uống");
    const removed = await expense("2026-11-12T13:00:00+07:00", "Ăn uống");
    await t
      .http()
      .delete(`/api/v1/transactions/${removed}`)
      .set("Authorization", an.auth)
      .expect(204);
    const binh = await registerUser(t, "binh@example.com");

    expect((await list({ month: "2026-11" })).items.map((i) => i.id)).toEqual([kept]);
    expect((await list({ month: "2026-11" }, binh)).items).toEqual([]);
  });

  it("rejects a missing month and a forged cursor", async () => {
    await t.http().get("/api/v1/transactions").set("Authorization", an.auth).expect(400);
    const res = await t
      .http()
      .get("/api/v1/transactions")
      .query({ month: "2026-11", cursor: "not-a-cursor" })
      .set("Authorization", an.auth);

    expect(res.status).toBe(400);
    expect(apiErrorResponseSchema.parse(res.body).error.code).toBe("VALIDATION_ERROR");
  });
});
