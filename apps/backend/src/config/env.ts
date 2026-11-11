import { z } from "zod";

/** Injection token for the validated environment. */
export const ENV = Symbol("ENV");

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables once at startup (fail fast).
 * The error lists which variables are wrong but never their values,
 * so secrets such as DATABASE_URL do not end up in logs.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
