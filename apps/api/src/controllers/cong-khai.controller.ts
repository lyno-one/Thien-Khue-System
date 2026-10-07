import { Body, Controller, Get, HttpCode, Ip, Param, Post, Query } from "@nestjs/common";
import { coMeta } from "../common/interceptors/bao-response.interceptor";
import { CongKhai } from "../common/decorators/xac-thuc.decorator";
import { DanhSachSanPhamQueryDto, GuiLienHeDto } from "../dto/cong-khai/cong-khai.dto";
import { LienHeService, SanPhamCongKhaiService } from "../services/cong-khai.service";

/** Trang cong khai — route /api/cong-khai/* (tat ca khong can dang nhap) */
@Controller("cong-khai")
export class CongKhaiController {
  constructor(
    private readonly sanPham: SanPhamCongKhaiService,
    private readonly lienHe: LienHeService
  ) {}

  @CongKhai()
  @Get("health")
  health() {
    return { module: "cong-khai", trang_thai: "ok" };
  }

  /** San pham hien thi (public.mau con ban): ?tu_khoa=&gioi_han=1..48&sap_xep=moi|ma */
  @CongKhai()
  @Get("san-pham")
  async danhSachSanPham(@Query() q: DanhSachSanPhamQueryDto) {
    const ds = await this.sanPham.danhSach(q);
    return coMeta(ds, { so_luong: ds.length });
  }

  @CongKhai()
  @Get("san-pham/:ma")
  chiTietSanPham(@Param("ma") ma: string) {
    return this.sanPham.chiTiet(ma);
  }

  /** Form dang ky hoc / hop tac / doi tac / khach quan tam -> lead */
  @CongKhai()
  @Post("lien-he")
  @HttpCode(201)
  guiLienHe(@Body() body: GuiLienHeDto, @Ip() ip: string) {
    return this.lienHe.gui(body, ip);
  }
}
