import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { NguoiDung, Vai } from "../common/decorators/xac-thuc.decorator";
import { coMeta } from "../common/interceptors/bao-response.interceptor";
import { phanTrang, taoMetaPhanTrang } from "../common/utils/phan-trang";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { ChienDichService, ThucTapService } from "../services/mang-luoi.service";
import {
  BaiTapMentorQueryDto,
  CapNhatChienDichDto,
  ChamBaiTapTtsDto,
  DeXuatDieuChinhDto,
  DuyetNoiDungDto,
  DuyetThamGiaDto,
  GhiNhanQueryDto,
  NghiemThuDto,
  NoiDungQuanLyQueryDto,
  TaoChienDichDto,
  ThamGiaQueryDto,
  XacMinhDonDto
} from "../dto/mang-luoi/mang-luoi.dto";
import { GhiNhanDonService, HoaHongService } from "../services/mang-luoi-hoa-hong.service";

/** Mentor: cham bai tap TTS, danh gia, de xuat chuyen vai — /api/mang-luoi/mentor/* */
@Vai("MENTOR", "QUAN_LY")
@Controller("mang-luoi/mentor")
export class MangLuoiMentorController {
  constructor(private readonly thucTap: ThucTapService) {}

  @Get("tts")
  danhSachTts() {
    return this.thucTap.danhSachTts();
  }

  @Get("tts/:hoSoId")
  danhGia(@Param("hoSoId", ParseUUIDPipe) hoSoId: string) {
    return this.thucTap.danhGia(hoSoId);
  }

  @Get("bai-tap")
  baiTap(@Query() q: BaiTapMentorQueryDto) {
    return this.thucTap.baiTapChoMentor(q.trang_thai, q.ho_so_id);
  }

  @Post("bai-tap/:id/cham")
  cham(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: ChamBaiTapTtsDto) {
    return this.thucTap.cham(nd, id, body);
  }
}

/** Nguoi phu trach mang luoi (QUAN_LY; THIEN_KHUE / ADMIN luon qua) — /api/mang-luoi/quan-ly/* */
@Vai("QUAN_LY")
@Controller("mang-luoi/quan-ly")
export class MangLuoiQuanLyController {
  constructor(
    private readonly ghiNhan: GhiNhanDonService,
    private readonly hoaHong: HoaHongService,
    private readonly chienDich: ChienDichService
  ) {}

  // ---------------------------------------------------------------- ghi nhan don

  @Get("ghi-nhan")
  async danhSachGhiNhan(@Query() q: GhiNhanQueryDto) {
    const p = phanTrang(q);
    const { ds, tong } = await this.ghiNhan.danhSach({ trang_thai: q.trang_thai, skip: p.skip, take: p.take });
    return coMeta(ds, taoMetaPhanTrang(p.trang, p.so_dong, tong));
  }

  /** Xac minh don trung nguon — nguoi xac minh khac nguoi gioi thieu / nguoi chot */
  @Post("ghi-nhan/:id/xac-minh")
  xacMinh(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: XacMinhDonDto) {
    return this.ghiNhan.xacMinh(nd, id, body.chon, body.ly_do);
  }

  /** Quet lai don CRM: don moi co [MGT:], giao thanh cong -> du dieu kien, hoan / huy -> bi tru */
  @Post("dong-bo")
  dongBo(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.ghiNhan.dongBo(nd.id);
  }

  // ---------------------------------------------------------------- dieu chinh hoa hong (maker-checker)

  @Post("dieu-chinh")
  deXuatDieuChinh(@NguoiDung() nd: ThongTinNguoiDung, @Body() body: DeXuatDieuChinhDto) {
    return this.hoaHong.deXuatDieuChinh(nd, body);
  }

  @Get("dieu-chinh/cho-ap-dung")
  choApDung() {
    return this.hoaHong.deXuatChoApDung();
  }

  @Post("dieu-chinh/:deXuatId/ap-dung")
  apDung(@NguoiDung() nd: ThongTinNguoiDung, @Param("deXuatId", ParseUUIDPipe) deXuatId: string) {
    return this.hoaHong.apDungDieuChinh(nd.id, deXuatId);
  }

  // ---------------------------------------------------------------- chien dich

  @Get("chien-dich")
  danhSachChienDich() {
    return this.chienDich.danhSachQuanLy();
  }

  @Post("chien-dich")
  taoChienDich(@NguoiDung() nd: ThongTinNguoiDung, @Body() body: TaoChienDichDto) {
    return this.chienDich.tao(nd, body);
  }

  @Patch("chien-dich/:id")
  suaChienDich(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: CapNhatChienDichDto) {
    return this.chienDich.capNhat(nd, id, body);
  }

  @Delete("chien-dich/:id")
  xoaChienDich(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string) {
    return this.chienDich.xoa(nd, id);
  }

  @Get("tham-gia")
  thamGia(@Query() q: ThamGiaQueryDto) {
    return this.chienDich.danhSachThamGia(q.chien_dich_id);
  }

  @Post("tham-gia/:id/duyet")
  duyetThamGia(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: DuyetThamGiaDto) {
    return this.chienDich.duyetThamGia(nd, id, body.dong_y, body.ghi_chu);
  }

  @Post("tham-gia/:id/nghiem-thu")
  nghiemThu(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: NghiemThuDto) {
    return this.chienDich.nghiemThu(nd, id, body.ghi_chu);
  }

  @Get("noi-dung")
  noiDung(@Query() q: NoiDungQuanLyQueryDto) {
    return this.chienDich.noiDungQuanLy(q);
  }

  @Post("noi-dung/:id/duyet")
  duyetNoiDung(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: DuyetNoiDungDto) {
    return this.chienDich.duyetNoiDung(nd, id, body);
  }
}
