import { type LoaiKhoaHoc, Prisma, type TrangThaiQuyenSku, type TrangThaiThucHanh, type TrangThaiVai, type Vai } from "@prisma/client";
import type { BaiThucHanh, BangChungQuyenSku, ChungChi, DieuKienVai, QuyenSkuCuaToi, TienDoKhoaHoc, YeuCauHocLai } from "@thien-khue/contracts";
import { docBangChungLuyenAi } from "./dao-tao-luyen-ai";

/*
 * Tinh tien do / dieu kien "dat khoa" — ham thuan, dung chung cho lo trinh, chi tiet khoa, xet cap quyen, tien do doi.
 * DAT KHOA = hoc het bai (dang bat) + moi bai kiem tra bat buoc dat nguong + bai thuc hanh duoc duyet (neu khoa yeu cau).
 * Fail-safe (LOI-CAN-SUA muc 9/11): khoa KHONG co bai kiem tra bat buoc dang bat thi KHONG BAO GIO hoan thanh —
 * tat de / bo bat_buoc khong mo duoc cong "hoc truoc khi ban".
 * Khoa SAN_PHAM: bai thi chi tinh neu lam o phien ban tai lieu hien hanh (hoac quyen SKU da duoc xac nhan o phien ban nay).
 */

/** Nguong dat toi thieu (README: bai kiem tra bat buoc >= 90%) — DTO, service, DB CHECK va cham diem cung dung */
export const NGUONG_DAT_TOI_THIEU = 90;
export interface KhoaDeTinh {
  id: string;
  loai: LoaiKhoaHoc;
  phien_ban_tai_lieu: number;
  can_thuc_hanh: boolean;
  mau_id: string | null;
  bai_hoc: { id: string; thoi_luong_phut?: number | null }[];
  bai_kiem_tra: { id: string; bat_buoc: boolean }[];
}
export interface LuotLamDeTinh {
  id: string;
  bai_kiem_tra_id: string;
  diem: number;
  dat: boolean;
  phien_ban_tai_lieu: number;
  nop_luc: Date | null;
}
export interface ThucHanhDeTinh {
  id: string;
  khoa_hoc_id: string;
  trang_thai: TrangThaiThucHanh;
  nop_luc: Date;
  nguoi_cham_id: string | null;
  nhan_xet: string | null;
  cham_luc: Date | null;
}
export interface QuyenDeTinh {
  mau_id: string;
  trang_thai: TrangThaiQuyenSku;
  phien_ban_tai_lieu: number;
}
export interface DuLieuHocVien {
  baiXong: Set<string>;
  /** Chi luot da nop */
  luotLam: LuotLamDeTinh[];
  thucHanh: ThucHanhDeTinh[];
  quyenSku: QuyenDeTinh[];
}
export interface TienDoChiTiet extends TienDoKhoaHoc {
  /** Luot dat dung lam bang chung (diem cao nhat, moi nhat) — cua bai bat buoc dau tien */
  luotDat: LuotLamDeTinh | null;
  thucHanhDat: ThucHanhDeTinh | null;
}
/** Luot thi nay co duoc tinh cho khoa (theo phien ban) khong */
export function luotDuocTinh(khoa: KhoaDeTinh, luot: LuotLamDeTinh, quyen: QuyenDeTinh | undefined): boolean {
  if (!luot.dat || !luot.nop_luc) return false;
  if (khoa.loai !== "SAN_PHAM") return true;
  if (luot.phien_ban_tai_lieu >= khoa.phien_ban_tai_lieu) return true;
  // Da xac nhan doc thay doi o phien ban hien hanh -> lan thi cu van hop le
  return !!quyen && quyen.trang_thai === "HOAT_DONG" && quyen.phien_ban_tai_lieu >= khoa.phien_ban_tai_lieu;
}
function tot(a: LuotLamDeTinh, b: LuotLamDeTinh): LuotLamDeTinh {
  if (a.diem !== b.diem) return a.diem > b.diem ? a : b;
  return (a.nop_luc?.getTime() ?? 0) >= (b.nop_luc?.getTime() ?? 0) ? a : b;
}
export function tinhTienDo(khoa: KhoaDeTinh, dl: DuLieuHocVien): TienDoChiTiet {
  const soBai = khoa.bai_hoc.length;
  const soBaiXong = khoa.bai_hoc.filter(b => dl.baiXong.has(b.id)).length;
  const quyen = khoa.mau_id ? dl.quyenSku.find(q => q.mau_id === khoa.mau_id) : undefined;
  const idsDe = new Set(khoa.bai_kiem_tra.map(b => b.id));
  const luotCuaKhoa = dl.luotLam.filter(l => idsDe.has(l.bai_kiem_tra_id) && l.nop_luc);

  const batBuoc = khoa.bai_kiem_tra.filter(b => b.bat_buoc);
  let kiemTraDat = batBuoc.length > 0;
  let luotDat: LuotLamDeTinh | null = null;
  for (const de of batBuoc) {
    const dat = luotCuaKhoa.filter(l => l.bai_kiem_tra_id === de.id && luotDuocTinh(khoa, l, quyen));
    if (!dat.length) {
      kiemTraDat = false;
      continue;
    }
    if (!luotDat) luotDat = dat.reduce(tot);
  }

  const luotBatBuoc = luotCuaKhoa.filter(l => batBuoc.some(b => b.id === l.bai_kiem_tra_id));
  const diemCaoNhat = luotBatBuoc.length ? Math.max(...luotBatBuoc.map(l => l.diem)) : null;

  const thCuaKhoa = dl.thucHanh.filter(t => t.khoa_hoc_id === khoa.id).sort((a, b) => b.nop_luc.getTime() - a.nop_luc.getTime());
  const thucHanhDat = thCuaKhoa.find(t => t.trang_thai === "DAT") ?? null;
  const thucHanh = thucHanhDat ? "DAT" : (thCuaKhoa[0]?.trang_thai ?? null);
  const thucHanhOk = !khoa.can_thuc_hanh || !!thucHanhDat;

  const hoanThanh = batBuoc.length > 0 && soBaiXong === soBai && kiemTraDat && thucHanhOk;

  let trangThai: TienDoKhoaHoc["trang_thai"];
  if (quyen?.trang_thai === "CAN_HOC_LAI") trangThai = "CAN_HOC_LAI";
  else if (hoanThanh) trangThai = "HOAN_THANH";
  else if (soBaiXong > 0 || luotCuaKhoa.length > 0 || thCuaKhoa.length > 0) trangThai = "DANG_HOC";
  else trangThai = "CHUA_BAT_DAU";

  return {
    so_bai: soBai,
    so_bai_xong: soBaiXong,
    phan_tram: soBai ? Math.round((soBaiXong * 100) / soBai) : hoanThanh ? 100 : 0,
    kiem_tra_dat: kiemTraDat,
    diem_cao_nhat: diemCaoNhat,
    thuc_hanh: khoa.can_thuc_hanh || thCuaKhoa.length ? thucHanh : null,
    hoan_thanh: hoanThanh,
    trang_thai: trangThai,
    luotDat,
    thucHanhDat
  };
}
/** Bo truong noi bo truoc khi tra client */
export function tienDoChoClient(t: TienDoChiTiet): TienDoKhoaHoc {
  const { luotDat: _l, thucHanhDat: _t, ...con } = t;
  return con;
}

