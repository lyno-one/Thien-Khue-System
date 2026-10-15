import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { TrangThaiVai, Vai } from "@prisma/client";
import type { MucDieuKien } from "@thien-khue/contracts";
import type { ThongTinNguoiDung } from "../types/nguoi-dung.type";

/*
 * Luat vai thuan (khong DB) — de test rieng. KIEN-TRUC muc 4, 5, 7.
 */

/** Vai phai hoc dat moi duoc HOAT_DONG (giong contracts VAI_PHAI_HOC) */
export const VAI_PHAI_HOC: readonly Vai[] = ["SALE", "CSKH", "CTV", "THUC_TAP", "KOL", "KOC"];
/** Vai chi ADMIN / THIEN_KHUE duoc cap / doi */
export const VAI_CAP_CAO: readonly Vai[] = ["QUAN_LY", "ADMIN", "THIEN_KHUE"];
/** Vai duoc quan tri vai cua nguoi khac */
export const VAI_QUAN_TRI_VAI: readonly Vai[] = ["QUAN_LY", "ADMIN", "THIEN_KHUE"];
export function laVaiPhaiHoc(vai: Vai): boolean {
  return VAI_PHAI_HOC.includes(vai);
}
/** Trang thai khi cap vai moi: vai phai hoc -> DANG_HOC (hoc truoc khi ban), con lai HOAT_DONG */
export function trangThaiKhoiTao(vai: Vai): TrangThaiVai {
  return laVaiPhaiHoc(vai) ? "DANG_HOC" : "HOAT_DONG";
}
function coVaiHoatDong(nd: Pick<ThongTinNguoiDung, "vai">, ds: readonly Vai[]): boolean {
  return nd.vai.some(v => ds.includes(v));
}
/**
 * Kiem nguoi doi co duoc thay doi `vai` cua ho so `hoSoDichId` khong.
 * - Khong ai tu cap / tu doi vai cua chinh minh (ke ca ADMIN) — tach nguoi doi va nguoi duoc doi.
 * - Can QUAN_LY / ADMIN / THIEN_KHUE dang HOAT_DONG.
 * - Vai cap cao (QUAN_LY, ADMIN, THIEN_KHUE): chi ADMIN / THIEN_KHUE; THIEN_KHUE chi THIEN_KHUE cap.
 */
export function kiemQuyenDoiVai(nguoiDoi: Pick<ThongTinNguoiDung, "id" | "vai">, hoSoDichId: string, vai: Vai): void {
  if (nguoiDoi.id === hoSoDichId) {
    throw new ForbiddenException("Không thể tự cấp hoặc thay đổi vai trò của chính mình");
  }
  if (!coVaiHoatDong(nguoiDoi, VAI_QUAN_TRI_VAI)) {
    throw new ForbiddenException("Chỉ Quản lý / Quản trị viên / Thiên Khuê được thay đổi vai trò");
  }
  if (vai === "THIEN_KHUE" && !nguoiDoi.vai.includes("THIEN_KHUE")) {
    throw new ForbiddenException("Chỉ Thiên Khuê được cấp hoặc thay đổi vai Thiên Khuê");
  }
  if (VAI_CAP_CAO.includes(vai) && !coVaiHoatDong(nguoiDoi, ["ADMIN", "THIEN_KHUE"])) {
    throw new ForbiddenException("Chỉ Quản trị viên / Thiên Khuê được cấp hoặc thay đổi vai quản lý, quản trị");
  }
}
/**
 * Chuyen trang thai vai hop le (quan tri doi tay):
 *   DANG_HOC  -> TAM_DUNG | KET_THUC   (HOAT_DONG chi qua kich hoat khi hoc dat)
 *   HOAT_DONG -> TAM_DUNG | KET_THUC
 *   TAM_DUNG  -> HOAT_DONG (vai phai hoc: phai dat dieu kien hoc — noi goi kiem) | KET_THUC
 *   KET_THUC  -> (cap lai bang "them vai")
 */
