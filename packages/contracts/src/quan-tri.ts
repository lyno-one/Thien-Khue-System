// Quan tri (agent quan-tri): 6 nhom ho so, de xuat duyet (maker-checker), nhat ky, bang dieu hanh.
// Dung kieu chung tu ./chung (Vai, ApiResponse...). Ten truong snake_case khop DB.
import { VAI_PHAI_HOC, type TrangThaiVai, type Vai } from "./chung";

// ------------------------------------------------------------------ DE XUAT DUYET (maker-checker)

export const DANH_SACH_LOAI_DE_XUAT = [
  "CAP_QUYEN_SKU",
  "CHUYEN_VAI",
  "KICH_HOAT_LAM_VIEC",
  "DUYET_QUA_TANG",
  "DUYET_VOUCHER",
  "XAC_MINH_DON",
  "DIEU_CHINH_HOA_HONG",
  "CHI_TRA_HOA_HONG",
  "DOI_CHINH_SACH",
  "XUAT_DU_LIEU_KHACH",
  "KHAC"
] as const;
export type LoaiDeXuat = (typeof DANH_SACH_LOAI_DE_XUAT)[number];

export const DANH_SACH_TRANG_THAI_DE_XUAT = ["CHO_KIEM", "CHO_DUYET", "DA_DUYET", "TU_CHOI", "HUY"] as const;
export type TrangThaiDeXuat = (typeof DANH_SACH_TRANG_THAI_DE_XUAT)[number];

export const NHAN_LOAI_DE_XUAT: Record<LoaiDeXuat, string> = {
  CAP_QUYEN_SKU: "Cấp / thu hồi quyền bán SKU",
  CHUYEN_VAI: "Chuyển vai trò (đã bỏ — đổi ở CRM)",
  KICH_HOAT_LAM_VIEC: "Kích hoạt làm việc",
  DUYET_QUA_TANG: "Duyệt quà tặng đối tác",
  DUYET_VOUCHER: "Duyệt voucher",
  XAC_MINH_DON: "Xác minh trùng nguồn đơn",
  DIEU_CHINH_HOA_HONG: "Điều chỉnh hoa hồng",
  CHI_TRA_HOA_HONG: "Chi trả hoa hồng",
  DOI_CHINH_SACH: "Thay đổi chính sách",
  XUAT_DU_LIEU_KHACH: "Xuất dữ liệu khách",
  KHAC: "Khác"
};

export const NHAN_TRANG_THAI_DE_XUAT: Record<TrangThaiDeXuat, string> = {
  CHO_KIEM: "Chờ kiểm",
  CHO_DUYET: "Chờ duyệt",
  DA_DUYET: "Đã duyệt",
  TU_CHOI: "Từ chối",
  HUY: "Đã rút"
};

/**
 * So buoc phe duyet theo loai (khop apps/api common/utils/quan-tri):
 *   3 buoc (de xuat -> kiem -> duyet, 3 nguoi khac nhau): tien + du lieu khach.
 *   2 buoc (de xuat -> duyet, nguoi duyet khac nguoi de xuat): moi loai con lai.
 */
export const LOAI_DE_XUAT_BA_BUOC: readonly LoaiDeXuat[] = ["CHI_TRA_HOA_HONG", "DIEU_CHINH_HOA_HONG", "XAC_MINH_DON", "XUAT_DU_LIEU_KHACH"];
export function soBuocDeXuat(loai: LoaiDeXuat): 2 | 3 {
  return LOAI_DE_XUAT_BA_BUOC.includes(loai) ? 3 : 2;
}
/** Nhan so buoc hien tren ban phe duyet */
export function nhanSoBuocDeXuat(loai: LoaiDeXuat): string {
  if (soBuocDeXuat(loai) === 2) return "2 bước";
  return loai === "XUAT_DU_LIEU_KHACH" ? "3 bước (dữ liệu khách)" : "3 bước (tiền)";
}

/**
 * Vai lay tu CRM — MOI vai nghiep vu (khop apps/api VAI_TU_CRM): admin / manager theo role; SALE, CSKH, THUC_TAP, CTV, KOL, KOC,
 * DOI_TAC theo nhom quyen phong ban. Doi vai = doi phong ban / quyen o CRM; Thien Khue khong cap / chuyen vai bang de xuat.
 */
