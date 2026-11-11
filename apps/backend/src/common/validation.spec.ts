import { describe, expect, it } from "vitest";

import { toValidationIssues } from "./validation.js";

describe("toValidationIssues", () => {
  it("joins nested paths with dots, including path segment objects", () => {
    expect(
      toValidationIssues([
        { message: "Required", path: ["items", 0, { key: "amount" }] },
        { message: "Invalid body" },
      ]),
    ).toEqual([
      { path: "items.0.amount", message: "Required" },
      { path: "", message: "Invalid body" },
    ]);
  });
});
