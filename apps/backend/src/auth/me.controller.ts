import type { User } from "@finance/shared";
import { Controller, Get } from "@nestjs/common";

import { AuthService } from "./auth.service.js";
import { type AuthUser, CurrentUser } from "./current-user.decorator.js";

@Controller("me")
export class MeController {
  constructor(private readonly auth: AuthService) {}

  /** GET /api/v1/me – the signed-in user's profile. */
  @Get()
  me(@CurrentUser() user: AuthUser): Promise<User> {
    return this.auth.getUser(user.id);
  }
}
