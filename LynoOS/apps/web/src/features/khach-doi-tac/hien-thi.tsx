import type { HangThanhVien, LoaiGiam, TrangThaiCapPhat, TrangThaiDuyetQua, TrangThaiMoiKh } from "@thien-khue/contracts";
import { NHAN_HANG_THANH_VIEN, NHAN_TRANG_THAI_CAP_PHAT, NHAN_TRANG_THAI_DUYET_QUA, NHAN_TRANG_THAI_MOI_KH } from "@thien-khue/contracts";
import { Nhan, type TongNhan } from "@/components/ui";
import { dinhDangTien } from "@/lib/dinh-dang";

/*
 * Mau nhan + chu hien thi dung chung cho module khach-doi-tac — he trang xanh (CRM DESIGN.md).
 * Ba khu (VIP / Than thiet / Hanh phuc CEO - Doi tac) phan biet bang cac bac cua thang xanh, khong dung mau rieng.
 */

/** Class nen + chu cho nhan hang / khoi tieu de theo khu */
export const LOP_KHU = {
  vip: "bg-xanh-800 text-tren-chinh",
  thanThien: "bg-chinh text-tren-chinh",
  hanhPhuc: "bg-chinh-nhat text-chinh-dam"
} as const;

/** Class mau chu cho so lon / diem nhan theo khu */
export const CHU_KHU = { vip: "text-xanh-800", thanThien: "text-chinh", hanhPhuc: "text-chinh-dam" } as const;

export function lopHang(hang: HangThanhVien | null): string {
  return hang === "VIP" ? LOP_KHU.vip : hang === "THAN_THIET" ? LOP_KHU.thanThien : "bg-be-mat-phu text-chu";
}

export function NhanHang({ hang }: { hang: HangThanhVien | null }) {
  if (!hang) return <Nhan tong="trung-tinh">Khách hàng</Nhan>;
  return <Nhan tong={hang === "VIP" ? "dam" : "chinh"}>{NHAN_HANG_THANH_VIEN[hang]}</Nhan>;
}

export function NhanHangApDung({ ds }: { ds: HangThanhVien[] }) {
  if (!ds.length) return <span className="text-sm text-chu-phu">Mọi hạng thành viên</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {ds.map(h => (
        <NhanHang key={h} hang={h} />
      ))}
    </span>
  );
}

const TONG_DUYET: Record<TrangThaiDuyetQua, TongNhan> = { CHO_THAM_DINH: "canh-bao", DA_DUYET: "thanh-cong", TU_CHOI: "loi" };
export function NhanDuyet({ tt }: { tt: TrangThaiDuyetQua }) {
  return <Nhan tong={TONG_DUYET[tt]}>{NHAN_TRANG_THAI_DUYET_QUA[tt]}</Nhan>;
}

const TONG_CAP: Record<TrangThaiCapPhat, TongNhan> = { DA_CAP: "chinh", DA_DUNG: "thanh-cong", HET_HAN: "trung-tinh", HUY: "loi" };
export function NhanCapPhat({ tt }: { tt: TrangThaiCapPhat }) {
  return <Nhan tong={TONG_CAP[tt]}>{NHAN_TRANG_THAI_CAP_PHAT[tt]}</Nhan>;
}

const TONG_MOI: Record<TrangThaiMoiKh, TongNhan> = {
  DA_MOI: "trung-tinh",
  THAM_GIA: "chinh",
  TU_CHOI: "trung-tinh",
  DA_GUI_MAU: "chinh",
  DA_PHAN_HOI: "thanh-cong",
  ROI_CHUONG_TRINH: "trung-tinh"
};
export function NhanMoi({ tt }: { tt: TrangThaiMoiKh }) {
  return <Nhan tong={TONG_MOI[tt]}>{NHAN_TRANG_THAI_MOI_KH[tt]}</Nhan>;
}

export function moTaGiam(loai: LoaiGiam, giaTri: number): string {
  return loai === "PHAN_TRAM" ? `Giảm ${giaTri}%` : `Giảm ${dinhDangTien(giaTri)}`;
}

/** 50000000 -> "50 triệu" */
export function tienGon(so: number): string {
  if (so >= 1_000_000_000) return `${(so / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  if (so >= 1_000_000) return `${(so / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
  return dinhDangTien(so);
}

/** So tu 1..5 -> cham tron */
export function DiemCham({ diem, nhan }: { diem: number | null; nhan: string }) {
  if (!diem) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-chu-phu">
      {nhan}
      <span aria-label={`${diem} trên 5`} className="tracking-[0.04em] text-chinh">
        {"●".repeat(diem)}
        <span className="text-chu-mo">{"●".repeat(5 - diem)}</span>
      </span>
    </span>
  );
}
