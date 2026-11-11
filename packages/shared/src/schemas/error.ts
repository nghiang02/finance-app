import { z } from "zod";

/**
 * Every API error response has the shape
 * `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {...} } }`.
 * Add new codes here when a feature needs them, so web and mobile can react to them.
 */
export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "TOO_MANY_REQUESTS",
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** One invalid field. `path` is dot-separated ("items.0.amount"); "" means the whole value. */
export const validationIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});
export type ValidationIssue = z.infer<typeof validationIssueSchema>;

/** `details` of a VALIDATION_ERROR response. */
export const validationErrorDetailsSchema = z.object({
  issues: z.array(validationIssueSchema),
});
export type ValidationErrorDetails = z.infer<typeof validationErrorDetailsSchema>;

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
