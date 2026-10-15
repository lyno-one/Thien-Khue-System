import type { TrangThaiVai, Vai } from "@prisma/client";

/** Phan nhan su CRM can de map vai (public.users.role / active + public.phong_ban.nhom_quyen cua phong ho) */
export interface NhanSuDeMap {
  role: string;
  active: boolean;
  /** phong_ban.nhom_quyen; chua co phong = KHONG / null. Gia tri la (CRM them nhom moi) -> khong vai */
  nhom_quyen: string | null;
}

export interface VaiKhoiTao {
  vai: Vai;
  trang_thai: TrangThaiVai;
}

/**
 * Trang thai vai phai hoc (SALE / CSKH / THUC_TAP / CTV / KOL / KOC) dong bo tu CRM: DANG_HOC — "hoc truoc khi ban"
 * (KIEN-TRUC muc 5) ap ca nhan su cu; chi HOAT_DONG khi hoc + thi dat (dao-tao / ho-so kich hoat). Dong bo KHONG BAO GIO tu nang len HOAT_DONG.
 */
export const TRANG_THAI_VAI_BAN_HANG_TU_CRM: TrangThaiVai = "DANG_HOC";

/**
 * Nhom quyen phong ban CRM -> vai Thien Khue (CRM migration 075 + 079). Doi tac khong can hoc -> HOAT_DONG.
 * KHO / KE_TOAN / KHONG (va nhom la) khong co trong bang -> khong vai nghiep vu.
 */
export const VAI_THEO_NHOM_QUYEN: Readonly<Record<string, VaiKhoiTao>> = Object.freeze({
  SALE: { vai: "SALE", trang_thai: TRANG_THAI_VAI_BAN_HANG_TU_CRM },
  CSKH: { vai: "CSKH", trang_thai: TRANG_THAI_VAI_BAN_HANG_TU_CRM },
  THUC_TAP: { vai: "THUC_TAP", trang_thai: TRANG_THAI_VAI_BAN_HANG_TU_CRM },
  CTV: { vai: "CTV", trang_thai: TRANG_THAI_VAI_BAN_HANG_TU_CRM },
  KOL: { vai: "KOL", trang_thai: TRANG_THAI_VAI_BAN_HANG_TU_CRM },
  KOC: { vai: "KOC", trang_thai: TRANG_THAI_VAI_BAN_HANG_TU_CRM },
  DOI_TAC: { vai: "DOI_TAC", trang_thai: "HOAT_DONG" }
} satisfies Record<string, VaiKhoiTao>);

/** Vai theo nhom quyen phong ban (null = khong vai: KHO, KE_TOAN, KHONG, chua co phong, gia tri la) */
export function vaiTheoNhomQuyen(nhomQuyen: string | null | undefined): VaiKhoiTao | null {
  const nhom = (nhomQuyen ?? "").trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(VAI_THEO_NHOM_QUYEN, nhom) ? { ...VAI_THEO_NHOM_QUYEN[nhom]! } : null;
}

/**
 * Map nhan su CRM -> vai Thien Khue (KIEN-TRUC muc 4) — vai CHI lay tu CRM, khong map theo chuc danh (users.position):
 *   role admin   -> ADMIN + THIEN_KHUE (HOAT_DONG);
 *   role manager -> QUAN_LY + MENTOR (HOAT_DONG);
 *   nhom_quyen SALE / CSKH / THUC_TAP / CTV / KOL / KOC -> vai cung ten (DANG_HOC — hoc dat moi HOAT_DONG);
 *   nhom_quyen DOI_TAC -> DOI_TAC (HOAT_DONG, khong can hoc);
 *   KHO / KE_TOAN / KHONG / chua co phong / nhom la -> khong vai nghiep vu.
 * Khong phai nhan su dang lam (null / active=false) -> [] (noi goi cap KHACH).
 */
export function mapVaiCrm(nhanSu: NhanSuDeMap | null | undefined): VaiKhoiTao[] {
  if (!nhanSu || nhanSu.active !== true) return [];
  const kq: VaiKhoiTao[] = [];
  if (nhanSu.role === "admin") kq.push({ vai: "ADMIN", trang_thai: "HOAT_DONG" }, { vai: "THIEN_KHUE", trang_thai: "HOAT_DONG" });
  if (nhanSu.role === "manager") kq.push({ vai: "QUAN_LY", trang_thai: "HOAT_DONG" }, { vai: "MENTOR", trang_thai: "HOAT_DONG" });
  const theoNhom = vaiTheoNhomQuyen(nhanSu.nhom_quyen);
  if (theoNhom && !kq.some(v => v.vai === theoNhom.vai)) kq.push(theoNhom);
  return kq;
}

/** Vai cap cho ho so moi khong phai nhan su CRM */
export const VAI_MAC_DINH: VaiKhoiTao = { vai: "KHACH", trang_thai: "HOAT_DONG" };

// ------------------------------------------------------------------ dong bo lai vai theo CRM (LOI-CAN-SUA muc 4 / 28)

/**
 * Vai ma CRM co the cap (mapVaiCrm) — moi vai nghiep vu. Dong bo chi dung toi dong vai cua cac vai nay
 * (va chi dong do CRM cap, xem keHoachDongBoVaiCrm); KHACH khong bao gio bi dong bo dung toi.
 */
