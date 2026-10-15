import type { HangThanhVien, Vai } from "@prisma/client";
import { ForbiddenException } from "@nestjs/common";
import { chuanHoaSdt, laSdtHopLe } from "../../infrastructure/crm/chuan-hoa-sdt";
import type { ThongTinNguoiDung } from "../types/nguoi-dung.type";

/*
 * Luat hang the — ham thuan (khong DB) de test truc tiep.
 * Hang KHONG luu: luon tinh lai tu tong mua hop le CRM luc doc -> don hoan / huy tu rot, hang tu tinh lai.
 */

export const SO_LAN_MUA_KH_HANH_PHUC = 10;
export interface CauHinhHangTinh {
  hang: HangThanhVien;
  ten: string;
  nguong_tich_luy: number;
  giam_gia_phan_tram: number;
  quyen_loi: string | null;
  bat: boolean;
}
export interface KetQuaTinhHang {
  hang: HangThanhVien | null;
  ten_hang: string;
  giam_gia_phan_tram: number;
  quyen_loi: string | null;
  hang_tiep_theo: { hang: HangThanhVien; ten: string; nguong_tich_luy: number; con_thieu: number } | null;
}
/** Don hop le (khop CrmDocService.DIEU_KIEN_DON_HOP_LE): BAN_HANG, khong huy / hoan, khong bi tra ca don */
export function laDonHopLe(don: { loai_don: string; trang_thai: string; da_tra_hang?: boolean | null }): boolean {
  return don.loai_don === "BAN_HANG" && don.trang_thai !== "huy" && don.trang_thai !== "hoan" && don.da_tra_hang !== true;
}
/** Tong tich luy tu danh sach don (dung khi da co don trong tay, vd hien thi chi tiet) */
export function tinhTichLuy(
  dsDon: { loai_don: string; trang_thai: string; tong_tien: number; da_tra_hang?: boolean | null; tien_tra_hang?: number | null }[]
): { tong_tien: number; so_don: number } {
  let tong = 0;
  let soDon = 0;
  for (const d of dsDon) {
    if (!laDonHopLe(d)) continue;
    // Tra mot phan: tich luy = tong_tien - tien da tra (giong TIEN_HOP_LE cua CrmDocService)
    tong += Math.max(0, (Number(d.tong_tien) || 0) - (Number(d.tien_tra_hang) || 0));
    soDon += 1;
  }
  return { tong_tien: tong, so_don: soDon };
}
/**
 * Hang cao nhat co nguong <= tong mua (chi cau hinh dang bat).
 * 49.999.999 -> thuong; 50.000.000 -> Than thiet; 100.000.000 -> VIP (theo seed).
 */
export function tinhHang(tongMua: number, cauHinh: CauHinhHangTinh[]): KetQuaTinhHang {
  const ds = cauHinh.filter(c => c.bat).sort((a, b) => a.nguong_tich_luy - b.nguong_tich_luy);
  let dat: CauHinhHangTinh | null = null;
  let tiep: CauHinhHangTinh | null = null;
  for (const c of ds) {
    if (tongMua >= c.nguong_tich_luy) dat = c;
    else {
      tiep = c;
      break;
    }
  }
  return {
    hang: dat?.hang ?? null,
    ten_hang: dat?.ten ?? "Khách hàng",
    giam_gia_phan_tram: dat?.giam_gia_phan_tram ?? 0,
    quyen_loi: dat?.quyen_loi ?? null,
    hang_tiep_theo: tiep
      ? { hang: tiep.hang, ten: tiep.ten, nguong_tich_luy: tiep.nguong_tich_luy, con_thieu: Math.max(0, tiep.nguong_tich_luy - tongMua) }
      : null
  };
}
/** Uu dai co hang_ap_dung rong = moi hang thanh vien (khong ap cho khach thuong) */
export function hangDuocHuong(hangApDung: HangThanhVien[], hangKhach: HangThanhVien | null): boolean {
  if (!hangKhach) return false;
  return hangApDung.length === 0 || hangApDung.includes(hangKhach);
}
/** Che SDT khi hien cho nguoi khong can biet day du: 0901234567 -> 090***4567 */
export function cheSdt(sdt: string): string {
  if (sdt.length < 7) return "***";
  return `${sdt.slice(0, 3)}***${sdt.slice(-4)}`;
}

/*
 * Danh tinh khach CRM cua nguoi dang dang nhap (LOI-CAN-SUA muc 1, 3).
 * SDT trong ho so do nguoi dung tu khai -> CHI coi la SDT mua hang khi da xac minh (ho_so.sdt_xac_minh_luc).
 * Service doc lai ho so tu DB (HoSoKhachRepository.laySdtHoSo, khong dung nd.hoSo) vi co xac minh khong nam trong
 * ThongTinNguoiDung va phai moi nhat, roi dua vao ham thuan ben duoi.
 */

/** Ma loi de web nhan ra va hien huong dan (khong phai loi chung) */
export const MA_LOI_SDT_CHUA_XAC_MINH = "SDT_CHUA_XAC_MINH";
export const THONG_DIEP_SDT_CHUA_XAC_MINH =
  "Số điện thoại của bạn chưa được xác minh. Hãy liên hệ CSKH LYNO để được gọi xác nhận số — sau khi xác minh, bạn sẽ xem được hạng thành viên, đơn hàng, ưu đãi và chương trình Khách hàng hạnh phúc.";
/** Phan ho so can de xac dinh SDT khach (doc tu DB) */
export interface HoSoSdt {
  sdt: string | null;
  sdt_chuan: string | null;
  sdt_xac_minh_luc: Date | null;
}
/**
 * SDT chuan (da xac minh) cua chu ho so — ham thuan, nhan ho so vua doc tu DB.
 * - null: ho so khong ton tai / chua co SDT hop le (khong noi duoc voi khach CRM, khong lo gi)
 * - 403 SDT_CHUA_XAC_MINH: co SDT nhung chua xac minh
 */
export function sdtKhachDaXacMinh(hoSo: HoSoSdt | null): string | null {
  const chuan = hoSo?.sdt_chuan ?? (hoSo?.sdt ? chuanHoaSdt(hoSo.sdt) : "");
  if (!hoSo || !laSdtHopLe(chuan)) return null;
  if (!hoSo.sdt_xac_minh_luc) throw new ForbiddenException({ code: MA_LOI_SDT_CHUA_XAC_MINH, message: THONG_DIEP_SDT_CHUA_XAC_MINH });
  return chuan;
}
/**
 * Quyet dinh chi Thien Khue (CEO): duyet qua, duyet voucher, doi chinh sach hang.
 * Kiem vai THIEN_KHUE THAT — khong dung coVai (VAI_TOI_CAO cho ADMIN qua). LOI-CAN-SUA muc 5, 12.
 */
export function laThienKhueThat(nd: Pick<ThongTinNguoiDung, "vai">): boolean {
  return nd.vai.includes("THIEN_KHUE" as Vai);
}
export function kiemThienKhueThat(nd: Pick<ThongTinNguoiDung, "vai">, viec: string): void {
  if (!laThienKhueThat(nd)) throw new ForbiddenException(`Chỉ Thiên Khuê được ${viec} — Quản trị viên không làm thay`);
}
