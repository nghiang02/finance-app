import { describe, expect, it } from "vitest";

import { mergeTransactionUpdate, type StoredTransactionFields } from "./merge.js";

const WALLET = "6f1c2d9e-8a4b-4c3d-9e2f-1a2b3c4d5e6f";
const OTHER_WALLET = "0b6f7c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e";
const CATEGORY = "3c2b1a0f-9e8d-4c7b-8a6f-5e4d3c2b1a0f";

const EXPENSE: StoredTransactionFields = {
  type: "EXPENSE",
  amount: 45_000,
  walletId: WALLET,
  toWalletId: null,
  categoryId: CATEGORY,
  note: "Phở",
  occurredAt: "2026-11-12T02:30:00.000Z",
};

const TRANSFER: StoredTransactionFields = {
  type: "TRANSFER",
  amount: 1_000_000,
  walletId: WALLET,
  toWalletId: OTHER_WALLET,
  categoryId: null,
  note: null,
  occurredAt: "2026-11-12T02:30:00.000Z",
};

describe("mergeTransactionUpdate", () => {
  it("keeps the stored fields that are not in the patch", () => {
    expect(mergeTransactionUpdate(EXPENSE, { amount: 50_000 })).toEqual({
      success: true,
      data: {
        type: "EXPENSE",
        amount: 50_000,
        walletId: WALLET,
        categoryId: CATEGORY,
        note: "Phở",
        occurredAt: "2026-11-12T02:30:00.000Z",
      },
    });
  });

  it("clears the note with null", () => {
    const result = mergeTransactionUpdate(EXPENSE, { note: null });
    expect(result.success && result.data.note).toBeNull();
  });

  it("turns an expense into a transfer when the destination wallet is given", () => {
    const result = mergeTransactionUpdate(EXPENSE, { type: "TRANSFER", toWalletId: OTHER_WALLET });
    expect(result).toEqual({
      success: true,
      data: {
        type: "TRANSFER",
        amount: 45_000,
        walletId: WALLET,
        toWalletId: OTHER_WALLET,
        note: "Phở",
        occurredAt: "2026-11-12T02:30:00.000Z",
      },
    });
  });

  it("asks for the field of the new type", () => {
    expect(mergeTransactionUpdate(EXPENSE, { type: "TRANSFER" })).toEqual({
      success: false,
      issues: [{ path: "toWalletId", message: "Chọn ví nhận" }],
    });
    expect(mergeTransactionUpdate(TRANSFER, { type: "INCOME" })).toEqual({
      success: false,
      issues: [{ path: "categoryId", message: "Chọn danh mục" }],
    });
  });

  it("rejects the field of the other type", () => {
    expect(mergeTransactionUpdate(TRANSFER, { categoryId: CATEGORY })).toMatchObject({
      success: false,
      issues: [{ path: "categoryId" }],
    });
    expect(mergeTransactionUpdate(EXPENSE, { toWalletId: OTHER_WALLET })).toMatchObject({
      success: false,
      issues: [{ path: "toWalletId" }],
    });
  });

  it("re-checks the transfer rules on the merged result", () => {
    expect(mergeTransactionUpdate(TRANSFER, { walletId: OTHER_WALLET })).toMatchObject({
      success: false,
      issues: [{ path: "toWalletId", message: "Ví nhận phải khác ví chuyển" }],
    });
  });
});
