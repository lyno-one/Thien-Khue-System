import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { NguoiDung } from "../common/decorators/xac-thuc.decorator";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { DanhDauDaDocDto, LocThongBaoQuery } from "../dto/core/core.dto";
import { ThongBaoService } from "../services/core.service";

/**
 * Thong bao trong app — route /api/thong-bao. Moi nguoi da dang nhap chi doc / danh dau thong bao cua chinh minh
 * (danh tinh tu token, khong tu body / query).
 */
@Controller("thong-bao")
export class ThongBaoController {
  constructor(private readonly thongBao: ThongBaoService) {}

  @Get()
  async danhSach(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: LocThongBaoQuery) {
    const { ds, chuaDoc } = await this.thongBao.layCuaToi(nd.id, { chiChuaDoc: q.chi_chua_doc, gioiHan: q.gioi_han });
    return {
      chua_doc: chuaDoc,
      ds: ds.map(t => ({
        id: t.id,
        loai: t.loai,
        tieu_de: t.tieu_de,
        noi_dung: t.noi_dung,
        lien_ket: t.lien_ket,
        da_doc: t.da_doc,
        created_at: t.created_at.toISOString()
      }))
    };
  }

  /** So thong bao chua doc — chuong tren thanh tren goi dinh ky, nen chi tra mot con so */
  @Get("chua-doc")
  async demChuaDoc(@NguoiDung() nd: ThongTinNguoiDung) {
    const { chuaDoc } = await this.thongBao.layCuaToi(nd.id, { gioiHan: 1 });
    return { chua_doc: chuaDoc };
  }

  @Post("da-doc")
  async daDoc(@NguoiDung() nd: ThongTinNguoiDung, @Body() dto: DanhDauDaDocDto) {
    return { da_doi: await this.thongBao.danhDauDaDoc(nd.id, dto.ids) };
  }
}
