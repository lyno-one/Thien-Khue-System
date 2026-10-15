// Sale / CSKH (agent ban-hang): ca truc, nang luc, phan bo khach, khach duoc giao, tao don qua CRM, ho tro KOL/KOC.
// Dung kieu chung tu ./chung (Vai, ApiResponse...). Ten truong snake_case khop DB. Ngay gio tra ve dang ISO string.
import type { Vai } from "./chung";

export const DANH_SACH_NGUON_GIAO_KHACH = ["TU_DONG", "THU_CONG", "LEAD"] as const;
export type NguonGiaoKhach = (typeof DANH_SACH_NGUON_GIAO_KHACH)[number];

export const DANH_SACH_TRANG_THAI_GIAO_KHACH = ["DANG_PHU_TRACH", "DA_CHUYEN", "KET_THUC"] as const;
export type TrangThaiGiaoKhach = (typeof DANH_SACH_TRANG_THAI_GIAO_KHACH)[number];

export const DANH_SACH_LOAI_LEAD = ["MUA_HANG", "DANG_KY_HOC", "HOP_TAC", "KHAC"] as const;
export type LoaiLead = (typeof DANH_SACH_LOAI_LEAD)[number];

export const DANH_SACH_TRANG_THAI_LEAD = ["MOI", "DA_PHAN_BO", "DANG_XU_LY", "THANH_CONG", "THAT_BAI", "TRUNG"] as const;
export type TrangThaiLead = (typeof DANH_SACH_TRANG_THAI_LEAD)[number];

export const NHAN_TRANG_THAI_LEAD: Record<TrangThaiLead, string> = {
  MOI: "Mới",
  DA_PHAN_BO: "Đã phân bổ",
  DANG_XU_LY: "Đang xử lý",
  THANH_CONG: "Thành công",
  THAT_BAI: "Thất bại",
  TRUNG: "Trùng"
};

export const NHAN_LOAI_LEAD: Record<LoaiLead, string> = {
  MUA_HANG: "Mua hàng",
  DANG_KY_HOC: "Đăng ký học",
  HOP_TAC: "Hợp tác",
  KHAC: "Khác"
};

export const NHAN_NGUON_GIAO_KHACH: Record<NguonGiaoKhach, string> = {
  TU_DONG: "Tự động",
  THU_CONG: "Thủ công",
  LEAD: "Lead"
};

/** Vai lam ca truc */
export type VaiCaTruc = Extract<Vai, "SALE" | "CSKH">;

/** Kenh don CRM (khop KENH_DON cua CRM) */
export const DANH_SACH_KENH_DON = ["website", "facebook", "cua_hang", "khac"] as const;
export type KenhDon = (typeof DANH_SACH_KENH_DON)[number];
export const NHAN_KENH_DON: Record<KenhDon, string> = {
  website: "Website",
  facebook: "Facebook / Inbox",
  cua_hang: "Cửa hàng",
  khac: "Khác"
};

export type TrangThaiDonCrm = "moi" | "dang_giao" | "giao_thanh_cong" | "hoan" | "huy";
export const NHAN_TRANG_THAI_DON: Record<TrangThaiDonCrm, string> = {
  moi: "Mới",
  dang_giao: "Đang giao",
  giao_thanh_cong: "Giao thành công",
  hoan: "Hoàn",
  huy: "Huỷ"
};

// ------------------------------------------------------------------ ca truc

export interface CaTruc {
  id: string;
  ho_so_id: string;
  ho_ten: string;
  /** "YYYY-MM-DD" */
  ngay: string;
  /** "HH:mm" gio Viet Nam */
  tu_gio: string;
  den_gio: string;
  vai: VaiCaTruc;
  so_khach_toi_da: number | null;
  /** So khach da giao trong ca */
  so_khach_da_giao: number;
  ghi_chu: string | null;
  /** Ca dang dien ra luc goi API */
  dang_dien_ra: boolean;
}

