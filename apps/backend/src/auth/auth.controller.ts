import {
  type AuthResponse,
  CLIENT_TYPE_HEADER,
  loginRequestSchema,
  type LoginRequest,
  refreshRequestSchema,
  type RefreshRequest,
  registerRequestSchema,
  type RegisterRequest,
} from "@finance/shared";
import {
  Body,
  Controller,
  Cookies,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from "@nestjs/common";
import { minutes, Throttle } from "@nestjs/throttler";

import { ApiException } from "../common/api-exception.js";
import { AuthService, type IssuedSession } from "./auth.service.js";
import { Public } from "./public.decorator.js";
import { REFRESH_COOKIE_NAME, RefreshCookieService } from "./refresh-cookie.service.js";

/** Per client IP. Slows down password guessing without bothering real users. */
const CREDENTIALS_THROTTLE = { default: { limit: 10, ttl: minutes(1) } };
const REFRESH_THROTTLE = { default: { limit: 30, ttl: minutes(1) } };

// Web may POST without a body; treat that as {}.
const refreshBodySchema = refreshRequestSchema.default({});

@Public()
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  @Post("register")
  @Throttle(CREDENTIALS_THROTTLE)
  async register(
    @Body({ schema: registerRequestSchema }) body: RegisterRequest,
    @Headers(CLIENT_TYPE_HEADER) clientType: string | undefined,
    @Res({ passthrough: true }) response: unknown,
  ): Promise<AuthResponse> {
    const session = await this.auth.register(body);
    return this.deliver(session, clientType === "mobile", response);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle(CREDENTIALS_THROTTLE)
  async login(
    @Body({ schema: loginRequestSchema }) body: LoginRequest,
    @Headers(CLIENT_TYPE_HEADER) clientType: string | undefined,
    @Res({ passthrough: true }) response: unknown,
  ): Promise<AuthResponse> {
    const session = await this.auth.login(body);
    return this.deliver(session, clientType === "mobile", response);
  }

  /**
   * The new token goes back through the channel the old one came from: body → body (mobile),
   * cookie → cookie (web). A script running in the browser can therefore never trade the
   * httpOnly cookie for a refresh token it could read.
   */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle(REFRESH_THROTTLE)
  async refresh(
    @Body({ schema: refreshBodySchema }) body: RefreshRequest,
    @Cookies(REFRESH_COOKIE_NAME) cookieToken: string | undefined,
    @Res({ passthrough: true }) response: unknown,
  ): Promise<AuthResponse> {
    if (body.refreshToken) {
      return this.auth.refresh(body.refreshToken);
    }
    if (!cookieToken) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Missing refresh token");
    }
    try {
      const session = await this.auth.refresh(cookieToken);
      return this.deliver(session, false, response);
    } catch (error) {
      // A dead cookie would make every page load fail the same way; remove it.
      this.refreshCookie.clear(response);
      throw error;
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(REFRESH_THROTTLE)
  async logout(
    @Body({ schema: refreshBodySchema }) body: RefreshRequest,
    @Cookies(REFRESH_COOKIE_NAME) cookieToken: string | undefined,
    @Res({ passthrough: true }) response: unknown,
  ): Promise<void> {
    await this.auth.logout(body.refreshToken ?? cookieToken);
    this.refreshCookie.clear(response);
  }

  private deliver(session: IssuedSession, isMobile: boolean, response: unknown): AuthResponse {
    if (isMobile) {
      return session;
    }
    const { refreshToken, ...rest } = session;
    this.refreshCookie.set(response, refreshToken);
    return rest;
  }
}
