// Dao tao LMS (agent dao-tao BE, FE doc): khoa hoc, bai hoc, bai kiem tra (KHONG co dap an), luot lam, thuc hanh, quyen SKU, chung chi.
// Ten truong snake_case khop DB. Ngay gio la chuoi ISO (JSON). Moi route duoi /api/dao-tao/*; response boc { data, meta? }.
import type { PhanTrangQuery, TrangThaiVai, Vai } from "./chung";

// ================================================================== ENUM (khop Prisma)

export const DANH_SACH_LOAI_KHOA_HOC = ["NEN_TANG", "NGHIEP_VU", "SAN_PHAM"] as const;
export type LoaiKhoaHoc = (typeof DANH_SACH_LOAI_KHOA_HOC)[number];

export const NHAN_LOAI_KHOA_HOC: Record<LoaiKhoaHoc, string> = {
  NEN_TANG: "Kiến thức chung",
  NGHIEP_VU: "Nghiệp vụ theo vai",
  SAN_PHAM: "Sản phẩm"
};

export type LoaiNoiDungBaiHoc = "MARKDOWN" | "VIDEO";
export type TrangThaiThucHanh = "CHO_CHAM" | "DAT" | "CHUA_DAT";
export type TrangThaiQuyenSku = "HOAT_DONG" | "CAN_HOC_LAI" | "THU_HOI";

export const NHAN_TRANG_THAI_THUC_HANH: Record<TrangThaiThucHanh, string> = {
  CHO_CHAM: "Chờ chấm",
  DAT: "Đạt",
  CHUA_DAT: "Chưa đạt"
};

export const NHAN_TRANG_THAI_QUYEN_SKU: Record<TrangThaiQuyenSku, string> = {
  HOAT_DONG: "Đang được bán",
  CAN_HOC_LAI: "Cần học lại",
  THU_HOI: "Đã thu hồi"
};

/** Trang thai khoa hoc cua nguoi hoc */
export type TrangThaiHocKhoa = "CHUA_BAT_DAU" | "DANG_HOC" | "HOAN_THANH" | "CAN_HOC_LAI";

export const NHAN_TRANG_THAI_HOC_KHOA: Record<TrangThaiHocKhoa, string> = {
  CHUA_BAT_DAU: "Chưa bắt đầu",
  DANG_HOC: "Đang học",
  HOAN_THANH: "Hoàn thành",
  CAN_HOC_LAI: "Cần học lại"
};

/** Khi tang phien ban tai lieu khoa SKU: chi can xac nhan da doc thay doi, hay phai thi lai */
export type YeuCauHocLai = "XAC_NHAN" | "THI_LAI";

/** Hanh dong voi san pham can quyen SKU (QuyenSkuService) */
export type HanhDongSku = "TU_VAN" | "LAY_MA_GIOI_THIEU" | "NHAN_CHIEN_DICH" | "BAN";

/** Nguong dat mac dinh cua bai kiem tra (%) */
export const NGUONG_DAT_MAC_DINH = 90;

// ================================================================== NGUOI HOC

/** Tien do cua nguoi dang dang nhap tren mot khoa */
export interface TienDoKhoaHoc {
  so_bai: number;
  so_bai_xong: number;
  /** 0..100 theo so bai da hoc */
  phan_tram: number;
  /** Moi bai kiem tra bat buoc da dat (khoa SAN_PHAM: dat o phien ban tai lieu hien hanh) */
  kiem_tra_dat: boolean;
  /** Diem cao nhat (%) o bai kiem tra bat buoc; null = chua lam */
  diem_cao_nhat: number | null;
  /** Bai thuc hanh gan nhat; null = chua nop (hoac khoa khong can thuc hanh) */
  thuc_hanh: TrangThaiThucHanh | null;
  /** Hoc het bai + thi dat + thuc hanh duoc duyet (neu can) */
  hoan_thanh: boolean;
  trang_thai: TrangThaiHocKhoa;
}

export interface KhoaHocTomTat {
  id: string;
  ma: string;
  ten: string;
  mo_ta: string | null;
  loai: LoaiKhoaHoc;
  vai_ap_dung: Vai[];
  /** Khoa SAN_PHAM: uuid public.mau + ma mau (vd "AL01") */
  mau_id: string | null;
  ma_mau: string | null;
  phien_ban_tai_lieu: number;
  bat_buoc: boolean;
  can_thuc_hanh: boolean;
  mau_sac: string | null;
  thu_tu: number;
  so_bai: number;
  tong_phut: number;
  co_bai_kiem_tra: boolean;
  tien_do: TienDoKhoaHoc;
}

export interface NhomLoTrinh {
  loai: LoaiKhoaHoc;
  tieu_de: string;
  khoa_hoc: KhoaHocTomTat[];
}

