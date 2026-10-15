

// Gio Viet Nam cho ca truc: ca_truc.ngay la @db.Date, tu_gio / den_gio la "HH:mm" theo Asia/Ho_Chi_Minh.

const MUI_GIO = "Asia/Ho_Chi_Minh";
/** Ngay "YYYY-MM-DD" va gio "HH:mm" theo gio Viet Nam */
export function bayGioVn(luc: Date = new Date()): { ngay: string; gio: string } {
  const phan = new Intl.DateTimeFormat("en-CA", {
    timeZone: MUI_GIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(luc);
  const lay = (t: string) => phan.find(p => p.type === t)?.value ?? "00";
  const gio = lay("hour") === "24" ? "00" : lay("hour");
  return { ngay: `${lay("year")}-${lay("month")}-${lay("day")}`, gio: `${gio}:${lay("minute")}` };
}
/** "YYYY-MM-DD" -> Date luu cot @db.Date (nua dem UTC — Prisma ghi dung ngay) */
export function ngayDb(ngay: string): Date {
  return new Date(`${ngay}T00:00:00.000Z`);
}
/** Date cot @db.Date -> "YYYY-MM-DD" */
export function ngayChuoi(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** Gio "HH:mm" hop le 00:00..23:59 */
export function laGioHopLe(gio: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(gio);
}
export function laNgayHopLe(ngay: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return false;
  const d = ngayDb(ngay);
  return !Number.isNaN(d.getTime()) && ngayChuoi(d) === ngay;
}
/** Ca [tu, den) co chua gio dang xet khong. Ca qua dem (den <= tu, vd 22:00–02:00) tinh phan truoc nua dem cua ngay ca. */
export function trongCa(gio: string, tuGio: string, denGio: string): boolean {
  if (denGio > tuGio) return gio >= tuGio && gio < denGio;
  return gio >= tuGio;
}
/** Dau ngay hom nay (gio VN) dang Date UTC — loc "hom nay" cho cot timestamptz */
export function dauNgayVn(luc: Date = new Date()): Date {
  const { ngay } = bayGioVn(luc);
  return new Date(`${ngay}T00:00:00.000+07:00`);
}

// Thuat toan phan bo (thuan, khong I/O — de test): round-robin co trong so theo tai viec.
//
// Ung vien = Sale / CSKH dang trong ca, con cho trong ca, du quyen SKU (neu khach quan tam mot ma).
// Diem = (tai hien tai + 1) / trong so; trong so = muc nang luc voi ma do (1..5), mac dinh 1.
// Diem thap nhat thang; hoa diem -> ai duoc giao lau nhat truoc (vong tron), roi theo id cho on dinh.

export interface UngVienPhanBo {
  hoSoId: string;
  hoTen: string;
  /** So khach DANG_PHU_TRACH */
  tai: number;
  /** Muc nang luc voi ma / nhom dang xet (1..5); null = khong khai bao */
  mucNangLuc: number | null;
  /** Lan duoc giao khach gan nhat (null = chua bao gio) */
  lanGiaoCuoi: Date | null;
  caTrucId: string;
  caNhan: string;
  /** So khach da giao trong ca / toi da (null = khong gioi han) */
  daGiaoTrongCa: number;
  toiDaTrongCa: number | null;
}
export interface KetQuaChon {
  ungVien: UngVienPhanBo;
  diem: number;
  lyDo: string;
}
export function trongSo(u: Pick<UngVienPhanBo, "mucNangLuc">): number {
  const m = u.mucNangLuc ?? 1;
  return Math.min(Math.max(Math.round(m), 1), 5);
}
export function diemTai(u: Pick<UngVienPhanBo, "tai" | "mucNangLuc">): number {
  return (u.tai + 1) / trongSo(u);
}
/** Con cho trong ca khong */
export function conChoTrongCa(u: Pick<UngVienPhanBo, "daGiaoTrongCa" | "toiDaTrongCa">): boolean {
  return u.toiDaTrongCa === null || u.daGiaoTrongCa < u.toiDaTrongCa;
}
/** Chon nguoi phu trach; null neu khong con ung vien (het cho / khong ai trong ca) */
export function chonNguoiPhuTrach(ds: UngVienPhanBo[], moTaNangLuc?: string | null): KetQuaChon | null {
  const conCho = ds.filter(conChoTrongCa);
  if (!conCho.length) return null;
  const xep = [...conCho].sort((a, b) => {
    const d = diemTai(a) - diemTai(b);
    if (Math.abs(d) > 1e-9) return d;
    const ta = a.lanGiaoCuoi?.getTime() ?? -Infinity;
    const tb = b.lanGiaoCuoi?.getTime() ?? -Infinity;
    if (ta !== tb) return ta - tb;
    return a.hoSoId.localeCompare(b.hoSoId);
  });
  const u = xep[0]!;
  const diem = diemTai(u);
  const phan = [
    `Ca ${u.caNhan}`,
    moTaNangLuc ? `đủ quyền ${moTaNangLuc}` : null,
    `tải ${u.tai} khách${u.toiDaTrongCa !== null ? ` (ca ${u.daGiaoTrongCa}/${u.toiDaTrongCa})` : ""}`,
    `trọng số ${trongSo(u)}`,
    `điểm ${diem.toFixed(2)} thấp nhất trong ${conCho.length} người`
  ].filter(Boolean);
  return { ungVien: u, diem, lyDo: phan.join(" · ") };
}
