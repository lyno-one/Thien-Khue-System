import type { LoaiLuyenAi, TrangThaiVai, Vai } from "@prisma/client";
import type { BangChungLuyenAi, DiemKyNangLuyenAi, PhienLuyenAi, TienDoLoaiLuyenAi, ViPhamLuyenAi, VaiXemLuyenAi, YeuCauLuyenAi } from "@thien-khue/contracts";
import { VAI_TOI_CAO } from "../guards/vai.guard";

/*
 * Luat "Luyen tu van voi AI" (Sales Training) — ham thuan, test rieng duoc. Hop dong: docs/TICH-HOP-SALES-TRAINING.md.
 *  - Phien DAT: diem_tong >= nguong (khong bao gio duoi 80) VA 0 loi cam ket sai chinh sach.
 *  - Du dieu kien: moi loai co du so phien dat (mac dinh 1 TU_VAN + 1 DOI_TRA) -> bai thuc hanh LUYEN_AI vao CHO_CHAM,
 *    mentor van phai duyet (khong tu dat).
 *  - Mentor tra ve (CHUA_DAT): chi phien nhan SAU luc cham moi duoc tinh lai.
 */

export const LOAI_LUYEN_AI: readonly LoaiLuyenAi[] = ["TU_VAN", "DOI_TRA"];
export const TEN_LOAI_LUYEN_AI: Record<LoaiLuyenAi, string> = { TU_VAN: "Tư vấn bán hàng", DOI_TRA: "Tình huống đổi trả" };
export const KY_NANG_LUYEN_AI = ["khai_thac", "lang_nghe", "gia_tri", "phan_doi", "chot", "tuan_thu"] as const;
/** Nguong san — cau hinh khoa chi duoc nang, khong ha */
export const NGUONG_LUYEN_AI_TOI_THIEU = 80;
/** Vai bat buoc luyen AI (CTV, KOL/KOC, thuc tap: giu bai nop tay) */
export const VAI_LUYEN_AI: readonly Vai[] = ["SALE", "CSKH"];
/** Han phieu vao Sales Training */
export const HAN_PHIEU_LUYEN_AI_MS = 10 * 60 * 1000;
/** Han phieu XEM lai mot phien (ngan: chi du de tab moi POST sang Sales Training) */
export const HAN_PHIEU_XEM_LUYEN_AI_MS = 2 * 60 * 1000;
/** Vai duoc xem phien cua nguoi khac — cung vai voi hang doi / cham bai thuc hanh (@Vai("MENTOR", "QUAN_LY"), ADMIN / THIEN_KHUE luon qua) */
export const VAI_XEM_PHIEN_NGUOI_KHAC: readonly Vai[] = ["MENTOR", "QUAN_LY"];
/** Gioi han so phien dua vao bang chung moi loai (diem cao nhat truoc) */
export const SO_PHIEN_BANG_CHUNG_MOI_LOAI = 3;

/** Doc khoa_hoc.yeu_cau_luyen_ai (Json) an toan. null / khong phai object -> khoa khong yeu cau */
export function docYeuCauLuyenAi(v: unknown): YeuCauLuyenAi | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as { nguong?: unknown; can?: unknown };
  const nguongTho = typeof o.nguong === "number" && Number.isFinite(o.nguong) ? Math.round(o.nguong) : NGUONG_LUYEN_AI_TOI_THIEU;
  const nguong = Math.min(100, Math.max(NGUONG_LUYEN_AI_TOI_THIEU, nguongTho));
  const canTho = o.can && typeof o.can === "object" && !Array.isArray(o.can) ? (o.can as Record<string, unknown>) : {};
  const soCan = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? Math.max(0, Math.min(10, Math.round(x))) : 1);
  const can = { TU_VAN: soCan(canTho.TU_VAN), DOI_TRA: soCan(canTho.DOI_TRA) };
  // Cau hinh 0 / 0 vo nghia (vao CHO_CHAM khong can phien nao) -> coi nhu mac dinh 1 / 1
  if (!can.TU_VAN && !can.DOI_TRA) return { nguong, can: { TU_VAN: 1, DOI_TRA: 1 } };
  return { nguong, can };
}

