import { Module } from "@nestjs/common";
import { DoiTacService, HangThanhVienService, KhHanhPhucService } from "../services/khach-doi-tac.service";
import { KhachDoiTacController } from "../controllers/khach-doi-tac.controller";
import { UuDaiService } from "../services/khach-doi-tac-uu-dai.service";
import {
  DoiTacRepository, HangThanhVienRepository, HoSoKhachRepository, KhHanhPhucRepository, UuDaiRepository
} from "../repositories/khach-doi-tac.repository";

/**
 * Khach hang & doi tac: hang the (tinh luc doc tu don hop le CRM), KH hanh phuc, qua / voucher doi tac, doi tac chien luoc.
 * Core (Prisma, CrmDocService, NhatKy, ThongBao...) la Global — inject thang.
 * Export HangThanhVienService de module khac (ban-hang, cong-khai) lay hang + giam gia cua khach.
 */
@Module({
  controllers: [KhachDoiTacController],
  providers: [
    HangThanhVienService,
    KhHanhPhucService,
    UuDaiService,
    DoiTacService,
    HangThanhVienRepository,
    HoSoKhachRepository,
    KhHanhPhucRepository,
    UuDaiRepository,
    DoiTacRepository
  ],
  exports: [HangThanhVienService]
})
export class KhachDoiTacModule {}
