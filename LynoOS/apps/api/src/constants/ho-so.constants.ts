import type { Vai } from "@prisma/client";

/** Nhan vai tieng Viet cho cau thong bao / nhat ky (giong NHAN_VAI o contracts — API khong import gia tri runtime tu contracts) */
export const NHAN_VAI_VN: Record<Vai, string> = {
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
