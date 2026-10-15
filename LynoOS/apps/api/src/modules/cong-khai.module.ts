import { Module } from "@nestjs/common";
import { BanHangModule } from "./ban-hang.module";
import { CongKhaiController } from "../controllers/cong-khai.controller";
import { LienHeService, SanPhamCongKhaiService } from "../services/cong-khai.service";
import { LienHeRepository } from "../repositories/cong-khai.repository";

/** Trang cong khai (agent cong-khai). Core (Prisma, CrmDocService, NhatKy...) la Global — inject thang. */
@Module({
  imports: [BanHangModule],
  controllers: [CongKhaiController],
  providers: [SanPhamCongKhaiService, LienHeService, LienHeRepository],
  exports: [SanPhamCongKhaiService]
})
export class CongKhaiModule {}
