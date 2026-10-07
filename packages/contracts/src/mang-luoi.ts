// Mang luoi CTV/TTS/KOL/KOC (agent mang-luoi): ma gioi thieu, chien dich, noi dung KOC, ghi nhan don, hoa hong.
// Dung kieu chung tu ./chung (Vai, ApiResponse...). Ten truong snake_case khop DB.
// Ten kieu co hau to rieng (Ml) o cho de trung voi module khac (index.ts export * — trung ten se loi TS2308).
import type { TrangThaiVai, Vai } from "./chung";

// ------------------------------------------------------------------ ENUM (khop Prisma)

export type NguonDonMl = "SALE" | "CTV" | "KOC" | "KOL";
export type TrangThaiGhiNhanMl = "HOP_LE" | "CHO_XAC_MINH" | "BI_HUY" | "DA_DOI_SOAT";
export type TrangThaiHoaHongMl = "CHO_DOI_SOAT" | "DU_DIEU_KIEN" | "DA_TRA" | "BI_TRU";
export type TrangThaiChienDichMl = "NHAP" | "DANG_CHAY" | "TAM_DUNG" | "KET_THUC";
export type TrangThaiThamGiaMl = "CHO_DUYET" | "DA_DUYET" | "TU_CHOI" | "HOAN_THANH";
export type LoaiNoiDungKocMl = "KICH_BAN" | "VIDEO";
export type TrangThaiNoiDungMl = "NHAP" | "CHO_DUYET" | "CAN_SUA" | "DA_DUYET" | "TU_CHOI" | "DA_DANG";
export type TrangThaiBaiTapTts = "CHO_CHAM" | "DAT" | "CHUA_DAT";
export type NenTangNoiDungMl = "TIKTOK" | "FACEBOOK" | "INSTAGRAM" | "YOUTUBE" | "KHAC";

/** Vai mang luoi duoc lay ma gioi thieu / nhan chien dich */
export const VAI_MANG_LUOI: readonly Vai[] = ["CTV", "THUC_TAP", "KOL", "KOC"];

export const NHAN_NGUON_DON_ML: Record<NguonDonMl, string> = { SALE: "Sale chốt", CTV: "Cộng tác viên", KOC: "KOC", KOL: "KOL" };

export const NHAN_TRANG_THAI_GHI_NHAN: Record<TrangThaiGhiNhanMl, string> = {
  HOP_LE: "Hợp lệ",
  CHO_XAC_MINH: "Chờ xác minh",
  BI_HUY: "Bị huỷ",
  DA_DOI_SOAT: "Đã đối soát"
};

export const NHAN_TRANG_THAI_HOA_HONG: Record<TrangThaiHoaHongMl, string> = {
  CHO_DOI_SOAT: "Chờ đối soát",
  DU_DIEU_KIEN: "Đủ điều kiện",
  DA_TRA: "Đã chi trả",
  BI_TRU: "Bị trừ"
};

export const NHAN_TRANG_THAI_CHIEN_DICH: Record<TrangThaiChienDichMl, string> = {
  NHAP: "Nháp",
  DANG_CHAY: "Đang chạy",
  TAM_DUNG: "Tạm dừng",
  KET_THUC: "Kết thúc"
};

export const NHAN_TRANG_THAI_THAM_GIA: Record<TrangThaiThamGiaMl, string> = {
  CHO_DUYET: "Chờ duyệt",
  DA_DUYET: "Đã nhận",
  TU_CHOI: "Từ chối",
  HOAN_THANH: "Đã nghiệm thu"
};

export const NHAN_TRANG_THAI_NOI_DUNG: Record<TrangThaiNoiDungMl, string> = {
  NHAP: "Nháp",
  CHO_DUYET: "Chờ duyệt",
  CAN_SUA: "Cần sửa",
  DA_DUYET: "Đã duyệt",
  TU_CHOI: "Từ chối",
  DA_DANG: "Đã đăng"
};

export const NHAN_TRANG_THAI_BAI_TAP_TTS: Record<TrangThaiBaiTapTts, string> = {
  CHO_CHAM: "Chờ chấm",
  DAT: "Đạt",
  CHUA_DAT: "Chưa đạt"
};

