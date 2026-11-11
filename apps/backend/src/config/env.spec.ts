import { describe, expect, it } from "vitest";

import { loadEnv } from "./env.js";

const DATABASE_URL = "postgresql://finance:finance@localhost:5432/finance?schema=public";
const JWT_ACCESS_SECRET = "a".repeat(48);
const REQUIRED = { DATABASE_URL, JWT_ACCESS_SECRET };

function errorMessageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : "";
  }
  throw new Error("expected function to throw");
}

describe("loadEnv", () => {
  it("applies defaults", () => {
    expect(loadEnv(REQUIRED)).toEqual({
      NODE_ENV: "development",
      PORT: 3000,
      DATABASE_URL,
      JWT_ACCESS_SECRET,
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
      TRUST_PROXY: "loopback",
    });
  });

  it("coerces numbers and TRUST_PROXY values", () => {
    const env = loadEnv({ ...REQUIRED, PORT: "4000", TRUST_PROXY: "1" });
    expect(env.PORT).toBe(4000);
    expect(env.TRUST_PROXY).toBe(1);
    expect(loadEnv({ ...REQUIRED, TRUST_PROXY: "false" }).TRUST_PROXY).toBe(false);
  });

  it("fails when DATABASE_URL or JWT_ACCESS_SECRET is missing", () => {
    const message = errorMessageOf(() => loadEnv({}));
    expect(message).toContain("DATABASE_URL");
    expect(message).toContain("JWT_ACCESS_SECRET");
  });

  it("rejects a short JWT secret and a non-PostgreSQL URL", () => {
    const message = errorMessageOf(() =>
      loadEnv({ DATABASE_URL: "mysql://u:p@localhost/db", JWT_ACCESS_SECRET: "short" }),
    );
    expect(message).toContain("DATABASE_URL");
    expect(message).toContain("JWT_ACCESS_SECRET");
  });

  it("rejects an invalid NODE_ENV and PORT", () => {
    const message = errorMessageOf(() =>
      loadEnv({ ...REQUIRED, NODE_ENV: "staging", PORT: "99999" }),
    );
    expect(message).toContain("NODE_ENV");
    expect(message).toContain("PORT");
  });

  it("never echoes the invalid values (they may be secrets)", () => {
    const message = errorMessageOf(() =>
      loadEnv({ DATABASE_URL: "s3cret-not-a-url", JWT_ACCESS_SECRET: "s3cret", PORT: "s3cret" }),
    );
    expect(message).not.toContain("s3cret");
  });
});
