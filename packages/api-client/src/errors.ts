import { type ErrorCode, validationErrorDetailsSchema } from "@finance/shared";

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

const GENERIC_MESSAGE = "Có lỗi xảy ra, vui lòng thử lại.";

const DEFAULT_MESSAGES: Partial<Record<ClientErrorCode, string>> = {
  NETWORK_ERROR: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
  TOO_MANY_REQUESTS: "Bạn thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.",
  VALIDATION_ERROR: "Thông tin chưa hợp lệ, vui lòng kiểm tra lại.",
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  SERVICE_UNAVAILABLE: "Máy chủ đang bảo trì, vui lòng thử lại sau.",
  INTERNAL_ERROR: "Máy chủ gặp lỗi, vui lòng thử lại sau.",
};

/**
 * A Vietnamese sentence to show the user. Screens override codes whose meaning depends
 * on context, e.g. UNAUTHORIZED on the login form means "wrong email or password".
 */
export function describeError(
  error: unknown,
  overrides: Partial<Record<ClientErrorCode, string>> = {},
): string {
  if (!isApiError(error)) {
    return GENERIC_MESSAGE;
  }
  return overrides[error.code] ?? DEFAULT_MESSAGES[error.code] ?? GENERIC_MESSAGE;
}

/** Field name → first error message, e.g. { email: "Email không hợp lệ" }. */
export type FieldErrors = Partial<Record<string, string>>;

interface Issue {
  readonly path: string | readonly PropertyKey[];
  readonly message: string;
}

/** Works for Zod issues (client-side checks) and server VALIDATION_ERROR issues alike. */
export function toFieldErrors(issues: readonly Issue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const path = typeof issue.path === "string" ? issue.path : issue.path.map(String).join(".");
    errors[path] ??= issue.message;
  }
  return errors;
}

/** Field errors from a server 400 VALIDATION_ERROR; empty for any other error. */
export function serverFieldErrors(error: unknown): FieldErrors {
  if (!isApiError(error) || error.code !== "VALIDATION_ERROR") {
    return {};
  }
  const details = validationErrorDetailsSchema.safeParse(error.details);
  return details.success ? toFieldErrors(details.data.issues) : {};
}
