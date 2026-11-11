import { Inject, Injectable } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";

import { API_PREFIX } from "../common/api-prefix.js";
import { ENV, type Env } from "../config/env.js";
import { TokenService } from "./token.service.js";

export const REFRESH_COOKIE_NAME = "finance_rt";
/** Only sent to the auth endpoints, never to the rest of the API. */
export const REFRESH_COOKIE_PATH = `/${API_PREFIX}/auth`;

/**
 * Web keeps the refresh token in an httpOnly cookie: JavaScript (including injected scripts)
 * cannot read it, and SameSite=Lax stops other sites from using it in a POST.
 */
@Injectable()
export class RefreshCookieService {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly tokens: TokenService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private get baseOptions() {
    return {
      httpOnly: true,
      // Browsers drop Secure cookies on plain http://localhost, so only require it in production.
      secure: this.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: REFRESH_COOKIE_PATH,
    };
  }

  set(response: unknown, refreshToken: string): void {
    this.adapterHost.httpAdapter.setCookie(response, REFRESH_COOKIE_NAME, refreshToken, {
      ...this.baseOptions,
      maxAge: this.tokens.refreshTokenTtlSeconds,
    });
  }

  clear(response: unknown): void {
    this.adapterHost.httpAdapter.clearCookie(response, REFRESH_COOKIE_NAME, this.baseOptions);
  }
}
