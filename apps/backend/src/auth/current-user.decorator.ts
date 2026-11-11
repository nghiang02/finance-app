import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

/** What AccessTokenGuard attaches to the request after verifying the access token. */
export interface AuthUser {
  id: string;
}

export interface RequestWithUser {
  user?: AuthUser;
}

/** `@CurrentUser() user: AuthUser` – the signed-in user. Every query must filter by `user.id`. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  if (!request.user) {
    // Only possible on a @Public() route, which is a programming error.
    throw new Error("@CurrentUser() used on a route that is not protected by AccessTokenGuard");
  }
  return request.user;
});
