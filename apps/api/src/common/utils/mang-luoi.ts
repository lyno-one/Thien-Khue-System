import { randomInt } from "node:crypto";
import { type NguonDon, Prisma, type TrangThaiGhiNhan, type TrangThaiHoaHong, type Vai } from "@prisma/client";

/*
 * Luat nghiep vu thuan (khong I/O) cua mang luoi — de test va dung chung giua service / job.
 * README 2.3: moi don hop le CHI MOT nguoi ban; ma gioi thieu khac nguoi chot -> CHO_XAC_MINH, khong tu chi tra.
 */

/** Ma gioi thieu trong ghi_chu don CRM: "[MGT:AL01-K7Q2M9]" */
const MAU_MGT = /\[MGT:\s*([A-Za-z0-9-]{4,40})\s*\]/;
export function tachMaGioiThieu(ghiChu: string | null | undefined): string | null {
  if (!ghiChu) return null;
  const m = MAU_MGT.exec(ghiChu);
  return m ? m[1]!.toUpperCase() : null;
}
/** Chuoi gan vao ghi_chu don CRM de dong bo nhan ra */
export function nhanMaGioiThieu(ma: string): string {
  return `[MGT:${ma.toUpperCase()}]`;
}
// Bo chu de doc / doc qua dien thoai: bo 0 O 1 I L
const BANG_CHU = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
/** "AL01" -> "AL01-K7Q2M9" (phan ngau nhien 6 ky tu, unique o DB — trung thi tao lai) */
export function taoChuoiMa(maMau: string | null, sinh: (max: number) => number = randomInt): string {
  let duoi = "";
  for (let i = 0; i < 6; i++) duoi += BANG_CHU[sinh(BANG_CHU.length)];
  const dau = (maMau ?? "TK").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "TK";
  return `${dau}-${duoi}`;
}
/** Vai mang luoi theo thu tu uu tien khi mot ho so co nhieu vai (quyet dinh nguon + ty le) */
export const VAI_GIOI_THIEU: readonly Vai[] = ["KOL", "KOC", "CTV", "THUC_TAP"];
/** Vai duoc coi la "nguoi chot" don tren CRM */
export const VAI_CHOT_DON: readonly Vai[] = ["SALE", "CSKH"];
export function nguonTuVai(vai: Vai): NguonDon {
  if (vai === "KOL") return "KOL";
  if (vai === "KOC") return "KOC";
  if (vai === "SALE" || vai === "CSKH") return "SALE";
  return "CTV"; // CTV, THUC_TAP
}
/** Chon vai dung de tinh (vai HOAT_DONG uu tien cao nhat trong danh sach cho phep) */
export function chonVai(vaiHoatDong: readonly Vai[], uuTien: readonly Vai[]): Vai | null {
  for (const v of uuTien) if (vaiHoatDong.includes(v)) return v;
  return null;
}
export type TrangThaiDonCrmMl = "moi" | "dang_giao" | "giao_thanh_cong" | "hoan" | "huy";
/**
 * Don CRM dua vao luat: chuoi trang_thai (cach goi cu) hoac chinh DonCrm (co co da_tra_hang tu CrmDocService).
 * Tra hang qua luong doi tra CRM giu don goc o 'giao_thanh_cong' -> chi nhan ra duoc khi truyen ca don.
 */
export type DonVaoLuat = string | { trang_thai: string; da_tra_hang?: boolean | null };
const trangThaiCua = (don: DonVaoLuat): string => (typeof don === "string" ? don : don.trang_thai);
/** Khach da tra ca don qua doi tra CRM (yeu cau TRA da chap nhan) */
export const donDaTraHang = (don: DonVaoLuat): boolean => typeof don !== "string" && don.da_tra_hang === true;
/** Don khong con tinh tien: hoan / huy tren CRM, hoac da tra ca don qua doi tra (README: khong tinh don hoan / tra) */
export const donBiHuy = (don: DonVaoLuat): boolean => {
  const tt = trangThaiCua(don);
  return tt === "hoan" || tt === "huy" || donDaTraHang(don);
};
/** Ly do hien cho nguoi dung khi don rot */
export const lyDoDonRot = (don: DonVaoLuat): string =>
  donDaTraHang(don) && !["hoan", "huy"].includes(trangThaiCua(don)) ? "Khách đã trả hàng (đổi trả CRM)" : "Đơn đã hoàn / huỷ trên CRM";
