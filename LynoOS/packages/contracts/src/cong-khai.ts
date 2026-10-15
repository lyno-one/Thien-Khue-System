// Trang cong khai (agent cong-khai): san pham hien thi, form dang ky / lead.
// Dung kieu chung tu ./chung (Vai, ApiResponse...). Ten truong snake_case khop DB.

// ------------------------------------------------------------------ san pham (doc public.mau qua BE)

/** Trang thai hien thi cong khai — mau 'ngung' khong bao gio tra ra */
export type TrangThaiSanPhamCongKhai = "dang_ban" | "het_hang";

/**
 * San pham cong khai: CHI truong an toan de hien thi (ma, ten, gia, anh, trang thai).
 * Khong co id noi bo, ton kho, cau tu van noi bo, tu khoa.
 */
export interface SanPhamCongKhai {
  ma: string;
  ten: string;
  /** Dong (so nguyen); null = chua chot gia -> hien "Liên hệ" */
  gia_ban: number | null;
  anh_url: string | null;
  trang_thai: TrangThaiSanPhamCongKhai;
  con_hang: boolean;
  /** Nhom hien thi suy tu tien to ma (vd "Áo & sơ mi") */
  nhom: string;
}

/** Mot dong bang size (cot do tuy mau: nguc, eo, vai, dai, mong...) */
export type DongBangSize = { size: string } & Record<string, string>;

export interface ChiTietSanPhamCongKhai extends SanPhamCongKhai {
  chat_lieu: string | null;
  form_dang: string | null;
  bang_size: DongBangSize[];
  anh_bang_size: string | null;
  /** Mau sac con hang (chi ten mau, KHONG so luong) */
  mau_sac: string[];
  /** Size con hang (chi ten size, KHONG so luong) */
  size_con: string[];
}

export type SapXepSanPham = "moi" | "ma";

export interface DanhSachSanPhamQuery {
  tu_khoa?: string;
  /** 1–48, mac dinh 24 */
  gioi_han?: number;
  /** moi = cap nhat gan nhat truoc, con hang truoc; ma = theo ma */
  sap_xep?: SapXepSanPham;
}

export interface DanhSachSanPhamMeta {
  so_luong: number;
}

// ------------------------------------------------------------------ form lien he -> lead

/** Trang dat form — quyet dinh loai lead (DAO_TAO -> DANG_KY_HOC, DOI_TAC -> HOP_TAC, con lai -> MUA_HANG) */
export type TrangLienHe = "TRANG_CHU" | "VIP" | "THAN_THIEN" | "DOI_TAC" | "DAO_TAO" | "SAN_PHAM";

export const DANH_SACH_TRANG_LIEN_HE: TrangLienHe[] = ["TRANG_CHU", "VIP", "THAN_THIEN", "DOI_TAC", "DAO_TAO", "SAN_PHAM"];

/** Lo trinh tren trang Dao tao */
export type LoTrinhDangKy = "sale" | "ctv" | "kol" | "other";

export const DANH_SACH_LO_TRINH: LoTrinhDangKy[] = ["sale", "ctv", "kol", "other"];

export interface GuiLienHeBody {
  ho_ten: string;
  /** SDT Viet Nam (tu chuan hoa: bo ky tu khac so, 84 -> 0) */
  sdt: string;
  email?: string;
  trang: TrangLienHe;
  /** Bat buoc khi trang = DAO_TAO */
  lo_trinh?: LoTrinhDangKy;
  /** Gia tri o chon tren form (hinh thuc / kenh biet den...) */
  lua_chon?: string;
  /** O ghi chu tu do */
  loi_nhan?: string;
  ma_mau_quan_tam?: string;
  ma_gioi_thieu?: string;
  dong_y_lien_he?: boolean;
  /** Bay chong spam (honeypot) — nguoi that luon de trong */
  website?: string;
}

export interface KetQuaLienHe {
  da_nhan: true;
}
