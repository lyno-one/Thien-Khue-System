import type { LoaiDeXuat, Vai } from "@prisma/client";

/** Dong bo don: quet lai ghi nhan tao trong N ngay gan nhat */
export const NGAY_QUET_LAI = 180;

/** Sinh chuoi ma gioi thieu: thu toi da N lan khi trung */
export const SO_LAN_THU_MA = 5;

/** Mot IP chi tinh mot click / ma trong khoang nay (chong bam lien tuc) */
export const KHOANG_CLICK_MS = 30 * 60_000;

/** Vai quan ly chien dich / xem moi chien dich */
export const VAI_TOI_CAO: Vai[] = ["QUAN_LY", "ADMIN", "THIEN_KHUE"];

/** Vai nhan thong bao can xac minh / de xuat (nguoi phu trach mang luoi) */
export const VAI_PHU_TRACH: Vai[] = ["QUAN_LY", "THIEN_KHUE"];

/** Nhan tieng Viet cho trang thai de_xuat_duyet (lich su duyet trong vi) */
export const NHAN_DE_XUAT: Record<string, string> = {
  CHO_KIEM: "Chờ kiểm",
  CHO_DUYET: "Chờ duyệt",
  DA_DUYET: "Đã duyệt",
  TU_CHOI: "Từ chối",
  HUY: "Đã rút"
};

/** Loai de xuat hien trong lich su duyet cua mot ho so */
export const LOAI_LICH_SU: LoaiDeXuat[] = ["DIEU_CHINH_HOA_HONG", "CHI_TRA_HOA_HONG", "CHUYEN_VAI"];
