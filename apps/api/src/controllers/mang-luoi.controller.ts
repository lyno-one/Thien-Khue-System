import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { CongKhai, NguoiDung, Vai } from "../common/decorators/xac-thuc.decorator";
import { coMeta } from "../common/interceptors/bao-response.interceptor";
import { phanTrang, taoMetaPhanTrang } from "../common/utils/phan-trang";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { ChienDichService, MaGioiThieuService, ThucTapService } from "../services/mang-luoi.service";
import {
  CapNhatSoLieuDto,
  DoiTrangThaiMaDto,
  GhiClickDto,
  GhiNhanQueryDto,
  GhiNhanTheoMaDonDto,
  HoaHongQueryDto,
  NhanChienDichDto,
  NopBaiTapTtsDto,
  NopNoiDungDto,
  SuaNoiDungDto,
  TaoMaGioiThieuDto
} from "../dto/mang-luoi/mang-luoi.dto";
import { GhiNhanDonService, HoaHongService } from "../services/mang-luoi-hoa-hong.service";

/**
 * Mang luoi CTV / TTS / KOL / KOC — route /api/mang-luoi/* cho nguoi tham gia.
 * Danh tinh luon tu token (@NguoiDung), khong bao gio tu body / query.
 */
@Controller("mang-luoi")
export class MangLuoiController {
  constructor(
    private readonly ma: MaGioiThieuService,
    private readonly chienDich: ChienDichService,
    private readonly thucTap: ThucTapService,
    private readonly ghiNhan: GhiNhanDonService,
    private readonly hoaHong: HoaHongService
  ) {}

  @CongKhai()
  @Get("health")
  health() {
    return { module: "mang-luoi", trang_thai: "ok" };
  }

  // ---------------------------------------------------------------- ma gioi thieu & tai lieu

