// Dinh dang hien thi: tien (dong), ngay gio theo Asia/Ho_Chi_Minh (KIEN-TRUC muc 7)

const MUI_GIO = "Asia/Ho_Chi_Minh";

/** 450000 -> "450.000đ" */
export function dinhDangTien(soTien: number | null | undefined): string {
  if (soTien === null || soTien === undefined || Number.isNaN(soTien)) return "—";
  return `${Math.round(soTien).toLocaleString("vi-VN")}đ`;
}

/** ISO / Date -> "07/10/2026" */
export function dinhDangNgay(v: string | Date | null | undefined): string {
  if (!v) return "—";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: MUI_GIO, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(v));
}

/** ISO / Date -> "07/10/2026 14:05" */
export function dinhDangNgayGio(v: string | Date | null | undefined): string {
  if (!v) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: MUI_GIO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(v));
}

/** Chu cai dau ho ten cho avatar: "Nguyễn Thu Sale" -> "NS" */
export function chuCaiDau(hoTen: string | null | undefined): string {
  const tu = (hoTen ?? "").trim().split(/\s+/).filter(Boolean);
  if (!tu.length) return "TK";
  const dau = tu[0]?.[0] ?? "";
  const cuoi = tu.length > 1 ? (tu[tu.length - 1]?.[0] ?? "") : "";
  return (dau + cuoi).toUpperCase();
}
