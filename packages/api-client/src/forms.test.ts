import type { Category, Transaction, Wallet } from "@finance/shared";
import { describe, expect, it } from "vitest";

import {
  categoryFormValues,
  toCreateCategoryRequest,
  toCreateTransactionRequest,
  toCreateWalletRequest,
  toUpdateCategoryRequest,
  toUpdateTransactionRequest,
  toUpdateWalletRequest,
  transactionFormValues,
  walletFormValues,
} from "./forms.js";

const WALLET: Wallet = {
  id: "6f1c2d9e-8a4b-4c3d-9e2f-1a2b3c4d5e6f",
  name: "Thẻ tín dụng",
  type: "CREDIT_CARD",
  currency: "VND",
  initialBalance: -2_500_000,
  balance: -2_000_000,
  archived: false,
  createdAt: "2026-11-12T01:00:00.000Z",
  updatedAt: "2026-11-12T01:00:00.000Z",
};

const CATEGORY: Category = {
  id: "0b6f7c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e",
  name: "Cà phê",
  type: "EXPENSE",
  icon: "☕",
  color: "#F97316",
  parentId: "6f1c2d9e-8a4b-4c3d-9e2f-1a2b3c4d5e6f",
  createdAt: "2026-11-12T01:00:00.000Z",
  updatedAt: "2026-11-12T01:00:00.000Z",
};

describe("wallet form", () => {
  it("starts empty for a new wallet", () => {
    expect(walletFormValues()).toEqual({
      name: "",
      type: "CASH",
      amount: "",
      isDebt: false,
      archived: false,
    });
  });

  it("shows a negative initial balance as an unsigned amount marked as debt", () => {
    expect(walletFormValues(WALLET)).toMatchObject({ amount: "2.500.000", isDebt: true });
  });

  it("round-trips an existing wallet unchanged", () => {
    expect(toUpdateWalletRequest(walletFormValues(WALLET))).toEqual({
      success: true,
      data: {
        name: "Thẻ tín dụng",
        type: "CREDIT_CARD",
        initialBalance: -2_500_000,
        archived: false,
      },
    });
  });

  it.each([
    ["", false, 0],
    ["1.500.000", false, 1_500_000],
    ["1500000", true, -1_500_000],
    ["0", true, 0],
  ])("parses %j (debt: %s) as %d", (amount, isDebt, expected) => {
    const result = toCreateWalletRequest({ ...walletFormValues(), name: "Ví", amount, isDebt });
    expect(result).toMatchObject({ success: true, data: { initialBalance: expected } });
    if (result.success) {
      expect(Object.is(result.data.initialBalance, -0)).toBe(false);
    }
  });

  it("reports an invalid amount and schema errors by field", () => {
    expect(toCreateWalletRequest({ ...walletFormValues(), name: "Ví", amount: "1,5" })).toEqual({
      success: false,
      errors: { initialBalance: "Số tiền không hợp lệ, ví dụ 1.500.000" },
    });
    const empty = toCreateWalletRequest(walletFormValues());
    expect(empty.success ? {} : empty.errors).toHaveProperty("name");
  });
});

describe("category form", () => {
  it("lets a new child inherit the parent color by omitting it", () => {
    const values = categoryFormValues({
      mode: "create",
      type: "EXPENSE",
      parentId: CATEGORY.parentId,
    });
    const result = toCreateCategoryRequest({ ...values, name: "Trà sữa" });

    expect(result).toEqual({
      success: true,
      data: { name: "Trà sữa", type: "EXPENSE", icon: null, parentId: CATEGORY.parentId },
    });
  });

  it("sends the chosen color and icon", () => {
    const values = categoryFormValues({ mode: "create", type: "INCOME", parentId: null });
    const result = toCreateCategoryRequest({
      ...values,
      name: "Lãi",
      icon: "🏦",
      color: "#22c55e",
    });

    expect(result).toMatchObject({ success: true, data: { icon: "🏦", color: "#22C55E" } });
  });

  it("round-trips an existing category, and clears the icon with an empty string", () => {
    const values = categoryFormValues({ mode: "edit", category: CATEGORY });
    expect(toUpdateCategoryRequest(values)).toEqual({
      success: true,
      data: { name: "Cà phê", icon: "☕", color: "#F97316", parentId: CATEGORY.parentId },
    });
    expect(toUpdateCategoryRequest({ ...values, icon: " " })).toMatchObject({
      success: true,
      data: { icon: null },
    });
  });

  it("reports an empty name", () => {
    const values = categoryFormValues({ mode: "edit", category: CATEGORY });
    const result = toUpdateCategoryRequest({ ...values, name: "" });
    expect(result.success ? {} : result.errors).toHaveProperty("name");
  });
});

