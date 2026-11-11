import { describe, expect, it } from "vitest";

import { ApiError, describeError, serverFieldErrors, toFieldErrors } from "./errors.js";

describe("describeError", () => {
  it("returns a Vietnamese message per code, with per-screen overrides", () => {
    const network = new ApiError(0, "NETWORK_ERROR", "Cannot reach the server");
    const unauthorized = new ApiError(401, "UNAUTHORIZED", "Invalid email or password");

    expect(describeError(network)).toContain("Không kết nối được máy chủ");
    expect(describeError(unauthorized, { UNAUTHORIZED: "Email hoặc mật khẩu không đúng." })).toBe(
      "Email hoặc mật khẩu không đúng.",
    );
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(describeError(new Error("boom"))).toBe("Có lỗi xảy ra, vui lòng thử lại.");
    expect(describeError(new ApiError(418, "BAD_REQUEST", "teapot"))).toBe(
      "Có lỗi xảy ra, vui lòng thử lại.",
    );
  });
});

describe("toFieldErrors", () => {
  it("keeps the first message per field and joins nested paths", () => {
    expect(
      toFieldErrors([
        { path: ["email"], message: "Email không hợp lệ" },
        { path: ["email"], message: "Email quá dài" },
        { path: "items.0.amount", message: "Quá nhỏ" },
      ]),
    ).toEqual({ email: "Email không hợp lệ", "items.0.amount": "Quá nhỏ" });
  });
});

describe("serverFieldErrors", () => {
  it("reads the issues of a 400 VALIDATION_ERROR", () => {
    const error = new ApiError(400, "VALIDATION_ERROR", "Request validation failed", {
      issues: [{ path: "password", message: "Mật khẩu cần ít nhất 8 ký tự" }],
    });

    expect(serverFieldErrors(error)).toEqual({ password: "Mật khẩu cần ít nhất 8 ký tự" });
  });

  it("returns nothing for other errors", () => {
    expect(serverFieldErrors(new ApiError(401, "UNAUTHORIZED", "x"))).toEqual({});
    expect(serverFieldErrors(new Error("x"))).toEqual({});
  });
});