// ------------------------------------------------------------------ MA GIOI THIEU & TAI LIEU

export interface MaGioiThieuCuaToi {
  id: string;
  ma: string;
  mau_id: string | null;
  ma_mau: string | null;
  ten_mau: string | null;
  anh_url: string | null;
  gia_ban: number | null;
  chien_dich_id: string | null;
  ten_chien_dich: string | null;
  bat: boolean;
  /** Quyen SKU con HOAT_DONG khong (mat quyen -> don qua ma khong tinh hoa hong cho SKU do) */
  con_quyen: boolean;
  so_click: number;
  so_don: number;
  doanh_so: number;
  created_at: string;
}

export interface TaoMaGioiThieuBody {
  /** uuid public.mau — hoac ma_mau */
  mau_id?: string;
  ma_mau?: string;
  chien_dich_id?: string;
}

export interface DoiTrangThaiMaBody {
  bat: boolean;
}

/** Tai lieu san pham cho SKU da duoc cap quyen */
export interface TaiLieuSanPhamMl {
  mau_id: string;
  ma_mau: string;
  ten: string;
  gia_ban: number | null;
  chat_lieu: string | null;
  form_dang: string | null;
  anh_url: string | null;
  anh_size_chart: string | null;
  cau_tu_van: string | null;
  trang_thai_ban: "dang_ban" | "het_hang" | "ngung";
  trang_thai_quyen: "HOAT_DONG" | "CAN_HOC_LAI" | "THU_HOI";
  phien_ban_tai_lieu: number;
  khoa_hoc: { id: string; ma: string; ten: string } | null;
}

/** Tra cuu cong khai mot ma (storefront ?mgt=) — khong lo thong tin ca nhan nguoi gioi thieu */
export interface MaGioiThieuCongKhai {
  ma: string;
  ma_mau: string | null;
  ten_mau: string | null;
  anh_url: string | null;
  gia_ban: number | null;
}

// ------------------------------------------------------------------ CHIEN DICH & NOI DUNG KOL/KOC

export interface ChienDichMl {
  id: string;
  ten: string;
  mo_ta: string | null;
  mau_ids: string[];
  ma_maus: string[];
  vai_ap_dung: Vai[];
  ngan_sach: number | null;
  bat_dau: string | null;
  han: string | null;
  trang_thai: TrangThaiChienDichMl;
  created_at: string;
}

export interface ChienDichChoToi extends ChienDichMl {
  /** Moi SKU cua chien dich deu da co quyen HOAT_DONG -> moi duoc nhan */
  du_quyen: boolean;
  ma_mau_thieu_quyen: string[];
  tham_gia: { id: string; trang_thai: TrangThaiThamGiaMl; ghi_chu: string | null; duyet_luc: string | null } | null;
}

export interface ChienDichQuanLy extends ChienDichMl {
  so_tham_gia: number;
  so_cho_duyet: number;
  so_noi_dung: number;
  tong_luot_xem: number;
}

export interface TaoChienDichBody {
  ten: string;
  mo_ta?: string;
  /** Ma SKU (vd ["AL01","AK01"]) */
  ma_maus: string[];
  vai_ap_dung?: Vai[];
  ngan_sach?: number;
  bat_dau?: string;
  han?: string;
  trang_thai?: TrangThaiChienDichMl;
}

export type CapNhatChienDichBody = Partial<TaoChienDichBody>;

export interface ThamGiaChienDichMl {
  id: string;
  chien_dich_id: string;
  ten_chien_dich: string;
  ho_so: { id: string; ho_ten: string };
  trang_thai: TrangThaiThamGiaMl;
  ghi_chu: string | null;
  duyet_luc: string | null;
  so_noi_dung: number;
  created_at: string;
}

export interface DuyetThamGiaBody {
  dong_y: boolean;
  ghi_chu?: string;
}

