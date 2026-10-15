import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { LoaiDeXuat, nhat_ky, TrangThaiDeXuat, TrangThaiVai, Vai } from "@prisma/client";
import type { NguoiTomTatQt, NhatKyQt } from "@thien-khue/contracts";

/*
 * Luat maker-checker thuan (khong DB) — de test rieng. KIEN-TRUC muc 7, README muc 4.
 * So buoc theo loai (gon lai 07/10 — "cai nao hop ly, de dung thi giu"):
 *   - 3 buoc (de xuat -> kiem -> duyet, 3 nguoi khac nhau): TIEN + du lieu khach — LOAI_DE_XUAT_BA_BUOC.
 *   - 2 buoc (de xuat -> duyet, nguoi duyet != nguoi de xuat): moi loai con lai (quyen SKU ngoai le,
 *     qua / voucher, chinh sach...). Bo buoc kiem; de xuat 2 buoc con CHO_KIEM (du lieu cu / module khac tao) coi nhu CHO_DUYET.
 * Nguoi lien quan (ho so bi doi vai, nguoi ban tren don dang xac minh...) khong duoc tham gia buoc nao. DB con CHECK them mot lop.
 */

/** Loai giu 3 buoc: dong tien (ai nhan hoa hong, bao nhieu, chi tra) + xuat du lieu khach (khop contracts LOAI_DE_XUAT_BA_BUOC) */
export const LOAI_DE_XUAT_BA_BUOC: readonly LoaiDeXuat[] = ["CHI_TRA_HOA_HONG", "DIEU_CHINH_HOA_HONG", "XAC_MINH_DON", "XUAT_DU_LIEU_KHACH"];
/** Loai co buoc kiem (3 buoc) */
export function coBuocKiem(loai: LoaiDeXuat): boolean {
  return LOAI_DE_XUAT_BA_BUOC.includes(loai);
}
/** So buoc cua loai de xuat (2 hoac 3) */
export function soBuocDeXuat(loai: LoaiDeXuat): 2 | 3 {
  return coBuocKiem(loai) ? 3 : 2;
}
/** Trang thai khi lap de xuat: 3 buoc -> CHO_KIEM, 2 buoc -> CHO_DUYET */
export function trangThaiBatDau(loai: LoaiDeXuat): "CHO_KIEM" | "CHO_DUYET" {
  return coBuocKiem(loai) ? "CHO_KIEM" : "CHO_DUYET";
}
/** Trang thai hien thi / xet luat: de xuat 2 buoc con CHO_KIEM (du lieu cu, module khac tao) coi nhu CHO_DUYET */
export function trangThaiHieuLuc(dx: { loai: LoaiDeXuat; trang_thai: TrangThaiDeXuat }): TrangThaiDeXuat {
  return dx.trang_thai === "CHO_KIEM" && !coBuocKiem(dx.loai) ? "CHO_DUYET" : dx.trang_thai;
}
/** Trang thai DB duoc phep chuyen sang DA_DUYET / TU_CHOI o buoc duyet (updateMany co dieu kien) */
export function trangThaiChoDuyetDb(loai: LoaiDeXuat): TrangThaiDeXuat[] {
  return coBuocKiem(loai) ? ["CHO_DUYET"] : ["CHO_DUYET", "CHO_KIEM"];
}

/**
 * Vai lay tu CRM — MOI vai nghiep vu (= VAI_NGUON_CRM o common/utils/core): admin / manager theo role, SALE / CSKH / THUC_TAP /
 * CTV / KOL / KOC / DOI_TAC theo nhom quyen phong ban. Doi vai = doi phong ban / quyen cua nhan su o CRM; Thien Khue KHONG cap /
 * chuyen vai bang de xuat hay cap tay (con lai KHACH). De xuat CHUYEN_VAI vi vay da bo (400).
 */
export const VAI_TU_CRM: readonly Vai[] = ["ADMIN", "THIEN_KHUE", "QUAN_LY", "MENTOR", "SALE", "CSKH", "THUC_TAP", "CTV", "KOL", "KOC", "DOI_TAC"];
export const LOI_VAI_TU_CRM = "Vai lấy từ CRM — đổi phòng ban / quyền của nhân sự ở CRM (Quản trị nhân sự)";
/** Nem 400 neu vai do CRM quan ly */
export function kiemVaiKhongTuCrm(vai: Vai | null | undefined): void {
  if (vai && VAI_TU_CRM.includes(vai)) throw new BadRequestException(LOI_VAI_TU_CRM);
}

