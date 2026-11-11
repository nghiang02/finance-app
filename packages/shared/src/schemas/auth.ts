import { z } from "zod";

/**
 * Header a client sends to say how it stores the refresh token:
 * "mobile" gets it in the JSON body (kept in SecureStore),
 * anything else (web) gets it as an httpOnly cookie.
 */
export const CLIENT_TYPE_HEADER = "x-client-type";
export const clientTypeSchema = z.enum(["web", "mobile"]);
export type ClientType = z.infer<typeof clientTypeSchema>;

export const PASSWORD_MIN_LENGTH = 8;
/** Upper bound keeps password hashing cheap enough to not become a DoS vector. */
export const PASSWORD_MAX_LENGTH = 128;

/** Trimmed and lower-cased, so "An@Mail.com " and "an@mail.com" are the same account. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Email không hợp lệ").max(254, "Email quá dài"));

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Mật khẩu cần ít nhất ${String(PASSWORD_MIN_LENGTH)} ký tự`)
  .max(PASSWORD_MAX_LENGTH, `Mật khẩu tối đa ${String(PASSWORD_MAX_LENGTH)} ký tự`);

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  name: z.string().trim().min(1, "Tên không được để trống").max(100, "Tên quá dài").optional(),
});
/** What the server receives after parsing. */
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
/** What a form sends (before trimming/lower-casing). */
export type RegisterInput = z.input<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  // Strength rules are not re-checked at login: older accounts may predate them.
  password: z.string().min(1, "Vui lòng nhập mật khẩu").max(PASSWORD_MAX_LENGTH),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginInput = z.input<typeof loginRequestSchema>;

/** Mobile sends the refresh token in the body; web sends nothing (the cookie carries it). */
export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1).max(512).optional(),
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  currency: z.string(),
  timezone: z.string(),
  createdAt: z.iso.datetime(),
});
export type User = z.infer<typeof userSchema>;

export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  /** Seconds until the access token expires. */
  expiresIn: z.number().int().positive(),
  /** Only for mobile clients; web receives it as an httpOnly cookie instead. */
  refreshToken: z.string().optional(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
