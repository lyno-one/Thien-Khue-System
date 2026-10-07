import { createParamDecorator, ExecutionContext, SetMetadata, UnauthorizedException } from "@nestjs/common";
import type { Vai as VaiEnum } from "@prisma/client";
import type { ThongTinNguoiDung, YeuCauCoNguoiDung } from "../types/nguoi-dung.type";

export const KHOA_CONG_KHAI = "tk:cong-khai";
export const KHOA_VAI = "tk:vai";

/** Route khong can dang nhap. Neu co Bearer hop le thi van gan @NguoiDung() (khong thi undefined). */
export const CongKhai = () => SetMetadata(KHOA_CONG_KHAI, true);

/**
 * Chi cho phep ho so co MOT trong cac vai (trang thai HOAT_DONG). ADMIN / THIEN_KHUE luon qua.
 * Dung chuoi: @Vai("SALE", "CSKH") — khong can import enum (tranh trung ten voi enum Prisma `Vai`).
 */
export const Vai = (...vai: VaiEnum[]) => SetMetadata(KHOA_VAI, vai);

/**
 * Nguoi dung hien tai (tu token — KHONG BAO GIO lay danh tinh tu body / query).
 * Route thuong: luon co. Route @CongKhai(): co the undefined.
 */
export const NguoiDung = createParamDecorator((_: unknown, ctx: ExecutionContext): ThongTinNguoiDung | undefined => {
  return ctx.switchToHttp().getRequest<YeuCauCoNguoiDung>().nguoiDung;
});

/** Access token goc cua nguoi dung — truyen cho CrmApiClient khi ghi du lieu CRM */
export const TokenNguoiDung = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const token = ctx.switchToHttp().getRequest<YeuCauCoNguoiDung>().token;
  if (!token) throw new UnauthorizedException("Chưa đăng nhập");
  return token;
});