/** Dieu kien kich hoat mot vai (DANG_HOC -> HOAT_DONG) */
export interface DieuKienVai {
  vai: Vai;
  trang_thai: TrangThaiVai;
  /** Khoa bat buoc (NEN_TANG + NGHIEP_VU cua vai) */
  khoa_bat_buoc: { id: string; ma: string; ten: string; loai: LoaiKhoaHoc; hoan_thanh: boolean }[];
  /** Du dieu kien kich hoat (vai DANG_HOC se tu chuyen HOAT_DONG) */
  du_dieu_kien: boolean;
}

export interface BaiTiepTheo {
  khoa_hoc_id: string;
  khoa_hoc_ten: string;
  bai_hoc_id: string;
  tieu_de: string;
}

/** GET /api/dao-tao/lo-trinh — lo trinh theo vai cua nguoi hoc */
export interface LoTrinhCuaToi {
  /** NEN_TANG, NGHIEP_VU, SAN_PHAM (nhom rong van tra ve) */
  nhom: NhomLoTrinh[];
  tong: {
    so_khoa: number;
    so_bai: number;
    so_bai_xong: number;
    phan_tram: number;
    so_khoa_da_bat_dau: number;
    so_chung_chi: number;
    so_quyen_sku: number;
  };
  vai: DieuKienVai[];
  bai_tiep_theo: BaiTiepTheo | null;
}

export interface BaiHocTomTat {
  id: string;
  ma: string;
  tieu_de: string;
  chuong: string | null;
  loai_noi_dung: LoaiNoiDungBaiHoc;
  tom_tat: string | null;
  thoi_luong_phut: number | null;
  thu_tu: number;
  da_xong: boolean;
  hoan_thanh_luc: string | null;
}

export interface ChuongKhoaHoc {
  /** Ten chuong; null = chua phan chuong */
  ten: string | null;
  bai_hoc: BaiHocTomTat[];
}

/** Ket qua tom tat cua nguoi hoc tren mot bai kiem tra (KHONG co dap an) */
export interface BaiKiemTraTomTat {
  id: string;
  ma: string;
  tieu_de: string;
  nguong_dat: number;
  bat_buoc: boolean;
  so_cau: number;
  thoi_gian_phut: number | null;
  so_lan_toi_da: number | null;
  so_lan_da_lam: number;
  diem_cao_nhat: number | null;
  /** Da dat (khoa SAN_PHAM: o phien ban tai lieu hien hanh) */
  da_dat: boolean;
  lan_cuoi: { diem: number; dat: boolean; nop_luc: string } | null;
}

export interface BaiThucHanh {
  id: string;
  khoa_hoc_id: string;
  ho_so_id: string;
  vai: Vai | null;
  tieu_de: string | null;
  mo_ta: string | null;
  link: string | null;
  tep_url: string | null;
  trang_thai: TrangThaiThucHanh;
  diem: number | null;
  nguoi_cham_id: string | null;
  nguoi_cham_ten: string | null;
  nhan_xet: string | null;
  cham_luc: string | null;
  nop_luc: string;
  /** NOP_TAY = hoc vien nop link / tep; LUYEN_AI = Sales Training gui ve khi du phien luyen dat */
  nguon: NguonThucHanh;
  /** Chi LUYEN_AI: cac phien luyen dat lam bang chung cho mentor duyet */
  bang_chung: BangChungLuyenAi | null;
}

export interface ChungChi {
  id: string;
  khoa_hoc_id: string;
  khoa_hoc_ten: string;
  khoa_hoc_loai: LoaiKhoaHoc;
  ma_chung_chi: string;
  phien_ban_tai_lieu: number;
  diem: number | null;
  cap_luc: string;
  het_han_luc: string | null;
  thu_hoi_luc: string | null;
}

/** Bang chung dat (luu trong quyen_sku.bang_chung) */
export interface BangChungQuyenSku {
  khoa_hoc_id: string;
  khoa_hoc_ma: string;
  phien_ban_tai_lieu: number;
  diem: number | null;
  luot_lam_id: string | null;
  thi_luc: string | null;
  bai_thuc_hanh_id: string | null;
  nguoi_cham_id: string | null;
  nhan_xet: string | null;
  duyet_luc: string | null;
  cap_luc: string;
  /** Lan xac nhan doc thay doi gan nhat (neu co) */
  xac_nhan_luc?: string | null;
  /** Dang cho hoc lai sau khi tang phien ban */
  can_hoc_lai?: { phien_ban_moi: number; yeu_cau: YeuCauHocLai; ly_do: string | null; luc: string } | null;
}

