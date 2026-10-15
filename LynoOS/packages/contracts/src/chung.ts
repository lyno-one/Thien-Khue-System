// Kieu dung chung moi module. Ten enum khop Prisma (apps/api/prisma/schema.prisma).

/** Vai trong he thong — mot ho so nhieu vai (KIEN-TRUC muc 4) */
export const DANH_SACH_VAI = [
  "KHACH",
  "SALE",
  "CSKH",
  "CTV",
  "THUC_TAP",
  "KOL",
  "KOC",
  "MENTOR",
  "DOI_TAC",
  "QUAN_LY",
  "ADMIN",
  "THIEN_KHUE"
] as const;
export type Vai = (typeof DANH_SACH_VAI)[number];

export const DANH_SACH_TRANG_THAI_VAI = ["DANG_HOC", "HOAT_DONG", "TAM_DUNG", "KET_THUC"] as const;
export type TrangThaiVai = (typeof DANH_SACH_TRANG_THAI_VAI)[number];

/** Vai phai hoc dat moi duoc HOAT_DONG (KIEN-TRUC muc 5) */
export const VAI_PHAI_HOC: readonly Vai[] = ["SALE", "CSKH", "CTV", "THUC_TAP", "KOL", "KOC"];

/** Nhan hien thi tieng Viet cho tung vai */
export const NHAN_VAI: Record<Vai, string> = {
  KHACH: "Khách hàng",
  SALE: "Sale",
  CSKH: "CSKH",
  CTV: "Cộng tác viên",
  THUC_TAP: "Thực tập sinh",
  KOL: "KOL",
  KOC: "KOC",
  MENTOR: "Mentor",
  DOI_TAC: "Đối tác",
  QUAN_LY: "Quản lý",
  ADMIN: "Quản trị viên",
  THIEN_KHUE: "Thiên Khuê"
};

/** Response thanh cong cua moi API Nest (interceptor o core boc san) */
export interface ApiResponse<T, M = PhanTrangMeta> {
  data: T;
  meta?: M;
}

/** Response loi (filter o core) — cung dang voi CRM Lyno */
export interface ApiLoi {
  error: { code: string; message: string; details?: unknown };
}

/** Tham so phan trang chuan (query ?trang=1&so_dong=20) */
export interface PhanTrangQuery {
  trang?: number;
  so_dong?: number;
}

export interface PhanTrangMeta {
  trang: number;
  so_dong: number;
  tong: number;
  tong_trang: number;
}

/** Vai kem trang thai cua ho so */
export interface VaiChiTiet {
  vai: Vai;
  trang_thai: TrangThaiVai;
  tu_luc: string;
  den_luc: string | null;
  /** Noi cap vai: "CRM" / "CRM_DONG_BO" = lay tu CRM; "QUAN_TRI" = cap tay; con lai = he thong / du lieu cu */
  nguon?: string | null;
}

/** Nguoi dung hien tai (GET /api/ho-so/toi) */
export interface NguoiDungHienTai {
  id: string;
  email: string | null;
  ho_so: {
    id: string;
    ho_ten: string;
    email: string | null;
    sdt: string | null;
    crm_user_id: string | null;
    kich_hoat_lam_viec: boolean;
  };
  /** Vai dang HOAT_DONG */
  vai: Vai[];
  /** Moi vai (ke ca DANG_HOC, TAM_DUNG) */
  vai_chi_tiet: VaiChiTiet[];
}
