// Khach hang & doi tac (agent khach-doi-tac): hang the, KH hanh phuc, qua / voucher, doi tac, hop dong.
// Dung kieu chung tu ./chung (Vai, ApiResponse...). Ten truong snake_case khop DB. Route: /api/khach-doi-tac/*

// ------------------------------------------------------------------ enum (khop Prisma)

export const DANH_SACH_HANG_THANH_VIEN = ["THAN_THIET", "VIP"] as const;
export type HangThanhVien = (typeof DANH_SACH_HANG_THANH_VIEN)[number];

export const DANH_SACH_TRANG_THAI_MOI_KH = ["DA_MOI", "THAM_GIA", "TU_CHOI", "DA_GUI_MAU", "DA_PHAN_HOI", "ROI_CHUONG_TRINH"] as const;
export type TrangThaiMoiKh = (typeof DANH_SACH_TRANG_THAI_MOI_KH)[number];

export const DANH_SACH_LOAI_DOI_TAC = ["DOANH_NGHIEP", "NGAN_HANG", "TO_CHUC", "NHA_CUNG_CAP_QUA"] as const;
export type LoaiDoiTac = (typeof DANH_SACH_LOAI_DOI_TAC)[number];

/** Dung chung cho qua tang + voucher: chi DA_DUYET moi hien thi cho khach */
export const DANH_SACH_TRANG_THAI_DUYET_QUA = ["CHO_THAM_DINH", "DA_DUYET", "TU_CHOI"] as const;
export type TrangThaiDuyetQua = (typeof DANH_SACH_TRANG_THAI_DUYET_QUA)[number];

export type LoaiGiam = "PHAN_TRAM" | "SO_TIEN";

export const DANH_SACH_TRANG_THAI_CAP_PHAT = ["DA_CAP", "DA_DUNG", "HET_HAN", "HUY"] as const;
export type TrangThaiCapPhat = (typeof DANH_SACH_TRANG_THAI_CAP_PHAT)[number];

export const DANH_SACH_LOAI_HOP_DONG = ["DAT_QUA", "DONG_THUONG_HIEU", "TAI_TRO", "KHAC"] as const;
export type LoaiHopDong = (typeof DANH_SACH_LOAI_HOP_DONG)[number];

export const DANH_SACH_TRANG_THAI_HOP_DONG = ["NHAP", "HIEU_LUC", "KET_THUC", "HUY"] as const;
export type TrangThaiHopDong = (typeof DANH_SACH_TRANG_THAI_HOP_DONG)[number];

/** So lan mua hop le toi thieu de duoc moi vao chuong trinh Khach hang hanh phuc */
export const SO_LAN_MUA_KH_HANH_PHUC = 10;

export const NHAN_HANG_THANH_VIEN: Record<HangThanhVien, string> = { THAN_THIET: "Thân thiết", VIP: "VIP" };
export const NHAN_TRANG_THAI_MOI_KH: Record<TrangThaiMoiKh, string> = {
  DA_MOI: "Đã mời",
  THAM_GIA: "Tham gia",
  TU_CHOI: "Từ chối",
  DA_GUI_MAU: "Đã gửi mẫu",
  DA_PHAN_HOI: "Đã phản hồi",
  ROI_CHUONG_TRINH: "Rời chương trình"
};
export const NHAN_LOAI_DOI_TAC: Record<LoaiDoiTac, string> = {
  DOANH_NGHIEP: "Doanh nghiệp",
  NGAN_HANG: "Ngân hàng",
  TO_CHUC: "Tổ chức",
  NHA_CUNG_CAP_QUA: "Nhà cung cấp quà"
};
export const NHAN_TRANG_THAI_DUYET_QUA: Record<TrangThaiDuyetQua, string> = {
  CHO_THAM_DINH: "Chờ thẩm định / duyệt",
  DA_DUYET: "Đã duyệt",
  TU_CHOI: "Từ chối"
};
export const NHAN_TRANG_THAI_CAP_PHAT: Record<TrangThaiCapPhat, string> = {
  DA_CAP: "Đã cấp",
  DA_DUNG: "Đã dùng",
  HET_HAN: "Hết hạn",
  HUY: "Huỷ"
};
export const NHAN_LOAI_HOP_DONG: Record<LoaiHopDong, string> = {
  DAT_QUA: "Đặt quà",
  DONG_THUONG_HIEU: "Đồng thương hiệu",
  TAI_TRO: "Tài trợ",
  KHAC: "Khác"
};
export const NHAN_TRANG_THAI_HOP_DONG: Record<TrangThaiHopDong, string> = {
  NHAP: "Nháp",
  HIEU_LUC: "Hiệu lực",
  KET_THUC: "Kết thúc",
  HUY: "Huỷ"
};

