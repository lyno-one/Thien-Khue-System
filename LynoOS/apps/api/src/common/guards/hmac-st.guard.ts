import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { layCauHinh } from "../../config/cau-hinh";
import { HEADER_CHU_KY, HEADER_THOI_GIAN, kiemChuKy, type LyDoChuKySai } from "../utils/hmac";

const THONG_DIEP: Record<LyDoChuKySai, string> = {
  CHUA_CAU_HINH: "Chưa cấu hình tích hợp Sales Training",
  THIEU_HEADER: "Thiếu chữ ký tích hợp",
  LECH_GIO: "Chữ ký đã quá hạn (lệch giờ quá 5 phút)",
  SAI_CHU_KY: "Chữ ký tích hợp không hợp lệ"
};

/** Bien the duong dan duoc ky: path day du (/api/...) — chap nhan them ban bo tien to /api va ban co query */
export function bienTheDuongDan(urlGoc: string): string[] {
  const [path] = urlGoc.split("?");
  const ds = new Set<string>([path]);
  if (path.startsWith("/api/")) ds.add(path.slice(4));
  if (urlGoc !== path) ds.add(urlGoc);
  return [...ds];
}

/**
 * Route server->server tu Sales Training (dung CUNG @CongKhai() de bo qua JwtGuard): kiem HMAC tren than request goc.
 * Can rawBody: true o main.ts. Bi mat: TICH_HOP_ST_SECRET.
 */
@Injectable()
export class HmacStGuard implements CanActivate {
  private readonly logger = new Logger("HmacSt");

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const docHeader = (ten: string) => {
      const v = req.headers[ten];
      return Array.isArray(v) ? v[0] : v;
    };
    const kq = kiemChuKy({
      biMat: layCauHinh().tichHopStSecret,
      thoiGian: docHeader(HEADER_THOI_GIAN),
      chuKy: docHeader(HEADER_CHU_KY),
      phuongThuc: req.method,
      duongDan: bienTheDuongDan(req.originalUrl ?? req.url),
      than: req.rawBody?.length ? req.rawBody.toString("utf8") : ""
    });
    if (kq.hopLe) return true;
    this.logger.warn(`Từ chối request Sales Training ${req.method} ${req.originalUrl}: ${kq.lyDo}`);
    throw new UnauthorizedException({ code: `HMAC_${kq.lyDo}`, message: THONG_DIEP[kq.lyDo] });
  }
}