export interface QuyenSkuCuaToi {
  id: string;
  mau_id: string;
  ma_mau: string;
  trang_thai: TrangThaiQuyenSku;
  phien_ban_tai_lieu: number;
  /** Phien ban hien hanh cua khoa SKU (> phien_ban_tai_lieu khi CAN_HOC_LAI) */
  phien_ban_hien_hanh: number | null;
  khoa_hoc_id: string | null;
  khoa_hoc_ten: string | null;
  cap_luc: string;
  thu_hoi_luc: string | null;
  ly_do: string | null;
  /** XAC_NHAN = bam "Đã đọc thay đổi" la hoat dong lai; THI_LAI = phai thi lai dat */
  yeu_cau_hoc_lai: YeuCauHocLai | null;
  bang_chung: BangChungQuyenSku | null;
}

/** GET /api/dao-tao/khoa-hoc/:idHoacMa */
export interface KhoaHocChiTiet extends KhoaHocTomTat {
  yeu_cau_thuc_hanh: string | null;
  /** Khac null = bai thuc hanh di qua "Luyện tư vấn với AI" (Sales Training) cho SALE / CSKH */
  yeu_cau_luyen_ai: YeuCauLuyenAi | null;
  chuong: ChuongKhoaHoc[];
  bai_kiem_tra: BaiKiemTraTomTat[];
  /** Bai thuc hanh cua toi (moi nhat truoc) */
  thuc_hanh: BaiThucHanh[];
  chung_chi: ChungChi | null;
  /** Khoa SAN_PHAM: quyen SKU cua toi voi ma nay */
  quyen_sku: QuyenSkuCuaToi | null;
}

/** GET /api/dao-tao/bai-hoc/:id */
export interface BaiHocChiTiet extends BaiHocTomTat {
  khoa_hoc_id: string;
  khoa_hoc_ten: string;
  /** Markdown */
  noi_dung: string | null;
  video_url: string | null;
  bai_truoc_id: string | null;
  bai_sau_id: string | null;
}

/** POST /api/dao-tao/bai-hoc/:id/hoan-thanh (DELETE de bo danh dau) */
export interface KetQuaHoanThanhBai {
  bai_hoc_id: string;
  da_xong: boolean;
  tien_do: TienDoKhoaHoc;
  thay_doi: ThayDoiSauDanhGia;
}

/** Nhung gi he thong vua tu cap sau mot hanh dong (hoc xong bai / thi dat / thuc hanh duoc duyet) */
export interface ThayDoiSauDanhGia {
  /** Khoa vua hoan thanh (chung chi moi / cap lai) */
  chung_chi_moi: ChungChi | null;
  /** Quyen SKU vua cap / hoat dong lai */
  quyen_sku_moi: { mau_id: string; ma_mau: string } | null;
  /** Vai vua chuyen DANG_HOC -> HOAT_DONG */
  vai_kich_hoat: Vai[];
}

// ------------------------------------------------------------------ bai kiem tra

/** Cau hoi tra cho client — KHONG BAO GIO co dap_an / giai_thich */
export interface CauHoiDeThi {
  id: string;
  ma: string;
  noi_dung: string;
  lua_chon: string[];
  /** true = co the chon nhieu dap an */
  nhieu_dap_an: boolean;
  thu_tu: number;
}

/** POST /api/dao-tao/bai-kiem-tra/:id/bat-dau — mo (hoac lay lai) luot lam dang do */
export interface DeThi {
  luot_lam_id: string;
  bai_kiem_tra_id: string;
  khoa_hoc_id: string;
  ma: string;
  tieu_de: string;
  nguong_dat: number;
  thoi_gian_phut: number | null;
  /** Han nop (ISO) neu co thoi gian lam; null = khong gioi han */
  het_han_luc: string | null;
  bat_dau_luc: string;
  so_lan_toi_da: number | null;
  so_lan_da_lam: number;
  cau_hoi: CauHoiDeThi[];
}

/** POST /api/dao-tao/bai-kiem-tra/:id/nop — body. Bat buoc tra loi het cau trong de */
export interface NopBaiKiemTraBody {
  luot_lam_id: string;
  /** { [cau_hoi_id]: chi so lua chon (0-based) } */
  tra_loi: Record<string, number[]>;
}

/** Chi tra khi DAT — truot thi khong lo cau dung / sai */
export interface GiaiThichCauHoi {
  cau_hoi_id: string;
  noi_dung: string;
  lua_chon: string[];
  dap_an: number[];
  ban_chon: number[];
  dung: boolean;
  giai_thich: string | null;
}

export interface KetQuaNopBai {
  luot_lam_id: string;
  bai_kiem_tra_id: string;
  /** Phan tram 0..100 (lam tron xuong) */
  diem: number;
  so_cau_dung: number;
  tong_cau: number;
  nguong_dat: number;
  dat: boolean;
  nop_luc: string;
  /** Ly do truot dac biet (vd qua gio) */
  ghi_chu: string | null;
  /** null khi truot */
  giai_thich: GiaiThichCauHoi[] | null;
  so_lan_con_lai: number | null;
  thay_doi: ThayDoiSauDanhGia;
}

