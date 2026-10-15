// Ho so & vai (agent ho-so): ho so, vai (lay tu CRM), lich su vai, kich hoat (hoc dat).
// Ten truong snake_case khop DB. Route: /api/ho-so/*
import type { NguoiDungHienTai, TrangThaiVai, Vai } from "./chung";

/**
 * Vai nguoi ngoai muon tham gia — chi de GUI LIEN HE (form /dang-ky -> lead), KHONG tu tao tai khoan.
 * Tai khoan + vai do admin tao trong CRM (phong ban co nhom quyen THUC_TAP / CTV / KOL / KOC / DOI_TAC); Thien Khue chi doc vai tu CRM.
 */
export const VAI_LIEN_HE_THAM_GIA = ["CTV", "KOL", "KOC", "THUC_TAP", "DOI_TAC"] as const;
export type VaiLienHeThamGia = (typeof VAI_LIEN_HE_THAM_GIA)[number];

/** Vai chi ADMIN / THIEN_KHUE duoc cap / ket thuc (QUAN_LY khong tu nang quyen) */
export const VAI_CAP_CAO: readonly Vai[] = ["QUAN_LY", "ADMIN", "THIEN_KHUE"];

/** Nhan hien thi trang thai vai */
export const NHAN_TRANG_THAI_VAI: Record<TrangThaiVai, string> = {
  DANG_HOC: "Đang học",
  HOAT_DONG: "Hoạt động",
  TAM_DUNG: "Tạm dừng",
  KET_THUC: "Kết thúc"
};

// ------------------------------------------------------------------ ho so cua toi

export interface QuyenSkuTomTat {
  hoat_dong: number;
  can_hoc_lai: number;
  thu_hoi: number;
  ds: { mau_id: string; ma_mau: string; trang_thai: "HOAT_DONG" | "CAN_HOC_LAI" | "THU_HOI"; cap_luc: string }[];
}

/** GET /api/ho-so/toi — giu dang NguoiDungHienTai (AuthProvider dung) + them chi tiet */
export interface HoSoCuaToi extends NguoiDungHienTai {
  chi_tiet: {
    anh_dai_dien: string | null;
    kich_hoat_luc: string | null;
    /** SDT da duoc xac minh la cua chu ho so (null = chua) — chi khi co moi xem duoc hang / don / uu dai theo SDT */
    sdt_xac_minh_luc: string | null;
    created_at: string;
  };
  quyen_sku: QuyenSkuTomTat;
}

// ------------------------------------------------------------------ xac minh SDT (CSKH / QUAN_LY)

/** Ma loi API /khach-doi-tac/toi/* khi SDT ho so chua xac minh (403) */
export const MA_LOI_SDT_CHUA_XAC_MINH = "SDT_CHUA_XAC_MINH";

/** GET /api/ho-so/xac-minh-sdt?sdt= — ho so dang khai SDT nay (email che bot) */
export interface HoSoTheoSdt {
  id: string;
  ho_ten: string;
  email_an: string | null;
  sdt: string | null;
  sdt_chuan: string | null;
  sdt_xac_minh_luc: string | null;
  created_at: string;
  /** Vai dang HOAT_DONG */
  vai: Vai[];
}

/** POST /api/ho-so/:id/xac-minh-sdt — nhan vien da goi vao so va chu tai khoan xac nhan */
export interface XacMinhSdtBody {
  /** SDT vua goi — phai khop SDT hien tai cua ho so */
  sdt: string;
  /** Cach da xac nhan (bat buoc, ghi nhat ky) */
  ghi_chu: string;
}

/** POST /api/ho-so/:id/huy-xac-minh-sdt (QUAN_LY) */
export interface HuyXacMinhSdtBody {
  ly_do: string;
}

/** PATCH /api/ho-so/toi */
export interface CapNhatHoSoBody {
  ho_ten?: string;
  sdt?: string | null;
  anh_dai_dien?: string | null;
}

// ------------------------------------------------------------------ vai & lich su

export interface LichSuVai {
  id: string;
  vai: Vai;
  trang_thai_cu: TrangThaiVai | null;
  trang_thai_moi: TrangThaiVai | null;
  nguoi_doi_id: string | null;
  nguoi_doi_ten: string | null;
  ly_do: string | null;
  de_xuat_duyet_id: string | null;
  created_at: string;
}

export interface VaiCuaHoSo {
  vai: Vai;
  trang_thai: TrangThaiVai;
  tu_luc: string;
  den_luc: string | null;
  nguon: string | null;
}

/** Ho so trong danh sach quan tri vai */
export interface HoSoTomTat {
  id: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;
  crm_user_id: string | null;
  kich_hoat_lam_viec: boolean;
  created_at: string;
  vai: VaiCuaHoSo[];
}

export interface HoSoChiTiet extends HoSoTomTat {
  anh_dai_dien: string | null;
  kich_hoat_luc: string | null;
  ghi_chu: string | null;
  lich_su_vai: LichSuVai[];
}

/** GET /api/ho-so?tu_khoa=&vai=&trang=&so_dong= */
export interface LocHoSoQuery {
  tu_khoa?: string;
  vai?: Vai;
  trang?: number;
  so_dong?: number;
}

/** POST /api/ho-so/:id/vai — QUAN_LY / ADMIN / THIEN_KHUE; khong cap cho chinh minh */
export interface ThemVaiBody {
  vai: Vai;
  ly_do: string;
}

/** PATCH /api/ho-so/:id/vai/:vai — tam dung / khoi phuc / ket thuc */
export interface DoiTrangThaiVaiBody {
  trang_thai: "TAM_DUNG" | "HOAT_DONG" | "KET_THUC";
  ly_do: string;
}

// ------------------------------------------------------------------ kich hoat lam viec

/** Mot dieu kien trong checklist hoc truoc khi ban */
export interface MucDieuKien {
  khoa_hoc_id: string;
  khoa_hoc_ma: string;
  khoa_hoc_ten: string;
  /** "BAI_HOC" | "KIEM_TRA" | "THUC_HANH" */
  loai: "BAI_HOC" | "KIEM_TRA" | "THUC_HANH";
  mo_ta: string;
  dat: boolean;
}

export interface DieuKienKichHoat {
  vai: Vai;
  trang_thai: TrangThaiVai;
  dat: boolean;
  dieu_kien: MucDieuKien[];
  /** Cau ngan cho nguoi dung: con thieu gi */
  con_thieu: string[];
}

/** POST /api/ho-so/toi/kich-hoat { vai } — tu kiem dieu kien, dat thi vai -> HOAT_DONG */
export interface KichHoatBody {
  vai: Vai;
}