export interface TaoCaTrucBody {
  ho_so_id: string;
  ngay: string;
  tu_gio: string;
  den_gio: string;
  vai: VaiCaTruc;
  so_khach_toi_da?: number | null;
  ghi_chu?: string | null;
}

export type SuaCaTrucBody = Partial<Omit<TaoCaTrucBody, "ho_so_id">>;

export interface CaTrucQuery {
  /** "YYYY-MM-DD" (mac dinh hom nay) */
  tu_ngay?: string;
  den_ngay?: string;
  ho_so_id?: string;
}

// ------------------------------------------------------------------ nhan su & nang luc

export interface NangLuc {
  id: string;
  ho_so_id: string;
  ma_mau: string | null;
  nhom: string | null;
  /** 1..5 */
  muc: number;
}

export interface LuuNangLucBody {
  ho_so_id: string;
  ma_mau?: string | null;
  nhom?: string | null;
  muc: number;
}

/** Nhan su Sale / CSKH (QUAN_LY xem de xep ca, giao lai) */
export interface NhanSuBanHang {
  ho_so_id: string;
  ho_ten: string;
  email: string | null;
  vai: VaiCaTruc[];
  /** So khach DANG_PHU_TRACH */
  tai_hien_tai: number;
  /** So ma SKU duoc quyen (HOAT_DONG) */
  so_ma_duoc_quyen: number;
  dang_trong_ca: boolean;
  nang_luc: NangLuc[];
}

// ------------------------------------------------------------------ lead & phan bo

export interface Lead {
  id: string;
  ten: string;
  sdt: string;
  sdt_chuan: string;
  email: string | null;
  loai: LoaiLead;
  nhu_cau: string | null;
  ma_mau_quan_tam: string | null;
  nguon: string | null;
  ma_gioi_thieu: string | null;
  trang_thai: TrangThaiLead;
  phan_bo_cho: string | null;
  phan_bo_cho_ten: string | null;
  phan_bo_luc: string | null;
  ghi_chu: string | null;
  created_at: string;
}

export interface LeadQuery {
  trang?: number;
  so_dong?: number;
  trang_thai?: TrangThaiLead;
  q?: string;
}

export interface DoiTrangThaiLeadBody {
  trang_thai: Extract<TrangThaiLead, "DANG_XU_LY" | "THANH_CONG" | "THAT_BAI" | "TRUNG">;
  ghi_chu?: string | null;
}

/** Ket qua phan bo mot lead / khach */
export interface KetQuaPhanBo {
  /** null = khong co ai phu hop (de cho phan bo thu cong) */
  ho_so_id: string | null;
  ho_ten: string | null;
  giao_khach_id: string | null;
  ly_do: string;
}

export interface KetQuaPhanBoLoat {
  da_phan_bo: number;
  chua_phan_bo: number;
  chi_tiet: (KetQuaPhanBo & { lead_id?: string; sdt_chuan?: string })[];
}

export interface PhanBoKhachBody {
  sdt: string;
  ten_khach?: string | null;
  /** Bo trong = tu dong (theo ca + nang luc + tai) */
  ho_so_id?: string | null;
  ly_do?: string | null;
}

export interface GiaoLaiKhachBody {
  /** Bo trong = tu dong */
  ho_so_id?: string | null;
  ly_do: string;
}

// ------------------------------------------------------------------ khach duoc giao

export interface KhachDuocGiao {
  giao_khach_id: string;
  sdt_chuan: string;
  ten_khach: string | null;
  ho_so_id: string;
  ho_ten_phu_trach: string | null;
  nguon: NguonGiaoKhach;
  trang_thai: TrangThaiGiaoKhach;
  giao_luc: string;
  ly_do: string | null;
  lead_id: string | null;
  lead_loai: LoaiLead | null;
  lead_nhu_cau: string | null;
  ma_mau_quan_tam: string | null;
}

export interface KhachDuocGiaoQuery {
  trang?: number;
  so_dong?: number;
  q?: string;
  /** QUAN_LY loc theo nguoi phu trach */
  ho_so_id?: string;
}

