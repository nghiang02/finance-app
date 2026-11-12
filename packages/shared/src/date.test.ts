import { describe, expect, it } from "vitest";

import { currentMonth, localDateKey, monthOf, monthRange, shiftMonth } from "./date.js";

const VN = "Asia/Ho_Chi_Minh";

describe("monthRange", () => {
  it("starts and ends at local midnight in Vietnam (UTC+7)", () => {
    const { start, end } = monthRange("2026-11", VN);
    expect(start.toISOString()).toBe("2026-10-31T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-30T17:00:00.000Z");
  });

  it("crosses the year in December", () => {
    const { start, end } = monthRange("2026-12", VN);
    expect(start.toISOString()).toBe("2026-11-30T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-31T17:00:00.000Z");
  });

  it("handles daylight saving time (New York switches on 8 March 2026)", () => {
    const { start, end } = monthRange("2026-03", "America/New_York");
    expect(start.toISOString()).toBe("2026-03-01T05:00:00.000Z"); // UTC-5
    expect(end.toISOString()).toBe("2026-04-01T04:00:00.000Z"); // UTC-4
  });

  it("works for UTC and zones ahead of UTC by more than half a day", () => {
    expect(monthRange("2026-02", "UTC").start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(monthRange("2026-02", "Pacific/Auckland").start.toISOString()).toBe(
      "2026-01-31T11:00:00.000Z",
    );
  });

  it("rejects a malformed month and an unknown time zone", () => {
    expect(() => monthRange("2026-13", VN)).toThrow(RangeError);
    expect(() => monthRange("2026-1", VN)).toThrow(RangeError);
    expect(() => monthRange("2026-11", "Mars/Olympus")).toThrow(RangeError);
  });
});

describe("monthOf and currentMonth", () => {
  it("uses the local date, not the UTC date", () => {
    // 30 Nov 23:30 in Vietnam is still November...
    expect(monthOf(new Date("2026-11-30T16:30:00Z"), VN)).toBe("2026-11");
    // ...and 1 Dec 00:30 in Vietnam is December, although it is still 30 Nov in UTC.
    expect(monthOf(new Date("2026-11-30T17:30:00Z"), VN)).toBe("2026-12");
    expect(currentMonth(VN, new Date("2026-11-30T17:30:00Z"))).toBe("2026-12");
  });
});

describe("shiftMonth", () => {
  it.each([
    ["2026-11", 1, "2026-12"],
    ["2026-12", 1, "2027-01"],
    ["2026-01", -1, "2025-12"],
    ["2026-11", -23, "2024-12"],
    ["2026-11", 0, "2026-11"],
  ])("%s %+d → %s", (month, delta, expected) => {
    expect(shiftMonth(month, delta)).toBe(expected);
  });
});

describe("localDateKey", () => {
  it("groups by the local day", () => {
    expect(localDateKey(new Date("2026-11-11T17:30:00Z"), VN)).toBe("2026-11-12");
    expect(localDateKey(new Date("2026-11-11T16:30:00Z"), VN)).toBe("2026-11-11");
  });
});
