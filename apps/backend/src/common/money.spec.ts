import { describe, expect, it } from "vitest";

import { moneyToBigInt, moneyToNumber } from "./money.js";

describe("money conversion", () => {
  it("round-trips integers, including negative ones", () => {
    expect(moneyToNumber(moneyToBigInt(1_500_000))).toBe(1_500_000);
    expect(moneyToNumber(moneyToBigInt(-2_500_000))).toBe(-2_500_000);
    expect(moneyToNumber(0n)).toBe(0);
  });

  it("refuses values that JSON numbers cannot represent exactly", () => {
    expect(() => moneyToNumber(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow(RangeError);
    expect(() => moneyToBigInt(1000.5)).toThrow(RangeError);
    expect(() => moneyToBigInt(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
  });
});
