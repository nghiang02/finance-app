import { describe, expect, it } from "vitest";

import {
  createTransactionRequestSchema,
  transactionListQuerySchema,
  transactionSchema,
  updateTransactionRequestSchema,
} from "./transaction.js";

const WALLET = "6f1c2d9e-8a4b-4c3d-9e2f-1a2b3c4d5e6f";
const OTHER_WALLET = "0b6f7c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e";
const CATEGORY = "3c2b1a0f-9e8d-4c7b-8a6f-5e4d3c2b1a0f";
const AT = "2026-11-12T09:30:00+07:00";

function issuePaths(body: unknown): string[] {
  const result = createTransactionRequestSchema.safeParse(body);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("createTransactionRequestSchema", () => {
  it("accepts an expense and turns a blank note into null", () => {
    expect(
      createTransactionRequestSchema.parse({
        type: "EXPENSE",
        amount: 45_000,
        walletId: WALLET,
        categoryId: CATEGORY,
        occurredAt: AT,
        note: "  ",
      }),
    ).toEqual({
      type: "EXPENSE",
      amount: 45_000,
      walletId: WALLET,
      categoryId: CATEGORY,
      occurredAt: AT,
      note: null,
    });
  });

  it("accepts a transfer between two wallets", () => {
    const transfer = {
      type: "TRANSFER",
      amount: 1_000_000,
      walletId: WALLET,
      toWalletId: OTHER_WALLET,
      occurredAt: "2026-11-12T02:30:00Z",
    };
    expect(createTransactionRequestSchema.parse(transfer)).toEqual(transfer);
  });

  it.each([
    ["zero", 0],
    ["negative", -5_000],
    ["float", 1.5],
  ])("rejects a %s amount", (_, amount) => {
    expect(
      issuePaths({
        type: "INCOME",
        amount,
        walletId: WALLET,
        categoryId: CATEGORY,
        occurredAt: AT,
      }),
    ).toEqual(["amount"]);
  });

  it("explains which field is missing", () => {
    const result = createTransactionRequestSchema.safeParse({
      type: "EXPENSE",
      amount: 1,
      walletId: WALLET,
      occurredAt: AT,
    });
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual([
      "Chọn danh mục",
    ]);
  });

  it("requires the field that belongs to the type", () => {
    expect(issuePaths({ type: "EXPENSE", amount: 1, walletId: WALLET, occurredAt: AT })).toEqual([
      "categoryId",
    ]);
    expect(issuePaths({ type: "TRANSFER", amount: 1, walletId: WALLET, occurredAt: AT })).toEqual([
      "toWalletId",
    ]);
  });

  it("rejects mixing fields of the two shapes", () => {
    expect(
      createTransactionRequestSchema.safeParse({
        type: "TRANSFER",
        amount: 1,
        walletId: WALLET,
        toWalletId: OTHER_WALLET,
        categoryId: CATEGORY,
        occurredAt: AT,
      }).success,
    ).toBe(false);
  });

  it("rejects a transfer to the same wallet", () => {
    expect(
      issuePaths({
        type: "TRANSFER",
        amount: 1,
        walletId: WALLET,
        toWalletId: WALLET,
        occurredAt: AT,
      }),
    ).toEqual(["toWalletId"]);
  });

  it("requires a time zone offset on occurredAt", () => {
    expect(
      issuePaths({
        type: "INCOME",
        amount: 1,
        walletId: WALLET,
        categoryId: CATEGORY,
        occurredAt: "2026-11-12T09:30:00",
      }),
    ).toEqual(["occurredAt"]);
  });
});

describe("updateTransactionRequestSchema", () => {
  it("accepts a partial change and rejects an empty one", () => {
    expect(updateTransactionRequestSchema.parse({ amount: 50_000 })).toEqual({ amount: 50_000 });
    expect(updateTransactionRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("transactionSchema", () => {
  it("rejects a non-integer amount in a response", () => {
    expect(
      transactionSchema.safeParse({
        id: "x",
        type: "EXPENSE",
        amount: 1.5,
        walletId: WALLET,
        toWalletId: null,
        categoryId: CATEGORY,
        note: null,
        occurredAt: "2026-11-12T02:30:00.000Z",
        createdAt: "2026-11-12T02:30:00.000Z",
        updatedAt: "2026-11-12T02:30:00.000Z",
      }).success,
    ).toBe(false);
  });
});

describe("transactionListQuerySchema", () => {
  it("needs a month and fills the default page size", () => {
    expect(transactionListQuerySchema.parse({ month: "2026-11" })).toEqual({
      month: "2026-11",
      limit: 30,
    });
    expect(transactionListQuerySchema.safeParse({}).success).toBe(false);
    expect(transactionListQuerySchema.safeParse({ month: "2026-13" }).success).toBe(false);
  });

  it("reads URL strings: coerces the limit and drops a blank search", () => {
    expect(
      transactionListQuerySchema.parse({ month: "2026-11", limit: "10", q: "  ", type: "EXPENSE" }),
    ).toEqual({ month: "2026-11", limit: 10, type: "EXPENSE" });
  });

  it("bounds the page size", () => {
    expect(transactionListQuerySchema.safeParse({ month: "2026-11", limit: "0" }).success).toBe(
      false,
    );
    expect(transactionListQuerySchema.safeParse({ month: "2026-11", limit: "500" }).success).toBe(
      false,
    );
  });
});
