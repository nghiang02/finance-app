import { Controller, Get, HttpStatus } from "@nestjs/common";
import type { HealthResponse } from "@finance/shared";

import { Public } from "../auth/public.decorator.js";
import { ApiException } from "../common/api-exception.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Public()
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /api/v1/health – used by Docker/hosting health checks. */
  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "SERVICE_UNAVAILABLE",
        "Database is unreachable",
      );
    }
    return { status: "ok" };
  }
}