export interface DauVaoGhiNhan {
  /** trang_thai don CRM, hoac ca DonCrm de nhan ra don da tra hang */
  trangThaiDon: DonVaoLuat;
  /** Chu ma gioi thieu hop le (ma bat + co vai mang luoi HOAT_DONG) */
  chuMa: { hoSoId: string; vai: Vai } | null;
  /** Ho so Sale / CSKH tao don tren CRM (don_hang.nguoi_tao -> ho_so.crm_user_id) */
  nguoiChot: { hoSoId: string; vai: Vai } | null;
}
export interface QuyetDinhGhiNhan {
  trang_thai: TrangThaiGhiNhan;
  nguoi_ban_ho_so_id: string | null;
  nguon: NguonDon;
  /** Vai dung tra ty le (null khi chua chot nguoi ban) */
  vai_tinh: Vai | null;
  ly_do: string | null;
}
/**
 * Quyet dinh ghi nhan nguoi ban cho MOT don. null = don khong lien quan mang luoi / Sale Thien Khue.
 * - Ma gioi thieu va nguoi chot la HAI nguoi khac nhau -> CHO_XAC_MINH, chua co nguoi ban (khong tao hoa hong).
 * - Don da hoan / huy luc ghi nhan -> BI_HUY (giu dong de chan ghi nhan lai, khong tinh tien).
 */
export function quyetDinhGhiNhan(v: DauVaoGhiNhan): QuyetDinhGhiNhan | null {
  const { chuMa, nguoiChot } = v;
  if (!chuMa && !nguoiChot) return null;
  const huy = donBiHuy(v.trangThaiDon);

  if (chuMa && nguoiChot && chuMa.hoSoId !== nguoiChot.hoSoId) {
    return {
      trang_thai: huy ? "BI_HUY" : "CHO_XAC_MINH",
      nguoi_ban_ho_so_id: null,
      nguon: nguonTuVai(chuMa.vai),
      vai_tinh: null,
      ly_do: huy ? lyDoDonRot(v.trangThaiDon) : "Mã giới thiệu và người chốt đơn là hai người khác nhau — chờ người phụ trách xác minh"
    };
  }
  const nguoiBan = chuMa ?? nguoiChot!;
  return {
    trang_thai: huy ? "BI_HUY" : "HOP_LE",
    nguoi_ban_ho_so_id: nguoiBan.hoSoId,
    nguon: nguonTuVai(nguoiBan.vai),
    vai_tinh: nguoiBan.vai,
    ly_do: huy ? lyDoDonRot(v.trangThaiDon) : null
  };
}
/** Trang thai hoa hong luc tao, theo don CRM (da tra hang xet truoc: don tra van o giao_thanh_cong) */
export function trangThaiHoaHongBanDau(don: DonVaoLuat): TrangThaiHoaHong {
  if (donBiHuy(don)) return "BI_TRU";
  if (trangThaiCua(don) === "giao_thanh_cong") return "DU_DIEU_KIEN";
  return "CHO_DOI_SOAT";
}
export interface ChuyenHoaHong {
  moi: TrangThaiHoaHong;
  /** Da chi tra roi moi hoan -> ghi dieu chinh am (tru vao ky sau) */
  ghiDieuChinhTru: boolean;
}
/**
 * Chuyen trang thai hoa hong khi don CRM doi trang thai / bi tra hang. null = khong doi.
 * BI_TRU la trang thai cuoi (don da hoan / huy / tra khong song lai). Da chi tra roi moi tra hang -> ghi dieu chinh am.
 */
export function chuyenTrangThaiHoaHong(hienTai: TrangThaiHoaHong, don: DonVaoLuat): ChuyenHoaHong | null {
  if (hienTai === "BI_TRU") return null;
  if (donBiHuy(don)) return { moi: "BI_TRU", ghiDieuChinhTru: hienTai === "DA_TRA" };
  if (trangThaiCua(don) === "giao_thanh_cong" && hienTai === "CHO_DOI_SOAT") return { moi: "DU_DIEU_KIEN", ghiDieuChinhTru: false };
  return null;
}
export interface DongTinh {
  mau_id: string;
  so_luong: number;
  don_gia: number;
}
export interface KetQuaTinhHoaHong {
  so_tien: number;
  /** Co so tinh (doanh so cac dong SKU duoc phep, da phan bo giam gia) */
  co_so: number;
  /** % hieu dung (2 so le) */
  ty_le: number;
  /** SKU bi bo qua vi nguoi ban chua co quyen */
  mau_bo_qua: string[];
}
/**
 * Hoa hong = tong (thanh tien dong * he so giam gia * ty le SKU). Chi tinh dong co SKU nguoi ban DA DUOC CAP QUYEN
 * (hoc truoc khi ban). He so = tong_tien / tong dong (<= 1: giam gia phan bo deu, phi ship khong tinh).
 */
