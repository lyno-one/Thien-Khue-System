import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { NguonGiaoKhach } from "@prisma/client";
import { CongKhai, NguoiDung, TokenNguoiDung, Vai } from "../common/decorators/xac-thuc.decorator";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import {
  CaTrucQueryDto,
  DoiTrangThaiLeadDto,
  GhiChamDto,
  GiaoLaiKhachDto,
  KhachDuocGiaoQueryDto,
  LeadQueryDto,
  LuuNangLucDto,
  PhanBoKhachDto,
  PhanBoThuCongDto,
  SuaCaTrucDto,
  TaoCaTrucDto,
  TaoDonDto,
  TaoYeuCauHoTroDto,
  TraLoiHoTroDto
} from "../dto/ban-hang/ban-hang.dto";
import { CaTrucService, DonService, HopViecService, HoTroService, KhachService, LeadService } from "../services/ban-hang.service";
import { PhanBoService } from "../services/ban-hang-phan-bo.service";

/**
 * Sale / CSKH — route /api/ban-hang/*.
 * Mac dinh can vai SALE / CSKH / QUAN_LY (HOAT_DONG); route quan ly danh @Vai("QUAN_LY"); ADMIN / THIEN_KHUE luon qua.
 * Danh tinh luon tu token (@NguoiDung) — Sale / CSKH chi thay khach / lead / ca cua chinh minh.
 */
@Vai("SALE", "CSKH", "QUAN_LY")
@Controller("ban-hang")
export class BanHangController {
  constructor(
    private readonly hopViec: HopViecService,
    private readonly khach: KhachService,
    private readonly don: DonService,
    private readonly caTruc: CaTrucService,
    private readonly lead: LeadService,
    private readonly phanBo: PhanBoService,
    private readonly hoTro: HoTroService
  ) {}

  @CongKhai()
  @Vai()
  @Get("health")
  health() {
    return { module: "ban-hang", trang_thai: "ok" };
  }

  // ---------------------------------------------------------------- hop viec

  @Get("hop-viec")
  layHopViec(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.hopViec.layHopViec(nd);
  }

  // ---------------------------------------------------------------- khach duoc giao

  @Get("khach")
  danhSachKhach(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: KhachDuocGiaoQueryDto) {
    return this.khach.danhSach(nd, q);
  }

  @Get("khach/:sdt")
  chiTietKhach(@NguoiDung() nd: ThongTinNguoiDung, @Param("sdt") sdt: string, @TokenNguoiDung() token: string) {
    return this.khach.chiTiet(nd, sdt, token);
  }

  @Post("khach/:sdt/cham")
  ghiCham(@NguoiDung() nd: ThongTinNguoiDung, @Param("sdt") sdt: string, @Body() dto: GhiChamDto, @TokenNguoiDung() token: string) {
    return this.khach.ghiCham(nd, sdt, dto.noi_dung, token);
  }

  @Post("khach/:sdt/ket-thuc")
  ketThucKhach(@NguoiDung() nd: ThongTinNguoiDung, @Param("sdt") sdt: string, @Body() dto: GhiChamDto) {
    return this.khach.ketThuc(nd, sdt, dto.noi_dung);
  }

  @Vai("QUAN_LY")
  @Post("khach/:sdt/giao-lai")
  giaoLai(@NguoiDung() nd: ThongTinNguoiDung, @Param("sdt") sdt: string, @Body() dto: GiaoLaiKhachDto) {
    return this.phanBo.giaoLai(sdt, { hoSoId: dto.ho_so_id, lyDo: dto.ly_do }, nd.id);
  }

  // ---------------------------------------------------------------- phan bo (QUAN_LY)

  @Vai("QUAN_LY")
  @Post("phan-bo/khach")
  phanBoKhach(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: PhanBoKhachDto) {
    return this.phanBo.giaoKhach({
      sdt: dto.sdt,
      tenKhach: dto.ten_khach,
      hoSoId: dto.ho_so_id,
      nguon: dto.ho_so_id ? NguonGiaoKhach.THU_CONG : NguonGiaoKhach.TU_DONG,
      lyDo: dto.ly_do,
      nguoiGiaoId: nd.id,
      vaiUuTien: ["CSKH"]
    });
  }