/** Phien dat: >= nguong (toi thieu 80) va khong co vi pham chinh sach */
export function datPhienLuyenAi(diemTong: number, soViPham: number, nguong = NGUONG_LUYEN_AI_TOI_THIEU): boolean {
  return Number.isFinite(diemTong) && diemTong >= Math.max(NGUONG_LUYEN_AI_TOI_THIEU, nguong) && soViPham === 0;
}

/** Duoc mo phieu luyen: co vai SALE / CSKH dang hoc hoac hoat dong */
export function coVaiLuyenAi(vaiChiTiet: { vai: Vai; trang_thai: TrangThaiVai }[]): boolean {
  return vaiChiTiet.some(v => VAI_LUYEN_AI.includes(v.vai) && (v.trang_thai === "DANG_HOC" || v.trang_thai === "HOAT_DONG"));
}

export interface PhienDeTinh {
  loai: LoaiLuyenAi;
  dat: boolean;
  diem_tong: number;
  nhan_luc: Date;
}

export interface TienDoLuyenAiTinh {
  loai: TienDoLoaiLuyenAi[];
  du: boolean;
  theoLoai: Record<LoaiLuyenAi, boolean>;
}

/** Tien do tung loai; moc != null -> chi tinh phien DAT nhan sau moc (mentor da tra ve truoc do) */
export function tinhTienDoLuyenAi(yc: YeuCauLuyenAi, phien: PhienDeTinh[], moc: Date | null): TienDoLuyenAiTinh {
  const theoLoai = { TU_VAN: false, DOI_TRA: false } as Record<LoaiLuyenAi, boolean>;
  const loai = LOAI_LUYEN_AI.map(l => {
    const cuaLoai = phien.filter(p => p.loai === l);
    const soDat = cuaLoai.filter(p => p.dat && (!moc || p.nhan_luc.getTime() > moc.getTime())).length;
    const can = yc.can[l];
    const dat = soDat >= can;
    theoLoai[l] = dat;
    return {
      loai: l,
      ten: TEN_LOAI_LUYEN_AI[l],
      can,
      so_dat: soDat,
      dat,
      so_phien: cuaLoai.length,
      diem_cao_nhat: cuaLoai.length ? Math.max(...cuaLoai.map(p => p.diem_tong)) : null
    };
  });
  return { loai, du: loai.every(x => x.dat), theoLoai };
}

/** Moc tinh lai: luc mentor cham CHUA_DAT bai LUYEN_AI gan nhat (null neu chua bi tra ve) */
export function mocTinhLai(baiLuyenAi: { trang_thai: string; cham_luc: Date | null }[]): Date | null {
  const ds = baiLuyenAi.filter(b => b.trang_thai === "CHUA_DAT" && b.cham_luc).map(b => b.cham_luc!.getTime());
  return ds.length ? new Date(Math.max(...ds)) : null;
}

export interface BanGhiPhienLuyenAi {
  id: string;
  phien_id_st: string;
  loai: LoaiLuyenAi;
  diem_tong: number;
  diem_ky_nang: unknown;
  so_vi_pham: number;
  vi_pham: unknown;
  tom_tat: string | null;
  diem_manh: unknown;
  can_cai_thien: unknown;
  dat: boolean;
  link_xem: string | null;
  ket_thuc_luc: Date | null;
  nhan_luc: Date;
}

const dsChuoi = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function anhXaPhienLuyenAi(p: BanGhiPhienLuyenAi): PhienLuyenAi {
  const kn = (p.diem_ky_nang && typeof p.diem_ky_nang === "object" ? p.diem_ky_nang : {}) as Record<string, unknown>;
  const diemKyNang = Object.fromEntries(KY_NANG_LUYEN_AI.map(k => [k, typeof kn[k] === "number" ? (kn[k] as number) : 0])) as DiemKyNangLuyenAi;
  const viPham: ViPhamLuyenAi[] = Array.isArray(p.vi_pham)
    ? p.vi_pham
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map(x => ({ loai: String(x.loai ?? ""), trich: String(x.trich ?? "") }))
    : [];
  return {
    id: p.id,
    phien_id_st: p.phien_id_st,
    loai: p.loai,
    diem_tong: p.diem_tong,
    diem_ky_nang: diemKyNang,
    so_vi_pham: p.so_vi_pham,
    vi_pham: viPham,
    tom_tat: p.tom_tat,
    diem_manh: dsChuoi(p.diem_manh),
    can_cai_thien: dsChuoi(p.can_cai_thien),
    dat: p.dat,
    link_xem: p.link_xem,
    ket_thuc_luc: p.ket_thuc_luc?.toISOString() ?? null,
    nhan_luc: p.nhan_luc.toISOString()
  };
}