/** GET /api/dao-tao/bai-kiem-tra/:id/lich-su — luot da nop cua toi (khong co dap an) */
export interface LuotLamTomTat {
  id: string;
  diem: number;
  so_cau_dung: number;
  tong_cau: number;
  dat: boolean;
  phien_ban_tai_lieu: number;
  bat_dau_luc: string;
  nop_luc: string | null;
}

// ------------------------------------------------------------------ thuc hanh

/** POST /api/dao-tao/khoa-hoc/:id/thuc-hanh — can link hoac tep_url */
export interface NopThucHanhBody {
  tieu_de?: string;
  mo_ta?: string;
  link?: string;
  tep_url?: string;
  /** Vai nop bai (mac dinh: vai dang hoc dau tien khop khoa) */
  vai?: Vai;
}

/** POST /api/dao-tao/thuc-hanh/:id/cham (MENTOR / QUAN_LY / THIEN_KHUE; khong tu cham bai minh) */
export interface ChamThucHanhBody {
  ket_qua: "DAT" | "CHUA_DAT";
  /** 0..100 */
  diem?: number;
  /** Bat buoc khi CHUA_DAT */
  nhan_xet?: string;
}

/** Hang trong hang doi cham (GET /api/dao-tao/thuc-hanh) */
export interface BaiThucHanhChoCham extends BaiThucHanh {
  hoc_vien_ten: string;
  hoc_vien_email: string | null;
  khoa_hoc_ten: string;
  khoa_hoc_ma: string;
  yeu_cau_thuc_hanh: string | null;
}

export interface LocThucHanhQuery extends PhanTrangQuery {
  /** Mac dinh CHO_CHAM */
  trang_thai?: TrangThaiThucHanh;
  khoa_hoc_id?: string;
}

export interface KetQuaChamThucHanh {
  bai_thuc_hanh: BaiThucHanh;
  /** Thay doi cua hoc vien (quyen SKU / vai kich hoat) */
  thay_doi: ThayDoiSauDanhGia;
}

// ------------------------------------------------------------------ quyen SKU

/** GET /api/dao-tao/quyen-sku/kiem?mau_id= | ?ma_mau= */
export interface KetQuaKiemQuyenSku {
  duoc: boolean;
  ly_do: string | null;
  mau_id: string | null;
  ma_mau: string | null;
  trang_thai: TrangThaiQuyenSku | null;
}

/** POST /api/dao-tao/quyen-sku/:mauId/xac-nhan — chi khi yeu_cau_hoc_lai = XAC_NHAN */
export interface KetQuaXacNhanSku {
  quyen_sku: QuyenSkuCuaToi;
}

// ------------------------------------------------------------------ tien do doi (MENTOR / QUAN_LY)

export type TrangThaiHocVien = "HOAN_THANH" | "DANG_HOC" | "CHUA_BAT_DAU" | "CAN_HO_TRO";

export const NHAN_TRANG_THAI_HOC_VIEN: Record<TrangThaiHocVien, string> = {
  HOAN_THANH: "Hoàn thành",
  DANG_HOC: "Đang học",
  CHUA_BAT_DAU: "Chưa bắt đầu",
  CAN_HO_TRO: "Cần hỗ trợ"
};

export interface HangTienDoDoi {
  ho_so_id: string;
  ho_ten: string;
  email: string | null;
  vai: { vai: Vai; trang_thai: TrangThaiVai }[];
  /** Ten cac khoa NGHIEP_VU (lo trinh), vd "Sale / CSKH chuẩn LYNO" */
  lo_trinh: string[];
  so_bai: number;
  so_bai_xong: number;
  phan_tram: number;
  /** vd "2/3 bài đạt" hoac "Chưa làm" */
  kiem_tra: string;
  so_lan_truot: number;
  thuc_hanh_cho_cham: number;
  so_quyen_sku: number;
  trang_thai: TrangThaiHocVien;
  hoat_dong_cuoi: string | null;
}

/** GET /api/dao-tao/tien-do-doi?vai=SALE&tu_khoa=&trang_thai= */
export interface LocTienDoDoiQuery extends PhanTrangQuery {
  vai?: Vai;
  trang_thai?: TrangThaiHocVien;
  tu_khoa?: string;
}

/** meta cua /tien-do-doi = PhanTrangMeta & { tong_hop } */
export interface TongHopTienDoDoi {
  hoc_vien: number;
  tien_do_trung_binh: number;
  hoan_thanh: number;
  can_ho_tro: number;
}