export interface NoiDungKocMl {
  id: string;
  ho_so: { id: string; ho_ten: string };
  chien_dich_id: string | null;
  ten_chien_dich: string | null;
  mau_id: string | null;
  ma_mau: string | null;
  loai: LoaiNoiDungKocMl;
  tieu_de: string;
  kich_ban: string | null;
  link_video: string | null;
  nen_tang: NenTangNoiDungMl | null;
  trang_thai: TrangThaiNoiDungMl;
  nhan_xet: string | null;
  duyet_luc: string | null;
  luot_xem: number;
  luot_tuong_tac: number;
  so_lieu_cap_nhat_luc: string | null;
  created_at: string;
  updated_at: string;
}

export interface NopNoiDungBody {
  chien_dich_id?: string;
  /** Gan ma san pham (SKU) — phai co quyen */
  ma_mau?: string;
  loai: LoaiNoiDungKocMl;
  tieu_de: string;
  kich_ban?: string;
  link_video?: string;
  nen_tang?: NenTangNoiDungMl;
  /** true = luu nhap (chua gui duyet) */
  luu_nhap?: boolean;
}

export type SuaNoiDungBody = Partial<Omit<NopNoiDungBody, "chien_dich_id">>;

export interface CapNhatSoLieuBody {
  luot_xem: number;
  luot_tuong_tac: number;
  /** Danh dau da dang (noi dung DA_DUYET) */
  da_dang?: boolean;
}

export interface DuyetNoiDungBody {
  ket_qua: "DA_DUYET" | "CAN_SUA" | "TU_CHOI";
  nhan_xet?: string;
}

// ------------------------------------------------------------------ THUC TAP SINH

export interface KhoaHocLoTrinhTts {
  id: string;
  ma: string;
  ten: string;
  loai: "NEN_TANG" | "NGHIEP_VU" | "SAN_PHAM";
  bat_buoc: boolean;
  can_thuc_hanh: boolean;
  yeu_cau_thuc_hanh: string | null;
  so_bai_hoc: number;
  so_bai_xong: number;
  /** Diem cao nhat bai kiem tra (0..100), null = chua lam */
  diem_kiem_tra: number | null;
  dat_kiem_tra: boolean;
  bai_tap: { tong: number; dat: number; cho_cham: number };
}

export interface BaiTapTts {
  id: string;
  khoa_hoc: { id: string; ten: string };
  ho_so: { id: string; ho_ten: string };
  tieu_de: string | null;
  mo_ta: string | null;
  link: string | null;
  trang_thai: TrangThaiBaiTapTts;
  diem: number | null;
  nhan_xet: string | null;
  nguoi_cham: { id: string; ho_ten: string } | null;
  cham_luc: string | null;
  nop_luc: string;
}

export interface NopBaiTapTtsBody {
  khoa_hoc_id: string;
  tieu_de: string;
  mo_ta?: string;
  link?: string;
}

export interface ChamBaiTapTtsBody {
  ket_qua: "DAT" | "CHUA_DAT";
  /** 0..100 */
  diem: number;
  nhan_xet: string;
}

/** Ket qua danh gia TTS — can cu de xuat chuyen vai */
export interface DanhGiaTts {
  ho_so: { id: string; ho_ten: string; email: string | null };
  vai: { vai: Vai; trang_thai: TrangThaiVai }[];
  bai_tap: { tong: number; dat: number; chua_dat: number; cho_cham: number; diem_tb: number | null };
  kiem_tra: { tong: number; dat: number; diem_tb: number | null };
  bai_hoc: { xong: number; tong: number };
  de_xuat_dang_mo: { id: string; sang_vai: Vai; trang_thai: string; created_at: string }[];
}

// ------------------------------------------------------------------ GHI NHAN DON & HOA HONG

export interface NguoiTomTatMl {
  id: string;
  ho_ten: string;
}

