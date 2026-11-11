import { HttpException, type HttpStatus } from "@nestjs/common";
import type { ErrorCode } from "@finance/shared";

/**
 * Throw this from services/controllers for expected errors.
 * AllExceptionsFilter turns it into `{ error: { code, message, details } }`.
 */
export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message, status);
  }
}