// ================================================================== QUAN TRI NOI DUNG (QUAN_LY / ADMIN / THIEN_KHUE)
// Route /api/dao-tao/quan-tri/*. Xoa khoa / bai / de = tat (bat=false), khong xoa cung (giu bang chung). Xoa cau hoi = xoa that.

export interface KhoaHocQuanTri {
  id: string;
  ma: string;
  ten: string;
  mo_ta: string | null;
  loai: LoaiKhoaHoc;
  vai_ap_dung: Vai[];
  mau_id: string | null;
  ma_mau: string | null;
  phien_ban_tai_lieu: number;
  bat_buoc: boolean;
  can_thuc_hanh: boolean;
  yeu_cau_thuc_hanh: string | null;
  mau_sac: string | null;
  thu_tu: number;
  bat: boolean;
  so_bai: number;
  so_bai_kiem_tra: number;
  so_hoc_vien: number;
  created_at: string;
  updated_at: string;
}

export interface BaiHocQuanTri {
  id: string;
  khoa_hoc_id: string;
  ma: string;
  tieu_de: string;
  chuong: string | null;
  loai_noi_dung: LoaiNoiDungBaiHoc;
  noi_dung: string | null;
  video_url: string | null;
  tom_tat: string | null;
  thoi_luong_phut: number | null;
  thu_tu: number;
  bat: boolean;
}

/** Cau hoi phia quan tri — CO dap_an */
export interface CauHoiQuanTri {
  id: string;
  bai_kiem_tra_id: string;
  ma: string;
  noi_dung: string;
  lua_chon: string[];
  dap_an: number[];
  giai_thich: string | null;
  diem: number;
  thu_tu: number;
}

export interface BaiKiemTraQuanTri {
  id: string;
  khoa_hoc_id: string;
  ma: string;
  tieu_de: string;
  nguong_dat: number;
  bat_buoc: boolean;
  so_cau_hien: number | null;
  thoi_gian_phut: number | null;
  so_lan_toi_da: number | null;
  bat: boolean;
  so_cau: number;
  cau_hoi?: CauHoiQuanTri[];
}

/** GET /api/dao-tao/quan-tri/khoa-hoc/:id */
export interface KhoaHocQuanTriChiTiet extends KhoaHocQuanTri {
  bai_hoc: BaiHocQuanTri[];
  bai_kiem_tra: BaiKiemTraQuanTri[];
}

export interface LocKhoaHocQuanTriQuery extends PhanTrangQuery {
  loai?: LoaiKhoaHoc;
  tu_khoa?: string;
  /** "true" | "false"; bo trong = ca hai */
  bat?: boolean;
}

/** POST /quan-tri/khoa-hoc. Khoa SAN_PHAM can mau_id hoac ma_mau (doc tu CRM) */
export interface TaoKhoaHocBody {
  ma: string;
  ten: string;
  mo_ta?: string;
  loai: LoaiKhoaHoc;
  vai_ap_dung: Vai[];
  mau_id?: string;
  ma_mau?: string;
  bat_buoc?: boolean;
  can_thuc_hanh?: boolean;
  yeu_cau_thuc_hanh?: string;
  mau_sac?: string;
  thu_tu?: number;
  bat?: boolean;
}

/** PATCH /quan-tri/khoa-hoc/:id (khong doi loai / mau; doi phien ban dung /tang-phien-ban) */
export type SuaKhoaHocBody = Partial<Omit<TaoKhoaHocBody, "loai" | "mau_id" | "ma_mau">>;

/** POST /quan-tri/khoa-hoc/:id/tang-phien-ban — chi khoa SAN_PHAM */
export interface TangPhienBanBody {
  ly_do: string;
  /** Mac dinh XAC_NHAN */
  yeu_cau?: YeuCauHocLai;
}

export interface KetQuaTangPhienBan {
  khoa_hoc_id: string;
  phien_ban_tai_lieu: number;
  /** So quyen SKU vua chuyen CAN_HOC_LAI */
  so_quyen_can_hoc_lai: number;
}

export interface TaoBaiHocBody {
  ma: string;
  tieu_de: string;
  chuong?: string;
  loai_noi_dung?: LoaiNoiDungBaiHoc;
  noi_dung?: string;
  video_url?: string;
  tom_tat?: string;
  thoi_luong_phut?: number;
  thu_tu?: number;
  bat?: boolean;
}
export type SuaBaiHocBody = Partial<TaoBaiHocBody>;

export interface TaoBaiKiemTraBody {
  ma: string;
  tieu_de: string;
  /** 0..100, mac dinh 90 */
  nguong_dat?: number;
  bat_buoc?: boolean;
  so_cau_hien?: number | null;
  thoi_gian_phut?: number | null;
  so_lan_toi_da?: number | null;
  bat?: boolean;
}
export type SuaBaiKiemTraBody = Partial<TaoBaiKiemTraBody>;

