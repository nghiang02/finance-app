import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { ENV, type Env } from "../config/env.js";
import { AccessTokenGuard } from "./access-token.guard.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { MeController } from "./me.controller.js";
import { PasswordService } from "./password.service.js";
import { RefreshCookieService } from "./refresh-cookie.service.js";
import { TokenService } from "./token.service.js";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_ACCESS_SECRET,
        // Pin the algorithm so a token signed with anything else (e.g. "none") is rejected.
        signOptions: { algorithm: "HS256" },
        verifyOptions: { algorithms: ["HS256"] },
      }),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [AuthService, PasswordService, TokenService, RefreshCookieService, AccessTokenGuard],
  exports: [AccessTokenGuard, TokenService],
})
export class AuthModule {}
