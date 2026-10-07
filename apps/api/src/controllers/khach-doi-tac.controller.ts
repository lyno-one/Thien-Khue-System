import { Body, Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { HangThanhVien } from "@prisma/client";
import { CongKhai, NguoiDung, Vai } from "../common/decorators/xac-thuc.decorator";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { DoiTacService, HangThanhVienService, KhHanhPhucService } from "../services/khach-doi-tac.service";
import {
  CapNhatCapPhatDto,
  CapNhatCauHinhHangDto,
  CapNhatDoiTacDto,
  CapNhatHopDongDto,
  CapNhatMoiKhDto,
  CapPhatDto,
  CapPhatTheoHangDto,
  DongYHinhDto,
  DuyetUuDaiDto,
  GuiPhanHoiDto,
  LocCapPhatQuery,
  LocDoiTacQuery,
  LocMoiKhQuery,
  LocPhanHoiQuery,
  LocUuDaiQuery,
  MoiKhHanhPhucDto,
  TaoDoiTacDto,
  TaoHopDongDto,
  TaoQuaTangDto,
  TaoVoucherDto,
  ThamDinhQuaDto,
  TraCuuHangQuery,
  TraLoiMoiDto
} from "../dto/khach-doi-tac/khach-doi-tac.dto";
import { UuDaiService } from "../services/khach-doi-tac-uu-dai.service";

/**
 * Khach hang & doi tac — route /api/khach-doi-tac/*
 * - toi/*: khach dang nhap xem hang, uu dai, KH hanh phuc cua chinh minh (danh tinh tu token)
 * - hang/*, hanh-phuc/*, qua-tang/*, voucher/*, cap-phat/*, doi-tac/*: nhan vien / quan ly / Thien Khue
 * ADMIN, THIEN_KHUE luon qua @Vai.
 */
@Controller("khach-doi-tac")
export class KhachDoiTacController {
  constructor(
    private readonly hang: HangThanhVienService,
    private readonly hanhPhuc: KhHanhPhucService,
    private readonly uuDai: UuDaiService,
    private readonly doiTac: DoiTacService
  ) {}

  @CongKhai()
  @Get("health")
  health() {
    return { module: "khach-doi-tac", trang_thai: "ok" };
  }

  // ---------------------------------------------------------------- khach (chinh minh)

  @Get("toi/hang")
  hangCuaToi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.hang.layHangCuaToi(nd);
  }

  @Get("toi/uu-dai")
  uuDaiCuaToi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.uuDai.layUuDaiCuaToi(nd);
  }

  @Get("toi/hanh-phuc")
  hanhPhucCuaToi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.hanhPhuc.layCuaToi(nd);
  }

  @Post("toi/hanh-phuc/tra-loi")
  traLoiMoi(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: TraLoiMoiDto) {
    return this.hanhPhuc.traLoi(nd, dto.tham_gia);
  }

  @Patch("toi/hanh-phuc/dong-y-hinh")
  dongYHinh(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: DongYHinhDto) {
    return this.hanhPhuc.doiDongYHinh(nd, dto.dong_y);
  }

  @Post("toi/hanh-phuc/phan-hoi")
  guiPhanHoi(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: GuiPhanHoiDto) {
    return this.hanhPhuc.guiPhanHoi(nd, dto);
  }

  // ---------------------------------------------------------------- hang the

  /** Chinh sach hang la thong tin cong khai (trang VIP / Than thien) */
  @CongKhai()
  @Get("hang/cau-hinh")
  cauHinhHang() {
    return this.hang.layCauHinh();
  }

  @Vai("THIEN_KHUE")
  @Put("hang/cau-hinh/:hang")
  capNhatCauHinh(
    @NguoiDung() nd: ThongTinNguoiDung,
    @Param("hang", new ParseEnumPipe(HangThanhVien)) hang: HangThanhVien,
    @Body() dto: CapNhatCauHinhHangDto
  ) {
    return this.hang.capNhatCauHinh(nd, hang, dto);
  }

  /** SALE / CSKH: chi khach duoc giao (kiem trong service) */
  @Vai("QUAN_LY", "CSKH", "SALE")
  @Get("hang/tra-cuu")
  traCuuHang(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: TraCuuHangQuery) {
    return this.hang.traCuu(nd, q.sdt);
  }

  // ---------------------------------------------------------------- KH hanh phuc

  @Vai("QUAN_LY", "CSKH")
  @Get("hanh-phuc/ung-vien")
  ungVien(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.hanhPhuc.ungVien(nd);
  }

  @Vai("QUAN_LY", "CSKH")
  @Get("hanh-phuc/moi")
  danhSachMoi(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: LocMoiKhQuery) {
    return this.hanhPhuc.danhSachMoi(nd, q);
  }

  @Vai("QUAN_LY", "CSKH")
  @Post("hanh-phuc/moi")
  moiKhach(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: MoiKhHanhPhucDto) {
    return this.hanhPhuc.moi(nd, dto);
  }

  @Vai("QUAN_LY", "CSKH")
  @Patch("hanh-phuc/moi/:id")
  capNhatMoi(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CapNhatMoiKhDto) {
    return this.hanhPhuc.capNhatMoi(nd, id, dto);
  }

  @Vai("QUAN_LY", "CSKH")
  @Get("hanh-phuc/phan-hoi")
  danhSachPhanHoi(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: LocPhanHoiQuery) {
    return this.hanhPhuc.danhSachPhanHoi(nd, q);
  }

  // ---------------------------------------------------------------- qua tang

  /** CSKH can xem de chon uu dai khi cap phat */
  @Vai("QUAN_LY", "CSKH")
  @Get("qua-tang")
  danhSachQua(@Query() q: LocUuDaiQuery) {
    return this.uuDai.danhSachQua(q);
  }

  /** DOI_TAC de xuat qua cho chinh doi tac minh (kiem trong service) */
  @Vai("QUAN_LY", "DOI_TAC")
  @Post("qua-tang")
  taoQua(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: TaoQuaTangDto) {
    return this.uuDai.taoQua(nd, dto);
  }

  @Vai("QUAN_LY")
  @Post("qua-tang/:id/tham-dinh")
  thamDinhQua(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: ThamDinhQuaDto) {
    return this.uuDai.thamDinhQua(nd, id, dto);
  }

  @Vai("THIEN_KHUE")
  @Post("qua-tang/:id/duyet")
  duyetQua(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DuyetUuDaiDto) {
    return this.uuDai.duyetQua(nd, id, dto);
  }

  // ---------------------------------------------------------------- voucher

  /** CSKH can xem de chon uu dai khi cap phat */
  @Vai("QUAN_LY", "CSKH")
  @Get("voucher")
  danhSachVoucher(@Query() q: LocUuDaiQuery) {
    return this.uuDai.danhSachVoucher(q);
  }

  @Vai("QUAN_LY")
  @Post("voucher")
  taoVoucher(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: TaoVoucherDto) {
    return this.uuDai.taoVoucher(nd, dto);
  }

  @Vai("THIEN_KHUE")
  @Post("voucher/:id/duyet")
  duyetVoucher(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DuyetUuDaiDto) {
    return this.uuDai.duyetVoucher(nd, id, dto);
  }

  // ---------------------------------------------------------------- cap phat

  @Vai("QUAN_LY", "CSKH")
  @Get("cap-phat")
  danhSachCapPhat(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: LocCapPhatQuery) {
    return this.uuDai.danhSachCapPhat(nd, q);
  }

  @Vai("QUAN_LY", "CSKH")
  @Post("cap-phat")
  capPhat(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: CapPhatDto) {
    return this.uuDai.capPhat(nd, dto);
  }

  @Vai("QUAN_LY")
  @Post("cap-phat/theo-hang")
  capPhatTheoHang(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: CapPhatTheoHangDto) {
    return this.uuDai.capPhatTheoHang(nd, dto);
  }

  @Vai("QUAN_LY", "CSKH")
  @Patch("cap-phat/:id")
  capNhatCapPhat(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CapNhatCapPhatDto) {
    return this.uuDai.capNhatCapPhat(nd, id, dto);
  }

  // ---------------------------------------------------------------- doi tac chien luoc

  /** Cong doi tac — dat truoc doi-tac/:id de khong bi bat nham */
  @Vai("DOI_TAC")
  @Get("doi-tac/cua-toi")
  doiTacCuaToi(@NguoiDung() nd: ThongTinNguoiDung) {
    return this.doiTac.cuaToi(nd);
  }

  @Vai("QUAN_LY")
  @Get("doi-tac/bao-cao")
  baoCaoDoiTac() {
    return this.doiTac.baoCao();
  }

  @Vai("QUAN_LY")
  @Get("doi-tac")
  danhSachDoiTac(@Query() q: LocDoiTacQuery) {
    return this.doiTac.danhSach(q);
  }

  @Vai("QUAN_LY")
  @Post("doi-tac")
  taoDoiTac(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: TaoDoiTacDto) {
    return this.doiTac.tao(nd, dto);
  }

  @Vai("QUAN_LY")
  @Get("doi-tac/:id")
  layDoiTac(@Param("id", ParseUUIDPipe) id: string) {
    return this.doiTac.layMot(id);
  }

  @Vai("QUAN_LY")
  @Patch("doi-tac/:id")
  capNhatDoiTac(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CapNhatDoiTacDto) {
    return this.doiTac.capNhat(nd, id, dto);
  }

  @Vai("QUAN_LY")
  @Get("doi-tac/:id/hop-dong")
  danhSachHopDong(@Param("id", ParseUUIDPipe) id: string) {
    return this.doiTac.danhSachHopDong(id);
  }

  @Vai("QUAN_LY")
  @Post("doi-tac/:id/hop-dong")
  taoHopDong(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: TaoHopDongDto) {
    return this.doiTac.taoHopDong(nd, id, dto);
  }

  @Vai("QUAN_LY")
  @Patch("hop-dong/:id")
  capNhatHopDong(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CapNhatHopDongDto) {
    return this.doiTac.capNhatHopDong(nd, id, dto);
  }
}
