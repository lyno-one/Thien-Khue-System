import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { coMeta } from "../common/interceptors/bao-response.interceptor";
import { CongKhai, NguoiDung, Vai } from "../common/decorators/xac-thuc.decorator";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { DeXuatService, HoSoQuanTriService, TongQuanService } from "../services/quan-tri.service";
import {
  DeXuatQueryDto,
  DoiTacQueryDto,
  GiaoDichQueryDto,
  HuyDeXuatDto,
  KhachHangQueryDto,
  NguoiDungQueryDto,
  NguoiHocQueryDto,
  NhatKyQueryDto,
  QuyetDinhDto,
  SanPhamQueryDto,
  TaoDeXuatDto
} from "../dto/quan-tri/quan-tri.dto";

/**
 * Quan tri — route /api/quan-tri/*. QUAN_LY xem + lap / kiem de xuat (ADMIN, THIEN_KHUE luon qua @Vai);
 * quyen DUYET kiem theo loai trong service (vd chinh sach / qua tang chi THIEN_KHUE).
 */
@Controller("quan-tri")
@Vai("QUAN_LY")
export class QuanTriController {
  constructor(
    private readonly tongQuan: TongQuanService,
    private readonly hoSo: HoSoQuanTriService,
    private readonly deXuat: DeXuatService
  ) {}

  @CongKhai()
  @Vai()
  @Get("health")
  health() {
    return { module: "quan-tri", trang_thai: "ok" };
  }

  // ---------------------------------------------------------------- bang dieu hanh

  @Get("tong-quan")
  layTongQuan(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.tongQuan.layTongQuan(nd);
  }

  @Get("nguoi-hoc")
  async layNguoiHoc(@Query() q: NguoiHocQueryDto) {
    const { ds, meta } = await this.tongQuan.layNguoiHoc(q);
    return coMeta(ds, meta);
  }

  // ---------------------------------------------------------------- 6 nhom ho so

  @Get("ho-so/nguoi-dung")
  async dsNguoiDung(@Query() q: NguoiDungQueryDto) {
    const { ds, meta } = await this.hoSo.dsNguoiDung(q);
    return coMeta(ds, meta);
  }

  @Get("ho-so/nguoi-dung/:id")
  chiTietNguoiDung(@Param("id", ParseUUIDPipe) id: string) {
    return this.hoSo.chiTietNguoiDung(id);
  }

  @Get("ho-so/khach-hang")
  dsKhachHang(@Query() q: KhachHangQueryDto) {
    return this.hoSo.dsKhachHang(q);
  }

  @Get("ho-so/khach-hang/:sdt")
  chiTietKhachHang(@Param("sdt") sdt: string) {
    return this.hoSo.chiTietKhachHang(sdt);
  }

  @Get("ho-so/san-pham")
  async dsSanPham(@Query() q: SanPhamQueryDto) {
    const { ds, meta } = await this.hoSo.dsSanPham(q);
    return coMeta(ds, meta);
  }

  @Get("ho-so/san-pham/:mauId")
  chiTietSanPham(@Param("mauId", ParseUUIDPipe) mauId: string) {
    return this.hoSo.chiTietSanPham(mauId);
  }

  @Get("ho-so/hoat-dong")
  async dsNhatKy(@Query() q: NhatKyQueryDto) {
    const { ds, meta } = await this.hoSo.dsNhatKy(q);
    return coMeta(ds, meta);
  }

  @Get("ho-so/giao-dich")
  async dsGiaoDich(@Query() q: GiaoDichQueryDto) {
    const { ds, meta } = await this.hoSo.dsGiaoDich(q);
    return coMeta(ds, meta);
  }

  @Get("ho-so/doi-tac")
  async dsDoiTac(@Query() q: DoiTacQueryDto) {
    const { ds, meta } = await this.hoSo.dsDoiTac(q);
    return coMeta(ds, meta);
  }

  @Get("ho-so/doi-tac/:id")
  chiTietDoiTac(@Param("id", ParseUUIDPipe) id: string) {
    return this.hoSo.chiTietDoiTac(id);
  }

  // ---------------------------------------------------------------- ban phe duyet (maker-checker)

  @Get("phe-duyet/hang-cho")
  layHangCho() {
    return this.deXuat.layHangCho();
  }

  @Get("phe-duyet/chinh-sach")
  layChinhSach() {
    return this.deXuat.layChinhSach();
  }

  @Get("de-xuat")
  async dsDeXuat(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: DeXuatQueryDto) {
    const { ds, meta } = await this.deXuat.layDanhSach(nd, q);
    return coMeta(ds, meta);
  }

  @Get("de-xuat/:id")
  chiTietDeXuat(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string) {
    return this.deXuat.layChiTiet(nd, id);
  }

  @Post("de-xuat")
  taoDeXuat(@NguoiDung() nd: ThongTinNguoiDung, @Body() body: TaoDeXuatDto) {
    return this.deXuat.tao(nd, body);
  }

  @Post("de-xuat/:id/kiem")
  kiem(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: QuyetDinhDto) {
    return this.deXuat.kiem(nd, id, body);
  }

  @Post("de-xuat/:id/duyet")
  duyet(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: QuyetDinhDto) {
    return this.deXuat.duyet(nd, id, body);
  }

  @Post("de-xuat/:id/huy")
  huy(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() body: HuyDeXuatDto) {
    return this.deXuat.huy(nd, id, body.ly_do);
  }
}
