import type { IncomingMessage, ServerResponse } from "node:http";

import type { ApiErrorResponse } from "@finance/shared";
import { HttpAdapterHost } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AllExceptionsFilter } from "./common/all-exceptions.filter.js";
import { API_PREFIX } from "./common/api-prefix.js";
import { createValidationPipe } from "./common/validation.js";
import { ENV, type Env } from "./config/env.js";

export { API_PREFIX } from "./common/api-prefix.js";

/**
 * Configure and initialize the app. Shared by main.ts and the e2e tests,
 * so tests exercise exactly the same prefix, validation and error format.
 */
export async function setupApp(app: NestExpressApplication): Promise<void> {
  // Don't advertise the framework in every response.
  app.disable("x-powered-by");
  // Behind the Next.js proxy (and later a hosting proxy) the client IP is in X-Forwarded-For.
  // Only trusted proxies may set it, otherwise anyone could fake an IP to dodge rate limits.
  app.set("trust proxy", app.get<Env>(ENV).TRUST_PROXY);
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
  app.enableShutdownHooks();

  // Registers every route, plus Nest's own 404 handler for unmatched /api/v1/* paths.
  await app.init();

  // Since NestJS 12, requests outside the global prefix never reach Nest, so Express would
  // answer them with an HTML 404 page. Registered after init() so it only sees unmatched paths.
  app.use(notFoundFallback);
}

function notFoundFallback(req: IncomingMessage, res: ServerResponse): void {
  const body: ApiErrorResponse = {
    error: { code: "NOT_FOUND", message: `Cannot ${req.method ?? "GET"} ${req.url ?? "/"}` },
  };
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
