import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { minutes, ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AccessTokenGuard } from "./auth/access-token.guard.js";
import { AuthModule } from "./auth/auth.module.js";
import { CategoriesModule } from "./categories/categories.module.js";
import { ConfigModule } from "./config/config.module.js";
import { HealthModule } from "./health/health.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { WalletsModule } from "./wallets/wallets.module.js";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    // Generous default for every route; auth routes set stricter limits with @Throttle().
    ThrottlerModule.forRoot({ throttlers: [{ name: "default", ttl: minutes(1), limit: 300 }] }),
    AuthModule,
    CategoriesModule,
    HealthModule,
    WalletsModule,
  ],
  providers: [
    // Global guards run in this order: rate limit first, then authentication.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: AccessTokenGuard },
  ],
})
export class AppModule {}
