import { HttpStatus, StandardSchemaValidationPipe } from "@nestjs/common";
import type { ValidationErrorDetails, ValidationIssue } from "@finance/shared";

import { ApiException } from "./api-exception.js";

/** Minimal shape of a Standard Schema issue (Zod, Valibot, ArkType all produce it). */
interface SchemaIssue {
  readonly message: string;
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[] | undefined;
}

export function toValidationIssues(issues: readonly SchemaIssue[]): ValidationIssue[] {
  return issues.map((issue) => ({
    path: (issue.path ?? [])
      .map((segment) => String(typeof segment === "object" ? segment.key : segment))
      .join("."),
    message: issue.message,
  }));
}

/**
 * NestJS 12 validates any parameter declared with `{ schema }`,
 * e.g. `@Body({ schema: createWalletSchema })`, using the Zod schemas from @finance/shared.
 * Parameters without a schema pass through unchanged.
 */
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues: readonly SchemaIssue[]) => {
      const details: ValidationErrorDetails = { issues: toValidationIssues(issues) };
      return new ApiException(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_ERROR",
        "Request validation failed",
        details,
      );
    },
  });
}
