import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "./cursor.js";

describe("transaction cursor", () => {
  it("round-trips", () => {
    const cursor = { occurredAt: new Date("2026-11-12T02:30:00.000Z"), id: "abc" };
    const encoded = encodeCursor(cursor);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/); // URL-safe, no padding
    expect(decodeCursor(encoded)).toEqual(cursor);
  });

  it.each([
    ["not base64 JSON", "%%%"],
    ["JSON without the fields", Buffer.from('{"x":1}').toString("base64url")],
    ["bad date", Buffer.from('{"o":"yesterday","i":"a"}').toString("base64url")],
    ["empty id", Buffer.from('{"o":"2026-11-12T02:30:00Z","i":""}').toString("base64url")],
    ["a JSON string", Buffer.from('"hello"').toString("base64url")],
  ])("rejects %s", (_, value) => {
    expect(decodeCursor(value)).toBeNull();
  });
});
