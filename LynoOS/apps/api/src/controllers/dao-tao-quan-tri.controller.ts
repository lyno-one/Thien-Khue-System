import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import type {
  BaiHocQuanTri,
  BaiKiemTraQuanTri,
  CauHoiQuanTri,
  KetQuaTangPhienBan,
  KhoaHocQuanTri,
  KhoaHocQuanTriChiTiet
} from "@thien-khue/contracts";
import { NguoiDung, Vai } from "../common/decorators/xac-thuc.decorator";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import {
  LocKhoaHocQuanTriQueryDto,
  SuaBaiHocDto,
  SuaBaiKiemTraDto,
  SuaCauHoiDto,
  SuaKhoaHocDto,
  TangPhienBanDto,
  TaoBaiHocDto,
  TaoBaiKiemTraDto,
  TaoCauHoiDto,
  TaoKhoaHocDto
} from "../dto/dao-tao/dao-tao.dto";
import { QuanTriNoiDungService } from "../services/dao-tao-quan-tri.service";
import { QuyenSkuService } from "../services/dao-tao-quyen-sku.service";

/**
 * Quan tri noi dung LMS — /api/dao-tao/quan-tri/*. QUAN_LY (ADMIN / THIEN_KHUE luon qua).
 * Nguong dat >= 90 (DTO + service + DB). Noi cong hoc (tat de / khoa bat buoc, bo bat_buoc, bo thuc hanh) chi THIEN_KHUE.
 */
@Vai("QUAN_LY")
@Controller("dao-tao/quan-tri")
export class DaoTaoQuanTriController {
  constructor(
    private readonly noiDung: QuanTriNoiDungService,
    private readonly quyenSku: QuyenSkuService
  ) {}

  // ---------------------------------------------------------------- khoa hoc

  @Get("khoa-hoc")
  danhSachKhoa(@Query() q: LocKhoaHocQuanTriQueryDto) {
    return this.noiDung.danhSachKhoa(q);
  }

  @Post("khoa-hoc")
  taoKhoa(@NguoiDung() nd: ThongTinNguoiDung, @Body() body: TaoKhoaHocDto): Promise<KhoaHocQuanTri> {
    return this.noiDung.taoKhoa(nd, body);
  }

  @Get("khoa-hoc/:id")
  chiTietKhoa(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string): Promise<KhoaHocQuanTriChiTiet> {
    return this.noiDung.chiTietKhoa(nd, id);
  }

  @Patch("khoa-hoc/:id")
  suaKhoa(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string, @Body() body: SuaKhoaHocDto): Promise<KhoaHocQuanTri> {
    return this.noiDung.suaKhoa(nd, id, body);
  }

  @Delete("khoa-hoc/:id")
  tatKhoa(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string): Promise<KhoaHocQuanTri> {
    return this.noiDung.tatKhoa(nd, id);
  }

  /** Tang phien ban tai lieu khoa SKU -> quyen SKU cua moi nguoi chuyen CAN_HOC_LAI + thong bao */
  @Post("khoa-hoc/:id/tang-phien-ban")
  @HttpCode(200)
  tangPhienBan(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string, @Body() body: TangPhienBanDto): Promise<KetQuaTangPhienBan> {
    return this.quyenSku.tangPhienBan(nd.id, id, body.ly_do.trim(), body.yeu_cau ?? "XAC_NHAN");
  }

  // ---------------------------------------------------------------- bai hoc

  @Post("khoa-hoc/:id/bai-hoc")
  taoBai(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string, @Body() body: TaoBaiHocDto): Promise<BaiHocQuanTri> {
    return this.noiDung.taoBai(nd.id, id, body);
  }

  @Patch("bai-hoc/:id")
  suaBai(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string, @Body() body: SuaBaiHocDto): Promise<BaiHocQuanTri> {
    return this.noiDung.suaBai(nd.id, id, body);
  }

  @Delete("bai-hoc/:id")
  tatBai(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string): Promise<BaiHocQuanTri> {
    return this.noiDung.tatBai(nd.id, id);
  }

  // ---------------------------------------------------------------- bai kiem tra + cau hoi

  @Post("khoa-hoc/:id/bai-kiem-tra")
  taoDe(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string, @Body() body: TaoBaiKiemTraDto): Promise<BaiKiemTraQuanTri> {
    return this.noiDung.taoDe(nd, id, body);
  }

  @Get("bai-kiem-tra/:id")
  chiTietDe(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string): Promise<BaiKiemTraQuanTri> {
    return this.noiDung.chiTietDe(nd, id);
  }

  @Patch("bai-kiem-tra/:id")
  suaDe(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string, @Body() body: SuaBaiKiemTraDto): Promise<BaiKiemTraQuanTri> {
    return this.noiDung.suaDe(nd, id, body);
  }

  @Delete("bai-kiem-tra/:id")
  tatDe(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string): Promise<BaiKiemTraQuanTri> {
    return this.noiDung.tatDe(nd, id);
  }

  @Post("bai-kiem-tra/:id/cau-hoi")
  taoCau(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string, @Body() body: TaoCauHoiDto): Promise<CauHoiQuanTri> {
    return this.noiDung.taoCau(nd, id, body);
  }

  @Patch("cau-hoi/:id")
  suaCau(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string, @Body() body: SuaCauHoiDto): Promise<CauHoiQuanTri> {
    return this.noiDung.suaCau(nd, id, body);
  }

  @Delete("cau-hoi/:id")
  xoaCau(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string): Promise<{ id: string }> {
    return this.noiDung.xoaCau(nd, id);
  }
}
