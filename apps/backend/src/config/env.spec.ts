import { describe, expect, it } from "vitest";

import { loadEnv } from "./env.js";

const DATABASE_URL = "postgresql://finance:finance@localhost:5432/finance?schema=public";

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
    expect(loadEnv({ DATABASE_URL })).toEqual({
      NODE_ENV: "development",
      PORT: 3000,
      DATABASE_URL,
    });
  });

  it("coerces PORT from string to number", () => {
    expect(loadEnv({ DATABASE_URL, PORT: "4000" }).PORT).toBe(4000);
  });

  it("fails when DATABASE_URL is missing", () => {
    expect(errorMessageOf(() => loadEnv({}))).toContain("DATABASE_URL");
  });

  it("rejects a non-PostgreSQL URL", () => {
    expect(errorMessageOf(() => loadEnv({ DATABASE_URL: "mysql://u:p@localhost/db" }))).toContain(
      "DATABASE_URL",
    );
  });

  it("rejects an invalid NODE_ENV and PORT", () => {
    const message = errorMessageOf(() =>
      loadEnv({ DATABASE_URL, NODE_ENV: "staging", PORT: "99999" }),
    );
    expect(message).toContain("NODE_ENV");
    expect(message).toContain("PORT");
  });

  it("never echoes the invalid values (they may be secrets)", () => {
    const message = errorMessageOf(() =>
      loadEnv({ DATABASE_URL: "s3cret-not-a-url", PORT: "s3cret-port" }),
    );
    expect(message).not.toContain("s3cret");
  });
});
