import { randomUUID } from "node:crypto";

import type { AuthResponse, LoginRequest, RegisterRequest, User as UserDto } from "@finance/shared";
import { HttpStatus, Injectable } from "@nestjs/common";

import { CategoriesService } from "../categories/categories.service.js";
import { ApiException } from "../common/api-exception.js";
import { Prisma, type User } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PasswordService } from "./password.service.js";
import { hashRefreshToken, TokenService } from "./token.service.js";

/** Tokens for a new or refreshed session. The controller decides how to deliver refreshToken. */
export type IssuedSession = AuthResponse & { refreshToken: string };

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    currency: user.currency,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
  };
}

function invalidCredentials(): ApiException {
  // Same message for "no such email" and "wrong password": don't reveal which emails exist.
  return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Invalid email or password");
}

function invalidRefreshToken(): ApiException {
  return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Invalid refresh token");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly categories: CategoriesService,
  ) {}

  /**
   * User, default categories and the first session are created in one transaction:
   * if any step fails, nothing is saved (no account without categories).
   */
  async register(input: RegisterRequest): Promise<IssuedSession> {
    const passwordHash = await this.passwords.hash(input.password);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: input.email, passwordHash, name: input.name ?? null },
        });
        await this.categories.createDefaults(tx, user.id);
        return this.issueSession(tx, user);
      });
    } catch (error) {
      // The unique index on email decides, so two simultaneous sign-ups cannot both succeed.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiException(HttpStatus.CONFLICT, "CONFLICT", "Email is already registered");
      }
      throw error;
    }
  }

  async login(input: LoginRequest): Promise<IssuedSession> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const passwordMatches = user
      ? await this.passwords.verify(user.passwordHash, input.password)
      : await this.passwords.verifyAgainstDummy(input.password);
    if (!user || !passwordMatches) {
      throw invalidCredentials();
    }
    return this.prisma.$transaction((tx) => this.issueSession(tx, user));
  }

  /**
   * Refresh token rotation: each refresh token works once and is replaced by a new one.
   * Presenting a token that was already used means a copy exists somewhere (stolen),
   * so the whole family is revoked and every device of that login must sign in again.
   */
  async refresh(refreshToken: string): Promise<IssuedSession> {
    const now = new Date();
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshToken) },
      include: { user: true },
    });
    if (!stored) {
      throw invalidRefreshToken();
    }
    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId, now);
      throw invalidRefreshToken();
    }
    if (stored.expiresAt <= now) {
      throw invalidRefreshToken();
    }

    const session = await this.prisma.$transaction(async (tx) => {
      // Claim the token atomically: if two requests race with the same token, only one wins.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: now },
      });
      if (claimed.count === 0) {
        return null;
      }
      return this.issueSession(tx, stored.user, stored.familyId);
    });

    if (!session) {
      // Lost the race: the same token was used twice, treat it like reuse.
      await this.revokeFamily(stored.familyId, now);
      throw invalidRefreshToken();
    }
    return session;
  }

  /** Ends the login this refresh token belongs to. Idempotent: unknown tokens are ignored. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshToken) },
      select: { familyId: true },
    });
    if (stored) {
      await this.revokeFamily(stored.familyId, new Date());
    }
  }

  async getUser(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      // Valid token for an account that no longer exists.
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Account not found");
    }
    return toUserDto(user);
  }

  private async issueSession(
    tx: Prisma.TransactionClient,
    user: User,
    familyId: string = randomUUID(),
  ): Promise<IssuedSession> {
    const { token, tokenHash } = this.tokens.createRefreshToken();
    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt: this.tokens.refreshTokenExpiresAt(),
      },
    });
    return {
      user: toUserDto(user),
      accessToken: await this.tokens.signAccessToken(user.id),
      expiresIn: this.tokens.accessTokenTtlSeconds,
      refreshToken: token,
    };
  }

  private async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