  @Vai("QUAN_LY")
  @Post("phan-bo/khach-can-cham")
  phanBoKhachCanCham(@NguoiDung() nd: ThongTinNguoiDung, @TokenNguoiDung() token: string) {
    return this.phanBo.phanBoKhachCanCham(token, nd.id);
  }

  @Vai("QUAN_LY")
  @Post("phan-bo/lead-moi")
  phanBoLeadMoi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.phanBo.phanBoLeadMoi(nd.id);
  }

  @Vai("QUAN_LY")
  @Post("lead/:id/phan-bo")
  phanBoLead(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: PhanBoThuCongDto) {
    return this.phanBo.phanBoLead(id, nd.id, dto.ho_so_id);
  }

  // ---------------------------------------------------------------- lead

  @Get("lead")
  danhSachLead(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: LeadQueryDto) {
    return this.lead.danhSach(nd, q);
  }

  @Patch("lead/:id/trang-thai")
  doiTrangThaiLead(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DoiTrangThaiLeadDto) {
    return this.lead.doiTrangThai(nd, id, dto);
  }

  // ---------------------------------------------------------------- san pham & don

  @Get("mau-duoc-phep")
  mauDuocPhep(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.don.mauDuocPhep(nd.id);
  }

  @Get("mau/:id/ton-kho")
  tonKho(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string) {
    return this.don.tonKho(nd.id, id);
  }

  @Post("don")
  taoDon(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: TaoDonDto, @TokenNguoiDung() token: string) {
    return this.don.taoDon(nd, dto, token);
  }

  @Get("don/cua-toi")
  donCuaToi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.don.donCuaToi(nd.id);
  }

  // ---------------------------------------------------------------- ca truc & nhan su

  @Get("ca-truc")
  danhSachCa(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: CaTrucQueryDto) {
    return this.caTruc.danhSach(nd, q);
  }

  @Vai("QUAN_LY")
  @Post("ca-truc")
  taoCa(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: TaoCaTrucDto) {
    return this.caTruc.tao(nd, dto);
  }

  @Vai("QUAN_LY")
  @Patch("ca-truc/:id")
  suaCa(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: SuaCaTrucDto) {
    return this.caTruc.sua(nd, id, dto);
  }

  @Vai("QUAN_LY")
  @Delete("ca-truc/:id")
  xoaCa(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string) {
    return this.caTruc.xoa(nd, id);
  }

  @Vai("QUAN_LY")
  @Get("nhan-su")
  nhanSu() {
    return this.caTruc.nhanSu();
  }

  @Vai("QUAN_LY")
  @Put("nang-luc")
  luuNangLuc(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: LuuNangLucDto) {
    return this.caTruc.luuNangLuc(nd, dto);
  }

  @Vai("QUAN_LY")
  @Delete("nang-luc/:id")
  xoaNangLuc(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string) {
    return this.caTruc.xoaNangLuc(nd, id);
  }

  // ---------------------------------------------------------------- ho tro KOL / KOC

  @Get("ho-tro")
  hoTroDuocGiao(@NguoiDung() nd: ThongTinNguoiDung, @Query("chua_xu_ly") chuaXuLy?: string) {
    return this.hoTro.danhSachDuocGiao(nd, chuaXuLy === "1" || chuaXuLy === "true");
  }

  @Post("ho-tro/:id/tra-loi")
  traLoiHoTro(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: TraLoiHoTroDto) {
    return this.hoTro.traLoi(nd, id, dto.tra_loi);
  }

  @Vai("KOL", "KOC")
  @Post("ho-tro")
  taoYeuCauHoTro(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: TaoYeuCauHoTroDto) {
    return this.hoTro.tao(nd, dto);
  }

  @Vai("KOL", "KOC")
  @Get("ho-tro/da-gui")
  hoTroDaGui(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.hoTro.danhSachDaGui(nd);
  }
}