// ------------------------------------------------------------------ hang thanh vien

/** GET /khach-doi-tac/hang/cau-hinh */
export interface CauHinhHang {
  id: string;
  hang: HangThanhVien;
  ten: string;
  /** Tong mua hop le toi thieu (dong) */
  nguong_tich_luy: number;
  giam_gia_phan_tram: number;
  quyen_loi: string | null;
  thu_tu: number;
  bat: boolean;
}

/** PUT /khach-doi-tac/hang/cau-hinh/:hang (THIEN_KHUE) */
export interface CapNhatCauHinhHangBody {
  ten?: string;
  nguong_tich_luy?: number;
  giam_gia_phan_tram?: number;
  quyen_loi?: string | null;
  bat?: boolean;
}

/** Don CRM gan nhat cua khach + co tinh vao hang hay khong (BAN_HANG, khong huy / hoan) */
export interface DonTichLuy {
  ma_don: string;
  loai_don: "BAN_HANG" | "DOI_TRA";
  trang_thai: string;
  tong_tien: number;
  created_at: string;
  tinh_vao_hang: boolean;
}

/** Ket qua tinh hang — luon tinh lai tu don hop le CRM luc doc (hoan / huy tu rot) */
export interface KetQuaHang {
  sdt_chuan: string;
  tong_mua_hop_le: number;
  so_don_hop_le: number;
  lan_mua_cuoi: string | null;
  /** null = khach thuong */
  hang: HangThanhVien | null;
  ten_hang: string;
  giam_gia_phan_tram: number;
  quyen_loi: string | null;
  hang_tiep_theo: { hang: HangThanhVien; ten: string; nguong_tich_luy: number; con_thieu: number } | null;
  /** Du so lan mua de duoc moi vao Khach hang hanh phuc */
  du_dieu_kien_hanh_phuc: boolean;
}

/** GET /khach-doi-tac/toi/hang — chi theo SDT da xac minh (403 SDT_CHUA_XAC_MINH neu co SDT nhung chua xac minh) */
export interface HangCuaToi extends KetQuaHang {
  /** Ho so chua co SDT -> khong noi duoc voi khach CRM */
  co_sdt: boolean;
  cau_hinh: CauHinhHang[];
  don_gan_day: DonTichLuy[];
}

/** GET /khach-doi-tac/hang/tra-cuu?sdt= (QUAN_LY / CSKH / SALE duoc giao khach) */
export interface TraCuuHang extends KetQuaHang {
  ten_khach: string | null;
}

// ------------------------------------------------------------------ uu dai (qua / voucher / cap phat)

export interface QuaTang {
  id: string;
  doi_tac_id: string | null;
  ten_doi_tac?: string | null;
  ten: string;
  mo_ta: string | null;
  hinh_anh: string | null;
  gia_tri: number | null;
  so_luong: number | null;
  hang_ap_dung: HangThanhVien[];
  trang_thai: TrangThaiDuyetQua;
  nguoi_de_xuat_id: string | null;
  nguoi_tham_dinh_id: string | null;
  ket_qua_tham_dinh: string | null;
  nguoi_duyet_id: string | null;
  duyet_luc: string | null;
  ly_do_tu_choi: string | null;
  created_at: string;
}

