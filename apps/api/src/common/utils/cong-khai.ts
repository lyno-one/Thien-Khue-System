import { LoaiLead } from "@prisma/client";
import type { DongBangSize, GuiLienHeBody, LoTrinhDangKy, SanPhamCongKhai, TrangLienHe } from "@thien-khue/contracts";
import { NHAN_LO_TRINH, NHAN_LUA_CHON, NHOM_THEO_TIEN_TO, THU_TU_SIZE } from "../../constants/cong-khai.constants";
import type { MauCrm, TonKhoCrm } from "../../infrastructure/crm/crm-doc.service";

/*
 * Gioi han so lan goi theo khoa (IP) trong bo nho — cua so truot.
 * Du cho mot tien trinh API; chay nhieu ban (scale ngang) thi can kho chung (Redis...) — chua can o giai doan nay.
 */
export class GioiHanTheoKhoa {
  private readonly lanGoi = new Map<string, number[]>();

  constructor(
    private readonly toiDa: number,
    private readonly cuaSoMs: number,
    /** Dong ho tiem vao de test */
    private readonly bayGio: () => number = () => Date.now()
  ) {}

  /** Ghi nhan mot lan goi. true = con trong han muc; false = vuot (khong tinh lan nay) */
  thu(khoa: string): boolean {
    const nay = this.bayGio();
    const moc = nay - this.cuaSoMs;
    const ds = (this.lanGoi.get(khoa) ?? []).filter(t => t > moc);
    if (ds.length >= this.toiDa) {
      this.lanGoi.set(khoa, ds);
      return false;
    }
    ds.push(nay);
    this.lanGoi.set(khoa, ds);
    if (this.lanGoi.size > 5000) this.donDep(moc);
    return true;
  }

  /** Giay con lai toi khi khoa duoc goi tiep */
  conLaiGiay(khoa: string): number {
    const ds = this.lanGoi.get(khoa);
    if (!ds?.length) return 0;
    return Math.max(0, Math.ceil((ds[0]! + this.cuaSoMs - this.bayGio()) / 1000));
  }

  /** Xoa khoa da het han de map khong phinh vo han */
  private donDep(moc: number) {
    for (const [k, ds] of this.lanGoi) if (!ds.some(t => t > moc)) this.lanGoi.delete(k);
  }
}

/* Luat thuan cua form lien he cong khai (khong DB) */

/** Trang -> loai lead */
export function loaiLeadTheoTrang(trang: TrangLienHe): LoaiLead {
  if (trang === "DAO_TAO") return LoaiLead.DANG_KY_HOC;
  if (trang === "DOI_TAC") return LoaiLead.HOP_TAC;
  return LoaiLead.MUA_HANG;
}
/** Co nen goi y tao tai khoan: CTV / KOL-KOC / thuc tap tu dang ky; khach VIP / than thien de theo doi hang the */
export function nenGoiYDangKy(trang: TrangLienHe, loTrinh?: LoTrinhDangKy): boolean {
  if (trang === "DAO_TAO") return !!loTrinh && loTrinh !== "sale";
  return trang === "VIP" || trang === "THAN_THIEN";
}
/** Gom noi dung form thanh mot doan nhu_cau cho Sale doc */
export function taoNhuCau(b: Pick<GuiLienHeBody, "trang" | "lo_trinh" | "lua_chon" | "loi_nhan" | "ma_mau_quan_tam">): string | null {
  const dong: string[] = [];
  if (b.trang === "DAO_TAO" && b.lo_trinh) dong.push(`Lộ trình: ${NHAN_LO_TRINH[b.lo_trinh]}`);
  if (b.lua_chon) dong.push(`${NHAN_LUA_CHON[b.trang]}: ${b.lua_chon}`);
  if (b.ma_mau_quan_tam) dong.push(`Mẫu quan tâm: ${b.ma_mau_quan_tam}`);
  if (b.loi_nhan) dong.push(`Lời nhắn: ${b.loi_nhan}`);
  return dong.length ? dong.join("\n") : null;
}

/* Luat thuan cua san pham cong khai: whitelist truong, khong lo id noi bo / so luong ton */

/** Nhom hien thi: khan lua uu tien theo ten, con lai theo 2 ky tu dau cua ma (quy uoc ma CRM) */
export function suyNhom(ma: string, ten: string): string {
  if (/khăn/i.test(ten)) return "Khăn lụa";
  return NHOM_THEO_TIEN_TO[ma.slice(0, 2).toUpperCase()] ?? "LYNO";
}
/** MauCrm -> ban cong khai (whitelist) */
export function sangCongKhai(m: MauCrm): SanPhamCongKhai {
  const trangThai = m.trang_thai === "dang_ban" ? "dang_ban" : "het_hang";
  return {
    ma: m.ma,
    ten: m.ten,
    gia_ban: m.gia_ban === null || m.gia_ban === undefined ? null : Math.round(Number(m.gia_ban)),
    anh_url: m.anh_url ?? null,
    trang_thai: trangThai,
    con_hang: trangThai === "dang_ban",
    nhom: suyNhom(m.ma, m.ten)
  };
}
/** size_chart (jsonb tu do) -> mang dong { size, ...cot } chi gom chuoi; bo dong khong co size */
export function chuanHoaBangSize(raw: unknown): DongBangSize[] {
  if (!Array.isArray(raw)) return [];
  const kq: DongBangSize[] = [];
  for (const dong of raw) {
    if (!dong || typeof dong !== "object" || Array.isArray(dong)) continue;
    const ban: Record<string, string> = {};
    for (const [k, v] of Object.entries(dong as Record<string, unknown>)) {
      if (typeof v === "string" || typeof v === "number") ban[k] = String(v);
    }
    if (!ban.size) continue;
    kq.push(ban as DongBangSize);
  }
  return kq;
}
function soSanhSize(a: string, b: string) {
  const ia = THU_TU_SIZE.indexOf(a.toUpperCase());
  const ib = THU_TU_SIZE.indexOf(b.toUpperCase());
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  return a.localeCompare(b, "vi", { numeric: true });
}
/** Ton kho -> chi ten mau / size con hang (so_luong > 0), khong lo so luong */
export function tomTatTonKho(ton: TonKhoCrm[]): { mau_sac: string[]; size_con: string[] } {
  const con = ton.filter(t => Number(t.so_luong) > 0);
  const mau = [...new Set(con.map(t => t.mau_sac?.trim()).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "vi"));
  const size = [...new Set(con.map(t => t.size?.trim()).filter((x): x is string => !!x))].sort(soSanhSize);
  return { mau_sac: mau, size_con: size };
}