/** Vai phai hoc dat moi HOAT_DONG (KIEN-TRUC muc 5) — ban sao cua contracts VAI_PHAI_HOC (api chi import type) */
export const VAI_PHAI_HOC: readonly Vai[] = ["SALE", "CSKH", "CTV", "THUC_TAP", "KOL", "KOC"];
/** Vai duoc xem moi khoa (duyet noi dung / ho tro hoc vien) */
export const VAI_XEM_MOI_KHOA: readonly Vai[] = ["MENTOR", "QUAN_LY", "ADMIN", "THIEN_KHUE"];
/** Client doc / ghi cho repository dao-tao: PrismaService hoac tx trong $transaction */
export type ClientDb = Prisma.TransactionClient;
/** Cot khoa hoc can cho tinh tien do + hien thi */
export const CHON_KHOA = {
  id: true,
  ma: true,
  ten: true,
  mo_ta: true,
  loai: true,
  vai_ap_dung: true,
  mau_id: true,
  ma_mau: true,
  phien_ban_tai_lieu: true,
  bat_buoc: true,
  can_thuc_hanh: true,
  yeu_cau_thuc_hanh: true,
  yeu_cau_luyen_ai: true,
  mau_sac: true,
  thu_tu: true,
  bat: true,
  bai_hoc: { where: { bat: true }, select: { id: true, thoi_luong_phut: true }, orderBy: [{ thu_tu: "asc" }, { ma: "asc" }] },
  bai_kiem_tra: { where: { bat: true }, select: { id: true, bat_buoc: true } }
} satisfies Prisma.khoa_hocSelect;
export type KhoaDaNap = Prisma.khoa_hocGetPayload<{ select: typeof CHON_KHOA }>;
/** Thu tu hien thi lo trinh */
export const THU_TU_LOAI: Record<string, number> = { NEN_TANG: 0, NGHIEP_VU: 1, SAN_PHAM: 2 };
export function sapXepKhoa<T extends { loai: string; thu_tu: number; ma: string }>(ds: T[]): T[] {
  return [...ds].sort((a, b) => (THU_TU_LOAI[a.loai] ?? 9) - (THU_TU_LOAI[b.loai] ?? 9) || a.thu_tu - b.thu_tu || a.ma.localeCompare(b.ma));
}
/** Khoa bat buoc de kich hoat mot vai: NEN_TANG + NGHIEP_VU, bat_buoc, ap dung cho vai */
export function khoaBatBuocCuaVai<T extends { loai: string; bat_buoc: boolean; bat: boolean; vai_ap_dung: Vai[] }>(ds: T[], vai: Vai): T[] {
  return ds.filter(k => k.bat && k.bat_buoc && (k.loai === "NEN_TANG" || k.loai === "NGHIEP_VU") && k.vai_ap_dung.includes(vai));
}
/** Dieu kien kich hoat tung vai phai hoc (DieuKienVai cho lo trinh) */
export function xetDieuKienVai(
  vaiChiTiet: { vai: Vai; trang_thai: TrangThaiVai }[],
  dsKhoa: KhoaDaNap[],
  tienDo: Map<string, TienDoChiTiet>
): DieuKienVai[] {
  return vaiChiTiet
    .filter(v => VAI_PHAI_HOC.includes(v.vai) && v.trang_thai !== "KET_THUC")
    .map(v => {
      const req = sapXepKhoa(khoaBatBuocCuaVai(dsKhoa, v.vai));
      const khoa_bat_buoc = req.map(k => ({ id: k.id, ma: k.ma, ten: k.ten, loai: k.loai, hoan_thanh: !!tienDo.get(k.id)?.hoan_thanh }));
      return {
        vai: v.vai,
        trang_thai: v.trang_thai,
        khoa_bat_buoc,
        du_dieu_kien: khoa_bat_buoc.length > 0 && khoa_bat_buoc.every(k => k.hoan_thanh)
      };
    });
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function laUuid(s: string): boolean {
  return UUID.test(s);
}

/** Doi ban ghi Prisma sang kieu contracts (Date -> ISO) */

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
export function anhXaChungChi(c: {
  id: string;
  khoa_hoc_id: string;
  ma_chung_chi: string;
  phien_ban_tai_lieu: number;
  diem: number | null;
  cap_luc: Date;
  het_han_luc: Date | null;
  thu_hoi_luc: Date | null;
  khoa_hoc: { ten: string; loai: LoaiKhoaHoc };
}): ChungChi {
  return {
    id: c.id,
    khoa_hoc_id: c.khoa_hoc_id,
    khoa_hoc_ten: c.khoa_hoc.ten,
    khoa_hoc_loai: c.khoa_hoc.loai,
    ma_chung_chi: c.ma_chung_chi,
    phien_ban_tai_lieu: c.phien_ban_tai_lieu,
    diem: c.diem,
    cap_luc: c.cap_luc.toISOString(),
    het_han_luc: iso(c.het_han_luc),
    thu_hoi_luc: iso(c.thu_hoi_luc)
  };
}
export interface BanGhiThucHanh {
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
  nhan_xet: string | null;
  cham_luc: Date | null;
  nop_luc: Date;
  /** Tuy chon de fixture test cu van hop le (thieu = NOP_TAY) */
  nguon?: "NOP_TAY" | "LUYEN_AI";
  bang_chung?: unknown;
}
export function anhXaThucHanh(t: BanGhiThucHanh, tenNguoiCham: Map<string, string> = new Map()): BaiThucHanh {
  return {
    id: t.id,
    khoa_hoc_id: t.khoa_hoc_id,
    ho_so_id: t.ho_so_id,
    vai: t.vai,
    tieu_de: t.tieu_de,
    mo_ta: t.mo_ta,
    link: t.link,
    tep_url: t.tep_url,
    trang_thai: t.trang_thai,
    diem: t.diem,
    nguoi_cham_id: t.nguoi_cham_id,
    nguoi_cham_ten: t.nguoi_cham_id ? (tenNguoiCham.get(t.nguoi_cham_id) ?? null) : null,
    nhan_xet: t.nhan_xet,
    cham_luc: iso(t.cham_luc),
    nop_luc: t.nop_luc.toISOString(),
    nguon: t.nguon ?? "NOP_TAY",
    bang_chung: t.nguon === "LUYEN_AI" ? docBangChungLuyenAi(t.bang_chung) : null
  };
}
/** Doc bang_chung (Json) an toan */
export function docBangChung(v: unknown): BangChungQuyenSku | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as BangChungQuyenSku;
}
export function yeuCauHocLai(bangChung: BangChungQuyenSku | null, trangThai: TrangThaiQuyenSku): YeuCauHocLai | null {
  if (trangThai !== "CAN_HOC_LAI") return null;
  return bangChung?.can_hoc_lai?.yeu_cau ?? "XAC_NHAN";
}
export function anhXaQuyenSku(q: {
  id: string;
  mau_id: string;
  ma_mau: string;
  trang_thai: TrangThaiQuyenSku;
  phien_ban_tai_lieu: number;
  khoa_hoc_id: string | null;
  cap_luc: Date;
  thu_hoi_luc: Date | null;
  ly_do: string | null;
  bang_chung: unknown;
  khoa_hoc: { ten: string; phien_ban_tai_lieu: number } | null;
}): QuyenSkuCuaToi {
  const bc = docBangChung(q.bang_chung);
  return {
    id: q.id,
    mau_id: q.mau_id,
    ma_mau: q.ma_mau,
    trang_thai: q.trang_thai,
    phien_ban_tai_lieu: q.phien_ban_tai_lieu,
    phien_ban_hien_hanh: q.khoa_hoc?.phien_ban_tai_lieu ?? null,
    khoa_hoc_id: q.khoa_hoc_id,
    khoa_hoc_ten: q.khoa_hoc?.ten ?? null,
    cap_luc: q.cap_luc.toISOString(),
    thu_hoi_luc: iso(q.thu_hoi_luc),
    ly_do: q.ly_do,
    yeu_cau_hoc_lai: yeuCauHocLai(bc, q.trang_thai),
    bang_chung: bc
  };
}
export const CHON_QUYEN_SKU = {
  id: true,
  mau_id: true,
  ma_mau: true,
  trang_thai: true,
  phien_ban_tai_lieu: true,
  khoa_hoc_id: true,
  cap_luc: true,
  thu_hoi_luc: true,
  ly_do: true,
  bang_chung: true,
  khoa_hoc: { select: { ten: true, phien_ban_tai_lieu: true } }
} as const;

