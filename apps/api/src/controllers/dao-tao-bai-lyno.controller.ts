import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import type { BaiLynoChiTiet, KetQuaQuizBaiLyno, LoTrinhBaiLyno, QuizBaiLyno } from "@thien-khue/contracts";
import { NguoiDung, TokenNguoiDung } from "../common/decorators/xac-thuc.decorator";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { NopQuizBaiLynoDto } from "../dto/dao-tao/dao-tao-bai-lyno.dto";
import { BaiLynoService } from "../services/dao-tao-bai-lyno.service";

/**
 * Bai hoc Lyno (bai tao tren CRM) — /api/dao-tao/bai-lyno/*. Chi nhan su CRM; goi CRM /api/kb/* bang token nguoi dung.
 * Route tinh (lo-trinh, quiz/...) khai TRUOC route :id de :id khong nuot mat.
 */
@Controller("dao-tao")
export class DaoTaoBaiLynoController {
  constructor(private readonly baiLyno: BaiLynoService) {}

  @Get("bai-lyno/lo-trinh")
  loTrinh(@NguoiDung() nd: ThongTinNguoiDung, @TokenNguoiDung() token: string): Promise<LoTrinhBaiLyno> {
    return this.baiLyno.layLoTrinh(nd, token);
  }

  @Post("bai-lyno/quiz/:quizId/nop")
  @HttpCode(200)
  nopQuiz(
    @NguoiDung() nd: ThongTinNguoiDung,
    @TokenNguoiDung() token: string,
    @Param("quizId") quizId: string,
    @Body() body: NopQuizBaiLynoDto
  ): Promise<KetQuaQuizBaiLyno> {
    return this.baiLyno.nopQuiz(nd, token, quizId, body);
  }

  @Get("bai-lyno/:id")
  chiTiet(@NguoiDung() nd: ThongTinNguoiDung, @TokenNguoiDung() token: string, @Param("id") id: string): Promise<BaiLynoChiTiet> {
    return this.baiLyno.layBai(nd, token, id);
  }

  @Get("bai-lyno/:id/quiz")
  quiz(@NguoiDung() nd: ThongTinNguoiDung, @TokenNguoiDung() token: string, @Param("id") id: string): Promise<QuizBaiLyno | null> {
    return this.baiLyno.layQuiz(nd, token, id);
  }

  @Post("bai-lyno/:id/da-doc")
  @HttpCode(204)
  daDoc(@NguoiDung() nd: ThongTinNguoiDung, @TokenNguoiDung() token: string, @Param("id") id: string): Promise<void> {
    return this.baiLyno.danhDauDaDoc(nd, token, id);
  }
}
