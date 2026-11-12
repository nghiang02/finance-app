import type { Category, Wallet } from "@finance/shared";
import { describe, expect, it } from "vitest";

import {
  categoryFormValues,
  toCreateCategoryRequest,
  toCreateWalletRequest,
  toUpdateCategoryRequest,
  toUpdateWalletRequest,
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
