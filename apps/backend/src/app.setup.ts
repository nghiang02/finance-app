import type { IncomingMessage, ServerResponse } from "node:http";

import type { ApiErrorResponse } from "@finance/shared";
import { HttpAdapterHost } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AllExceptionsFilter } from "./common/all-exceptions.filter.js";
import { createValidationPipe } from "./common/validation.js";

export const API_PREFIX = "api/v1";

/**
 * Configure and initialize the app. Shared by main.ts and the e2e tests,
 * so tests exercise exactly the same prefix, validation and error format.
 */
export async function setupApp(app: NestExpressApplication): Promise<void> {
  // Don't advertise the framework in every response.
  app.disable("x-powered-by");
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