export const VAI_TU_CRM: readonly Vai[] = ["ADMIN", "THIEN_KHUE", "QUAN_LY", "MENTOR", "SALE", "CSKH", "THUC_TAP", "CTV", "KOL", "KOC", "DOI_TAC"];
export const LOI_VAI_TU_CRM = "Vai lấy từ CRM — đổi phòng ban / quyền của nhân sự ở CRM (Quản trị nhân sự)";
/** Nguon dong vai do CRM cap (vai_tro_ho_so.nguon) */
export function laNguonCrm(nguon: string | null | undefined): boolean {
  return nguon === "CRM" || nguon === "CRM_DONG_BO";
}

/**
 * "Kich hoat lam viec" chi ap cho ho so co vai phai hoc (SALE, CSKH, CTV, THUC_TAP, KOL, KOC) chua ket thuc.
 * Ho so chi co vai khong phai hoc (Admin, Quan ly, Mentor, Doi tac, Khach...) -> KHONG_AP_DUNG.
 */
export type TrangThaiKichHoatLamViec = "KHONG_AP_DUNG" | "DA_KICH_HOAT" | "CHUA_KICH_HOAT";
export function trangThaiKichHoatLamViec(vai: readonly { vai: Vai; trang_thai: TrangThaiVai }[], kichHoatLamViec: boolean): TrangThaiKichHoatLamViec {
  const coVaiPhaiHoc = vai.some(v => VAI_PHAI_HOC.includes(v.vai) && v.trang_thai !== "KET_THUC");
  if (!coVaiPhaiHoc) return "KHONG_AP_DUNG";
  return kichHoatLamViec ? "DA_KICH_HOAT" : "CHUA_KICH_HOAT";
}
export const NHAN_KICH_HOAT_LAM_VIEC: Record<TrangThaiKichHoatLamViec, string> = {
  KHONG_AP_DUNG: "Không áp dụng",
  DA_KICH_HOAT: "Đã kích hoạt",
  CHUA_KICH_HOAT: "Chưa (cần học đạt)"
};

/** Loai de xuat quan-tri tu ap dung khi duyet (cac loai khac: chi ghi quyet dinh, module so huu doc trang thai) */
export const LOAI_DE_XUAT_TU_AP_DUNG: readonly LoaiDeXuat[] = [
  "CAP_QUYEN_SKU",
  "CHUYEN_VAI",
  "DUYET_QUA_TANG",
  "DUYET_VOUCHER",
  "XAC_MINH_DON",
  "DOI_CHINH_SACH"
];

/** Loai lap duoc tu ban phe duyet quan tri (cac loai con lai do module so huu tao, vd DIEU_CHINH_HOA_HONG tu mang-luoi) */
export const LOAI_DE_XUAT_LAP_TU_QUAN_TRI: readonly LoaiDeXuat[] = [
  "CAP_QUYEN_SKU",
  "DUYET_QUA_TANG",
  "DUYET_VOUCHER",
  "XAC_MINH_DON",
  "DOI_CHINH_SACH",
  "XUAT_DU_LIEU_KHACH",
  "KHAC"
];

type NguonDon = "SALE" | "CTV" | "KOC" | "KOL";
type HangThanhVien = "THAN_THIET" | "VIP";
type TrangThaiQuyenSku = "HOAT_DONG" | "CAN_HOC_LAI" | "THU_HOI";

/** du_lieu theo loai — body tao de xuat. CHUYEN_VAI: chi con DU LIEU CU (lap moi bi 400 — vai lay tu CRM) */
export interface DuLieuQtChuyenVai {
  vai: Vai;
  trang_thai_moi: TrangThaiVai;
  /** Tuy chon: vai cu ket thuc khi duyet (vd THUC_TAP -> KOC). De xuat tu ho-so dung { vai_moi, trang_thai_vai_moi, tu_vai } — server doc ca hai dang */
  tu_vai?: Vai;
}
export interface DuLieuQtCapQuyenSku {
  mau_id: string;
  /** HOAT_DONG = cap (phai co bang chung hoc dat), THU_HOI = thu hoi */
  trang_thai_moi: "HOAT_DONG" | "THU_HOI";
}
export interface DuLieuQtDuyetQua {
  /** Ghi chu tham dinh chat luong (tuy chon) */
  ghi_chu?: string;
}
export interface DuLieuQtXacMinhDon {
  /** GHI_NHAN = chon nguoi ban; HUY = don khong tinh cho ai */
  ket_qua: "GHI_NHAN" | "HUY";
  nguoi_ban_ho_so_id?: string;
  nguon?: NguonDon;
}
export type DuLieuQtDoiChinhSach =
  | { chinh_sach: "TY_LE_HOA_HONG"; vai: Vai; mau_id?: string | null; ty_le: number }
  | { chinh_sach: "NGUONG_HANG"; hang: HangThanhVien; nguong_tich_luy?: number; giam_gia_phan_tram?: number };

