import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ThongTinNguoiDung, YeuCauCoNguoiDung } from "../types/nguoi-dung.type";
import { type HanhDongSku, QuyenSkuService } from "../../services/dao-tao-quyen-sku.service";

export const KHOA_QUYEN_SKU = "tk:quyen-sku";

export interface CauHinhQuyenSku {
  hanhDong: HanhDongSku;
  /**
   * Duong dan toi mau_id / ma mau trong request, vd "params.mauId", "body.mau_id", "query.ma_mau",
   * "body.dong[].mau_id" (moi phan tu mang deu phai co quyen). Gia tri co the la uuid public.mau hoac ma (AL01).
   */
  duongDan: string;
  /** Bo qua cho ADMIN / THIEN_KHUE (mac dinh true) */
  boQuaVaiToiCao?: boolean;
  /** Khong co gia tri trong request thi cho qua (mac dinh false -> 400/403) */
  choPhepTrong?: boolean;
}

/**
 * Danh dau route can quyen SKU. Dung kem guard:
 *   @UseGuards(QuyenSkuGuard)
 *   @CanQuyenSku("BAN", "body.dong[].mau_id")
 * Module dung phai imports: [DaoTaoModule] (export QuyenSkuGuard + QuyenSkuService).
 */
export const CanQuyenSku = (hanhDong: HanhDongSku, duongDan: string, tuyChon: Omit<CauHinhQuyenSku, "hanhDong" | "duongDan"> = {}) =>
  SetMetadata(KHOA_QUYEN_SKU, { hanhDong, duongDan, ...tuyChon } satisfies CauHinhQuyenSku);

/** Lay moi gia tri chuoi theo duong dan (ho tro "[]" de duyet mang) */
export function layTheoDuongDan(goc: unknown, duongDan: string): string[] {
  let hienTai: unknown[] = [goc];
  for (const phan of duongDan.split(".")) {
    const laMang = phan.endsWith("[]");
    const ten = laMang ? phan.slice(0, -2) : phan;
    const tiep: unknown[] = [];
    for (const x of hienTai) {
      if (x == null || typeof x !== "object") continue;
      const v = (x as Record<string, unknown>)[ten];
      if (laMang && Array.isArray(v)) tiep.push(...v);
      else if (v !== undefined) tiep.push(v);
    }
    hienTai = tiep;
  }
  return hienTai.flatMap(v => (Array.isArray(v) ? v : [v])).filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

@Injectable()
export class QuyenSkuGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly quyenSku: QuyenSkuService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const cauHinh = this.reflector.getAllAndOverride<CauHinhQuyenSku | undefined>(KHOA_QUYEN_SKU, [ctx.getHandler(), ctx.getClass()]);
    if (!cauHinh) return true;
    const req = ctx.switchToHttp().getRequest<YeuCauCoNguoiDung>();
    const nd: ThongTinNguoiDung | undefined = req.nguoiDung;
    if (!nd) throw new UnauthorizedException("Chưa đăng nhập");
    if ((cauHinh.boQuaVaiToiCao ?? true) && nd.vai.some(v => v === "ADMIN" || v === "THIEN_KHUE")) return true;

    const giaTri = [...new Set(layTheoDuongDan({ params: req.params, query: req.query, body: req.body }, cauHinh.duongDan))];
    if (!giaTri.length) {
      if (cauHinh.choPhepTrong) return true;
      throw new ForbiddenException("Thiếu mã sản phẩm để kiểm tra quyền bán");
    }
    for (const g of giaTri) await this.quyenSku.kiem(nd.id, g, cauHinh.hanhDong);
    return true;
  }
}
