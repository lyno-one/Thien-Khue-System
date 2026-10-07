import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { layCauHinh } from "../../config/cau-hinh";

/*
 * GHI du lieu CRM (tao don, doi trang thai don, ghi cham soc khach...) CHI qua CRM apps/api,
 * mang Bearer token CUA CHINH NGUOI DUNG — de CRM ap dung luat, quyen, trigger kho / luong.
 * Lay token trong controller: @TokenNguoiDung() token: string.
 */

type PhuongThuc = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** Body tao don CRM (POST /api/don-hang) — khop taoDonSchema cua CRM */
export interface TaoDonCrmBody {
  kenh: "website" | "facebook" | "cua_hang" | "khac";
  khach_ten: string;
  khach_sdt?: string;
  khach_dia_chi?: string;
  ghi_chu?: string;
  dong: { mau_id: string; size?: string; mau_sac?: string; so_luong: number; don_gia: number }[];
}

const HET_GIO_MS = 15_000;

@Injectable()
export class CrmApiClient {
  private readonly logger = new Logger("CrmApiClient");

  /**
   * Goi CRM. Thanh cong -> tra `data` trong { data } cua CRM. Loi CRM { error: { code, message } } -> HttpException
   * cung status + message (tieng Viet cua CRM; 5xx -> 502). Khong toi duoc CRM -> 503.
   */
  async goi<T>(
    token: string,
    phuongThuc: PhuongThuc,
    duongDan: string,
    tuyChon: { body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {}
  ): Promise<T> {
    if (!token) {
      throw new HttpException({ code: "UNAUTHORIZED", message: "Thiếu phiên đăng nhập để gọi CRM" }, HttpStatus.UNAUTHORIZED);
    }
    const url = new URL(`${layCauHinh().crmApiUrl}${duongDan.startsWith("/") ? "" : "/"}${duongDan}`);
    for (const [k, v] of Object.entries(tuyChon.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));

    let res: Response;
    try {
      res = await fetch(url, {
        method: phuongThuc,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(tuyChon.body !== undefined ? { "Content-Type": "application/json" } : {})
        },
        body: tuyChon.body !== undefined ? JSON.stringify(tuyChon.body) : undefined,
        signal: AbortSignal.timeout(HET_GIO_MS)
      });
    } catch (e) {
      this.logger.error(`${phuongThuc} ${url.pathname}: ${e instanceof Error ? e.message : String(e)}`);
      throw new ServiceUnavailableException("Không kết nối được CRM, thử lại sau");
    }

    if (res.status === 204) return undefined as T;
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const loi = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
      if (res.status >= 500) this.logger.error(`${phuongThuc} ${url.pathname} -> ${res.status} ${loi?.code ?? ""}`);
      throw new HttpException(
        { code: loi?.code ?? "CRM_ERROR", message: loi?.message ?? "CRM từ chối yêu cầu", details: loi?.details },
        res.status >= 500 ? HttpStatus.BAD_GATEWAY : res.status
      );
    }
    return (body as { data: T } | null)?.data as T;
  }

  /** Tao don ban hang tren CRM (nguoi tao = nguoi dung cua token) */
  taoDon<T = { id: string; ma_don: string }>(token: string, body: TaoDonCrmBody): Promise<T> {
    return this.goi<T>(token, "POST", "/api/don-hang", { body });
  }

  /** Chi tiet don tren CRM theo quyen cua nguoi dung */
  layDon<T = unknown>(token: string, donId: string): Promise<T> {
    return this.goi<T>(token, "GET", `/api/don-hang/${encodeURIComponent(donId)}`);
  }

  /** Doi trang thai don (CRM ap luat chuyen trang thai + kho) */
  doiTrangThaiDon<T = unknown>(token: string, donId: string, sang: string, lyDoHoan?: string | null): Promise<T> {
    return this.goi<T>(token, "POST", `/api/don-hang/${encodeURIComponent(donId)}/change-status`, { body: { sang, lyDoHoan } });
  }
}
