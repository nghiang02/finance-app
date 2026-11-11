import { createHash, randomBytes } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { ENV, type Env } from "../config/env.js";

const DAY_MS = 86_400_000;

/**
 * Refresh tokens are random (256 bits), so a fast hash like SHA-256 is enough to store them:
 * unlike passwords they cannot be guessed from a dictionary.
 */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  get accessTokenTtlSeconds(): number {
    return this.env.ACCESS_TOKEN_TTL_SECONDS;
  }

  signAccessToken(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId }, { expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS });
  }

  /** Returns the user id, or null when the token is invalid, tampered with or expired. */
  async verifyAccessToken(token: string): Promise<string | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token);
      return typeof payload.sub === "string" ? payload.sub : null;
    } catch {
      return null;
    }
  }

  createRefreshToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString("base64url");
    return { token, tokenHash: hashRefreshToken(token) };
  }

  refreshTokenExpiresAt(now: Date = new Date()): Date {
    return new Date(now.getTime() + this.env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);
  }

  get refreshTokenTtlSeconds(): number {
    return this.env.REFRESH_TOKEN_TTL_DAYS * (DAY_MS / 1000);
  }
}
