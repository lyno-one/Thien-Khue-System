import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Ky / kiem chu ky server->server voi Sales Training (docs/TICH-HOP-SALES-TRAINING.md muc 3).
 *   X-TK-Thoi-Gian: <unix giay>
 *   X-TK-Chu-Ky:    hex(HMAC-SHA256(secret, "<thoi-gian>.<METHOD>.<path>.<raw body hoac rong>"))
 * Ham thuan (khong doc env) — guard truyen secret vao, test goi truc tiep.
 */

export const HEADER_THOI_GIAN = "x-tk-thoi-gian";
export const HEADER_CHU_KY = "x-tk-chu-ky";
/** Lech gio toi da giua hai may (giay) — qua thi coi la gui lai / gia mao */
export const LECH_GIO_TOI_DA_GIAY = 300;
/** Bi mat qua ngan thi coi nhu chua cau hinh (tu choi het) */
export const DO_DAI_BI_MAT_TOI_THIEU = 32;

/** Chuoi duoc ky: "<thoi-gian>.<METHOD>.<path>.<body>" */
export function chuoiKy(thoiGian: string, phuongThuc: string, duongDan: string, than: string): string {
  return `${thoiGian}.${phuongThuc.toUpperCase()}.${duongDan}.${than}`;
}

export function kyHmac(biMat: string, thoiGian: string, phuongThuc: string, duongDan: string, than = ""): string {
  return createHmac("sha256", biMat).update(chuoiKy(thoiGian, phuongThuc, duongDan, than), "utf8").digest("hex");
}

/** Header ky san cho request di (Sales Training dung cung cong thuc; o day dung cho test / cong cu) */
export function taoHeaderKy(biMat: string, phuongThuc: string, duongDan: string, than = "", bayGioMs = Date.now()): Record<string, string> {
  const thoiGian = String(Math.floor(bayGioMs / 1000));
  return { "X-TK-Thoi-Gian": thoiGian, "X-TK-Chu-Ky": kyHmac(biMat, thoiGian, phuongThuc, duongDan, than) };
}

export type LyDoChuKySai = "CHUA_CAU_HINH" | "THIEU_HEADER" | "LECH_GIO" | "SAI_CHU_KY";
export type KetQuaKiemChuKy = { hopLe: true } | { hopLe: false; lyDo: LyDoChuKySai };

export interface DuLieuKiemChuKy {
  biMat: string;
  thoiGian: string | undefined;
  chuKy: string | undefined;
  phuongThuc: string;
  /** Cac duong dan chap nhan (vd co / khong tien to /api) — chu ky khop MOT trong so do la du */
  duongDan: string[];
  than: string;
  bayGioMs?: number;
}

/** So hai chuoi hex bang timingSafeEqual (khac do dai -> false, khong nem) */
function bangNhauAnToan(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function kiemChuKy(d: DuLieuKiemChuKy): KetQuaKiemChuKy {
  if (!d.biMat || d.biMat.length < DO_DAI_BI_MAT_TOI_THIEU) return { hopLe: false, lyDo: "CHUA_CAU_HINH" };
  const thoiGian = d.thoiGian?.trim();
  const chuKy = d.chuKy?.trim().toLowerCase();
  if (!thoiGian || !chuKy || !/^\d{1,12}$/.test(thoiGian) || !/^[0-9a-f]{64}$/.test(chuKy)) return { hopLe: false, lyDo: "THIEU_HEADER" };
  const bayGio = Math.floor((d.bayGioMs ?? Date.now()) / 1000);
  if (Math.abs(bayGio - Number(thoiGian)) > LECH_GIO_TOI_DA_GIAY) return { hopLe: false, lyDo: "LECH_GIO" };
  // Kiem het cac bien the (khong dung som) — thoi gian khong phu thuoc bien the nao khop
  let khop = false;
  for (const p of d.duongDan) {
    if (bangNhauAnToan(kyHmac(d.biMat, thoiGian, d.phuongThuc, p, d.than), chuKy)) khop = true;
  }
  return khop ? { hopLe: true } : { hopLe: false, lyDo: "SAI_CHU_KY" };
}
