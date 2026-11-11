import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { getTestDatabaseUrl } from "./test-database.js";

/** Bring the test database to the latest migration before any test runs. */
export default function setup(): void {
  const url = getTestDatabaseUrl();
  if (!url) {
    console.warn(
      "\n⚠ TEST_DATABASE_URL is not set: database integration tests are skipped.\n" +
        "  See apps/backend/.env.example to enable them.\n",
    );
    return;
  }
  execFileSync(resolve("node_modules/.bin/prisma"), ["migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
