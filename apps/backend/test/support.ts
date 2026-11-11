import { authResponseSchema, CLIENT_TYPE_HEADER } from "@finance/shared";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module.js";
import { setupApp } from "../src/app.setup.js";
import { ENV, type Env } from "../src/config/env.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

export const TEST_PASSWORD = "correct horse battery";

export interface TestApp {
  app: NestExpressApplication;
  prisma: PrismaService;
  http: () => ReturnType<typeof request>;
}

/** A real app on the test database, wiped before each test. */
export async function createTestApp(databaseUrl: string): Promise<TestApp> {
  const env: Env = {
    NODE_ENV: "test",
    PORT: 0,
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: "test-secret-that-is-long-enough-for-hs256-signing",
    ACCESS_TOKEN_TTL_SECONDS: 900,
    REFRESH_TOKEN_TTL_DAYS: 30,
    TRUST_PROXY: "loopback",
  };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue(env)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  await setupApp(app);
  const prisma = app.get(PrismaService);
  await prisma.$executeRaw`TRUNCATE "User" CASCADE`;
  return { app, prisma, http: () => request(app.getHttpServer()) };
}

export interface TestUser {
  id: string;
  accessToken: string;
  /** Authorization header value. */
  auth: string;
}

export async function registerUser(testApp: TestApp, email: string): Promise<TestUser> {
  const res = await testApp
    .http()
    .post("/api/v1/auth/register")
    .set(CLIENT_TYPE_HEADER, "mobile")
    .send({ email, password: TEST_PASSWORD });
  const body = authResponseSchema.parse(res.body);
  return { id: body.user.id, accessToken: body.accessToken, auth: `Bearer ${body.accessToken}` };
}
