import { describe, expect, it } from "vitest";

import { PasswordService } from "./password.service.js";

describe("PasswordService", () => {
  const passwords = new PasswordService();

  it("hashes with argon2id and a random salt (never stores the password)", async () => {
    const first = await passwords.hash("correct horse battery");
    const second = await passwords.hash("correct horse battery");

    expect(first.startsWith("$argon2id$")).toBe(true);
    expect(first).not.toContain("correct horse battery");
    expect(first).not.toBe(second);
  });

  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await passwords.hash("correct horse battery");

    await expect(passwords.verify(hash, "correct horse battery")).resolves.toBe(true);
    await expect(passwords.verify(hash, "Correct horse battery")).resolves.toBe(false);
  });

  it("always returns false for the dummy check used when the email does not exist", async () => {
    await expect(passwords.verifyAgainstDummy("anything")).resolves.toBe(false);
  });
});
