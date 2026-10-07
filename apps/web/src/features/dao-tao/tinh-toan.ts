import { NHAN_VAI } from "@thien-khue/contracts";
import type { BaiHocTomTat, ChuongKhoaHoc, KhoaHocTomTat, LoaiKhoaHoc, ThayDoiSauDanhGia } from "./kieu";

/* Ham thuan (khong React) cho giao dien LMS — bam logic LMS.dc.html */

export const NHAN_LOAI_KHOA: Record<LoaiKhoaHoc, string> = {
  NEN_TANG: "Bắt buộc",
  NGHIEP_VU: "Chuyên sâu",
  SAN_PHAM: "Sản phẩm"
};

export const NHAN_LOC_LOAI: Record<LoaiKhoaHoc, string> = {
  NEN_TANG: "Nền tảng",
  NGHIEP_VU: "Nghiệp vụ",
  SAN_PHAM: "Sản phẩm"
};

/** Nhan khoa: NEN_TANG luon "Bắt buộc"; khoa khac bat_buoc thi ghi them */
export function nhanKhoa(k: Pick<KhoaHocTomTat, "loai" | "bat_buoc">): string {
  if (k.loai === "NEN_TANG") return "Bắt buộc";
  return NHAN_LOAI_KHOA[k.loai];
}

/**
 * Bia khoa theo he trang xanh (CRM DESIGN.md): class token theo loai khoa — khong con dung mau_sac hex cua khoa
 * (bang mau cu vang / tim / ngoc da bo). nen = nen bia, chu = so / ma tren bia, dai = net trang tri (stroke currentColor).
 */
export interface BiaKhoa {
  nen: string;
  chu: string;
  dai: string;
}

const BIA: Record<LoaiKhoaHoc, BiaKhoa> = {
  NEN_TANG: { nen: "bg-chinh-nhat", chu: "text-chinh-dam", dai: "text-xanh-200" },
  NGHIEP_VU: { nen: "bg-xanh-100", chu: "text-xanh-800", dai: "text-xanh-300" },
  SAN_PHAM: { nen: "bg-be-mat-phu", chu: "text-chu", dai: "text-vien-dam" }
};

export function biaKhoa(loai: LoaiKhoaHoc | null | undefined): BiaKhoa {
  return (loai && BIA[loai]) || BIA.NEN_TANG;
}

/** Nhan nut khoa: Bắt đầu / Tiếp tục / Ôn lại */
export function nhanNutKhoa(k: KhoaHocTomTat): string {
  if (k.tien_do.trang_thai === "CAN_HOC_LAI") return "Học lại";
  if (k.tien_do.so_bai_xong === 0) return "Bắt đầu";
  if (k.tien_do.so_bai_xong >= k.tien_do.so_bai) return "Ôn lại";
  return "Tiếp tục";
}

export function phanTram(xong: number, tong: number): number {
  if (!tong) return 0;
  return Math.max(0, Math.min(100, Math.round((xong / tong) * 100)));
}

/** Tong tien do moi khoa: so bai xong / tong, so khoa dang theo, so khoa hoan thanh */
export function tongTienDo(ds: KhoaHocTomTat[]) {
  let xong = 0;
  let tong = 0;
  let dangTheo = 0;
  let hoanThanh = 0;
  for (const k of ds) {
    xong += k.tien_do.so_bai_xong;
    tong += k.tien_do.so_bai;
    if (k.tien_do.so_bai_xong > 0) dangTheo++;
    if (k.tien_do.hoan_thanh) hoanThanh++;
  }
  return { xong, tong, dangTheo, hoanThanh, phanTram: phanTram(xong, tong) };
}

/** Moi bai cua khoa theo thu tu chuong -> bai (de tim bai truoc / sau, bai chua xong) */
export function phangBai(chuong: ChuongKhoaHoc[]): (BaiHocTomTat & { ten_chuong: string | null })[] {
  return chuong.flatMap(c => [...c.bai_hoc].sort((a, b) => a.thu_tu - b.thu_tu).map(b => ({ ...b, ten_chuong: c.ten })));
}

/** Bai dau tien chua xong (hoac bai dau) */
export function baiChuaXong<T extends { da_xong: boolean }>(dsBai: T[]): T | null {
  return dsBai.find(b => !b.da_xong) ?? dsBai[0] ?? null;
}

/** Huy hieu o hero tong quan (LMS.dc.html) */
export function huyHieu(ds: KhoaHocTomTat[], soChungChi: number): { nhan: string; co: boolean }[] {
  const t = tongTienDo(ds);
  const quaKiemTra = ds.some(k => k.co_bai_kiem_tra && k.tien_do.kiem_tra_dat);
  return [
    { nhan: "Khởi đầu", co: t.xong >= 1 },
    { nhan: "Nửa chặng", co: t.tong > 0 && t.xong * 2 >= t.tong },
    { nhan: "Qua bài kiểm tra", co: quaKiemTra },
    { nhan: "Chứng chỉ đầu tiên", co: soChungChi >= 1 }
  ];
}

/** Dieu kien mo chung chi (LMS.dc.html certHint) */
export function goiYChungChi(k: KhoaHocTomTat): string {
  const can: string[] = ["hoàn thành tất cả bài học"];
  if (k.co_bai_kiem_tra) can.push("đạt bài kiểm tra từ 90%");
  if (k.can_thuc_hanh) can.push("bài thực hành được duyệt");
  const cau = can.join(", ").replace(/, ([^,]*)$/, " và $1");
  return cau.charAt(0).toUpperCase() + cau.slice(1) + ".";
}

/** "8 phút" */
export function nhanThoiLuong(phut: number | null | undefined): string {
  return phut ? `${phut} phút` : "Tự học";
}

/** So thu tu 2 chu so tren bia ("01") */
export function soThuTu(i: number): string {
  return String(i + 1).padStart(2, "0");
}

/** Bo dong tieu de markdown dau tien neu trung tieu de bai (seed: "## <tieu de>") */
export function boTieuDeTrung(noiDung: string, tieuDe: string): string {
  const dong = noiDung.split(/\r?\n/);
  const dau = dong.findIndex(d => d.trim() !== "");
  if (dau >= 0) {
    const m = /^#{1,6}\s+(.*)$/.exec(dong[dau]!.trim());
    if (m && m[1]!.trim().toLowerCase() === tieuDe.trim().toLowerCase()) dong.splice(dau, 1);
  }
  return dong.join("\n").trim();
}

/** Cau bao cho nguoi hoc ve nhung gi he thong vua tu cap (chung chi, quyen SKU, vai kich hoat) */
export function cauThayDoi(td: ThayDoiSauDanhGia | null | undefined): string[] {
  if (!td) return [];
  const kq: string[] = [];
  if (td.chung_chi_moi) kq.push(`Bạn vừa nhận chứng chỉ “${td.chung_chi_moi.khoa_hoc_ten}”.`);
  if (td.quyen_sku_moi) kq.push(`Bạn đã được cấp quyền bán mã ${td.quyen_sku_moi.ma_mau}.`);
  if (td.vai_kich_hoat.length) kq.push(`Vai trò ${td.vai_kich_hoat.map(v => NHAN_VAI[v]).join(", ")} đã được kích hoạt.`);
  return kq;
}