/*
 * Ham thuan (khong DB) cho cham bai kiem tra — de test rieng va dung chung service.
 * Luat: diem = phan tram theo trong so cau (lam tron XUONG — 89,9% van la 89 -> truot o nguong 90).
 */
export interface CauHoiCham {
  id: string;
  ma: string;
  noi_dung: string;
  lua_chon: string[];
  dap_an: number[];
  giai_thich: string | null;
  diem: number;
  thu_tu: number;
}
export interface KetQuaCham {
  diem: number;
  so_cau_dung: number;
  tong_cau: number;
  chiTiet: { cau: CauHoiCham; ban_chon: number[]; dung: boolean }[];
}
/** Doc mang so tu cot Json (lua_chon / dap_an) — du lieu xau thi bo qua phan tu sai */
export function docMangSo(v: unknown): number[] {
  if (typeof v === "number" && Number.isInteger(v)) return [v];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is number => typeof x === "number" && Number.isInteger(x));
}
export function docMangChuoi(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(x => (typeof x === "string" ? x : String(x)));
}
/** Chuan hoa cau hoi tu Prisma (Json) sang dang cham */
export function chuanHoaCauHoi(c: {
  id: string;
  ma: string;
  noi_dung: string;
  lua_chon: unknown;
  dap_an: unknown;
  giai_thich: string | null;
  diem: number;
  thu_tu: number;
}): CauHoiCham {
  return {
    id: c.id,
    ma: c.ma,
    noi_dung: c.noi_dung,
    lua_chon: docMangChuoi(c.lua_chon),
    dap_an: [...new Set(docMangSo(c.dap_an))].sort((a, b) => a - b),
    giai_thich: c.giai_thich,
    diem: c.diem > 0 ? c.diem : 1,
    thu_tu: c.thu_tu
  };
}
/** PRNG co hat (mulberry32) tu chuoi — chon de on dinh theo luot_lam.id (khong can luu de) */
function taoNgauNhien(hat: string): () => number {
  let h = 1779033703 ^ hat.length;
  for (let i = 0; i < hat.length; i++) {
    h = Math.imul(h ^ hat.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/**
 * Cac cau trong de cua mot luot lam. so_cau_hien = null -> het cau.
 * Chon ngau nhien co hat = luotLamId nen luc nop tinh lai dung de da phat (khong can luu de vao DB).
 */
export function chonCauHoi<T extends { id: string; thu_tu: number }>(ds: T[], soCauHien: number | null, luotLamId: string): T[] {
  const sapXep = [...ds].sort((a, b) => a.thu_tu - b.thu_tu || a.id.localeCompare(b.id));
  if (!soCauHien || soCauHien <= 0 || soCauHien >= sapXep.length) return sapXep;
  const rd = taoNgauNhien(luotLamId);
  const tron = [...sapXep];
  for (let i = tron.length - 1; i > 0; i--) {
    const j = Math.floor(rd() * (i + 1));
    [tron[i], tron[j]] = [tron[j], tron[i]];
  }
  const chon = new Set(tron.slice(0, soCauHien).map(c => c.id));
  return sapXep.filter(c => chon.has(c.id));
}
/** Cau tra loi con thieu / khong hop le (bat buoc tra loi het) */
export function timCauThieu(de: CauHoiCham[], traLoi: Record<string, unknown>): string[] {
  return de
    .filter(c => {
      const chon = traLoi[c.id];
      if (!Array.isArray(chon) || chon.length === 0) return true;
      return chon.some(x => typeof x !== "number" || !Number.isInteger(x) || x < 0 || x >= c.lua_chon.length);
    })
    .map(c => c.id);
}
/** Phan tram lam tron xuong — khong bao gio lam tron len thanh dat */
export function tinhPhanTram(diemDat: number, tongDiem: number): number {
  if (tongDiem <= 0) return 0;
  return Math.floor((diemDat * 100) / tongDiem);
}
/** Cham de: dung khi tap lua chon trung khop tap dap an */
export function chamDe(de: CauHoiCham[], traLoi: Record<string, number[]>): KetQuaCham {
  let diemDat = 0;
  let tongDiem = 0;
  let soDung = 0;
  const chiTiet = de.map(cau => {
    const banChon = [...new Set(traLoi[cau.id] ?? [])].sort((a, b) => a - b);
    const dung = cau.dap_an.length > 0 && banChon.length === cau.dap_an.length && banChon.every((x, i) => x === cau.dap_an[i]);
    tongDiem += cau.diem;
    if (dung) {
      diemDat += cau.diem;
      soDung++;
    }
    return { cau, ban_chon: banChon, dung };
  });
  return { diem: tinhPhanTram(diemDat, tongDiem), so_cau_dung: soDung, tong_cau: de.length, chiTiet };
}
/** Dat khi diem >= nguong; nguong luon bi kep toi thieu 90 (du lieu cu / sai cung khong ha duoc luat) */
export function datNguong(diem: number, nguong: number): boolean {
  return diem >= Math.max(nguong, NGUONG_DAT_TOI_THIEU);
}