export interface TaoDeXuatBody {
  loai: LoaiDeXuat;
  /** Ten bang doi tuong, vd "ho_so", "qua_tang", "ghi_nhan_don" (server tu dien neu bo trong) */
  doi_tuong?: string;
  doi_tuong_id?: string | null;
  du_lieu: Record<string, unknown>;
  ly_do?: string;
}

export interface QuyetDinhDeXuatBody {
  dong_y: boolean;
  y_kien?: string;
}

export interface NguoiTomTatQt {
  id: string;
  ho_ten: string;
  email: string | null;
}

export interface DeXuatDuyet {
  id: string;
  loai: LoaiDeXuat;
  doi_tuong: string;
  doi_tuong_id: string | null;
  du_lieu: Record<string, unknown>;
  ly_do: string | null;
  /** Trang thai hieu luc (de xuat 2 buoc con CHO_KIEM cu -> CHO_DUYET) */
  trang_thai: TrangThaiDeXuat;
  /** 2 = de xuat -> duyet; 3 = de xuat -> kiem -> duyet (tien / du lieu khach) */
  so_buoc: 2 | 3;
  nguoi_de_xuat: NguoiTomTatQt | null;
  nguoi_kiem: NguoiTomTatQt | null;
  kiem_luc: string | null;
  y_kien_kiem: string | null;
  nguoi_duyet: NguoiTomTatQt | null;
  duyet_luc: string | null;
  y_kien_duyet: string | null;
  created_at: string;
  /** Mo ta doi tuong de hien thi (vd ten qua, ma don, ho ten) */
  mo_ta_doi_tuong: string | null;
  /** Quyen cua nguoi dang xem tren de xuat nay */
  co_the_kiem: boolean;
  co_the_duyet: boolean;
  co_the_huy: boolean;
  /** Ly do khong the duyet (vd "Bạn đã kiểm đề xuất này") — de FE giai thich */
  ly_do_khong_duyet: string | null;
}

export interface DeXuatChiTiet extends DeXuatDuyet {
  nhat_ky: NhatKyQt[];
}

export interface DeXuatQuery {
  trang?: number;
  so_dong?: number;
  trang_thai?: TrangThaiDeXuat;
  loai?: LoaiDeXuat;
  /** CUA_TOI = toi de xuat; CAN_TOI = toi co the kiem / duyet */
  pham_vi?: "CUA_TOI" | "CAN_TOI";
}

/** Hang cho chua co de xuat mo (qua cho tham dinh, don cho xac minh...) — QUAN_LY lap de xuat tu day */
export interface HangChoPheDuyet {
  qua_tang: { id: string; ten: string; doi_tac: string | null; gia_tri: number | null; so_luong: number | null; created_at: string }[];
  voucher: { id: string; ma: string; ten: string; doi_tac: string | null; loai_giam: "PHAN_TRAM" | "SO_TIEN"; gia_tri: number; created_at: string }[];
  don_cho_xac_minh: {
    id: string;
    ma_don: string;
    tong_tien: number;
    nguon: NguonDon;
    ma_gioi_thieu: string | null;
    nguoi_gioi_thieu: NguoiTomTatQt | null;
    nguoi_chot: NguoiTomTatQt | null;
    nguoi_ban_hien_tai: NguoiTomTatQt | null;
    ly_do: string | null;
    created_at: string;
  }[];
}

