import { Controller, Get } from "@nestjs/common";
import { CongKhai } from "../common/decorators/xac-thuc.decorator";
import { PrismaService } from "../infrastructure/prisma/prisma.service";

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /api/health — kiem app + ket noi DB */
  @CongKhai()
  @Get("health")
  async health() {
    await this.prisma.$queryRaw`select 1`;
    return { trang_thai: "ok", dich_vu: "thien-khue-api" };
  }
}
