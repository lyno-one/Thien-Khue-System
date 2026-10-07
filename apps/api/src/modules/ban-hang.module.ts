import { Module } from "@nestjs/common";
import { DaoTaoModule } from "./dao-tao.module";
import { MangLuoiModule } from "./mang-luoi.module";
import { BanHangController } from "../controllers/ban-hang.controller";
import { CaTrucService, DonService, HopViecService, HoTroService, KhachService, LeadService } from "../services/ban-hang.service";
import { PhanBoService } from "../services/ban-hang-phan-bo.service";
import {
  CaTrucRepository, DonRepository, HopViecRepository, HoTroRepository, KhachRepository, LeadRepository, PhanBoRepository
} from "../repositories/ban-hang.repository";

/**
 * Sale / CSKH (agent ban-hang). Core (Prisma, CrmDocService, CrmApiClient, NhatKy, ThongBao...) la Global — inject thang.
 * Export PhanBoService: module cong-khai `imports: [BanHangModule]` roi goi phanBoLead(lead.id) sau khi tao lead.
 */
@Module({
  imports: [DaoTaoModule, MangLuoiModule],
  controllers: [BanHangController],
  providers: [
    PhanBoService,
    KhachService,
    DonService,
    CaTrucService,
    LeadService,
    HoTroService,
    HopViecService,
    PhanBoRepository,
    KhachRepository,
    DonRepository,
    CaTrucRepository,
    LeadRepository,
    HoTroRepository,
    HopViecRepository
  ],
  exports: [PhanBoService]
})
export class BanHangModule {}
