import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { Vai as VaiEnum } from "@prisma/client";
import type {
  DieuKienKichHoat,
  HoSoChiTiet,
  HoSoCuaToi,
  HoSoTheoSdt,
  LichSuVai
} from "@thien-khue/contracts";
import { coMeta } from "../common/interceptors/bao-response.interceptor";
import { CongKhai, NguoiDung, Vai } from "../common/decorators/xac-thuc.decorator";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import {
  CapNhatHoSoDto,
  DoiTrangThaiVaiDto,
  HuyXacMinhSdtDto,
  KichHoatDto,
  LocHoSoDto,
  ThemVaiDto,
  TimHoSoTheoSdtDto,
  XacMinhSdtDto
} from "../dto/ho-so/ho-so.dto";
import { HoSoService, XacMinhSdtService } from "../services/ho-so.service";
import { VaiService } from "../services/ho-so-vai.service";

/** :vai tren duong dan -> enum Prisma (400 neu sai) */
function docVai(v: string): VaiEnum {
  const vai = v?.toUpperCase() as VaiEnum;
  if (!Object.values(VaiEnum).includes(vai)) throw new BadRequestException("Vai trò không hợp lệ");
  return vai;
}

/**
 * Ho so & vai — /api/ho-so/*
 * Route "toi/*" (cua chinh minh) dat TRUOC route ":id" de khong bi bat nham.
 * Khong co tu dang ky tai khoan / tu dang ky vai / de xuat chuyen vai: tai khoan + vai do admin tao trong CRM
 * (Thien Khue chi doc vai tu CRM). Trang thai hoc DANG_HOC -> HOAT_DONG (kich-hoat) van o day.
 */
@Controller("ho-so")
export class HoSoController {
  constructor(
    private readonly hoSo: HoSoService,
    private readonly vaiSv: VaiService,
    private readonly xacMinhSdt: XacMinhSdtService
  ) {}

  @CongKhai()
  @Get("health")
  health() {
    return { module: "ho-so", trang_thai: "ok" };
  }

  // ---------------------------------------------------------------- cua toi

  /** Ho so + vai + trang thai kich hoat + quyen SKU tom tat (AuthProvider o web goi) */
  @Get("toi")
  toi(@NguoiDung() nd: ThongTinNguoiDung): Promise<HoSoCuaToi> {
    return this.hoSo.layCuaToi(nd);
  }

  @Patch("toi")
  async capNhatToi(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: CapNhatHoSoDto): Promise<HoSoCuaToi> {
    await this.hoSo.capNhatCuaToi(nd, dto);
    return this.hoSo.layCuaToi(nd);
  }

  @Get("toi/lich-su-vai")
  lichSuCuaToi(@NguoiDung() nd: ThongTinNguoiDung): Promise<LichSuVai[]> {
    return this.vaiSv.lichSu(nd.id);
  }

  /** Checklist hoc truoc khi ban cho tung vai phai hoc */
  @Get("toi/dieu-kien-kich-hoat")
  dieuKienCuaToi(@NguoiDung() nd: ThongTinNguoiDung): Promise<DieuKienKichHoat[]> {
    return this.vaiSv.dieuKienKichHoat(nd.id);
  }

  /** Tu kiem dieu kien va kich hoat vai DANG_HOC (he thong kich hoat, khong phai tu cap quyen) */
  @Post("toi/kich-hoat")
  @HttpCode(200)
  kichHoatCuaToi(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: KichHoatDto): Promise<DieuKienKichHoat> {
    return this.vaiSv.kichHoat(nd.id, dto.vai, null);
  }

  // ---------------------------------------------------------------- xac minh SDT (CSKH / QUAN_LY; ADMIN, THIEN_KHUE qua @Vai)
  // SDT tu khai chi noi voi du lieu khach CRM khi da xac minh (LOI-CAN-SUA muc 1, 3). Dat TRUOC ":id".