export interface Voucher {
  id: string;
  ma: string;
  ten: string;
  doi_tac_id: string | null;
  ten_doi_tac?: string | null;
  loai_giam: LoaiGiam;
  gia_tri: number;
  don_toi_thieu: number | null;
  hang_ap_dung: HangThanhVien[];
  so_luong: number | null;
  da_cap: number;
  bat_dau: string | null;
  het_han: string | null;
  trang_thai: TrangThaiDuyetQua;
  /** Nguoi tao (maker) — chi nguoi nay sua / huy duoc khi chua duyet */
  nguoi_de_xuat_id?: string | null;
  nguoi_duyet_id: string | null;
  duyet_luc: string | null;
  created_at: string;
}

/** Ban khach nhin thay (chi DA_DUYET, bo truong noi bo) */
export interface QuaTangKhach {
  id: string;
  ten: string;
  mo_ta: string | null;
  hinh_anh: string | null;
  gia_tri: number | null;
  hang_ap_dung: HangThanhVien[];
  ten_doi_tac: string | null;
}
export interface VoucherKhach {
  id: string;
  ma: string;
  ten: string;
  loai_giam: LoaiGiam;
  gia_tri: number;
  don_toi_thieu: number | null;
  hang_ap_dung: HangThanhVien[];
  het_han: string | null;
  ten_doi_tac: string | null;
}

export interface CapPhatUuDai {
  id: string;
  sdt_chuan: string;
  voucher_id: string | null;
  qua_tang_id: string | null;
  ten_uu_dai: string | null;
  ma_voucher: string | null;
  ly_do: string | null;
  trang_thai: TrangThaiCapPhat;
  nguoi_cap_id: string | null;
  cap_luc: string;
  dung_luc: string | null;
  crm_don_id: string | null;
}

/** Uu dai da cap — ban cho chinh khach (khong co nguoi cap, ly do noi bo, don CRM) */
export interface CapPhatCuaToi {
  id: string;
  ten_uu_dai: string | null;
  ma_voucher: string | null;
  trang_thai: TrangThaiCapPhat;
  cap_luc: string;
  dung_luc: string | null;
}

/** GET /khach-doi-tac/toi/uu-dai (403 SDT_CHUA_XAC_MINH neu SDT chua xac minh) */
export interface UuDaiCuaToi {
  hang: HangThanhVien | null;
  voucher: VoucherKhach[];
  qua_tang: QuaTangKhach[];
  da_cap: CapPhatCuaToi[];
}

/** POST /khach-doi-tac/qua-tang (trang thai luon CHO_THAM_DINH) */
export interface TaoQuaTangBody {
  doi_tac_id?: string | null;
  ten: string;
  mo_ta?: string | null;
  hinh_anh?: string | null;
  gia_tri?: number | null;
  so_luong?: number | null;
  hang_ap_dung?: HangThanhVien[];
}
/** PATCH /khach-doi-tac/qua-tang/:id — chi nguoi de xuat, khi chua duoc tham dinh / duyet (hoac da bi tu choi -> gui lai) */
export interface CapNhatQuaTangBody {
  ten?: string;
  mo_ta?: string | null;
  hinh_anh?: string | null;
  gia_tri?: number | null;
  so_luong?: number | null;
  hang_ap_dung?: HangThanhVien[];
}
/** PATCH /khach-doi-tac/voucher/:id — chi nguoi tao, khi chua duoc duyet (hoac da bi tu choi -> gui lai); ma giu nguyen */
export interface CapNhatVoucherBody {
  ten?: string;
  loai_giam?: LoaiGiam;
  gia_tri?: number;
  don_toi_thieu?: number | null;
  hang_ap_dung?: HangThanhVien[];
  so_luong?: number | null;
  bat_dau?: string | null;
  het_han?: string | null;
}
/** POST /khach-doi-tac/qua-tang/:id/ngung | /voucher/:id/ngung (chi THIEN_KHUE) */
export interface NgungUuDaiBody {
  ly_do: string;
}
/** POST /khach-doi-tac/qua-tang/:id/tham-dinh (QUAN_LY, khac nguoi de xuat) */
export interface ThamDinhQuaBody {
  dat: boolean;
  ket_qua: string;
}
/** POST /khach-doi-tac/qua-tang/:id/duyet | /voucher/:id/duyet (THIEN_KHUE, khac nguoi tao) */
export interface DuyetUuDaiBody {
  duyet: boolean;
  ly_do?: string | null;
}
/** POST /khach-doi-tac/voucher */
export interface TaoVoucherBody {
  ma: string;
  ten: string;
  doi_tac_id?: string | null;
  loai_giam: LoaiGiam;
  gia_tri: number;
  don_toi_thieu?: number | null;
  hang_ap_dung?: HangThanhVien[];
  so_luong?: number | null;
  bat_dau?: string | null;
  het_han?: string | null;
}
/** POST /khach-doi-tac/cap-phat — cap cho mot khach (kiem hang hien tai) */
export interface CapPhatBody {
  sdt: string;
  voucher_id?: string | null;
  qua_tang_id?: string | null;
  ly_do?: string | null;
}
/** POST /khach-doi-tac/cap-phat/theo-hang — cap cho moi khach dang o hang (tinh lai tu CRM) */
export interface CapPhatTheoHangBody {
  hang: HangThanhVien;
  voucher_id?: string | null;
  qua_tang_id?: string | null;
  ly_do?: string | null;
}
export interface KetQuaCapPhatTheoHang {
  so_khach_du_hang: number;
  da_cap: number;
  bo_qua_da_co: number;
  bo_qua_het_so_luong: number;
}
/** PATCH /khach-doi-tac/cap-phat/:id */
export interface CapNhatCapPhatBody {
  trang_thai: "DA_DUNG" | "HUY" | "HET_HAN";
  crm_don_id?: string | null;
}

