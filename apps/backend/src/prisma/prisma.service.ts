import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";

import { ENV, type Env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

/** One shared Prisma client (connection pool) for the whole app. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    // Prisma ORM 7 requires a driver adapter; adapter-pg uses the `pg` connection pool.
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  }

  async onModuleInit(): Promise<void> {
    // Fail at startup (not on the first request) if the database is unreachable.
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
