import {
  apiErrorResponseSchema,
  authResponseSchema,
  CLIENT_TYPE_HEADER,
  DEFAULT_CATEGORIES,
  userSchema,
} from "@finance/shared";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppModule } from "../src/app.module.js";
import { setupApp } from "../src/app.setup.js";
import { REFRESH_COOKIE_NAME } from "../src/auth/refresh-cookie.service.js";
import { hashRefreshToken } from "../src/auth/token.service.js";
import { CategoriesService } from "../src/categories/categories.service.js";
import { ENV, type Env } from "../src/config/env.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { getTestDatabaseUrl } from "./test-database.js";

const databaseUrl = getTestDatabaseUrl();

const PASSWORD = "correct horse battery";

function parseAuth(body: unknown) {
  return authResponseSchema.parse(body);
}

function parseError(body: unknown) {
  return apiErrorResponseSchema.parse(body).error;
}

/** The refresh cookie from a response, e.g. "finance_rt=abc; Path=/api/v1/auth; HttpOnly; …". */
function refreshCookieOf(res: request.Response): string | undefined {
  const header = res.get("Set-Cookie") ?? [];
  return header.find((cookie) => cookie.startsWith(`${REFRESH_COOKIE_NAME}=`));
}

/** "finance_rt=abc; Path=…" -> "finance_rt=abc" (what the browser sends back). */
function cookiePair(setCookie: string | undefined): string {
  if (!setCookie) {
    throw new Error("expected a refresh cookie");
  }
  return setCookie.split(";")[0] ?? "";
}