  @Vai("CTV", "THUC_TAP", "KOL", "KOC")
  @Get("ma-gioi-thieu")
  maCuaToi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.ma.cuaToi(nd.id);
  }

  /** Lay ma cho mot SKU — 403 neu chua duoc cap quyen SKU */
  @Vai("CTV", "THUC_TAP", "KOL", "KOC")
  @Post("ma-gioi-thieu")
  layMa(@NguoiDung() nd: ThongTinNguoiDung, @Body() body: TaoMaGioiThieuDto) {
    return this.ma.layHoacTao(nd.id, body);
  }

  @Vai("CTV", "THUC_TAP", "KOL", "KOC")
  @Patch("ma-gioi-thieu/:id")
  doiTrangThaiMa(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: DoiTrangThaiMaDto) {
    return this.ma.doiTrangThai(nd.id, id, body.bat);
  }

  /** Xoa ma cua minh khi chua co click / don (da dung thi chi tat duoc) */
  @Vai("CTV", "THUC_TAP", "KOL", "KOC")
  @Delete("ma-gioi-thieu/:id")
  xoaMa(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string) {
    return this.ma.xoa(nd.id, id);
  }

  /** Tai lieu san pham cua cac SKU da duoc cap quyen */
  @Get("tai-lieu")
  taiLieu(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.ma.taiLieu(nd.id);
  }

  /** Storefront doc ma ?mgt= (khong lo thong tin nguoi gioi thieu) */
  @CongKhai()
  @Get("cong-khai/ma/:ma")
  traCuuMa(@Param("ma") ma: string) {
    return this.ma.traCuuCongKhai(ma);
  }

  @CongKhai()
  @Post("cong-khai/ma/:ma/click")
  ghiClick(@Param("ma") ma: string, @Body() body: GhiClickDto, @Req() req: Request) {
    // Chi tin req.ip (Express tu doc X-Forwarded-For khi bat TRUST_PROXY) — header tu khach gia mao duoc
    const ip = req.ip || null;
    return this.ma.ghiClick(ma, { ip, userAgent: req.headers["user-agent"] ?? null, nguonUrl: body.nguon_url ?? null });
  }

  // ---------------------------------------------------------------- chien dich & noi dung

  @Vai("KOL", "KOC", "CTV", "THUC_TAP")
  @Get("chien-dich")
  chienDichChoToi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.chienDich.choToi(nd);
  }

  /** Nhan chien dich — moi SKU cua chien dich phai co quyen */
  @Vai("KOL", "KOC", "CTV", "THUC_TAP")
  @Post("chien-dich/:id/nhan")
  nhanChienDich(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: NhanChienDichDto) {
    return this.chienDich.nhan(nd, id, body.ghi_chu);
  }

  @Vai("KOL", "KOC", "CTV", "THUC_TAP")
  @Get("noi-dung")
  noiDungCuaToi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.chienDich.noiDungCuaToi(nd.id);
  }

  @Vai("KOL", "KOC", "CTV", "THUC_TAP")
  @Post("noi-dung")
  nopNoiDung(@NguoiDung() nd: ThongTinNguoiDung, @Body() body: NopNoiDungDto) {
    return this.chienDich.nopNoiDung(nd, body);
  }

  @Vai("KOL", "KOC", "CTV", "THUC_TAP")
  @Patch("noi-dung/:id")
  suaNoiDung(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: SuaNoiDungDto) {
    return this.chienDich.suaNoiDung(nd, id, body);
  }

  /** Luot xem / tuong tac — chu noi dung hoac quan ly nhap */
  @Vai("KOL", "KOC", "CTV", "THUC_TAP", "QUAN_LY")
  @Patch("noi-dung/:id/so-lieu")
  capNhatSoLieu(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: CapNhatSoLieuDto) {
    return this.chienDich.capNhatSoLieu(nd, id, body);
  }

  // ---------------------------------------------------------------- thuc tap sinh (ke ca DANG_HOC — nen khong dat @Vai)

  @Get("thuc-tap/lo-trinh")
  loTrinh(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.thucTap.loTrinh(nd.id);
  }

  @Get("thuc-tap/bai-tap")
  baiTapCuaToi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.thucTap.baiTapCuaToi(nd.id);
  }

  @Post("thuc-tap/bai-tap")
  nopBaiTap(@NguoiDung() nd: ThongTinNguoiDung, @Body() body: NopBaiTapTtsDto) {
    return this.thucTap.nopBaiTap(nd, body);
  }

  @Get("thuc-tap/danh-gia")
  danhGiaCuaToi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.thucTap.danhGia(nd.id);
  }

  // ---------------------------------------------------------------- thu nhap & nguon don (du lieu cua chinh minh)

  @Get("thu-nhap/vi")
  vi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.hoaHong.layVi(nd.id);
  }

  @Get("thu-nhap/hoa-hong")
  async hoaHongCuaToi(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: HoaHongQueryDto) {
    const p = phanTrang(q);
    const { ds, tong } = await this.hoaHong.danhSach(nd.id, { trang_thai: q.trang_thai, ky: q.ky, skip: p.skip, take: p.take });
    return coMeta(ds, taoMetaPhanTrang(p.trang, p.so_dong, tong));
  }

  @Get("thu-nhap/dieu-chinh")
  dieuChinh(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.hoaHong.dieuChinhCuaToi(nd.id);
  }

  @Get("thu-nhap/lich-su-duyet")
  lichSuDuyet(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.hoaHong.lichSuDuyet(nd.id);
  }

  /** Nguon don: don toi ban / gioi thieu / chot (ca don cho xac minh) */
  @Get("thu-nhap/don")
  async donCuaToi(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: GhiNhanQueryDto) {
    const p = phanTrang(q);
    const { ds, tong } = await this.ghiNhan.cuaToi(nd.id, { trang_thai: q.trang_thai, skip: p.skip, take: p.take });
    return coMeta(ds, taoMetaPhanTrang(p.trang, p.so_dong, tong));
  }

  /** Sale / quan ly ghi nhan don CRM theo ma don (+ ma gioi thieu khach dua) */
  @Vai("SALE", "CSKH", "QUAN_LY")
  @Post("ghi-nhan/don")
  ghiNhanDon(@NguoiDung() nd: ThongTinNguoiDung, @Body() body: GhiNhanTheoMaDonDto) {
    return this.ghiNhan.ghiNhanTheoMaDon(nd, body.ma_don, body.ma_gioi_thieu);
  }
}