/** Chinh sach hien hanh (de form doi chinh sach hien gia tri truoc) */
export interface ChinhSachHienHanh {
  ty_le_hoa_hong: { id: string; vai: Vai; mau_id: string | null; ma_mau: string | null; ty_le: number; hieu_luc_tu: string; ghi_chu: string | null }[];
  hang_thanh_vien: { hang: HangThanhVien; ten: string; nguong_tich_luy: number; giam_gia_phan_tram: number; bat: boolean }[];
}

/** Bang ty le hoa hong day du (GET /quan-tri/phe-duyet/ty-le-hoa-hong) */
export type TrangThaiTyLeHoaHong = "DANG_AP_DUNG" | "CHUA_TOI" | "DA_HET";
export interface TyLeHoaHongQt {
  id: string;
  vai: Vai;
  mau_id: string | null;
  ma_mau: string | null;
  ty_le: number;
  hieu_luc_tu: string;
  hieu_luc_den: string | null;
  bat: boolean;
  ghi_chu: string | null;
  trang_thai: TrangThaiTyLeHoaHong;
}
export interface BangTyLeHoaHong {
  ty_le: TyLeHoaHongQt[];
}

// ------------------------------------------------------------------ BANG DIEU HANH

export interface TongQuanQuanTri {
  nguoi_hoc: { tong: number; dang_hoc: number; hoat_dong: number };
  /** Ty le luot lam dat / luot da nop (0..100), null khi chua co luot */
  ty_le_dat: number | null;
  luot_lam: { tong: number; dat: number };
  don_theo_nguon: { nguon: NguonDon; so_don: number; tong_tien: number }[];
  don_cho_xac_minh: number;
  hoa_hong_cho: { so_tien: number; so_dong: number };
  de_xuat: { cho_kiem: number; cho_duyet: number; can_toi: number };
  qua_cho_tham_dinh: number;
  nguoi_dung: number;
}

export type TrangThaiNguoiHocQt = "HOAN_THANH" | "DANG_HOC" | "CHUA_BAT_DAU" | "CAN_HO_TRO";
export const NHAN_TRANG_THAI_NGUOI_HOC_QT: Record<TrangThaiNguoiHocQt, string> = {
  HOAN_THANH: "Hoàn thành",
  DANG_HOC: "Đang học",
  CHUA_BAT_DAU: "Chưa bắt đầu",
  CAN_HO_TRO: "Cần hỗ trợ"
};

export interface NguoiHocDongQt {
  ho_so_id: string;
  ho_ten: string;
  vai: { vai: Vai; trang_thai: TrangThaiVai }[];
  bai_hoc_xong: number;
  tong_bai_hoc: number;
  /** 0..100 */
  tien_do: number;
  bai_kiem_tra_dat: number;
  tong_bai_kiem_tra: number;
  trang_thai: TrangThaiNguoiHocQt;
}

// ------------------------------------------------------------------ 6 NHOM HO SO

export interface NguoiDungDongQt {
  id: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;
  crm_user_id: string | null;
  kich_hoat_lam_viec: boolean;
  vai: { vai: Vai; trang_thai: TrangThaiVai }[];
  so_quyen_sku: number;
  created_at: string;
}

export interface NguoiDungChiTietQt extends Omit<NguoiDungDongQt, "vai"> {
  vai: { vai: Vai; trang_thai: TrangThaiVai; tu_luc: string; den_luc: string | null; nguon: string | null }[];
  lich_su_vai: { vai: Vai; trang_thai_cu: TrangThaiVai | null; trang_thai_moi: TrangThaiVai | null; ly_do: string | null; nguoi_doi: NguoiTomTatQt | null; created_at: string }[];
  quyen_sku: { mau_id: string; ma_mau: string; trang_thai: TrangThaiQuyenSku; cap_luc: string; phien_ban_tai_lieu: number }[];
  chung_chi: { ma_chung_chi: string; khoa_hoc: string; diem: number | null; cap_luc: string }[];
  luot_lam: { bai_kiem_tra: string; diem: number; dat: boolean; nop_luc: string | null }[];
  giao_dich: { so_don: number; doanh_so: number; hoa_hong_cho: number; hoa_hong_da_tra: number };
  nhat_ky: NhatKyQt[];
}

export interface KhachHangDongQt {
  sdt_chuan: string;
  ten: string | null;
  tong_tien: number;
  so_don: number;
  lan_mua_cuoi: string | null;
  hang: HangThanhVien | null;
}

