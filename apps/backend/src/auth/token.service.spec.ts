import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";

import type { Env } from "../config/env.js";
import { hashRefreshToken, TokenService } from "./token.service.js";

const SECRET = "test-secret-that-is-long-enough-for-hs256-signing";

function setup() {
  const jwt = new JwtService({
    secret: SECRET,
    signOptions: { algorithm: "HS256" },
    verifyOptions: { algorithms: ["HS256"] },
  });
  const env = { ACCESS_TOKEN_TTL_SECONDS: 900, REFRESH_TOKEN_TTL_DAYS: 30 } as Env;
  return { jwt, tokens: new TokenService(jwt, env) };
}

describe("TokenService", () => {
  it("signs an access token whose subject is the user id", async () => {
    const { tokens } = setup();

    const token = await tokens.signAccessToken("user-1");

    await expect(tokens.verifyAccessToken(token)).resolves.toBe("user-1");
  });

  it("rejects tampered, foreign and expired access tokens", async () => {
    const { jwt, tokens } = setup();
    const token = await tokens.signAccessToken("user-1");
    const foreign = await new JwtService({ secret: "another-secret-another-secret-123" }).signAsync(
      { sub: "user-1" },
    );
    const expired = await jwt.signAsync({ sub: "user-1" }, { expiresIn: -10 });

    await expect(tokens.verifyAccessToken(`${token}x`)).resolves.toBeNull();
    await expect(tokens.verifyAccessToken(foreign)).resolves.toBeNull();
    await expect(tokens.verifyAccessToken(expired)).resolves.toBeNull();
    await expect(tokens.verifyAccessToken("not-a-jwt")).resolves.toBeNull();
  });

  it("creates unguessable refresh tokens and stores only their hash", () => {
    const { tokens } = setup();

    const a = tokens.createRefreshToken();
    const b = tokens.createRefreshToken();

    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(43); // 32 random bytes, base64url
    expect(a.tokenHash).toBe(hashRefreshToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
  });

  it("expires refresh tokens after the configured number of days", () => {
    const { tokens } = setup();
    const now = new Date("2026-11-12T00:00:00.000Z");

    expect(tokens.refreshTokenExpiresAt(now).toISOString()).toBe("2026-12-12T00:00:00.000Z");
    expect(tokens.refreshTokenTtlSeconds).toBe(30 * 86_400);
  });
});