describe.skipIf(!databaseUrl)("Auth (integration, real database)", () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  // A fresh app per test also resets the in-memory rate limiter.
  beforeEach(async () => {
    const env: Env = {
      NODE_ENV: "test",
      PORT: 0,
      DATABASE_URL: databaseUrl ?? "",
      JWT_ACCESS_SECRET: "test-secret-that-is-long-enough-for-hs256-signing",
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
      TRUST_PROXY: "loopback",
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENV)
      .useValue(env)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    await setupApp(app);
    prisma = app.get(PrismaService);
    await prisma.$executeRaw`TRUNCATE "User" CASCADE`;
  });

  afterEach(async () => {
    await app.close();
  });

  function register(
    body: Record<string, unknown> = { email: "an@example.com", password: PASSWORD },
    client: "web" | "mobile" = "mobile",
  ) {
    return request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .set(CLIENT_TYPE_HEADER, client)
      .send(body);
  }

  function login(
    email = "an@example.com",
    password = PASSWORD,
    client: "web" | "mobile" = "mobile",
  ) {
    return request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set(CLIENT_TYPE_HEADER, client)
      .send({ email, password });
  }

  function refreshWithBody(refreshToken: string) {
    return request(app.getHttpServer()).post("/api/v1/auth/refresh").send({ refreshToken });
  }

  describe("register", () => {
    it("creates the account and returns both tokens to a mobile client", async () => {
      const res = await register({ email: "  An@Example.COM ", password: PASSWORD, name: "An" });

      expect(res.status).toBe(201);
      const body = parseAuth(res.body);
      expect(body.user).toMatchObject({ email: "an@example.com", name: "An", currency: "VND" });
      expect(body.refreshToken).toBeTypeOf("string");
      expect(body.expiresIn).toBe(900);
      expect(refreshCookieOf(res)).toBeUndefined();
    });

    it("gives a web client the refresh token only as an httpOnly cookie", async () => {
      const res = await register(undefined, "web");

      expect(res.status).toBe(201);
      expect(parseAuth(res.body).refreshToken).toBeUndefined();
      const cookie = refreshCookieOf(res);
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Path=/api/v1/auth");
      expect(cookie).toMatch(/SameSite=Lax/i);
    });

    it("stores an argon2id hash, never the password or the raw refresh token", async () => {
      const body = parseAuth((await register()).body);

      const user = await prisma.user.findUniqueOrThrow({ where: { id: body.user.id } });
      expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
      const tokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(tokens).toHaveLength(1);
      expect(tokens[0]?.tokenHash).toBe(hashRefreshToken(body.refreshToken ?? ""));
    });

    it("rejects an email that is already registered (case-insensitive) with 409", async () => {
      await register();
      const res = await register({ email: "AN@example.com", password: PASSWORD });

      expect(res.status).toBe(409);
      expect(parseError(res.body).code).toBe("CONFLICT");
    });

    it("validates the body with the shared schema", async () => {
      const res = await register({ email: "not-an-email", password: "short" });

      expect(res.status).toBe(400);
      expect(parseError(res.body).code).toBe("VALIDATION_ERROR");
    });
  });

  describe("default categories", () => {
    const expectedTotal = DEFAULT_CATEGORIES.reduce(
      (total, category) => total + 1 + (category.children?.length ?? 0),
      0,
    );

    it("creates the default categories, with children linked to their parent", async () => {
      const { user } = parseAuth((await register()).body);

      const categories = await prisma.category.findMany({ where: { userId: user.id } });
      expect(categories).toHaveLength(expectedTotal);

      const food = categories.find((c) => c.name === "Ăn uống" && c.parentId === null);
      const coffee = categories.find((c) => c.name === "Cà phê");
      expect(food).toMatchObject({ type: "EXPENSE", icon: "🍜", color: "#F97316" });
      // Children inherit the parent's type and color.
      expect(coffee).toMatchObject({ parentId: food?.id, type: "EXPENSE", color: "#F97316" });
      expect(categories.filter((c) => c.type === "INCOME").map((c) => c.name)).toContain("Lương");
    });

    it("gives every user their own copy", async () => {
      const a = parseAuth((await register({ email: "a@example.com", password: PASSWORD })).body);
      const b = parseAuth((await register({ email: "b@example.com", password: PASSWORD })).body);

      expect(await prisma.category.count({ where: { userId: a.user.id } })).toBe(expectedTotal);
      expect(await prisma.category.count({ where: { userId: b.user.id } })).toBe(expectedTotal);
    });

    it("rolls back the whole sign-up if creating the categories fails", async () => {
      vi.spyOn(app.get(CategoriesService), "createDefaults").mockRejectedValueOnce(
        new Error("simulated failure"),
      );

      const res = await register();

      expect(res.status).toBe(500);
      expect(parseError(res.body).code).toBe("INTERNAL_ERROR");
      // No half-created account: no user, no categories, no refresh token.
      expect(await prisma.user.count()).toBe(0);
      expect(await prisma.category.count()).toBe(0);
      expect(await prisma.refreshToken.count()).toBe(0);
    });
  });

  describe("login and /me", () => {
    it("logs in and reads the profile with the access token", async () => {
      await register();
      const { accessToken } = parseAuth((await login()).body);

      const res = await request(app.getHttpServer())
        .get("/api/v1/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(userSchema.parse(res.body).email).toBe("an@example.com");
    });

    it("gives the same 401 for a wrong password and an unknown email", async () => {
      await register();
      const wrongPassword = await login("an@example.com", "wrong password");
      const unknownEmail = await login("nobody@example.com", PASSWORD);

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(parseError(wrongPassword.body)).toEqual(parseError(unknownEmail.body));
    });

    it("rejects /me without a valid access token", async () => {
      await request(app.getHttpServer()).get("/api/v1/me").expect(401);
      await request(app.getHttpServer())
        .get("/api/v1/me")
        .set("Authorization", "Bearer not-a-token")
        .expect(401);
    });

    it("limits login attempts per IP (429 after 10 per minute)", async () => {
      for (let attempt = 1; attempt <= 10; attempt++) {
        expect((await login("an@example.com", "wrong password")).status).toBe(401);
      }
      const blocked = await login("an@example.com", "wrong password");

      expect(blocked.status).toBe(429);
      expect(parseError(blocked.body).code).toBe("TOO_MANY_REQUESTS");
    });
  });

  describe("refresh token rotation", () => {
    it("issues a new refresh token and invalidates the old one", async () => {
      const first = parseAuth((await register()).body).refreshToken ?? "";

      const res = await refreshWithBody(first).expect(200);
      const second = parseAuth(res.body).refreshToken ?? "";

      expect(second).not.toBe(first);
      expect(second.length).toBeGreaterThan(0);
    });

    it("revokes the whole login when an already-used token comes back (theft detection)", async () => {
      const stolen = parseAuth((await register()).body).refreshToken ?? "";
      const legit = parseAuth((await refreshWithBody(stolen)).body).refreshToken ?? "";

      // The attacker replays the old token…
      expect((await refreshWithBody(stolen)).status).toBe(401);
      // …so the legitimate user's newer token is revoked as well.
      expect((await refreshWithBody(legit)).status).toBe(401);
    });

    it("does not affect other logins of the same user", async () => {
      await register();
      const phone = parseAuth((await login()).body).refreshToken ?? "";
      const tablet = parseAuth((await login()).body).refreshToken ?? "";
      await refreshWithBody(phone);

      await refreshWithBody(phone); // reuse on the phone revokes only the phone's family

      expect((await refreshWithBody(tablet)).status).toBe(200);
    });

    it("rejects an expired refresh token", async () => {
      const token = parseAuth((await register()).body).refreshToken ?? "";
      await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

      expect((await refreshWithBody(token)).status).toBe(401);
    });

    it("rotates the web cookie and never puts the token in the body", async () => {
      const cookie = cookiePair(refreshCookieOf(await register(undefined, "web")));

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .set("Cookie", cookie)
        .expect(200);

      expect(parseAuth(res.body).refreshToken).toBeUndefined();
      const rotated = cookiePair(refreshCookieOf(res));
      expect(rotated).not.toBe(cookie);
    });

    it("rejects a refresh without any token", async () => {
      const res = await request(app.getHttpServer()).post("/api/v1/auth/refresh").expect(401);

      expect(parseError(res.body).code).toBe("UNAUTHORIZED");
    });
  });

  describe("logout", () => {
    it("revokes the refresh token (mobile)", async () => {
      const token = parseAuth((await register()).body).refreshToken ?? "";

      await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .send({ refreshToken: token })
        .expect(204);

      expect((await refreshWithBody(token)).status).toBe(401);
    });

    it("revokes and clears the cookie (web), and is safe to call twice", async () => {
      const cookie = cookiePair(refreshCookieOf(await register(undefined, "web")));

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Cookie", cookie)
        .expect(204);
      expect(refreshCookieOf(res)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);

      await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Cookie", cookie)
        .expect(204);
      await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .set("Cookie", cookie)
        .expect(401);
    });
  });
});
