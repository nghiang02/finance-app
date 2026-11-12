import {
  apiErrorResponseSchema,
  categoryListSchema,
  transactionSchema,
  validationErrorDetailsSchema,
  walletListSchema,
  walletSchema,
} from "@finance/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestApp, registerUser, type TestApp, type TestUser } from "./support.js";
import { getTestDatabaseUrl } from "./test-database.js";

const databaseUrl = getTestDatabaseUrl();
const AT = "2026-11-12T09:30:00+07:00";

describe.skipIf(!databaseUrl)("Transactions (integration, real database)", () => {
  let t: TestApp;
  let an: TestUser;
  let binh: TestUser;

  beforeEach(async () => {
    t = await createTestApp(databaseUrl ?? "");
    an = await registerUser(t, "an@example.com");
    binh = await registerUser(t, "binh@example.com");
  });

  afterEach(async () => {
    await t.app.close();
  });

  async function createWallet(user: TestUser, body: Record<string, unknown>) {
    const res = await t.http().post("/api/v1/wallets").set("Authorization", user.auth).send(body);
    expect(res.status).toBe(201);
    return walletSchema.parse(res.body);
  }

  async function balances(user: TestUser): Promise<Record<string, number>> {
    const res = await t.http().get("/api/v1/wallets").set("Authorization", user.auth).expect(200);
    return Object.fromEntries(walletListSchema.parse(res.body).map((w) => [w.name, w.balance]));
  }

  async function categoryId(user: TestUser, name: string): Promise<string> {
    const res = await t
      .http()
      .get("/api/v1/categories")
      .set("Authorization", user.auth)
      .expect(200);
    const category = categoryListSchema.parse(res.body).find((c) => c.name === name);
    if (!category) {
      throw new Error(`Category ${name} not found`);
    }
    return category.id;
  }

  function post(user: TestUser, body: Record<string, unknown>) {
    return t.http().post("/api/v1/transactions").set("Authorization", user.auth).send(body);
  }

  function patch(user: TestUser, id: string, body: Record<string, unknown>) {
    return t.http().patch(`/api/v1/transactions/${id}`).set("Authorization", user.auth).send(body);
  }

  function issues(body: unknown): Record<string, string> {
    const { error } = apiErrorResponseSchema.parse(body);
    expect(error.code).toBe("VALIDATION_ERROR");
    return Object.fromEntries(
      validationErrorDetailsSchema.parse(error.details).issues.map((i) => [i.path, i.message]),
    );
  }

  describe("create", () => {
    it("records income and expense and the wallet balance follows", async () => {
      const cash = await createWallet(an, {
        name: "Tiền mặt",
        type: "CASH",
        initialBalance: 500_000,
      });

      const salary = await post(an, {
        type: "INCOME",
        amount: 10_000_000,
        walletId: cash.id,
        categoryId: await categoryId(an, "Lương"),
        occurredAt: AT,
      });
      expect(salary.status).toBe(201);
      const pho = await post(an, {
        type: "EXPENSE",
        amount: 45_000,
        walletId: cash.id,
        categoryId: await categoryId(an, "Ăn uống"),
        occurredAt: AT,
        note: "Phở bò",
      });
      expect(pho.status).toBe(201);

      expect(transactionSchema.parse(pho.body)).toMatchObject({
        type: "EXPENSE",
        amount: 45_000,
        walletId: cash.id,
        toWalletId: null,
        note: "Phở bò",
        // 09:30 in Vietnam (UTC+7) is stored and returned as 02:30 UTC.
        occurredAt: "2026-11-12T02:30:00.000Z",
      });
      expect((await balances(an))["Tiền mặt"]).toBe(500_000 + 10_000_000 - 45_000);
    });

    it("moves money between wallets with a transfer", async () => {
      const bank = await createWallet(an, {
        name: "Ngân hàng",
        type: "BANK",
        initialBalance: 3_000_000,
      });
      const cash = await createWallet(an, { name: "Tiền mặt", type: "CASH" });

      const res = await post(an, {
        type: "TRANSFER",
        amount: 1_000_000,
        walletId: bank.id,
        toWalletId: cash.id,
        occurredAt: AT,
      });

      expect(res.status).toBe(201);
      expect(transactionSchema.parse(res.body).categoryId).toBeNull();
      expect(await balances(an)).toEqual({ "Ngân hàng": 2_000_000, "Tiền mặt": 1_000_000 });
    });

    it("requires a category of the same type", async () => {
      const cash = await createWallet(an, { name: "Tiền mặt", type: "CASH" });
      const res = await post(an, {
        type: "EXPENSE",
        amount: 10_000,
        walletId: cash.id,
        categoryId: await categoryId(an, "Lương"),
        occurredAt: AT,
      });

      expect(res.status).toBe(400);
      expect(Object.keys(issues(res.body))).toEqual(["categoryId"]);
    });

    it("treats another user's wallet or category as missing", async () => {
      const mine = await createWallet(an, { name: "Tiền mặt", type: "CASH" });
      const theirs = await createWallet(binh, { name: "Của Bình", type: "CASH" });

      const intoTheirWallet = await post(an, {
        type: "EXPENSE",
        amount: 10_000,
        walletId: theirs.id,
        categoryId: await categoryId(an, "Ăn uống"),
        occurredAt: AT,
      });
      expect(issues(intoTheirWallet.body)).toEqual({ walletId: "Ví không tồn tại" });

      const theirCategory = await post(an, {
        type: "EXPENSE",
        amount: 10_000,
        walletId: mine.id,
        categoryId: await categoryId(binh, "Ăn uống"),
        occurredAt: AT,
      });
      expect(issues(theirCategory.body)).toEqual({ categoryId: "Danh mục không tồn tại" });

      const toTheirWallet = await post(an, {
        type: "TRANSFER",
        amount: 10_000,
        walletId: mine.id,
        toWalletId: theirs.id,
        occurredAt: AT,
      });
      expect(issues(toTheirWallet.body)).toEqual({ toWalletId: "Ví không tồn tại" });
      expect((await balances(binh))["Của Bình"]).toBe(0);
    });

    it("refuses archived wallets and transfers between currencies", async () => {
      const cash = await createWallet(an, { name: "Tiền mặt", type: "CASH" });
      const old = await createWallet(an, { name: "Ví cũ", type: "CASH" });
      await t
        .http()
        .patch(`/api/v1/wallets/${old.id}`)
        .set("Authorization", an.auth)
        .send({ archived: true })
        .expect(200);
      const usd = await createWallet(an, { name: "USD", type: "BANK", currency: "USD" });

      const archived = await post(an, {
        type: "TRANSFER",
        amount: 1_000,
        walletId: cash.id,
        toWalletId: old.id,
        occurredAt: AT,
      });
      expect(Object.keys(issues(archived.body))).toEqual(["toWalletId"]);

      const currencies = await post(an, {
        type: "TRANSFER",
        amount: 1_000,
        walletId: cash.id,
        toWalletId: usd.id,
        occurredAt: AT,
      });
      expect(issues(currencies.body)).toEqual({ toWalletId: "Hai ví phải cùng loại tiền tệ" });
    });

    it("rejects invalid bodies with field errors", async () => {
      const cash = await createWallet(an, { name: "Tiền mặt", type: "CASH" });
      const res = await post(an, { type: "EXPENSE", amount: 0, walletId: cash.id, occurredAt: AT });

      expect(res.status).toBe(400);
      expect(issues(res.body)).toEqual({
        amount: "Số tiền phải lớn hơn 0",
        categoryId: "Chọn danh mục",
      });
    });
  });

  describe("update and delete", () => {
    it("updates the amount and the balance follows", async () => {
      const cash = await createWallet(an, {
        name: "Tiền mặt",
        type: "CASH",
        initialBalance: 100_000,
      });
      const created = transactionSchema.parse(
        (
          await post(an, {
            type: "EXPENSE",
            amount: 45_000,
            walletId: cash.id,
            categoryId: await categoryId(an, "Ăn uống"),
            occurredAt: AT,
          })
        ).body,
      );

      const res = await patch(an, created.id, { amount: 60_000, note: "Lẩu" });

      expect(res.status).toBe(200);
      expect(transactionSchema.parse(res.body)).toMatchObject({ amount: 60_000, note: "Lẩu" });
      expect((await balances(an))["Tiền mặt"]).toBe(40_000);
    });

    it("turns an expense into a transfer", async () => {
      const bank = await createWallet(an, {
        name: "Ngân hàng",
        type: "BANK",
        initialBalance: 1_000_000,
      });
      const cash = await createWallet(an, { name: "Tiền mặt", type: "CASH" });
      const created = transactionSchema.parse(
        (
          await post(an, {
            type: "EXPENSE",
            amount: 200_000,
            walletId: bank.id,
            categoryId: await categoryId(an, "Mua sắm"),
            occurredAt: AT,
          })
        ).body,
      );

      const missing = await patch(an, created.id, { type: "TRANSFER" });
      expect(issues(missing.body)).toEqual({ toWalletId: "Chọn ví nhận" });

      const res = await patch(an, created.id, { type: "TRANSFER", toWalletId: cash.id });
      expect(res.status).toBe(200);
      expect(transactionSchema.parse(res.body)).toMatchObject({
        type: "TRANSFER",
        toWalletId: cash.id,
        categoryId: null,
      });
      expect(await balances(an)).toEqual({ "Ngân hàng": 800_000, "Tiền mặt": 200_000 });
    });

    it("soft-deletes: the balance is restored and the row stays", async () => {
      const cash = await createWallet(an, {
        name: "Tiền mặt",
        type: "CASH",
        initialBalance: 100_000,
      });
      const created = transactionSchema.parse(
        (
          await post(an, {
            type: "EXPENSE",
            amount: 30_000,
            walletId: cash.id,
            categoryId: await categoryId(an, "Ăn uống"),
            occurredAt: AT,
          })
        ).body,
      );

      await t
        .http()
        .delete(`/api/v1/transactions/${created.id}`)
        .set("Authorization", an.auth)
        .expect(204);

      expect((await balances(an))["Tiền mặt"]).toBe(100_000);
      const row = await t.prisma.transaction.findUniqueOrThrow({ where: { id: created.id } });
      expect(row.deletedAt).not.toBeNull();
      await t
        .http()
        .get(`/api/v1/transactions/${created.id}`)
        .set("Authorization", an.auth)
        .expect(404);
    });

    it("hides other users' transactions behind 404", async () => {
      const cash = await createWallet(an, { name: "Tiền mặt", type: "CASH" });
      const created = transactionSchema.parse(
        (
          await post(an, {
            type: "EXPENSE",
            amount: 30_000,
            walletId: cash.id,
            categoryId: await categoryId(an, "Ăn uống"),
            occurredAt: AT,
          })
        ).body,
      );

      await t
        .http()
        .get(`/api/v1/transactions/${created.id}`)
        .set("Authorization", binh.auth)
        .expect(404);
      expect((await patch(binh, created.id, { amount: 1 })).status).toBe(404);
      await t
        .http()
        .delete(`/api/v1/transactions/${created.id}`)
        .set("Authorization", binh.auth)
        .expect(404);
      await t
        .http()
        .get(`/api/v1/transactions/${created.id}`)
        .set("Authorization", an.auth)
        .expect(200);
    });
  });
});