export interface GhiNhanDonMl {
  id: string;
  crm_don_id: string;
  ma_don: string;
  tong_tien: number;
  nguon: NguonDonMl;
  ma_gioi_thieu: string | null;
  trang_thai: TrangThaiGhiNhanMl;
  ly_do: string | null;
  nguoi_ban: NguoiTomTatMl | null;
  nguoi_gioi_thieu: NguoiTomTatMl | null;
  nguoi_chot: NguoiTomTatMl | null;
  nguoi_xac_minh: NguoiTomTatMl | null;
  xac_minh_luc: string | null;
  hoa_hong: { id: string; so_tien: number; ty_le: number | null; trang_thai: TrangThaiHoaHongMl; ky: string } | null;
  /** Vai tro cua nguoi dang xem tren don (trang ca nhan) */
  vai_tro_cua_toi?: "NGUOI_BAN" | "NGUOI_GIOI_THIEU" | "NGUOI_CHOT" | null;
  created_at: string;
}

export interface XacMinhDonBody {
  /** GIOI_THIEU = tinh cho nguoi co ma; NGUOI_CHOT = tinh cho Sale chot; KHONG_AI = don khong tinh cho ai */
  chon: "GIOI_THIEU" | "NGUOI_CHOT" | "KHONG_AI";
  ly_do: string;
}

export interface GhiNhanTheoMaDonBody {
  ma_don: string;
  /** Ma gioi thieu khach dua (neu co) */
  ma_gioi_thieu?: string;
}

export interface KetQuaDongBoMl {
  don_moi: number;
  cap_nhat: number;
  cho_xac_minh: number;
  bi_tru: number;
  du_dieu_kien: number;
  bo_qua: number;
  loi: number;
  /** false = CrmDocService chua co ham quet don co [MGT:] — chi cap nhat don da ghi nhan */
  quet_don_moi: boolean;
  bat_dau: string;
  ket_thuc: string;
}

export interface HoaHongDongMl {
  id: string;
  so_tien: number;
  ty_le: number | null;
  trang_thai: TrangThaiHoaHongMl;
  ky: string;
  tra_luc: string | null;
  don: { id: string; ma_don: string; tong_tien: number; nguon: NguonDonMl; ma_gioi_thieu: string | null; trang_thai_ghi_nhan: TrangThaiGhiNhanMl };
  created_at: string;
  updated_at: string;
}

export interface DieuChinhHoaHongMl {
  id: string;
  hoa_hong_id: string | null;
  ma_don: string | null;
  so_tien: number;
  ly_do: string;
  ky: string;
  de_xuat_duyet_id: string | null;
  nguoi_tao: NguoiTomTatMl | null;
  created_at: string;
}

export interface ViHoaHong {
  du_dieu_kien: { so_tien: number; so_dong: number };
  cho_doi_soat: { so_tien: number; so_dong: number };
  /** Don dang cho xac minh co lien quan toi toi (chua co hoa hong) */
  cho_xac_minh: { so_don: number; tong_tien: number };
  bi_tru: { so_tien: number; so_dong: number };
  da_tra: { so_tien: number; so_dong: number };
  /** Tong cac khoan dieu chinh (+/-) */
  dieu_chinh: { so_tien: number; so_dong: number };
  /** Tam tinh = du dieu kien + dieu chinh */
  tam_tinh: number;
  ty_le_ap_dung: { vai: Vai; ty_le: number; ma_mau: string | null }[];
}

export interface LichSuDuyetMl {
  id: string;
  loai: "XAC_MINH_DON" | "DIEU_CHINH_HOA_HONG" | "CHI_TRA_HOA_HONG" | "CHUYEN_VAI" | "KHAC";
  tieu_de: string;
  trang_thai: string;
  nguoi_quyet_dinh: NguoiTomTatMl | null;
  y_kien: string | null;
  luc: string;
}

export interface DeXuatDieuChinhBody {
  ho_so_id: string;
  /** Am = tru, duong = cong (dong) */
  so_tien: number;
  ly_do: string;
  /** "YYYY-MM" — mac dinh thang hien tai */
  ky?: string;
  hoa_hong_id?: string;
}

export interface HoaHongQuery {
  trang?: number;
  so_dong?: number;
  trang_thai?: TrangThaiHoaHongMl;
  ky?: string;
}

export interface GhiNhanQuery {
  trang?: number;
  so_dong?: number;
  trang_thai?: TrangThaiGhiNhanMl;
}