export interface KhachHangChiTietQt extends KhachHangDongQt {
  dia_chi: string | null;
  ghi_chu: string | null;
  don: { id: string; ma_don: string; loai_don: string; trang_thai: string; tong_tien: number; created_at: string }[];
  phu_trach: { ho_so: NguoiTomTatQt | null; nguon: string; giao_luc: string } | null;
  uu_dai: { id: string; loai: "VOUCHER" | "QUA_TANG"; ten: string; trang_thai: string; cap_luc: string }[];
  kh_hanh_phuc: { trang_thai: string; moi_luc: string; dong_y_dung_hinh: boolean } | null;
}

export interface SanPhamDongQt {
  id: string;
  ma: string;
  ten: string;
  gia_ban: number | null;
  trang_thai: string;
  anh_url: string | null;
  khoa_hoc: { id: string; ma: string; ten: string; phien_ban_tai_lieu: number } | null;
  quyen_sku: { hoat_dong: number; can_hoc_lai: number; thu_hoi: number };
}

export interface SanPhamChiTietQt extends SanPhamDongQt {
  chat_lieu: string | null;
  form_dang: string | null;
  ton_kho: { size: string; mau_sac: string; so_luong: number }[];
  nguoi_co_quyen: { ho_so: NguoiTomTatQt; trang_thai: TrangThaiQuyenSku; cap_luc: string; phien_ban_tai_lieu: number }[];
}

export interface NhatKyQt {
  id: string;
  ho_so: NguoiTomTatQt | null;
  tac_nhan: "NGUOI" | "HE_THONG" | "AI";
  hanh_dong: string;
  doi_tuong: string;
  doi_tuong_id: string | null;
  du_lieu: unknown;
  created_at: string;
}

export interface NhatKyQtQuery {
  trang?: number;
  so_dong?: number;
  ho_so_id?: string;
  doi_tuong?: string;
  doi_tuong_id?: string;
  hanh_dong?: string;
  tu_ngay?: string;
  den_ngay?: string;
}

type TrangThaiGhiNhan = "HOP_LE" | "CHO_XAC_MINH" | "BI_HUY" | "DA_DOI_SOAT";
type TrangThaiHoaHong = "CHO_DOI_SOAT" | "DU_DIEU_KIEN" | "DA_TRA" | "BI_TRU";

export interface GiaoDichDongQt {
  id: string;
  crm_don_id: string;
  ma_don: string;
  tong_tien: number;
  nguon: NguonDon;
  trang_thai: TrangThaiGhiNhan;
  ma_gioi_thieu: string | null;
  nguoi_ban: NguoiTomTatQt | null;
  nguoi_chot: NguoiTomTatQt | null;
  hoa_hong: { so_tien: number; ty_le: number | null; trang_thai: TrangThaiHoaHong; ky: string } | null;
  created_at: string;
}

export interface DoiTacDongQt {
  id: string;
  ten: string;
  loai: "DOANH_NGHIEP" | "NGAN_HANG" | "TO_CHUC" | "NHA_CUNG_CAP_QUA";
  nguoi_lien_he: string | null;
  sdt: string | null;
  email: string | null;
  bat: boolean;
  so_qua: number;
  so_voucher: number;
  so_hop_dong: number;
  doanh_thu_qua: number;
  chi_phi_tai_tro: number;
}

export interface DoiTacChiTietQt extends DoiTacDongQt {
  ma_so_thue: string | null;
  dia_chi: string | null;
  ghi_chu: string | null;
  qua_tang: { id: string; ten: string; gia_tri: number | null; trang_thai: string; created_at: string }[];
  voucher: { id: string; ma: string; ten: string; trang_thai: string; het_han: string | null }[];
  hop_dong: { id: string; ten: string; loai: string; trang_thai: string; gia_tri_hop_dong: number | null; doanh_thu_qua: number; chi_phi_tai_tro: number }[];
}

export const NHAN_NGUON_DON_QT: Record<NguonDon, string> = { SALE: "Sale", CTV: "Cộng tác viên", KOC: "KOC", KOL: "KOL" };
export const NHAN_HANG_QT: Record<HangThanhVien, string> = { THAN_THIET: "Thân thiết", VIP: "VIP" };
