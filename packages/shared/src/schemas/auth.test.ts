import { describe, expect, it } from "vitest";

import {
  authResponseSchema,
  loginRequestSchema,
  PASSWORD_MAX_LENGTH,
  registerRequestSchema,
} from "./auth.js";

describe("registerRequestSchema", () => {
  it("normalizes the email (trim + lower-case) and trims the name", () => {
    expect(
      registerRequestSchema.parse({
        email: "  An.Nguyen@Example.COM ",
        password: "correct horse",
        name: "  An  ",
      }),
    ).toEqual({ email: "an.nguyen@example.com", password: "correct horse", name: "An" });
  });

  it("rejects short and overly long passwords with a Vietnamese message", () => {
    const short = registerRequestSchema.safeParse({ email: "a@b.vn", password: "1234567" });
    expect(short.success).toBe(false);
    expect(short.error?.issues[0]?.message).toBe("Mật khẩu cần ít nhất 8 ký tự");

    const long = registerRequestSchema.safeParse({
      email: "a@b.vn",
      password: "x".repeat(PASSWORD_MAX_LENGTH + 1),
    });
    expect(long.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerRequestSchema.safeParse({ email: "not-an-email", password: "12345678" });
    expect(result.error?.issues[0]?.message).toBe("Email không hợp lệ");
  });

  it("rejects a blank name instead of storing an empty string", () => {
    expect(
      registerRequestSchema.safeParse({ email: "a@b.vn", password: "12345678", name: "   " })
        .success,
    ).toBe(false);
  });
});

describe("loginRequestSchema", () => {
  it("does not apply the strength rules (only requires a password)", () => {
    expect(loginRequestSchema.safeParse({ email: "a@b.vn", password: "short" }).success).toBe(true);
    expect(loginRequestSchema.safeParse({ email: "a@b.vn", password: "" }).success).toBe(false);
  });
});

describe("authResponseSchema", () => {
  const user = {
    id: "u1",
    email: "a@b.vn",
    name: null,
    currency: "VND",
    timezone: "Asia/Ho_Chi_Minh",
    createdAt: "2026-11-12T01:00:00.000Z",
  };

  it("accepts web (no refresh token) and mobile (with refresh token) responses", () => {
    expect(authResponseSchema.safeParse({ user, accessToken: "a", expiresIn: 900 }).success).toBe(
      true,
    );
    expect(
      authResponseSchema.safeParse({ user, accessToken: "a", expiresIn: 900, refreshToken: "r" })
        .success,
    ).toBe(true);
  });
});
