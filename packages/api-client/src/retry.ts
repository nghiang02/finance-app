import { isApiError } from "./errors.js";

/**
 * TanStack Query `retry` option shared by web and mobile.
 * Client errors (4xx: validation, unauthorized, not found…) will not succeed on retry,
 * so fail fast; network and server errors are retried up to 2 times.
 */
export function shouldRetryRequest(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}