export function kiemChuyenTrangThai(vai: Vai, cu: TrangThaiVai, moi: TrangThaiVai): void {
  if (cu === moi) throw new ConflictException("Vai trò đã ở trạng thái này");
  if (cu === "KET_THUC") throw new BadRequestException("Vai trò đã kết thúc — dùng chức năng thêm vai để cấp lại");
  if (moi === "DANG_HOC") throw new BadRequestException("Không chuyển vai về trạng thái đang học bằng tay");
  if (moi === "HOAT_DONG" && cu === "DANG_HOC" && laVaiPhaiHoc(vai)) {
    throw new BadRequestException("Vai đang học chỉ được kích hoạt khi học và thi đạt (≥ 90%) và bài thực hành được duyệt");
  }
}

/** Che email khi nhan vien doi chieu qua dien thoai: "ng***@gmail.com" */
export function anEmail(email: string | null): string | null {
  if (!email) return null;
  const [ten, mien] = email.split("@");
  if (!ten || !mien) return "***";
  return `${ten.slice(0, Math.min(2, ten.length))}***@${mien}`;
}

/*
 * Dieu kien "hoc truoc khi ban" (KIEN-TRUC muc 5) — phan thuan (khong DB) de test rieng.
 *   moi khoa NEN_TANG / NGHIEP_VU bat buoc ap cho vai: xong moi bai hoc, moi bai kiem tra bat buoc dat >= nguong (90),
 *   khoa can thuc hanh -> co bai thuc hanh DAT.
 */

export interface KhoaHocCanDat {
  id: string;
  ma: string;
  ten: string;
  can_thuc_hanh: boolean;
  bai_hoc: { id: string }[];
  bai_kiem_tra: { id: string; tieu_de: string; nguong_dat: number }[];
}
export interface DuLieuHocCuaHoSo {
  /** bai_hoc_id da hoan thanh */
  baiHocXong: Set<string>;
  /** diem cao nhat (0..100) cua luot dat theo bai_kiem_tra_id */
  diemDatCaoNhat: Map<string, number>;
  /** khoa_hoc_id co bai thuc hanh DAT */
  thucHanhDat: Set<string>;
}
export interface KetQuaDieuKien {
  dat: boolean;
  dieu_kien: MucDieuKien[];
  con_thieu: string[];
}
/** Ham thuan: danh gia checklist tu khoa hoc can dat + du lieu hoc cua ho so */
export function danhGiaDieuKien(khoaHoc: KhoaHocCanDat[], hoc: DuLieuHocCuaHoSo): KetQuaDieuKien {
  if (!khoaHoc.length) {
    // Fail-safe: chua cau hinh khoa bat buoc thi khong tu kich hoat
    return { dat: false, dieu_kien: [], con_thieu: ["Chưa có khoá học bắt buộc cho vai trò này — liên hệ quản lý"] };
  }
  const dieu_kien: MucDieuKien[] = [];
  for (const k of khoaHoc) {
    const goc = { khoa_hoc_id: k.id, khoa_hoc_ma: k.ma, khoa_hoc_ten: k.ten };
    const xong = k.bai_hoc.filter(b => hoc.baiHocXong.has(b.id)).length;
    dieu_kien.push({
      ...goc,
      loai: "BAI_HOC",
      mo_ta: `Hoàn thành ${xong}/${k.bai_hoc.length} bài học`,
      dat: xong === k.bai_hoc.length
    });
    for (const kt of k.bai_kiem_tra) {
      const diem = hoc.diemDatCaoNhat.get(kt.id);
      const dat = diem !== undefined && diem >= kt.nguong_dat;
      dieu_kien.push({
        ...goc,
        loai: "KIEM_TRA",
        mo_ta: dat ? `${kt.tieu_de}: đạt ${diem}%` : `${kt.tieu_de}: cần đạt ≥ ${kt.nguong_dat}%`,
        dat
      });
    }
    if (k.can_thuc_hanh) {
      const dat = hoc.thucHanhDat.has(k.id);
      dieu_kien.push({ ...goc, loai: "THUC_HANH", mo_ta: dat ? "Bài thực hành đã được duyệt" : "Bài thực hành chưa được duyệt", dat });
    }
  }
  const con_thieu = dieu_kien.filter(d => !d.dat).map(d => `${d.khoa_hoc_ten} — ${d.mo_ta}`);
  return { dat: con_thieu.length === 0, dieu_kien, con_thieu };
}
