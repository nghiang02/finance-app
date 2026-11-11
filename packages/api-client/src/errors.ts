import type { ErrorCode } from "@finance/shared";

/**
 * Codes the client can see: every server ErrorCode, plus failures that happen
 * before/after the server answers.
 */
export type ClientErrorCode = ErrorCode | "NETWORK_ERROR" | "INVALID_RESPONSE";

/** The only error type thrown by the API client, so screens handle one shape. */
export class ApiError extends Error {
  override readonly name = "ApiError";

  constructor(
    /** HTTP status, or 0 when the server could not be reached. */
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly details?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