/** Vai duoc xem bang dieu hanh + lap de xuat + kiem */
export const VAI_XEM_QUAN_TRI: Vai[] = ["QUAN_LY", "ADMIN", "THIEN_KHUE"];
export const VAI_LAP_DE_XUAT: Vai[] = ["QUAN_LY", "ADMIN", "THIEN_KHUE"];
export const VAI_KIEM: Vai[] = ["QUAN_LY", "ADMIN", "THIEN_KHUE"];
/** Vai phai hoc dat moi duoc HOAT_DONG (KIEN-TRUC muc 5) */
export const VAI_PHAI_HOC: readonly Vai[] = ["SALE", "CSKH", "CTV", "THUC_TAP", "KOL", "KOC"];
/**
 * Ai duoc DUYET theo loai. Dong tien / chinh sach / qua tang hien thi cho khach / du lieu khach: chi THIEN_KHUE (CEO).
 * Khong dung luat "ADMIN luon qua" cua VaiGuard o day — ADMIN khong duyet thay CEO.
 */
const VAI_DUYET: Record<LoaiDeXuat, Vai[]> = {
  CAP_QUYEN_SKU: ["ADMIN", "THIEN_KHUE"],
  CHUYEN_VAI: ["ADMIN", "THIEN_KHUE"],
  KICH_HOAT_LAM_VIEC: ["ADMIN", "THIEN_KHUE"],
  DUYET_QUA_TANG: ["THIEN_KHUE"],
  DUYET_VOUCHER: ["THIEN_KHUE"],
  XAC_MINH_DON: ["ADMIN", "THIEN_KHUE"],
  DIEU_CHINH_HOA_HONG: ["THIEN_KHUE"],
  CHI_TRA_HOA_HONG: ["THIEN_KHUE"],
  DOI_CHINH_SACH: ["THIEN_KHUE"],
  XUAT_DU_LIEU_KHACH: ["THIEN_KHUE"],
  KHAC: ["ADMIN", "THIEN_KHUE"]
};
/** Vai duoc duyet mot de xuat (cap / doi vai cap cao thi chat hon) */
export function vaiDuyetTheoLoai(loai: LoaiDeXuat, duLieu?: unknown): Vai[] {
  if (loai === "CHUYEN_VAI") {
    const vai = layVaiDich(duLieu);
    if (vai === "THIEN_KHUE" || vai === "ADMIN") return ["THIEN_KHUE"];
  }
  return VAI_DUYET[loai];
}
/** Vai dich trong du_lieu CHUYEN_VAI (dang quan-tri { vai } hoac dang ho-so { vai_moi }) */
export function layVaiDich(duLieu: unknown): Vai | null {
  if (!duLieu || typeof duLieu !== "object") return null;
  const d = duLieu as Record<string, unknown>;
  const v = d.vai ?? d.vai_moi;
  return typeof v === "string" ? (v as Vai) : null;
}
export interface NguoiThaoTac {
  id: string;
  /** Vai HOAT_DONG */
  vai: Vai[];
}
export interface DeXuatToiThieu {
  loai: LoaiDeXuat;
  trang_thai: TrangThaiDeXuat;
  du_lieu: unknown;
  nguoi_de_xuat_id: string;
  nguoi_kiem_id: string | null;
}
export type LoiLuat = { kieu: "quyen" | "trang_thai"; thongDiep: string };
const coMot = (nd: NguoiThaoTac, ds: readonly Vai[]) => nd.vai.some(v => ds.includes(v));
/** Ly do KHONG duoc kiem (null = duoc). Loai 2 buoc khong co buoc kiem. */
export function loiKiem(nd: NguoiThaoTac, dx: DeXuatToiThieu, lienQuan: readonly string[] = []): LoiLuat | null {
  if (!coBuocKiem(dx.loai)) return { kieu: "trang_thai", thongDiep: "Loại đề xuất này 2 bước — không có bước kiểm, người có thẩm quyền duyệt trực tiếp" };
  if (dx.trang_thai !== "CHO_KIEM") return { kieu: "trang_thai", thongDiep: "Đề xuất không còn ở bước chờ kiểm" };
  if (dx.nguoi_de_xuat_id === nd.id) return { kieu: "quyen", thongDiep: "Người đề xuất không được tự kiểm đề xuất của mình" };
  if (lienQuan.includes(nd.id)) return { kieu: "quyen", thongDiep: "Bạn là người liên quan trực tiếp tới đề xuất này nên không được kiểm" };
  if (!coMot(nd, VAI_KIEM)) return { kieu: "quyen", thongDiep: "Chỉ Quản lý / Quản trị viên / Thiên Khuê được kiểm đề xuất" };
  return null;
}
/** Ly do KHONG duoc duyet (null = duoc) */
export function loiDuyet(nd: NguoiThaoTac, dx: DeXuatToiThieu, lienQuan: readonly string[] = []): LoiLuat | null {
  const tt = trangThaiHieuLuc(dx);
  if (tt !== "CHO_DUYET") {
    return { kieu: "trang_thai", thongDiep: tt === "CHO_KIEM" ? "Đề xuất chưa được kiểm — loại liên quan tiền cần người kiểm trước khi duyệt" : "Đề xuất đã được xử lý" };
  }
  if (dx.nguoi_de_xuat_id === nd.id) return { kieu: "quyen", thongDiep: "Người đề xuất không được tự duyệt đề xuất của mình" };
  if (dx.nguoi_kiem_id === nd.id) return { kieu: "quyen", thongDiep: "Người kiểm không được đồng thời là người duyệt" };
  if (lienQuan.includes(nd.id)) return { kieu: "quyen", thongDiep: "Bạn là người liên quan trực tiếp tới đề xuất này nên không được duyệt" };
  const can = vaiDuyetTheoLoai(dx.loai, dx.du_lieu);
  if (!coMot(nd, can)) {
    return { kieu: "quyen", thongDiep: can.length === 1 && can[0] === "THIEN_KHUE" ? "Loại đề xuất này chỉ Thiên Khuê được duyệt" : "Chỉ Quản trị viên / Thiên Khuê được duyệt loại đề xuất này" };
  }
  return null;
}
/** Chi nguoi de xuat rut duoc, khi chua co quyet dinh cuoi */
export function loiHuy(nd: NguoiThaoTac, dx: DeXuatToiThieu): LoiLuat | null {
  if (dx.trang_thai !== "CHO_KIEM" && dx.trang_thai !== "CHO_DUYET") return { kieu: "trang_thai", thongDiep: "Đề xuất đã được xử lý, không rút được" };
  if (dx.nguoi_de_xuat_id !== nd.id) return { kieu: "quyen", thongDiep: "Chỉ người đề xuất được rút đề xuất" };
  return null;
}
/** Nem exception Nest tu LoiLuat */
export function nemNeuLoi(loi: LoiLuat | null): void {
  if (!loi) return;
  if (loi.kieu === "trang_thai") throw new ConflictException(loi.thongDiep);
  throw new ForbiddenException(loi.thongDiep);
}
/**
 * Chuyen trang thai vai bang de xuat:
 *  - vai phai hoc khong duoc nhay len HOAT_DONG (chi kich hoat khi hoc dat) — tru khi dang TAM_DUNG; khi do
 *    ApDungDeXuatService.kiemHocDat VAN kiem lai dieu kien hoc (DANG_HOC -> TAM_DUNG -> HOAT_DONG khong lach duoc)
 *  - vai khong can hoc khong co trang thai DANG_HOC
 *  - TAM_DUNG / KET_THUC chi ap cho vai dang co
 */
