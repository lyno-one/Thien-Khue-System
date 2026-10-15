import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Vai } from "@prisma/client";
import { KHOA_VAI } from "../decorators/xac-thuc.decorator";
import type { ThongTinNguoiDung, YeuCauCoNguoiDung } from "../types/nguoi-dung.type";

/** Vai luon qua moi @Vai(...) */
export const VAI_TOI_CAO: readonly Vai[] = ["ADMIN", "THIEN_KHUE"];

/** Co mot trong cac vai (HOAT_DONG) hay khong — dung chung cho guard va service */
export function coVai(nguoiDung: Pick<ThongTinNguoiDung, "vai"> | undefined, canVai: readonly Vai[]): boolean {
  if (!nguoiDung) return false;
  if (!canVai.length) return true;
  return nguoiDung.vai.some(v => VAI_TOI_CAO.includes(v) || canVai.includes(v));
}

/** Guard toan cuc (chay sau JwtGuard): kiem @Vai(...) tren handler / controller */
@Injectable()
export class VaiGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const canVai = this.reflector.getAllAndOverride<Vai[] | undefined>(KHOA_VAI, [ctx.getHandler(), ctx.getClass()]);
    if (!canVai?.length) return true;
    const nguoiDung = ctx.switchToHttp().getRequest<YeuCauCoNguoiDung>().nguoiDung;
    if (!nguoiDung) throw new UnauthorizedException("Chưa đăng nhập");
    if (!coVai(nguoiDung, canVai)) throw new ForbiddenException("Bạn không có vai trò phù hợp để thực hiện thao tác này");
    return true;
  }
}
