import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { KHOA_CONG_KHAI } from "../decorators/xac-thuc.decorator";
import type { YeuCauCoNguoiDung } from "../types/nguoi-dung.type";
import { NguoiDungService } from "../../services/core.service";
import { XacThucTokenService } from "../../infrastructure/supabase/xac-thuc-token.service";

function layBearer(req: YeuCauCoNguoiDung): string | null {
  const h = req.headers.authorization;
  if (!h) return null;
  const [kieu, token] = h.split(" ");
  return kieu?.toLowerCase() === "bearer" && token ? token.trim() : null;
}

/**
 * Guard TOAN CUC: moi route can Bearer access token Supabase hop le, tru @CongKhai().
 * Gan req.nguoiDung (ho so + vai, tu tao lan dau) va req.token (de goi CRM).
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly xacThuc: XacThucTokenService,
    private readonly nguoiDung: NguoiDungService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== "http") return true;
    const req = ctx.switchToHttp().getRequest<YeuCauCoNguoiDung>();
    const congKhai = this.reflector.getAllAndOverride<boolean>(KHOA_CONG_KHAI, [ctx.getHandler(), ctx.getClass()]);
    const token = layBearer(req);

    if (congKhai) {
      // Route cong khai: co token hop le thi gan nguoi dung, loi token thi bo qua (khong chan)
      if (token) {
        try {
          const daXacThuc = await this.xacThuc.xacThuc(token);
          if (daXacThuc) {
            req.nguoiDung = await this.nguoiDung.layTuToken(daXacThuc);
            req.token = token;
          }
        } catch {
          /* bo qua — route cong khai */
        }
      }
      return true;
    }

    if (!token) throw new UnauthorizedException("Chưa đăng nhập");
    const daXacThuc = await this.xacThuc.xacThuc(token);
    if (!daXacThuc) throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
    req.nguoiDung = await this.nguoiDung.layTuToken(daXacThuc);
    req.token = token;
    return true;
  }
}
