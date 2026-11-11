import { describe, expect, it } from "vitest";

import { apiErrorResponseSchema, validationErrorDetailsSchema } from "./error.js";

describe("apiErrorResponseSchema", () => {
  it("accepts a response with and without details", () => {
    expect(
      apiErrorResponseSchema.safeParse({ error: { code: "NOT_FOUND", message: "Not found" } })
        .success,
    ).toBe(true);
    expect(
      apiErrorResponseSchema.safeParse({
        error: { code: "VALIDATION_ERROR", message: "Invalid", details: { issues: [] } },
      }).success,
    ).toBe(true);
  });

  it("rejects unknown error codes and other shapes", () => {
    expect(
      apiErrorResponseSchema.safeParse({ error: { code: "OOPS", message: "x" } }).success,
    ).toBe(false);
    expect(apiErrorResponseSchema.safeParse({ statusCode: 400, message: "x" }).success).toBe(false);
  });
});

describe("validationErrorDetailsSchema", () => {
  it("parses field issues", () => {
    const details = validationErrorDetailsSchema.parse({
      issues: [{ path: "amount", message: "Too small" }],
    });
    expect(details.issues[0]?.path).toBe("amount");
  });
});
