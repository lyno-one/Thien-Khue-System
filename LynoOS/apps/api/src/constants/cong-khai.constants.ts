import type { LoTrinhDangKy, TrangLienHe } from "@thien-khue/contracts";

/* ---- Form lien he ---- */

/** Han muc gui form theo IP: toi da `toiDa` lan trong `cuaSoMs` */
export const GIOI_HAN_LIEN_HE = { toiDa: 5, cuaSoMs: 10 * 60 * 1000 };

/** Gop trung lead cung SDT + loai + trang trong khoang nay */
export const GOP_TRUNG_LEAD_MS = 24 * 60 * 60 * 1000;

export const NHAN_LO_TRINH: Record<LoTrinhDangKy, string> = {
  sale: "Sale / CSKH",
  ctv: "CTV online",
  kol: "KOL / KOC",
  other: "Chương trình khác"
};

/** Nhan cua o chon tren tung trang (khop thiet ke Main.dc.html) — de nhu_cau doc duoc khi Sale mo lead */
export const NHAN_LUA_CHON: Record<TrangLienHe, string> = {
  TRANG_CHU: "Quan tâm",
  VIP: "Đã mua hàng tại LYNO",
  THAN_THIEN: "Biết đến qua",
  DOI_TAC: "Hình thức quan tâm",
  DAO_TAO: "Hình thức",
  SAN_PHAM: "Quan tâm"
};

/* ---- San pham cong khai ---- */

/** Nhom hien thi theo 2 ky tu dau cua ma mau (quy uoc ma CRM) */
export const NHOM_THEO_TIEN_TO: Record<string, string> = {
  AK: "Áo khoác",
  AL: "Áo & sơ mi",
  SM: "Set & vest",
  VD: "Váy & đầm",
  QD: "Quần",
  PK: "Phụ kiện"
};

/** Thu tu size chuan khi sap danh sach size con hang */
export const THU_TU_SIZE = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "FREESIZE", "FREE"];

/** Ma mau hop le tren URL chi tiet */
export const MA_MAU_HOP_LE = /^[A-Za-z0-9_-]{1,30}$/;

/** Cache danh sach san pham cong khai */
export const TTL_CACHE_SAN_PHAM_MS = 30_000;