export function tinhHoaHong(dong: DongTinh[], tongTien: number, mauDuocPhep: ReadonlySet<string>, tyLe: (mauId: string) => number): KetQuaTinhHoaHong {
  const tongDong = dong.reduce((s, d) => s + Math.max(0, d.so_luong) * Math.max(0, d.don_gia), 0);
  if (tongDong <= 0 || tongTien <= 0) return { so_tien: 0, co_so: 0, ty_le: 0, mau_bo_qua: [] };
  const heSo = Math.min(1, tongTien / tongDong);
  let coSo = 0;
  let tien = 0;
  const boQua = new Set<string>();
  for (const d of dong) {
    if (!mauDuocPhep.has(d.mau_id)) {
      boQua.add(d.mau_id);
      continue;
    }
    const thanhTien = Math.max(0, d.so_luong) * Math.max(0, d.don_gia) * heSo;
    coSo += thanhTien;
    tien += (thanhTien * Math.max(0, tyLe(d.mau_id))) / 100;
  }
  const soTien = Math.round(tien);
  const coSoTron = Math.round(coSo);
  return { so_tien: soTien, co_so: coSoTron, ty_le: coSoTron > 0 ? Math.round((soTien / coSoTron) * 10000) / 100 : 0, mau_bo_qua: [...boQua] };
}
export interface DongTyLe {
  mau_id: string | null;
  ty_le: number;
  hieu_luc_tu: Date;
}
/**
 * Ty le cho mot SKU tai thoi diem `luc` (luc tao don): dong rieng SKU uu tien dong chung (mau_id null);
 * trong cung loai lay dong hieu luc moi nhat <= luc. Chua co dong nao hieu luc luc do (ty le ban hanh sau don)
 * -> lay dong ban hanh som nhat sau do, de don cu khong bi tinh 0.
 */
export function chonTyLe(ds: DongTyLe[], mauId: string, luc: Date = new Date()): number {
  const chon = (a: DongTyLe[]): DongTyLe | undefined => {
    const truoc = a.filter(d => d.hieu_luc_tu.getTime() <= luc.getTime()).sort((x, y) => y.hieu_luc_tu.getTime() - x.hieu_luc_tu.getTime());
    if (truoc[0]) return truoc[0];
    return [...a].sort((x, y) => x.hieu_luc_tu.getTime() - y.hieu_luc_tu.getTime())[0];
  };
  return (chon(ds.filter(d => d.mau_id === mauId)) ?? chon(ds.filter(d => d.mau_id === null)))?.ty_le ?? 0;
}
/** Ky doi soat "YYYY-MM" theo gio Viet Nam */
export function kyDoiSoat(luc: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(luc);
  const nam = p.find(x => x.type === "year")?.value ?? String(luc.getUTCFullYear());
  const thang = p.find(x => x.type === "month")?.value ?? String(luc.getUTCMonth() + 1).padStart(2, "0");
  return `${nam}-${thang}`;
}
/** Chien dich chi nhan duoc khi MOI SKU deu co quyen HOAT_DONG */
export function skuThieuQuyen(mauIds: readonly string[], mauDuocPhep: ReadonlySet<string>): string[] {
  return mauIds.filter(id => !mauDuocPhep.has(id));
}

/** Loi unique (P2002) — dung de bat truong hop hai luong cung ghi mot don / mot ma */
export function laTrungKhoa(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError ? e.code === "P2002" : (e as { code?: string } | null)?.code === "P2002";
}
export const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
/** Chi chap nhan link http(s) */
export function laLinkHopLe(s: string | null | undefined): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
/** Lay danh sach ho_so.id nguoi nhap ma tu cac dong nhat_ky GHI_NHAN_DON (du_lieu.nguoi_nhap_ma) — ham thuan */
export function tachNguoiNhapMa(ds: { du_lieu: Prisma.JsonValue | null }[]): string[] {
  const kq = new Set<string>();
  for (const d of ds) {
    const v = d.du_lieu && typeof d.du_lieu === "object" && !Array.isArray(d.du_lieu) ? (d.du_lieu as Record<string, unknown>).nguoi_nhap_ma : null;
    if (typeof v === "string" && v) kq.add(v);
  }
  return [...kq];
}
