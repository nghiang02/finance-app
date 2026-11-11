import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Every route requires a valid access token (AccessTokenGuard is global).
 * Mark the few that don't – health check, register, login, refresh, logout – with @Public().
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
