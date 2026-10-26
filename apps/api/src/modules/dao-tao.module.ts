import { Module } from "@nestjs/common";
import { DaoTaoController } from "../controllers/dao-tao.controller";
import { HocVienService, KiemTraService, ThucHanhService, TienDoDoiService, XetDatService } from "../services/dao-tao.service";
import { DaoTaoQuanTriController } from "../controllers/dao-tao-quan-tri.controller";
import { QuanTriNoiDungService } from "../services/dao-tao-quan-tri.service";
import { QuyenSkuGuard } from "../common/guards/quyen-sku.guard";
import { QuyenSkuService } from "../services/dao-tao-quyen-sku.service";
import { DaoTaoLuyenAiController } from "../controllers/dao-tao-luyen-ai.controller";
import { LuyenAiService } from "../services/dao-tao-luyen-ai.service";
import { HmacStGuard } from "../common/guards/hmac-st.guard";
import { DaoTaoBaiLynoController } from "../controllers/dao-tao-bai-lyno.controller";
import { BaiLynoService } from "../services/dao-tao-bai-lyno.service";
import {
  DuLieuHocRepository, HocVienRepository, KiemTraRepository, LuyenAiRepository, QuanTriNoiDungRepository, QuyenSkuRepository, ThucHanhRepository,
  TienDoDoiRepository, XetDatRepository
} from "../repositories/dao-tao.repository";

/**
 * Dao tao LMS (agent dao-tao). Export cho module khac (ban-hang, mang-luoi...): imports: [DaoTaoModule] roi
 *  - inject QuyenSkuService: kiem(hoSoId, mauIdHoacMa[, hanhDong]) / batBuoc / kiemNhieu / layMauDuocPhep...
 *  - hoac @UseGuards(QuyenSkuGuard) + @CanQuyenSku("BAN", "body.mau_id") tren route.
 */
@Module({
  controllers: [DaoTaoController, DaoTaoQuanTriController, DaoTaoLuyenAiController, DaoTaoBaiLynoController],
  providers: [
    QuyenSkuService,
    QuyenSkuGuard,
    XetDatService,
    HocVienService,
    KiemTraService,
    ThucHanhService,
    TienDoDoiService,
    QuanTriNoiDungService,
    LuyenAiService,
    BaiLynoService,
    HmacStGuard,
    DuLieuHocRepository,
    QuyenSkuRepository,
    XetDatRepository,
    HocVienRepository,
    KiemTraRepository,
    ThucHanhRepository,
    TienDoDoiRepository,
    QuanTriNoiDungRepository,
    LuyenAiRepository
  ],
  exports: [QuyenSkuService, QuyenSkuGuard]
})
export class DaoTaoModule {}
