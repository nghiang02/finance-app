import { describe, expect, it } from "vitest";

import { ApiError } from "./errors.js";
import { shouldRetryRequest } from "./retry.js";

describe("shouldRetryRequest", () => {
  it("never retries client errors", () => {
    expect(shouldRetryRequest(0, new ApiError(400, "VALIDATION_ERROR", "Invalid"))).toBe(false);
    expect(shouldRetryRequest(0, new ApiError(401, "UNAUTHORIZED", "Login required"))).toBe(false);
    expect(shouldRetryRequest(0, new ApiError(404, "NOT_FOUND", "Missing"))).toBe(false);
  });

  it("retries network and server errors up to twice", () => {
    const networkError = new ApiError(0, "NETWORK_ERROR", "Offline");
    const serverError = new ApiError(503, "SERVICE_UNAVAILABLE", "Down");
    expect(shouldRetryRequest(0, networkError)).toBe(true);
    expect(shouldRetryRequest(1, serverError)).toBe(true);
    expect(shouldRetryRequest(2, serverError)).toBe(false);
    expect(shouldRetryRequest(0, new Error("unknown"))).toBe(true);
  });
});