export function kiemChuyenVai(vai: Vai, cu: TrangThaiVai | null, moi: TrangThaiVai): void {
  if (cu === moi) throw new ConflictException("Vai trò đã ở trạng thái này");
  const phaiHoc = VAI_PHAI_HOC.includes(vai);
  if (moi === "HOAT_DONG" && phaiHoc && cu !== "TAM_DUNG") {
    throw new BadRequestException("Vai này phải học và thi đạt (≥ 90%), bài thực hành được duyệt mới được kích hoạt — không kích hoạt bằng đề xuất");
  }
  if (moi === "DANG_HOC" && !phaiHoc) throw new BadRequestException("Vai này không có lộ trình học bắt buộc — chọn Hoạt động");
  if ((moi === "TAM_DUNG" || moi === "KET_THUC") && (cu === null || cu === "KET_THUC")) {
    throw new BadRequestException("Hồ sơ chưa có vai này (hoặc vai đã kết thúc)");
  }
}

/** Bo null / trung trong danh sach ho_so.id (truoc khi tra ho ten mot lan — NguoiTomTatRepository) */
export function locIdNguoi(ids: (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((x): x is string => !!x))];
}
export function anhXaNhatKy(n: nhat_ky, nguoi: Map<string, NguoiTomTatQt>): NhatKyQt {
  return {
    id: n.id,
    ho_so: n.ho_so_id ? (nguoi.get(n.ho_so_id) ?? { id: n.ho_so_id, ho_ten: "(không rõ)", email: null }) : null,
    tac_nhan: n.tac_nhan,
    hanh_dong: n.hanh_dong,
    doi_tuong: n.doi_tuong,
    doi_tuong_id: n.doi_tuong_id,
    du_lieu: n.du_lieu,
    created_at: n.created_at.toISOString()
  };
}
/** "2026-10-07" -> dau ngay theo gio Viet Nam */
export function dauNgayVn(ngay: string): Date {
  return new Date(`${ngay}T00:00:00+07:00`);
}
/** "2026-10-07" -> dau ngay HOM SAU theo gio Viet Nam (moc loai tru) */
export function sauNgayVn(ngay: string): Date {
  const d = dauNgayVn(ngay);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