// ------------------------------------------------------------------ khach hang hanh phuc

export interface PhanHoiMauThu {
  id: string;
  moi_kh_hanh_phuc_id: string;
  mau_id: string | null;
  ma_mau: string | null;
  diem_size: number | null;
  diem_chat_lieu: number | null;
  diem_kieu_dang: number | null;
  noi_dung: string;
  hinh_anh: string[];
  /** Khach cho phep dung hinh cua phan hoi nay (mac dinh false) */
  cho_phep_dung_hinh: boolean;
  created_at: string;
}

/** GET /khach-doi-tac/hanh-phuc/phan-hoi (nhan vien) */
export interface PhanHoiMauThuNoiBo extends PhanHoiMauThu {
  sdt_chuan: string;
  ten_khach: string | null;
  /** Duoc dung hinh truyen thong = khach dong y o CA loi moi lan phan hoi nay */
  duoc_dung_hinh: boolean;
}

export interface MoiKhHanhPhuc {
  id: string;
  sdt_chuan: string;
  ten_khach: string | null;
  so_lan_mua_luc_moi: number;
  trang_thai: TrangThaiMoiKh;
  /** Dong y dung hinh — co RIENG, mac dinh false, tach khoi viec tham gia */
  dong_y_dung_hinh: boolean;
  dong_y_dung_hinh_luc: string | null;
  nguoi_moi_id: string | null;
  moi_luc: string;
  tra_loi_luc: string | null;
  ghi_chu: string | null;
  so_phan_hoi?: number;
}

/** Loi moi tra cho chinh khach — bo ghi chu noi bo, nguoi moi */
export type LoiMoiCuaToi = Omit<MoiKhHanhPhuc, "ghi_chu" | "nguoi_moi_id" | "so_phan_hoi">;

/** GET /khach-doi-tac/toi/hanh-phuc (403 SDT_CHUA_XAC_MINH neu SDT chua xac minh) */
export interface HanhPhucCuaToi {
  co_sdt: boolean;
  so_lan_mua_hop_le: number;
  du_dieu_kien: boolean;
  loi_moi: LoiMoiCuaToi | null;
  phan_hoi: PhanHoiMauThu[];
}
/** POST /khach-doi-tac/toi/hanh-phuc/tra-loi — tu nguyen */
export interface TraLoiMoiBody {
  tham_gia: boolean;
}
/** PATCH /khach-doi-tac/toi/hanh-phuc/dong-y-hinh */
export interface DongYHinhBody {
  dong_y: boolean;
}
/** POST /khach-doi-tac/toi/hanh-phuc/phan-hoi */
export interface GuiPhanHoiBody {
  ma_mau?: string | null;
  diem_size?: number | null;
  diem_chat_lieu?: number | null;
  diem_kieu_dang?: number | null;
  noi_dung: string;
  hinh_anh?: string[];
  cho_phep_dung_hinh?: boolean;
}