/** Bang chung cho mentor: moi loai lay toi da N phien DAT (sau moc), diem cao nhat truoc */
export function taoBangChungLuyenAi(yc: YeuCauLuyenAi, phien: BanGhiPhienLuyenAi[], moc: Date | null, bayGio: Date): BangChungLuyenAi {
  const chon = LOAI_LUYEN_AI.flatMap(l =>
    phien
      .filter(p => p.loai === l && p.dat && (!moc || p.nhan_luc.getTime() > moc.getTime()))
      .sort((a, b) => b.diem_tong - a.diem_tong || b.nhan_luc.getTime() - a.nhan_luc.getTime())
      .slice(0, Math.max(yc.can[l], SO_PHIEN_BANG_CHUNG_MOI_LOAI))
  );
  return { loai: "LUYEN_AI", nguong: yc.nguong, phien: chon.map(anhXaPhienLuyenAi), cap_nhat_luc: bayGio.toISOString() };
}

/** Doc bai_thuc_hanh.bang_chung (Json) an toan */
export function docBangChungLuyenAi(v: unknown): BangChungLuyenAi | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Partial<BangChungLuyenAi>;
  if (o.loai !== "LUYEN_AI" || !Array.isArray(o.phien)) return null;
  return o as BangChungLuyenAi;
}

/** Tom tat mot dong cho cot mo_ta cua bai thuc hanh (mentor doc nhanh trong hang doi) */
export function moTaBaiLuyenAi(bc: BangChungLuyenAi): string {
  const dong = LOAI_LUYEN_AI.map(l => {
    const ds = bc.phien.filter(p => p.loai === l);
    return ds.length ? `${TEN_LOAI_LUYEN_AI[l]}: ${ds.map(p => `${p.diem_tong} điểm`).join(", ")}` : null;
  }).filter(Boolean);
  return `Đạt ngưỡng ${bc.nguong} điểm, không vi phạm chính sách. ${dong.join(" · ")}`;
}

/** id phien Sales Training la uuid (phien that). Chuoi khac (vd "e2e-script-...") = khong co ban ghi ben ST */
export function laPhienIdSt(s: string | null | undefined): s is string {
  return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * link_xem duoc luu: KHONG tin link Sales Training gui — luon dung lai "<stUrl>/luyen-tap/<phienId>" (cung origin da cau hinh,
 * dung phien). phienId khong phai uuid (phien gia / script) hoac chua cau hinh ST -> null.
 */
export function chuanHoaLinkXem(phienId: string, stUrl: string): string | null {
  if (!stUrl || !laPhienIdSt(phienId)) return null;
  return `${stUrl.replace(/\/+$/, "")}/luyen-tap/${phienId}`;
}

/**
 * Vai cua nguoi xem mot phien: chu phien -> CHU; nguoi khac can vai cham bai (MENTOR / QUAN_LY, ADMIN / THIEN_KHUE luon qua)
 * -> QUAN_LY (quan ly / admin / CEO) hoac MENTOR. null = khong duoc xem.
 */
export function vaiXemPhienLuyenAi(nguoiXemId: string, vaiHoatDong: readonly Vai[], chuPhienId: string): VaiXemLuyenAi | null {
  if (nguoiXemId === chuPhienId) return "CHU";
  if (vaiHoatDong.some(v => v === "QUAN_LY" || VAI_TOI_CAO.includes(v))) return "QUAN_LY";
  if (vaiHoatDong.includes("MENTOR")) return "MENTOR";
  return null;
}
