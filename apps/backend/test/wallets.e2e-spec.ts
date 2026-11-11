import { apiErrorResponseSchema, walletListSchema, walletSchema } from "@finance/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestApp, registerUser, type TestApp, type TestUser } from "./support.js";
import { getTestDatabaseUrl } from "./test-database.js";

const databaseUrl = getTestDatabaseUrl();

describe.skipIf(!databaseUrl)("Wallets (integration, real database)", () => {
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

  async function listWallets(user: TestUser) {
    const res = await t.http().get("/api/v1/wallets").set("Authorization", user.auth).expect(200);
    return walletListSchema.parse(res.body);
  }

  /** Transactions CRUD comes in phase 3; insert rows directly to test the balance. */
  async function addTransaction(
    user: TestUser,
    data: {
      type: "INCOME" | "EXPENSE" | "TRANSFER";
      amount: number;
      walletId: string;
      toWalletId?: string;
      deleted?: boolean;
    },
  ) {
    const category =
      data.type === "TRANSFER"
        ? null
        : await t.prisma.category.findFirstOrThrow({
            where: { userId: user.id, type: data.type, parentId: null },
          });
    await t.prisma.transaction.create({
      data: {
        userId: user.id,
        type: data.type,
        amount: BigInt(data.amount),
        walletId: data.walletId,
        toWalletId: data.toWalletId ?? null,
        categoryId: category?.id ?? null,
        occurredAt: new Date(),
        deletedAt: data.deleted ? new Date() : null,
      },
    });
  }

  describe("create and list", () => {
    it("creates a wallet with defaults and returns its balance", async () => {
      const wallet = await createWallet(an, { name: "Tiền mặt", type: "CASH" });

      expect(wallet).toMatchObject({
        name: "Tiền mặt",
        type: "CASH",
        currency: "VND",
        initialBalance: 0,
        balance: 0,
        archived: false,
      });
      expect(await listWallets(an)).toEqual([wallet]);
    });

    it("requires authentication", async () => {
      await t.http().get("/api/v1/wallets").expect(401);
    });

    it("validates the body with the shared schema (integer money, no unknown fields)", async () => {
      for (const body of [
        { name: "", type: "CASH" },
        { name: "Ví", type: "GOLD" },
        { name: "Ví", type: "CASH", initialBalance: 1000.5 },
        { name: "Ví", type: "CASH", userId: binh.id },
      ]) {
        const res = await t.http().post("/api/v1/wallets").set("Authorization", an.auth).send(body);
        expect(res.status, JSON.stringify(body)).toBe(400);
        expect(apiErrorResponseSchema.parse(res.body).error.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("balance", () => {
    it("is initial + income − expense − transfers out + transfers in", async () => {
      const cash = await createWallet(an, {
        name: "Tiền mặt",
        type: "CASH",
        initialBalance: 1_000_000,
      });
      const bank = await createWallet(an, {
        name: "Ngân hàng",
        type: "BANK",
        initialBalance: 5_000_000,
      });

      await addTransaction(an, { type: "INCOME", amount: 15_000_000, walletId: bank.id });
      await addTransaction(an, { type: "EXPENSE", amount: 45_000, walletId: cash.id });
      await addTransaction(an, { type: "EXPENSE", amount: 1_200_000, walletId: bank.id });
      await addTransaction(an, {
        type: "TRANSFER",
        amount: 2_000_000,
        walletId: bank.id,
        toWalletId: cash.id,
      });

      const balances = Object.fromEntries((await listWallets(an)).map((w) => [w.name, w.balance]));
      expect(balances).toEqual({
        "Tiền mặt": 1_000_000 - 45_000 + 2_000_000,
        "Ngân hàng": 5_000_000 + 15_000_000 - 1_200_000 - 2_000_000,
      });
    });

    it("ignores soft-deleted transactions", async () => {
      const cash = await createWallet(an, {
        name: "Tiền mặt",
        type: "CASH",
        initialBalance: 100_000,
      });
      await addTransaction(an, {
        type: "EXPENSE",
        amount: 30_000,
        walletId: cash.id,
        deleted: true,
      });

      expect((await listWallets(an))[0]?.balance).toBe(100_000);
    });

    it("supports negative balances (credit card)", async () => {
      const card = await createWallet(an, {
        name: "Visa",
        type: "CREDIT_CARD",
        initialBalance: -500_000,
      });
      await addTransaction(an, { type: "EXPENSE", amount: 250_000, walletId: card.id });

      expect((await listWallets(an))[0]?.balance).toBe(-750_000);
    });

    it("updates the balance when the initial balance changes", async () => {
      const cash = await createWallet(an, { name: "Tiền mặt", type: "CASH" });
      await addTransaction(an, { type: "EXPENSE", amount: 20_000, walletId: cash.id });

      const res = await t
        .http()
        .patch(`/api/v1/wallets/${cash.id}`)
        .set("Authorization", an.auth)
        .send({ initialBalance: 200_000 })
        .expect(200);

      expect(walletSchema.parse(res.body)).toMatchObject({
        initialBalance: 200_000,
        balance: 180_000,
      });
    });
  });

  describe("update and delete", () => {
    it("renames and archives a wallet; currency cannot be changed", async () => {
      const wallet = await createWallet(an, { name: "Ví cũ", type: "CASH" });

      const res = await t
        .http()
        .patch(`/api/v1/wallets/${wallet.id}`)
        .set("Authorization", an.auth)
        .send({ name: "Ví mới", archived: true })
        .expect(200);
      expect(walletSchema.parse(res.body)).toMatchObject({ name: "Ví mới", archived: true });

      await t
        .http()
        .patch(`/api/v1/wallets/${wallet.id}`)
        .set("Authorization", an.auth)
        .send({ currency: "USD" })
        .expect(400);
    });

    it("soft-deletes: gone from the list, row and transactions kept", async () => {
      const wallet = await createWallet(an, { name: "Momo", type: "E_WALLET" });
      await addTransaction(an, { type: "EXPENSE", amount: 10_000, walletId: wallet.id });

      await t
        .http()
        .delete(`/api/v1/wallets/${wallet.id}`)
        .set("Authorization", an.auth)
        .expect(204);

      expect(await listWallets(an)).toEqual([]);
      const row = await t.prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(row.deletedAt).not.toBeNull();
      expect(await t.prisma.transaction.count({ where: { walletId: wallet.id } })).toBe(1);
      // A deleted wallet behaves as missing.
      await t
        .http()
        .delete(`/api/v1/wallets/${wallet.id}`)
        .set("Authorization", an.auth)
        .expect(404);
    });

    it("rejects an id that is not a UUID", async () => {
      await t.http().delete("/api/v1/wallets/not-a-uuid").set("Authorization", an.auth).expect(400);
    });
  });

  describe("isolation between users", () => {
    it("never shows or changes another user's wallet (404, not 403)", async () => {
      const binhWallet = await createWallet(binh, { name: "Ví của Bình", type: "CASH" });

      expect(await listWallets(an)).toEqual([]);
      const patch = await t
        .http()
        .patch(`/api/v1/wallets/${binhWallet.id}`)
        .set("Authorization", an.auth)
        .send({ name: "Hacked" });
      expect(patch.status).toBe(404);
      await t
        .http()
        .delete(`/api/v1/wallets/${binhWallet.id}`)
        .set("Authorization", an.auth)
        .expect(404);

      expect((await listWallets(binh))[0]?.name).toBe("Ví của Bình");
    });
  });
});
