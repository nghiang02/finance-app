import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { ApiErrorResponse, ErrorCode } from "@finance/shared";

import { Prisma } from "../generated/prisma/client.js";
import { ApiException } from "./api-exception.js";

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "VALIDATION_ERROR",
  [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS",
  [HttpStatus.SERVICE_UNAVAILABLE]: "SERVICE_UNAVAILABLE",
};

interface ErrorPayload {
  status: number;
  body: ApiErrorResponse;
}

function payload(
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): ErrorPayload {
  return {
    status,
    body: { error: details === undefined ? { code, message } : { code, message, details } },
  };
}

const INTERNAL_ERROR = payload(
  HttpStatus.INTERNAL_SERVER_ERROR,
  "INTERNAL_ERROR",
  "Internal server error",
);

/** Map anything thrown while handling a request to the API error format. */
export function toErrorPayload(exception: unknown): ErrorPayload {
  if (exception instanceof ApiException) {
    return payload(exception.getStatus(), exception.code, exception.message, exception.details);
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    // https://www.prisma.io/docs/orm/reference/error-reference
    if (exception.code === "P2002") {
      return payload(HttpStatus.CONFLICT, "CONFLICT", "Resource already exists");
    }
    if (exception.code === "P2025") {
      return payload(HttpStatus.NOT_FOUND, "NOT_FOUND", "Resource not found");
    }
    return INTERNAL_ERROR;
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    if (status >= 500) {
      return INTERNAL_ERROR;
    }
    return payload(status, CODE_BY_STATUS[status] ?? "BAD_REQUEST", exception.message);
  }

  return INTERNAL_ERROR;
}

/**
 * Single place that decides what clients see when something fails.
 * 5xx responses never include internal details (SQL, stack traces, connection strings);
 * those go to the server log instead.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = toErrorPayload(exception);

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : "Non-Error value thrown",
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const { httpAdapter } = this.adapterHost;
    httpAdapter.reply(host.switchToHttp().getResponse(), body, status);
  }
}