export interface DonCuaKhach {
  id: string;
  ma_don: string;
  kenh: string;
  loai_don: "BAN_HANG" | "DOI_TRA";
  trang_thai: TrangThaiDonCrm;
  tong_tien: number;
  giam_gia: number;
  created_at: string;
  /** Don hop le (tinh tich luy): BAN_HANG va khong huy / hoan */
  hop_le: boolean;
}

export interface ChiTietKhach {
  giao: KhachDuocGiao;
  /** Ho so khach tren CRM (null = khach moi, CRM chua co) */
  crm: { id: string; ten: string; sdt: string; dia_chi: string | null; ghi_chu: string | null; created_at: string } | null;
  tong_mua: { tong_tien: number; so_don: number; lan_mua_cuoi: string | null };
  don: DonCuaKhach[];
  /** Lich su cham soc tren CRM (null = khong doc duoc tu CRM luc nay) */
  lich_su_cham: LuotChamKhach[] | null;
}

export interface LuotChamKhach {
  id: string;
  noi_dung: string;
  nguoi_cham: string | null;
  created_at: string;
}

export interface PhanBoKhachCanChamBody {
  /** So khach toi da phan bo mot lan (mac dinh 50) */
  gioi_han?: number;
}

export interface GhiChamBody {
  noi_dung: string;
}

// ------------------------------------------------------------------ san pham & tao don

export interface MauDuocPhep {
  id: string;
  ma: string;
  ten: string;
  gia_ban: number | null;
  anh_url: string | null;
  trang_thai: "dang_ban" | "het_hang" | "ngung";
  cau_tu_van: string | null;
}

export interface TonKhoMau {
  size: string;
  mau_sac: string;
  so_luong: number;
}

export interface DongDonBody {
  mau_id: string;
  size?: string;
  mau_sac?: string;
  so_luong: number;
  /** Bo trong = gia_ban hien tai cua mau */
  don_gia?: number;
}

export interface TaoDonBody {
  kenh: KenhDon;
  khach_ten: string;
  khach_sdt: string;
  khach_dia_chi?: string | null;
  ghi_chu?: string | null;
  /** Ma gioi thieu CTV / KOC (bo trong = lay tu lead neu co) */
  ma_gioi_thieu?: string | null;
  dong: DongDonBody[];
}

export interface KetQuaTaoDon {
  crm_don_id: string;
  ma_don: string;
  tong_tien: number;
  ghi_nhan: {
    id: string | null;
    trang_thai: "HOP_LE" | "CHO_XAC_MINH" | null;
    ly_do: string | null;
  };
  /** Canh bao khong chan (vd ghi nhan loi sau khi CRM da tao don) */
  canh_bao: string | null;
}

// ------------------------------------------------------------------ hop viec & ho tro

export interface HopViecHomNay {
  ngay: string;
  ca_hom_nay: CaTruc[];
  ca_hien_tai: CaTruc | null;
  tong_dang_phu_trach: number;
  khach_moi_hom_nay: KhachDuocGiao[];
  lead_can_lien_he: Lead[];
  yeu_cau_ho_tro_mo: number;
  don_hom_nay: { so_don: number; tong_tien: number; cho_xac_minh: number };
}

export interface YeuCauHoTro {
  /** yeu_cau_ho_tro.id */
  id: string;
  nguoi_gui_id: string;
  nguoi_gui_ten: string;
  nguoi_ho_tro_id: string;
  nguoi_ho_tro_ten: string | null;
  ma_mau: string | null;
  noi_dung: string;
  lien_ket: string | null;
  da_xu_ly: boolean;
  tra_loi: string | null;
  created_at: string;
  xu_ly_luc: string | null;
}

export interface TaoYeuCauHoTroBody {
  noi_dung: string;
  ma_mau?: string | null;
  /** Link kich ban / video can gop y */
  lien_ket?: string | null;
}

export interface TraLoiHoTroBody {
  tra_loi: string;
}
