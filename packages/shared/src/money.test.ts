import { describe, expect, it } from "vitest";

import {
  formatMoney,
  formatMoneyInput,
  getCurrencyFractionDigits,
  parseMoneyInput,
} from "./money.js";

/** Intl uses non-breaking spaces (U+00A0 / U+202F); normalize so tests stay readable. */
const normalizeSpaces = (value: string): string => value.replace(/\s/g, " ");

describe("getCurrencyFractionDigits", () => {
  it("returns 0 for VND and 2 for USD", () => {
    expect(getCurrencyFractionDigits("VND")).toBe(0);
    expect(getCurrencyFractionDigits("usd")).toBe(2);
  });

  it("falls back to 2 for unknown currencies", () => {
    expect(getCurrencyFractionDigits("XYZ")).toBe(2);
  });
});

describe("formatMoney", () => {
  it("formats VND with dot thousand separators by default", () => {
    expect(normalizeSpaces(formatMoney(1_500_000))).toBe("1.500.000 ₫");
  });

  it("formats zero and negative amounts", () => {
    expect(normalizeSpaces(formatMoney(0))).toBe("0 ₫");
    expect(normalizeSpaces(formatMoney(-50_000))).toBe("-50.000 ₫");
  });

  it("converts minor units for currencies with decimals", () => {
    expect(formatMoney(123_456, "USD", "en-US")).toBe("$1,234.56");
  });

  it("rejects non-integer or unsafe amounts", () => {
    expect(() => formatMoney(1.5)).toThrow(RangeError);
    expect(() => formatMoney(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN)).toThrow(RangeError);
  });
});

describe("parseMoneyInput", () => {
  it.each([
    ["1500000", 1_500_000],
    ["1.500.000", 1_500_000],
    ["1,500,000", 1_500_000],
    ["1 500 000", 1_500_000],
    ["  25.000  ", 25_000],
    ["0", 0],
  ])("parses %j -> %d", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(["", "   ", "abc", "-200", "1.5", "1.50.000", "1.500,000", "12.3456", "1e6"])(
    "returns null for invalid input %j",
    (input) => {
      expect(parseMoneyInput(input)).toBeNull();
    },
  );

  it("returns null when the value exceeds MAX_SAFE_INTEGER", () => {
    expect(parseMoneyInput("99999999999999999999")).toBeNull();
  });
});

describe("formatMoneyInput", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1_000, "1.000"],
    [1_500_000, "1.500.000"],
    [-250_000, "250.000"],
  ])("formats %d as %s", (amount, expected) => {
    expect(formatMoneyInput(amount)).toBe(expected);
  });

  it("round-trips through parseMoneyInput", () => {
    for (const amount of [0, 7, 12_345, 1_500_000, 9_007_199_254_740_991]) {
      expect(parseMoneyInput(formatMoneyInput(amount))).toBe(amount);
    }
  });

  it("rejects non-integers", () => {
    expect(() => formatMoneyInput(1.5)).toThrow(RangeError);
  });
});