export const VAI_NGUON_CRM: readonly Vai[] = ["ADMIN", "THIEN_KHUE", "QUAN_LY", "MENTOR", "SALE", "CSKH", "THUC_TAP", "CTV", "KOL", "KOC", "DOI_TAC"];

/**
 * Vai noi bo can nhan su CRM dang lam: nhan su bi khoa -> TAM_DUNG ca khi do con nguoi cap (giu nguon, khong tu khoi phuc).
 * Vai khac (THIEN_KHUE, MENTOR, THUC_TAP, CTV, KOL, KOC, DOI_TAC) chi bi dong bo dung toi khi chinh dong do do CRM cap
 * (nguon CRM / CRM_DONG_BO); dong do con nguoi cap (QUAN_TRI, DANG_KY cu...) giu nguyen.
 */
export const VAI_CAN_NHAN_SU_DANG_LAM: readonly Vai[] = ["ADMIN", "QUAN_LY", "SALE", "CSKH"];

/** nguon cua dong vai do CRM cap */
export const NGUON_CRM = "CRM";
/**
 * nguon cua dong vai do DONG BO tu tam dung / ket thuc (nhan su bi khoa, doi phong, doi role) — chi dong mang nhan nay
 * moi duoc dong bo tu khoi phuc; tam dung / ket thuc do con nguoi quyet dinh thi giu nguyen.
 */
export const NGUON_CRM_DONG_BO = "CRM_DONG_BO";

export interface VaiHienTai {
  vai: Vai;
  trang_thai: TrangThaiVai;
  nguon: string | null;
}

export interface DoiVaiCrm {
  vai: Vai;
  /** null = tao moi */
  cu: TrangThaiVai | null;
  moi: TrangThaiVai;
  /** null = giu nguon hien tai */
  nguon: string | null;
  ly_do: string;
}

const DANG_CO_HIEU_LUC: readonly TrangThaiVai[] = ["HOAT_DONG", "DANG_HOC"];

/**
 * Ham thuan: so vai hien tai voi nhan su CRM -> danh sach thay doi.
 *  - Ho so da lien ket CRM ma nhan su bi khoa / bi xoa: vai do CRM cap dang hieu luc -> TAM_DUNG; vai noi bo
 *    (VAI_CAN_NHAN_SU_DANG_LAM) do con nguoi cap cung TAM_DUNG nhung giu nguon.
 *  - Nhan su con lam nhung CRM khong con cap vai (doi phong / doi role): dong vai do CRM cap -> KET_THUC. Ca vai
 *    truoc day map theo chuc danh (CTV / KOC, nguon CRM) — nay CRM khong cap nua nen tu ket thuc.
 *  - CRM cap vai moi: chua co -> tao; da bi dong bo tam dung / ket thuc -> khoi phuc ve trang thai map
 *    (vai phai hoc ve DANG_HOC — nguoi da hoc dat bam "Kich hoat" / dao-tao kich hoat lai theo dieu kien hoc, khong nhay thang HOAT_DONG).
 *  - Vai bi con nguoi tam dung / ket thuc, hoac vai Thien Khue cap: khong dung.
 */
export function keHoachDongBoVaiCrm(hienTai: VaiHienTai[], nhanSu: NhanSuDeMap | null | undefined, daLienKetCrm: boolean): DoiVaiCrm[] {
  const muon = new Map(mapVaiCrm(nhanSu).map(v => [v.vai, v.trang_thai]));
  const biKhoa = daLienKetCrm && (!nhanSu || nhanSu.active !== true);
  const kq: DoiVaiCrm[] = [];
  for (const vai of VAI_NGUON_CRM) {
    const r = hienTai.find(v => v.vai === vai);
    const tt = muon.get(vai);
    const doCrmQuan = r?.nguon === NGUON_CRM || r?.nguon === NGUON_CRM_DONG_BO;
    if (r && DANG_CO_HIEU_LUC.includes(r.trang_thai)) {
      if (biKhoa) {
        if (!doCrmQuan && !VAI_CAN_NHAN_SU_DANG_LAM.includes(vai)) continue;
        kq.push({
          vai,
          cu: r.trang_thai,
          moi: "TAM_DUNG",
          // vai do con nguoi cap (QUAN_TRI...) van tam dung nhung giu nguon -> mo khoa CRM khong tu khoi phuc
          nguon: doCrmQuan ? NGUON_CRM_DONG_BO : null,
          ly_do: "Đồng bộ nhân sự CRM: tài khoản CRM đã bị khoá hoặc không còn"
        });
      } else if (!tt && doCrmQuan) {
        kq.push({ vai, cu: r.trang_thai, moi: "KET_THUC", nguon: NGUON_CRM_DONG_BO, ly_do: "Đồng bộ nhân sự CRM: không còn vai này trên CRM (đổi phòng ban / đổi quyền)" });
      }
      continue;
    }
    if (!tt) continue;
    if (!r) kq.push({ vai, cu: null, moi: tt, nguon: NGUON_CRM, ly_do: "Đồng bộ nhân sự CRM: được cấp vai mới trên CRM" });
    else if (r.nguon === NGUON_CRM_DONG_BO) kq.push({ vai, cu: r.trang_thai, moi: tt, nguon: NGUON_CRM, ly_do: "Đồng bộ nhân sự CRM: khôi phục vai theo CRM" });
  }
  return kq;
}
