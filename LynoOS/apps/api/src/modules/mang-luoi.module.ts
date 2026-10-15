import { Module } from "@nestjs/common";
import { DaoTaoModule } from "./dao-tao.module";
import { ChienDichService, MaGioiThieuService, ThucTapService } from "../services/mang-luoi.service";
import { DongBoDonJob } from "../jobs/dong-bo-don.job";
import { GhiNhanDonService, HoaHongService } from "../services/mang-luoi-hoa-hong.service";
import { MangLuoiMentorController, MangLuoiQuanLyController } from "../controllers/mang-luoi-quan-ly.controller";
import { MangLuoiController } from "../controllers/mang-luoi.controller";
import {
  ChienDichRepository, GhiNhanDonRepository, HoaHongRepository, HoSoMangLuoiRepository, MaGioiThieuRepository, ThucTapRepository
} from "../repositories/mang-luoi.repository";

/**
 * Mang luoi CTV / TTS / KOL / KOC + ghi nhan don + vi hoa hong. Core (Prisma, CrmDocService, NhatKy, ThongBao...) la Global.
 * Export GhiNhanDonService (ban-hang goi xuLyDon sau khi tao don; quan-tri goi taoHoaHongNeuThieu sau khi duyet XAC_MINH_DON)
 * va HoaHongService (quan-tri goi apDungDieuChinh sau khi duyet DIEU_CHINH_HOA_HONG).
 */
@Module({
  imports: [DaoTaoModule],
  controllers: [MangLuoiController, MangLuoiMentorController, MangLuoiQuanLyController],
  providers: [
    MaGioiThieuRepository,
    ChienDichRepository,
    ThucTapRepository,
    GhiNhanDonRepository,
    HoaHongRepository,
    HoSoMangLuoiRepository,
    MaGioiThieuService,
    ChienDichService,
    ThucTapService,
    GhiNhanDonService,
    HoaHongService,
    DongBoDonJob
  ],
  exports: [GhiNhanDonService, HoaHongService, MaGioiThieuService]
})
export class MangLuoiModule {}
