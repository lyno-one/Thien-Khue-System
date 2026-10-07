import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import type { NguCanhPhieuLuyenAi, PhanHoiKetQuaLuyenAi, PhieuLuyenAi, TienDoLuyenAi } from "@thien-khue/contracts";
import { CongKhai, NguoiDung } from "../common/decorators/xac-thuc.decorator";
import { HmacStGuard } from "../common/guards/hmac-st.guard";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { ketQuaLuyenAiPipe, TaoPhieuLuyenAiDto, type ThanKetQuaLuyenAi } from "../dto/dao-tao/dao-tao-luyen-ai.dto";
import { LuyenAiService } from "../services/dao-tao-luyen-ai.service";

/**
 * Luyen tu van voi AI (Sales Training) — /api/dao-tao/luyen-ai/* + /api/dao-tao/khoa-hoc/:id/luyen-ai.
 * Route HMAC: @CongKhai() (bo JwtGuard) + HmacStGuard (chi Sales Training co bi mat). Hop dong: docs/TICH-HOP-SALES-TRAINING.md
 */
@Controller("dao-tao")
export class DaoTaoLuyenAiController {
  constructor(private readonly luyenAi: LuyenAiService) {}

  /** Nguoi hoc SALE / CSKH mo phieu vao Sales Training */
  @Post("luyen-ai/phieu")
  taoPhieu(@NguoiDung() nd: ThongTinNguoiDung, @Body() body: TaoPhieuLuyenAiDto): Promise<PhieuLuyenAi> {
    return this.luyenAi.taoPhieu(nd, body);
  }

  @Get("khoa-hoc/:idHoacMa/luyen-ai")
  tienDo(@NguoiDung() nd: ThongTinNguoiDung, @Param("idHoacMa") idHoacMa: string): Promise<TienDoLuyenAi> {
    return this.luyenAi.tienDo(nd, idHoacMa);
  }

  /** Sales Training doi phieu (dung mot lan) */
  @CongKhai()
  @UseGuards(HmacStGuard)
  @Get("luyen-ai/phieu/:ma")
  doiPhieu(@Param("ma") ma: string): Promise<NguCanhPhieuLuyenAi> {
    return this.luyenAi.doiPhieu(ma);
  }

  /** Sales Training gui ket qua phien luyen (idempotent theo phien_id). Body kieu interface -> pipe toan cuc bo qua, pipe rieng kiem */
  @CongKhai()
  @UseGuards(HmacStGuard)
  @Post("luyen-ai/ket-qua")
  @HttpCode(200)
  ketQua(@Body(ketQuaLuyenAiPipe) body: ThanKetQuaLuyenAi): Promise<PhanHoiKetQuaLuyenAi> {
    return this.luyenAi.nhanKetQua(body);
  }
}
