import { Module } from "@nestjs/common";
import { HoSoModule } from "./ho-so.module";
import { MangLuoiModule } from "./mang-luoi.module";
import { ApDungDeXuatService } from "../services/quan-tri-ap-dung.service";
import { DeXuatService, HoSoQuanTriService, TongQuanService } from "../services/quan-tri.service";
import { QuanTriController } from "../controllers/quan-tri.controller";
import {
  ApDungDeXuatRepository, DeXuatRepository, HoSoQuanTriRepository, NguoiTomTatRepository, TongQuanRepository
} from "../repositories/quan-tri.repository";

/**
 * Quan tri (agent quan-tri): bang dieu hanh, 6 nhom ho so, ban phe duyet maker-checker.
 * Core (Prisma, CrmDocService, NhatKy, ThongBao...) la Global — inject thang. Truy van thien_khue chi o repositories/quan-tri.repository.ts.
 * Export DeXuatService de module khac doc / dem de xuat neu can (tao de xuat: ghi thang de_xuat_duyet CHO_KIEM + nhat_ky).
 */
@Module({
  // HoSoModule: DieuKienHocService — chuyen vai phai hoc sang HOAT_DONG luon kiem dieu kien hoc
  imports: [MangLuoiModule, HoSoModule],
  controllers: [QuanTriController],
  providers: [
    ApDungDeXuatService,
    DeXuatService,
    HoSoQuanTriService,
    TongQuanService,
    ApDungDeXuatRepository,
    DeXuatRepository,
    HoSoQuanTriRepository,
    NguoiTomTatRepository,
    TongQuanRepository
  ],
  exports: [DeXuatService]
})
export class QuanTriModule {}
