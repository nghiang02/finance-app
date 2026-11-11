import { describe, expect, it } from "vitest";

import { computeBalance, NO_MOVEMENTS } from "./balance.js";

describe("computeBalance", () => {
  it("is the initial balance when there are no transactions", () => {
    expect(computeBalance(500_000n, NO_MOVEMENTS)).toBe(500_000n);
  });

  it("adds income and incoming transfers, subtracts expenses and outgoing transfers", () => {
    expect(
      computeBalance(1_000_000n, {
        income: 15_000_000n,
        expense: 3_200_000n,
        transferOut: 2_000_000n,
        transferIn: 500_000n,
      }),
    ).toBe(11_300_000n);
  });

  it("can go negative (e.g. a credit card)", () => {
    expect(computeBalance(0n, { ...NO_MOVEMENTS, expense: 750_000n })).toBe(-750_000n);
  });

  it("stays exact beyond Number.MAX_SAFE_INTEGER", () => {
    const huge = BigInt(Number.MAX_SAFE_INTEGER);
    expect(computeBalance(huge, { ...NO_MOVEMENTS, income: 2n })).toBe(huge + 2n);
  });
});
