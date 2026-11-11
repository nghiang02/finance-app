import {
  apiErrorResponseSchema,
  healthResponseSchema,
  validationErrorDetailsSchema,
} from "@finance/shared";
import { Body, Controller, Get, Post } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AppModule } from "../src/app.module.js";
import { setupApp } from "../src/app.setup.js";
import { ENV, type Env } from "../src/config/env.js";
import { Prisma } from "../src/generated/prisma/client.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

const testEnv: Env = {
  NODE_ENV: "test",
  PORT: 0,
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
};

const createItemSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().int().positive(),
});
type CreateItemBody = z.infer<typeof createItemSchema>;

/** Routes that exist only in this test, to exercise validation and error mapping. */
@Controller("test")
class TestController {
  @Post("items")
  create(@Body({ schema: createItemSchema }) body: CreateItemBody): CreateItemBody {
    return body;
  }

  @Get("crash")
  crash(): never {
    throw new Error("connect failed: postgresql://admin:s3cret@db.internal/finance");
  }

  @Get("duplicate")
  duplicate(): never {
    throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    });
  }
}

function parseError(body: unknown) {
  return apiErrorResponseSchema.parse(body).error;
}

describe("App (e2e)", () => {
  let app: NestExpressApplication;
  const queryRaw = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestController],
    })
      .overrideProvider(ENV)
      .useValue(testEnv)
      // No real database: the health check only needs $queryRaw.
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: queryRaw })
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    await setupApp(app);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    queryRaw.mockReset();
  });

  describe("GET /api/v1/health", () => {
    it("returns ok when the database answers", async () => {
      queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const res = await request(app.getHttpServer()).get("/api/v1/health").expect(200);

      expect(healthResponseSchema.parse(res.body)).toEqual({ status: "ok" });
    });

    it("returns 503 SERVICE_UNAVAILABLE when the database is down", async () => {
      queryRaw.mockRejectedValue(new Error("ECONNREFUSED"));

      const res = await request(app.getHttpServer()).get("/api/v1/health").expect(503);

      expect(parseError(res.body).code).toBe("SERVICE_UNAVAILABLE");
    });
  });

  describe("routing", () => {
    it("serves routes only under the /api/v1 prefix, with a JSON 404 outside it", async () => {
      const res = await request(app.getHttpServer())
        .get("/health")
        .expect(404)
        .expect("Content-Type", /application\/json/);

      expect(parseError(res.body).code).toBe("NOT_FOUND");
    });

    it("returns NOT_FOUND in the API error format for unknown routes", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/does-not-exist").expect(404);

      expect(parseError(res.body)).toMatchObject({ code: "NOT_FOUND" });
    });

    it("does not advertise the framework (no X-Powered-By header)", async () => {
      queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const res = await request(app.getHttpServer()).get("/api/v1/health").expect(200);

      expect(res.get("X-Powered-By")).toBeUndefined();
    });
  });

  describe("validation", () => {
    it("returns 400 VALIDATION_ERROR with one issue per invalid field", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/test/items")
        .send({ name: "", amount: "-5" })
        .expect(400);

      const error = parseError(res.body);
      expect(error.code).toBe("VALIDATION_ERROR");
      const { issues } = validationErrorDetailsSchema.parse(error.details);
      expect(issues.map((issue) => issue.path).sort()).toEqual(["amount", "name"]);
    });

    it("passes the parsed (coerced) value to the handler", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/test/items")
        .send({ name: "Coffee", amount: "25000", extra: "stripped" })
        .expect(201);

      expect(z.strictObject({ name: z.string(), amount: z.number() }).parse(res.body)).toEqual({
        name: "Coffee",
        amount: 25000,
      });
    });
  });

  describe("error mapping", () => {
    it("hides internal details of unexpected errors", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/test/crash").expect(500);

      expect(parseError(res.body)).toEqual({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      });
      expect(JSON.stringify(res.body)).not.toContain("s3cret");
    });

    it("maps a Prisma unique violation (P2002) to 409 CONFLICT", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/test/duplicate").expect(409);

      expect(parseError(res.body).code).toBe("CONFLICT");
    });
  });
});
