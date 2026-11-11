import { describe, expect, it } from "vitest";

import { createWalletRequestSchema, updateWalletRequestSchema } from "./wallet.js";

describe("createWalletRequestSchema", () => {
  it("applies defaults (VND, balance 0) and trims the name", () => {
    expect(createWalletRequestSchema.parse({ name: "  Tiền mặt ", type: "CASH" })).toEqual({
      name: "Tiền mặt",
      type: "CASH",
      currency: "VND",
      initialBalance: 0,
    });
  });

  it("accepts a negative initial balance (credit card debt)", () => {
    const parsed = createWalletRequestSchema.parse({
      name: "Visa",
      type: "CREDIT_CARD",
      initialBalance: -2_500_000,
    });
    expect(parsed.initialBalance).toBe(-2_500_000);
  });

  it("rejects money that is not an integer", () => {
    const result = createWalletRequestSchema.safeParse({
      name: "Ví",
      type: "CASH",
      initialBalance: 1000.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name, an unknown type and unknown fields", () => {
    expect(createWalletRequestSchema.safeParse({ name: " ", type: "CASH" }).success).toBe(false);
    expect(createWalletRequestSchema.safeParse({ name: "Ví", type: "GOLD" }).success).toBe(false);
    expect(
      createWalletRequestSchema.safeParse({ name: "Ví", type: "CASH", userId: "someone-else" })
        .success,
    ).toBe(false);
  });

  it("normalizes the currency code", () => {
    expect(
      createWalletRequestSchema.parse({ name: "USD", type: "BANK", currency: " usd " }).currency,
    ).toBe("USD");
  });
});

describe("updateWalletRequestSchema", () => {
  it("accepts a partial update", () => {
    expect(updateWalletRequestSchema.parse({ archived: true })).toEqual({ archived: true });
  });

  it("rejects an empty update and any attempt to change the currency", () => {
    expect(updateWalletRequestSchema.safeParse({}).success).toBe(false);
    expect(updateWalletRequestSchema.safeParse({ currency: "USD" }).success).toBe(false);
  });
});
