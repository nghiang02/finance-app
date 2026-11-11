import { z } from "zod";

/** Injection token for the validated environment. */
export const ENV = Symbol("ENV");

/** Express "trust proxy" accepts booleans, hop counts or address lists like "loopback". */
const trustProxySchema = z
  .string()
  .default("loopback")
  .transform((value): boolean | number | string => {
    if (value === "true") return true;
    if (value === "false") return false;
    if (/^\d+$/.test(value)) return Number(value);
    return value;
  });

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters (openssl rand -base64 48)"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  TRUST_PROXY: trustProxySchema,
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