const WALLET_ID = "6f1c2d9e-8a4b-4c3d-9e2f-1a2b3c4d5e6f";
const OTHER_WALLET_ID = "0b6f7c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e";
const CATEGORY_ID = "3c2b1a0f-9e8d-4c7b-8a6f-5e4d3c2b1a0f";
const NOW = new Date("2026-11-12T02:30:00.000Z");

describe("transaction form", () => {
  it("starts as an expense now, in the given wallet", () => {
    expect(transactionFormValues({ mode: "create", walletId: WALLET_ID }, NOW)).toEqual({
      type: "EXPENSE",
      amount: "",
      walletId: WALLET_ID,
      toWalletId: null,
      categoryId: null,
      note: "",
      occurredAt: "2026-11-12T02:30:00.000Z",
    });
  });

  it("builds an expense from the typed amount", () => {
    const values = {
      ...transactionFormValues({ mode: "create", walletId: WALLET_ID }, NOW),
      amount: "45.000",
      categoryId: CATEGORY_ID,
      note: " Phở ",
    };
    expect(toCreateTransactionRequest(values)).toEqual({
      success: true,
      data: {
        type: "EXPENSE",
        amount: 45_000,
        walletId: WALLET_ID,
        categoryId: CATEGORY_ID,
        occurredAt: "2026-11-12T02:30:00.000Z",
        note: "Phở",
      },
    });
  });

  it("reports every missing field at once", () => {
    const values = transactionFormValues({ mode: "create", walletId: null }, NOW);
    expect(toCreateTransactionRequest(values)).toEqual({
      success: false,
      errors: { amount: "Nhập số tiền", walletId: "Chọn ví", categoryId: "Chọn danh mục" },
    });
  });

  it("asks for the destination wallet of a transfer and rejects zero", () => {
    const values = {
      ...transactionFormValues({ mode: "create", type: "TRANSFER", walletId: WALLET_ID }, NOW),
      amount: "0",
    };
    expect(toCreateTransactionRequest(values)).toEqual({
      success: false,
      errors: { amount: "Số tiền phải lớn hơn 0", toWalletId: "Chọn ví nhận" },
    });
  });

  it("round-trips an existing transaction into a full update", () => {
    const transaction: Transaction = {
      id: "t1",
      type: "TRANSFER",
      amount: 1_000_000,
      walletId: WALLET_ID,
      toWalletId: OTHER_WALLET_ID,
      categoryId: null,
      note: null,
      occurredAt: "2026-11-10T01:00:00.000Z",
      createdAt: "2026-11-10T01:00:00.000Z",
      updatedAt: "2026-11-10T01:00:00.000Z",
    };
    const values = transactionFormValues({ mode: "edit", transaction });
    expect(values.amount).toBe("1.000.000");
    expect(toUpdateTransactionRequest(values)).toEqual({
      success: true,
      data: {
        type: "TRANSFER",
        amount: 1_000_000,
        walletId: WALLET_ID,
        toWalletId: OTHER_WALLET_ID,
        categoryId: null,
        occurredAt: "2026-11-10T01:00:00.000Z",
        note: null,
      },
    });
  });

  it("clears the destination wallet when a transfer becomes an expense", () => {
    const values = {
      ...transactionFormValues({ mode: "create", type: "TRANSFER", walletId: WALLET_ID }, NOW),
      amount: "200.000",
      toWalletId: OTHER_WALLET_ID,
      type: "EXPENSE" as const,
      categoryId: CATEGORY_ID,
    };
    const result = toUpdateTransactionRequest(values);
    expect(result.success && result.data).toMatchObject({
      categoryId: CATEGORY_ID,
      toWalletId: null,
    });
  });
});
