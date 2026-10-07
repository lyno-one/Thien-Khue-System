import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import type {
  BaiHocChiTiet,
  BaiThucHanh,
  ChungChi,
  DeThi,
  KetQuaChamThucHanh,
  KetQuaHoanThanhBai,
  KetQuaKiemQuyenSku,
  KetQuaNopBai,
  KetQuaXacNhanSku,
  KhoaHocChiTiet,
  KhoaHocTomTat,
  LoTrinhCuaToi,
  LuotLamTomTat,
  QuyenSkuCuaToi
} from "@thien-khue/contracts";
import { CongKhai, NguoiDung, Vai } from "../common/decorators/xac-thuc.decorator";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import {
  ChamThucHanhDto,
  KiemQuyenSkuQueryDto,
  LocKhoaHocQueryDto,
  LocThucHanhQueryDto,
  LocTienDoDoiQueryDto,
  NopBaiKiemTraDto,
  NopThucHanhDto
} from "../dto/dao-tao/dao-tao.dto";
import { HocVienService, KiemTraService, ThucHanhService, TienDoDoiService } from "../services/dao-tao.service";
import { QuyenSkuService } from "../services/dao-tao-quyen-sku.service";

/** Dao tao LMS — route /api/dao-tao/* (nguoi hoc + mentor / quan ly). Quan tri noi dung: quan-tri-dao-tao.controller.ts */
@Controller("dao-tao")
export class DaoTaoController {
  constructor(
    private readonly hocVien: HocVienService,
    private readonly kiemTra: KiemTraService,
    private readonly thucHanh: ThucHanhService,
    private readonly quyenSku: QuyenSkuService,
    private readonly tienDoDoi: TienDoDoiService
  ) {}

  @CongKhai()
  @Get("health")
  health() {
    return { module: "dao-tao", trang_thai: "ok" };
  }

  // ---------------------------------------------------------------- lo trinh / khoa / bai

  @Get("lo-trinh")
  loTrinh(@NguoiDung() nd: ThongTinNguoiDung): Promise<LoTrinhCuaToi> {
    return this.hocVien.loTrinh(nd);
  }

  @Get("khoa-hoc")
  danhSachKhoa(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: LocKhoaHocQueryDto): Promise<KhoaHocTomTat[]> {
    return this.hocVien.danhSachKhoa(nd, q.loai);
  }

  @Get("khoa-hoc/:idHoacMa")
  chiTietKhoa(@NguoiDung() nd: ThongTinNguoiDung, @Param("idHoacMa") idHoacMa: string): Promise<KhoaHocChiTiet> {
    return this.hocVien.chiTietKhoa(nd, idHoacMa);
  }

  @Get("bai-hoc/:id")
  chiTietBai(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string): Promise<BaiHocChiTiet> {
    return this.hocVien.chiTietBai(nd, id);
  }

  @Post("bai-hoc/:id/hoan-thanh")
  @HttpCode(200)
  hoanThanhBai(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string): Promise<KetQuaHoanThanhBai> {
    return this.hocVien.danhDauBai(nd, id, true);
  }

  @Delete("bai-hoc/:id/hoan-thanh")
  boHoanThanhBai(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string): Promise<KetQuaHoanThanhBai> {
    return this.hocVien.danhDauBai(nd, id, false);
  }

  // ---------------------------------------------------------------- bai kiem tra

  @Post("bai-kiem-tra/:id/bat-dau")
  @HttpCode(200)
  batDau(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string): Promise<DeThi> {
    return this.kiemTra.batDau(nd.id, id);
  }

  @Post("bai-kiem-tra/:id/nop")
  @HttpCode(200)
  nop(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string, @Body() body: NopBaiKiemTraDto): Promise<KetQuaNopBai> {
    return this.kiemTra.nop(nd.id, id, body.luot_lam_id, body.tra_loi);
  }

  @Get("bai-kiem-tra/:id/lich-su")
  lichSu(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string): Promise<LuotLamTomTat[]> {
    return this.kiemTra.lichSu(nd.id, id);
  }

  // ---------------------------------------------------------------- thuc hanh

  @Post("khoa-hoc/:id/thuc-hanh")
  nopThucHanh(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string, @Body() body: NopThucHanhDto): Promise<BaiThucHanh> {
    return this.thucHanh.nop(nd, id, body);
  }

  @Get("thuc-hanh/cua-toi")
  thucHanhCuaToi(@NguoiDung() nd: ThongTinNguoiDung): Promise<BaiThucHanh[]> {
    return this.hocVien.thucHanhCuaToi(nd.id);
  }

  /** Hang doi cham — MENTOR / QUAN_LY (ADMIN, THIEN_KHUE luon qua) */
  @Vai("MENTOR", "QUAN_LY")
  @Get("thuc-hanh")
  hangDoiCham(@Query() q: LocThucHanhQueryDto) {
    return this.thucHanh.danhSach(q);
  }

  /** Cham bai — khong tu cham bai cua minh (kiem trong service) */
  @Vai("MENTOR", "QUAN_LY")
  @Post("thuc-hanh/:id/cham")
  @HttpCode(200)
  cham(@NguoiDung() nd: ThongTinNguoiDung, @Param("id") id: string, @Body() body: ChamThucHanhDto): Promise<KetQuaChamThucHanh> {
    return this.thucHanh.cham(nd.id, id, body);
  }

  // ---------------------------------------------------------------- chung chi / quyen SKU

  @Get("chung-chi/cua-toi")
  chungChi(@NguoiDung() nd: ThongTinNguoiDung): Promise<ChungChi[]> {
    return this.hocVien.chungChiCuaToi(nd.id);
  }

  @Get("quyen-sku/cua-toi")
  quyenSkuCuaToi(@NguoiDung() nd: ThongTinNguoiDung): Promise<QuyenSkuCuaToi[]> {
    return this.quyenSku.cuaToi(nd.id);
  }

  @Get("quyen-sku/kiem")
  kiemQuyen(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: KiemQuyenSkuQueryDto): Promise<KetQuaKiemQuyenSku> {
    const ma = q.mau_id ?? q.ma_mau;
    if (!ma) throw new BadRequestException("Cần mau_id hoặc ma_mau");
    return this.quyenSku.kiemChoClient(nd.id, ma);
  }

  @Post("quyen-sku/:mau/xac-nhan")
  @HttpCode(200)
  async xacNhan(@NguoiDung() nd: ThongTinNguoiDung, @Param("mau") mau: string): Promise<KetQuaXacNhanSku> {
    return { quyen_sku: await this.quyenSku.xacNhanDocThayDoi(nd.id, mau) };
  }

  // ---------------------------------------------------------------- tien do doi

  @Vai("MENTOR", "QUAN_LY")
  @Get("tien-do-doi")
  tienDo(@Query() q: LocTienDoDoiQueryDto) {
    return this.tienDoDoi.danhSach(q);
  }
}

