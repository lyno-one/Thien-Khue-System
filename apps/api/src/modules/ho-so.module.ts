import { Module } from "@nestjs/common";
import { DieuKienHocService, VaiService } from "../services/ho-so-vai.service";
import { HoSoController } from "../controllers/ho-so.controller";
import { HoSoService, XacMinhSdtService } from "../services/ho-so.service";
import { DieuKienHocRepository, HoSoRepository, VaiRepository, XacMinhSdtRepository } from "../repositories/ho-so.repository";
import { TtsLenCtvJob } from "../jobs/tts-len-ctv.job";

/**
 * Ho so & vai (agent ho-so). Core (Prisma, NhatKy, ThongBao, SupabaseAdmin...) la Global — inject thang.
 * Export cho module khac:
 *   - VaiService.kichHoat(hoSoId, vai, nguoiDoiId) — dao-tao goi sau khi hoc dat (vai DANG_HOC -> HOAT_DONG)
 *   - VaiService.apDungDeXuatChuyenVai(deXuatId, tx?) — quan-tri goi khi de xuat CHUYEN_VAI DA_DUYET
 *   - VaiService.quetTtsLenCtv() — TTS hoc dat khoa CTV tu them vai CTV (TtsLenCtvJob quet dinh ky, quan-tri bam tay)
 *   - DieuKienHocService.kiem(hoSoId, vai) — checklist hoc truoc khi ban
 *   - XacMinhSdtService.apXacMinh(hoSoId, sdtChuan, { cach: "OTP", ... }) — de gan luong OTP sau nay
 * Khong import DaoTaoModule (tranh vong import) — dieu kien hoc doc thang bang LMS qua DieuKienHocRepository.
 */
@Module({
  controllers: [HoSoController],
  providers: [
    HoSoRepository,
    VaiRepository,
    DieuKienHocRepository,
    XacMinhSdtRepository,
    HoSoService,
    VaiService,
    DieuKienHocService,
    XacMinhSdtService,
    TtsLenCtvJob
  ],
  exports: [VaiService, DieuKienHocService, XacMinhSdtService]
})
export class HoSoModule {}