export interface TaoCauHoiBody {
  ma: string;
  noi_dung: string;
  /** >= 2 lua chon */
  lua_chon: string[];
  /** chi so 0-based, >= 1 dap an */
  dap_an: number[];
  giai_thich?: string;
  diem?: number;
  thu_tu?: number;
}
export type SuaCauHoiBody = Partial<TaoCauHoiBody>;

// ================================================================== LUYEN TU VAN VOI AI (Sales Training)
// Hop dong: docs/TICH-HOP-SALES-TRAINING.md. Chi diem + tom tat, KHONG co transcript hoi thoai.

export const DANH_SACH_LOAI_LUYEN_AI = ["TU_VAN", "DOI_TRA"] as const;
export type LoaiLuyenAi = (typeof DANH_SACH_LOAI_LUYEN_AI)[number];
export const NHAN_LOAI_LUYEN_AI: Record<LoaiLuyenAi, string> = {
  TU_VAN: "Tư vấn bán hàng",
  DOI_TRA: "Tình huống đổi trả"
};

export type NguonThucHanh = "NOP_TAY" | "LUYEN_AI";
export const NHAN_NGUON_THUC_HANH: Record<NguonThucHanh, string> = {
  NOP_TAY: "Nộp tay",
  LUYEN_AI: "Luyện tư vấn với AI"
};

/** Phien dat khi diem_tong >= nguong (khong duoi muc nay) VA 0 loi cam ket sai chinh sach */
export const NGUONG_LUYEN_AI_TOI_THIEU = 80;

export const DANH_SACH_KY_NANG_LUYEN_AI = ["khai_thac", "lang_nghe", "gia_tri", "phan_doi", "chot", "tuan_thu"] as const;
export type KyNangLuyenAi = (typeof DANH_SACH_KY_NANG_LUYEN_AI)[number];
export const NHAN_KY_NANG_LUYEN_AI: Record<KyNangLuyenAi, string> = {
  khai_thac: "Khai thác nhu cầu",
  lang_nghe: "Lắng nghe",
  gia_tri: "Trình bày giá trị",
  phan_doi: "Xử lý phản đối",
  chot: "Chốt đơn",
  tuan_thu: "Tuân thủ chính sách"
};
/** Diem 0..100 tung ky nang */
export type DiemKyNangLuyenAi = Record<KyNangLuyenAi, number>;

/** Loi cam ket sai chinh sach (vd hua doi tra sai luat) */
export interface ViPhamLuyenAi {
  loai: string;
  trich: string;
}

/** khoa_hoc.yeu_cau_luyen_ai */
export interface YeuCauLuyenAi {
  nguong: number;
  /** So phien dat can co cua tung loai */
  can: Record<LoaiLuyenAi, number>;
}

/** POST /api/dao-tao/luyen-ai/phieu (Bearer nguoi hoc) */
export interface TaoPhieuLuyenAiBody {
  khoa_hoc_id: string;
  loai: LoaiLuyenAi;
}
export interface PhieuLuyenAi {
  ma_phieu: string;
  /** Web mo tab moi bang FORM POST tu gui toi day (truong ma_phieu, access_token, refresh_token) */
  url_vao: string;
  het_han: string;
}

/** GET /api/dao-tao/luyen-ai/phieu/:ma (HMAC, Sales Training goi) — phieu dung mot lan */
export interface NguCanhPhieuLuyenAi {
  ho_so_id: string;
  crm_user_id: string;
  loai: LoaiLuyenAi;
  khoa_hoc_ma: string;
  ten_khoa: string;
  /** SKU da / dang hoc (rong -> SKU cac khoa san pham dang bat) de chon san pham cho TU_VAN */
  ma_mau: string[];
}

/** Vai nguoi xem mot phien Sales Training mo tu Thien Khue (phieu XEM) */
export const DANH_SACH_VAI_XEM_LUYEN_AI = ["CHU", "MENTOR", "QUAN_LY"] as const;
export type VaiXemLuyenAi = (typeof DANH_SACH_VAI_XEM_LUYEN_AI)[number];

/** POST /api/dao-tao/luyen-ai/phien/:id/phieu-xem (Bearer chu phien / MENTOR / QUAN_LY) — :id = phien_luyen_ai.id cua TK */
export interface PhieuXemLuyenAi {
  ma_phieu: string;
  /** Web mo tab moi bang FORM POST tu gui toi day (truong ma_phieu, access_token) — "<ST>/api/vao-tu-thien-khue/xem" */
  url_vao: string;
  het_han: string;
}

