import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ApiException } from "../common/api-exception.js";
import type { RequestWithUser } from "./current-user.decorator.js";
import { IS_PUBLIC_KEY } from "./public.decorator.js";
import { TokenService } from "./token.service.js";

interface HttpRequest extends RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
}

function extractBearerToken(header: string | string[] | undefined): string | null {
  if (typeof header !== "string") {
    return null;
  }
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

/** Global guard: a route is protected unless it is marked @Public(). */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<HttpRequest>();
    const token = extractBearerToken(request.headers.authorization);
    const userId = token ? await this.tokens.verifyAccessToken(token) : null;
    if (!userId) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        "UNAUTHORIZED",
        token ? "Invalid or expired access token" : "Missing access token",
      );
    }

    request.user = { id: userId };
    return true;
  }
}