/** GET /khach-doi-tac/hanh-phuc/ung-vien (QUAN_LY / CSKH) — khach du 10 lan chua duoc moi */
export interface UngVienHanhPhuc {
  sdt_chuan: string;
  ten_khach: string | null;
  so_don: number;
  tong_tien: number;
  lan_mua_cuoi: string | null;
}
/** POST /khach-doi-tac/hanh-phuc/moi */
export interface MoiKhHanhPhucBody {
  sdt: string;
  ghi_chu?: string | null;
}
/** PATCH /khach-doi-tac/hanh-phuc/moi/:id */
export interface CapNhatMoiKhBody {
  trang_thai: "DA_GUI_MAU" | "ROI_CHUONG_TRINH";
  ghi_chu?: string | null;
}

// ------------------------------------------------------------------ doi tac chien luoc

export interface DoiTac {
  id: string;
  ten: string;
  loai: LoaiDoiTac;
  ma_so_thue: string | null;
  nguoi_lien_he: string | null;
  sdt: string | null;
  email: string | null;
  dia_chi: string | null;
  ho_so_id: string | null;
  bat: boolean;
  ghi_chu: string | null;
  created_at: string;
}
export interface TaoDoiTacBody {
  ten: string;
  loai: LoaiDoiTac;
  ma_so_thue?: string | null;
  nguoi_lien_he?: string | null;
  sdt?: string | null;
  email?: string | null;
  dia_chi?: string | null;
  ho_so_id?: string | null;
  ghi_chu?: string | null;
}
export type CapNhatDoiTacBody = Partial<TaoDoiTacBody> & { bat?: boolean };

/** Ket qua chien dich: chi so tong hop, KHONG chua danh sach khach ca nhan */
export interface KetQuaChienDich {
  luot_tiep_can?: number;
  don_hang?: number;
  doanh_thu?: number;
  [k: string]: number | undefined;
}

export interface HopDongDoiTac {
  id: string;
  doi_tac_id: string;
  so_hop_dong: string | null;
  ten: string;
  loai: LoaiHopDong;
  gia_tri_hop_dong: number | null;
  doanh_thu_qua: number;
  chi_phi_tai_tro: number;
  ket_qua_chien_dich: KetQuaChienDich | null;
  ket_qua_ghi_chu: string | null;
  bat_dau: string | null;
  ket_thuc: string | null;
  trang_thai: TrangThaiHopDong;
  nguoi_phu_trach_id: string | null;
  created_at: string;
}
export interface TaoHopDongBody {
  so_hop_dong?: string | null;
  ten: string;
  loai: LoaiHopDong;
  gia_tri_hop_dong?: number | null;
  doanh_thu_qua?: number;
  chi_phi_tai_tro?: number;
  ket_qua_chien_dich?: KetQuaChienDich | null;
  ket_qua_ghi_chu?: string | null;
  bat_dau?: string | null;
  ket_thuc?: string | null;
  trang_thai?: TrangThaiHopDong;
}
export type CapNhatHopDongBody = Partial<TaoHopDongBody>;

/** Bao cao tach 3 dong: doanh thu ban qua / chi phi tai tro / ket qua chien dich — chi so tong hop */
export interface BaoCaoDoiTac {
  doi_tac_id: string;
  ten: string;
  loai: LoaiDoiTac;
  so_hop_dong: number;
  doanh_thu_qua: number;
  chi_phi_tai_tro: number;
  ket_qua_chien_dich: KetQuaChienDich;
  so_qua_da_duyet: number;
  so_voucher_da_duyet: number;
  /** So luot uu dai da cap / da dung (dem, khong co SDT) */
  luot_cap: number;
  luot_dung: number;
}

/** GET /khach-doi-tac/doi-tac/cua-toi (vai DOI_TAC) — khong co du lieu khach ca nhan */
export interface DoiTacCuaToi {
  doi_tac: DoiTac;
  hop_dong: HopDongDoiTac[];
  qua_tang: QuaTang[];
  voucher: Voucher[];
  bao_cao: BaoCaoDoiTac;
}