/** GET /api/dao-tao/luyen-ai/phieu-xem/:ma (HMAC, Sales Training goi) — phieu XEM dung mot lan, han 2 phut */
export interface NguCanhPhieuXemLuyenAi {
  /** Nguoi XEM (nguoi bam nut o TK) — ST phai kiem trung voi nguoi vua dang nhap bang access_token */
  crm_user_id: string;
  ho_so_id: string;
  ho_ten: string;
  vai_xem: VaiXemLuyenAi;
  /** Phien duoc phep xem — ST chi redirect toi /luyen-tap/<phien_id_st> */
  phien_id_st: string;
  loai: LoaiLuyenAi;
  khoa_hoc_ma: string;
  /** Chu phien (nguoi hoc) — ST kiem phien_id_st thuoc dung nguoi nay */
  chu_phien: { crm_user_id: string; ho_so_id: string; ho_ten: string };
}

/** POST /api/dao-tao/luyen-ai/ket-qua (HMAC, Sales Training goi) — idempotent theo phien_id */
export interface KetQuaLuyenAiBody {
  ma_phieu: string;
  phien_id: string;
  crm_user_id: string;
  loai: LoaiLuyenAi;
  diem_tong: number;
  diem_ky_nang: DiemKyNangLuyenAi;
  so_vi_pham: number;
  vi_pham: ViPhamLuyenAi[];
  tom_tat: string;
  diem_manh: string[];
  can_cai_thien: string[];
  /** TK chi giu khi dung "<SALES_TRAINING_URL>/luyen-tap/<phien_id>"; khac -> tu dung lai tu phien_id (uuid) hoac bo */
  link_xem: string;
  ket_thuc_luc: string;
}
export interface PhanHoiKetQuaLuyenAi {
  dat: boolean;
  tien_do: Record<LoaiLuyenAi, boolean>;
  /** Co khi du dieu kien -> bai thuc hanh LUYEN_AI dang CHO_CHAM (hoac da co) */
  bai_thuc_hanh_id?: string;
}

/** Mot phien luyen da nhan (khong co transcript) */
export interface PhienLuyenAi {
  id: string;
  phien_id_st: string;
  loai: LoaiLuyenAi;
  diem_tong: number;
  diem_ky_nang: DiemKyNangLuyenAi;
  so_vi_pham: number;
  vi_pham: ViPhamLuyenAi[];
  tom_tat: string | null;
  diem_manh: string[];
  can_cai_thien: string[];
  dat: boolean;
  link_xem: string | null;
  ket_thuc_luc: string | null;
  nhan_luc: string;
}

/** bai_thuc_hanh.bang_chung khi nguon = LUYEN_AI */
export interface BangChungLuyenAi {
  loai: "LUYEN_AI";
  nguong: number;
  /** Phien dat duoc tinh (moi loai: phien diem cao nhat truoc) */
  phien: PhienLuyenAi[];
  cap_nhat_luc: string;
}

export interface TienDoLoaiLuyenAi {
  loai: LoaiLuyenAi;
  ten: string;
  can: number;
  so_dat: number;
  dat: boolean;
  so_phien: number;
  diem_cao_nhat: number | null;
}

/** GET /api/dao-tao/khoa-hoc/:idHoacMa/luyen-ai (Bearer nguoi hoc) */
export interface TienDoLuyenAi {
  khoa_hoc_id: string;
  /** null = khoa khong yeu cau luyen AI */
  yeu_cau: YeuCauLuyenAi | null;
  /** Buoc nay ap dung cho toi: khoa co yeu cau VA toi co vai SALE / CSKH (DANG_HOC hoac HOAT_DONG) — khi do khong nop tay */
  ap_dung: boolean;
  /** ap_dung va tich hop Sales Training dang bat */
  duoc_luyen: boolean;
  ly_do_khong_duoc: string | null;
  loai: TienDoLoaiLuyenAi[];
  /** Du phien dat moi loai (tinh tu sau lan mentor tra ve gan nhat) */
  du_dieu_kien: boolean;
  /** Bai thuc hanh LUYEN_AI moi nhat */
  bai_thuc_hanh: { id: string; trang_thai: TrangThaiThucHanh; nhan_xet: string | null; cham_luc: string | null } | null;
  /** Mentor tra ve (CHUA_DAT) luc nay -> chi phien nhan sau moc nay moi duoc tinh */
  tinh_tu: string | null;
  /** Phien cua toi, moi nhat truoc */
  phien: PhienLuyenAi[];
}

