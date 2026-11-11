import "dotenv/config";

/**
 * Integration tests run against a real PostgreSQL database and wipe it between tests.
 * To protect your development data, the database name must end with "_test"
 * (CI is allowed to use its own throwaway database).
 */
export function getTestDatabaseUrl(): string | undefined {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    return undefined;
  }
  const databaseName = new URL(url).pathname.replace(/^\//, "");
  if (!databaseName.endsWith("_test") && process.env.CI !== "true") {
    throw new Error(
      `TEST_DATABASE_URL points to "${databaseName}". Use a database whose name ends with "_test".`,
    );
  }
  return url;
}
