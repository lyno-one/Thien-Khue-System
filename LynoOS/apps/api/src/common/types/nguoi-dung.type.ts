import type { TrangThaiVai, Vai } from "@prisma/client";
import type { Request } from "express";

/** Nguoi dung da xac thuc — gan vao request boi JwtGuard, lay trong controller bang @NguoiDung() */
export interface ThongTinNguoiDung {
  /** auth.users.id = ho_so.id */
  id: string;
  email: string | null;
  hoSo: {
    id: string;
    ho_ten: string;
    email: string | null;
    sdt: string | null;
    /** SDT chuan hoa (khoa noi khach CRM) — optional de fixture test cu van hop le */
    sdt_chuan?: string | null;
    crm_user_id: string | null;
    kich_hoat_lam_viec: boolean;
  };
  /** Vai dang HOAT_DONG (VaiGuard kiem theo danh sach nay) */
  vai: Vai[];
  /** Moi vai kem trang thai (ca DANG_HOC / TAM_DUNG) */
  vaiChiTiet: { vai: Vai; trang_thai: TrangThaiVai; tu_luc: Date; den_luc: Date | null }[];
}

export interface YeuCauCoNguoiDung extends Request {
  nguoiDung?: ThongTinNguoiDung;
  /** Access token Supabase goc — chuyen tiep cho CrmApiClient */
  token?: string;
}