  /** Ho so dang khai SDT nay — de goi xac nhan (email che bot) */
  @Vai("CSKH", "QUAN_LY")
  @Get("xac-minh-sdt")
  timTheoSdt(@Query() q: TimHoSoTheoSdtDto): Promise<HoSoTheoSdt[]> {
    return this.xacMinhSdt.timTheoSdt(q.sdt);
  }

  /** Da goi vao so va chu tai khoan xac nhan -> xac minh (khong tu xac minh cho minh; ghi nhat ky) */
  @Vai("CSKH", "QUAN_LY")
  @Post(":id/xac-minh-sdt")
  @HttpCode(200)
  async xacMinhSdtHoSo(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: XacMinhSdtDto): Promise<HoSoTheoSdt[]> {
    await this.xacMinhSdt.xacMinhBoiNhanVien(nd, id, dto);
    return this.xacMinhSdt.timTheoSdt(dto.sdt);
  }

  /** Huy xac minh (xac minh nham / so da doi chu) */
  @Vai("QUAN_LY")
  @Post(":id/huy-xac-minh-sdt")
  @HttpCode(200)
  async huyXacMinhSdt(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: HuyXacMinhSdtDto): Promise<{ ok: true }> {
    await this.xacMinhSdt.huyXacMinh(nd, id, dto);
    return { ok: true };
  }

  // ---------------------------------------------------------------- quan tri vai (QUAN_LY / ADMIN / THIEN_KHUE)

  @Vai("QUAN_LY", "MENTOR")
  @Get()
  async danhSach(@Query() q: LocHoSoDto) {
    const { data, meta } = await this.vaiSv.danhSach(q);
    return coMeta(data, meta);
  }

  @Vai("QUAN_LY", "MENTOR")
  @Get(":id")
  chiTiet(@Param("id", ParseUUIDPipe) id: string): Promise<HoSoChiTiet> {
    return this.vaiSv.chiTiet(id);
  }

  @Vai("QUAN_LY", "MENTOR")
  @Get(":id/lich-su-vai")
  lichSu(@Param("id", ParseUUIDPipe) id: string): Promise<LichSuVai[]> {
    return this.vaiSv.lichSu(id);
  }

  @Vai("QUAN_LY", "MENTOR")
  @Get(":id/dieu-kien-kich-hoat")
  dieuKien(@Param("id", ParseUUIDPipe) id: string): Promise<DieuKienKichHoat[]> {
    return this.vaiSv.dieuKienKichHoat(id);
  }

  /** Them vai cho ho so khac — khong tu cap cho minh; vai cap cao chi ADMIN / THIEN_KHUE */
  @Vai("QUAN_LY")
  @Post(":id/vai")
  themVai(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: ThemVaiDto): Promise<HoSoChiTiet> {
    return this.vaiSv.themVai(nd, id, dto);
  }

  /** Tam dung / khoi phuc / ket thuc vai */
  @Vai("QUAN_LY")
  @Patch(":id/vai/:vai")
  doiTrangThai(
    @NguoiDung() nd: ThongTinNguoiDung,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("vai") vai: string,
    @Body() dto: DoiTrangThaiVaiDto
  ): Promise<HoSoChiTiet> {
    return this.vaiSv.doiTrangThai(nd, id, docVai(vai), dto);
  }

  /** Quan ly / mentor kich hoat ho so khac khi da dat dieu kien hoc (van kiem dieu kien) */
  @Vai("QUAN_LY", "MENTOR")
  @Post(":id/kich-hoat")
  @HttpCode(200)
  kichHoat(@NguoiDung() nd: ThongTinNguoiDung, @Param("id", ParseUUIDPipe) id: string, @Body() dto: KichHoatDto): Promise<DieuKienKichHoat> {
    if (id === nd.id) throw new BadRequestException("Tự kích hoạt vai của mình tại trang Tài khoản");
    return this.vaiSv.kichHoat(id, dto.vai, nd.id);
  }
}
