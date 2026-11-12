import { describe, expect, it } from "vitest";

import { totalBalanceByCurrency } from "./wallet-totals.js";

describe("totalBalanceByCurrency", () => {
  it("adds active wallets per currency, including negative balances", () => {
    expect(
      totalBalanceByCurrency([
        { currency: "VND", balance: 1_500_000, archived: false },
        { currency: "VND", balance: -300_000, archived: false },
        { currency: "USD", balance: 2_550, archived: false },
        { currency: "VND", balance: 10_000_000, archived: true },
      ]),
    ).toEqual([
      { currency: "VND", total: 1_200_000 },
      { currency: "USD", total: 2_550 },
    ]);
  });

  it("returns nothing when there is no active wallet", () => {
    expect(totalBalanceByCurrency([])).toEqual([]);
    expect(totalBalanceByCurrency([{ currency: "VND", balance: 5, archived: true }])).toEqual([]);
  });

  it("throws instead of rounding when the total is not a safe integer", () => {
    const big = { currency: "VND", balance: Number.MAX_SAFE_INTEGER, archived: false };
    expect(() => totalBalanceByCurrency([big, big])).toThrow(RangeError);
  });
});