/*
 * BANG ROUTE (/api/dao-tao/...)
 * Nguoi hoc (dang nhap):
 *   GET    lo-trinh                          -> LoTrinhCuaToi
 *   GET    khoa-hoc?loai=                    -> KhoaHocTomTat[] (moi khoa dang bat)
 *   GET    khoa-hoc/:idHoacMa                -> KhoaHocChiTiet
 *   GET    bai-hoc/:id                       -> BaiHocChiTiet
 *   POST   bai-hoc/:id/hoan-thanh            -> KetQuaHoanThanhBai
 *   DELETE bai-hoc/:id/hoan-thanh            -> KetQuaHoanThanhBai
 *   POST   bai-kiem-tra/:id/bat-dau          -> DeThi
 *   POST   bai-kiem-tra/:id/nop              -> KetQuaNopBai   (body NopBaiKiemTraBody)
 *   GET    bai-kiem-tra/:id/lich-su          -> LuotLamTomTat[]
 *   POST   khoa-hoc/:id/thuc-hanh            -> BaiThucHanh    (body NopThucHanhBody)
 *   GET    thuc-hanh/cua-toi                 -> BaiThucHanh[]
 *   GET    chung-chi/cua-toi                 -> ChungChi[]
 *   GET    quyen-sku/cua-toi                 -> QuyenSkuCuaToi[]
 *   GET    quyen-sku/kiem?mau_id=|ma_mau=    -> KetQuaKiemQuyenSku
 *   POST   quyen-sku/:mauId/xac-nhan         -> KetQuaXacNhanSku
 * Mentor / quan ly (MENTOR, QUAN_LY; ADMIN/THIEN_KHUE luon qua):
 *   GET    thuc-hanh?trang_thai=&khoa_hoc_id=&trang=&so_dong=  -> BaiThucHanhChoCham[] + meta phan trang
 *   POST   thuc-hanh/:id/cham                -> KetQuaChamThucHanh (body ChamThucHanhBody)
 *   GET    tien-do-doi?vai=&trang_thai=&tu_khoa=&trang=&so_dong= -> HangTienDoDoi[] + meta { ...PhanTrangMeta, tong_hop }
 * Luyen tu van voi AI (Sales Training — docs/TICH-HOP-SALES-TRAINING.md):
 *   POST   luyen-ai/phieu                    -> PhieuLuyenAi (Bearer SALE / CSKH, body TaoPhieuLuyenAiBody)
 *   GET    khoa-hoc/:idHoacMa/luyen-ai       -> TienDoLuyenAi (Bearer)
 *   GET    luyen-ai/phieu/:ma                -> NguCanhPhieuLuyenAi (HMAC — chi Sales Training; het han / da dung -> 410)
 *   POST   luyen-ai/ket-qua                  -> PhanHoiKetQuaLuyenAi (HMAC — chi Sales Training; body KetQuaLuyenAiBody)
 *   POST   luyen-ai/phien/:id/phieu-xem      -> PhieuXemLuyenAi (Bearer chu phien / MENTOR / QUAN_LY; han 2 phut)
 *   GET    luyen-ai/phieu-xem/:ma            -> NguCanhPhieuXemLuyenAi (HMAC — chi Sales Training; dung mot lan; het han / da dung -> 410)
 * Quan tri noi dung (QUAN_LY, ADMIN, THIEN_KHUE):
 *   GET    quan-tri/khoa-hoc                 -> KhoaHocQuanTri[] + meta
 *   POST   quan-tri/khoa-hoc                 -> KhoaHocQuanTri
 *   GET    quan-tri/khoa-hoc/:id             -> KhoaHocQuanTriChiTiet (co cau hoi + dap an)
 *   PATCH  quan-tri/khoa-hoc/:id             -> KhoaHocQuanTri
 *   DELETE quan-tri/khoa-hoc/:id             -> KhoaHocQuanTri (bat=false)
 *   POST   quan-tri/khoa-hoc/:id/tang-phien-ban -> KetQuaTangPhienBan
 *   POST   quan-tri/khoa-hoc/:id/bai-hoc     -> BaiHocQuanTri
 *   PATCH  quan-tri/bai-hoc/:id              -> BaiHocQuanTri
 *   DELETE quan-tri/bai-hoc/:id              -> BaiHocQuanTri (bat=false)
 *   POST   quan-tri/khoa-hoc/:id/bai-kiem-tra -> BaiKiemTraQuanTri
 *   GET    quan-tri/bai-kiem-tra/:id         -> BaiKiemTraQuanTri (co cau_hoi)
 *   PATCH  quan-tri/bai-kiem-tra/:id         -> BaiKiemTraQuanTri
 *   DELETE quan-tri/bai-kiem-tra/:id         -> BaiKiemTraQuanTri (bat=false)
 *   POST   quan-tri/bai-kiem-tra/:id/cau-hoi -> CauHoiQuanTri
 *   PATCH  quan-tri/cau-hoi/:id              -> CauHoiQuanTri
 *   DELETE quan-tri/cau-hoi/:id              -> { id }
 */
