import {
  NHAN_LOAI_LEAD,
  NHAN_NGUON_GIAO_KHACH,
  NHAN_TRANG_THAI_DON,
  NHAN_TRANG_THAI_LEAD,
  type LoaiLead,
  type NguonGiaoKhach,
  type TrangThaiDonCrm,
  type TrangThaiLead
} from "@thien-khue/contracts";
import { Nhan, type TongNhan } from "@/components/ui";

const TONG_LEAD: Record<TrangThaiLead, TongNhan> = {
  MOI: "canh-bao",
  DA_PHAN_BO: "chinh",
  DANG_XU_LY: "chinh",
  THANH_CONG: "thanh-cong",
  THAT_BAI: "loi",
  TRUNG: "trung-tinh"
};

const TONG_DON: Record<TrangThaiDonCrm, TongNhan> = {
  moi: "chinh",
  dang_giao: "chinh",
  giao_thanh_cong: "thanh-cong",
  hoan: "canh-bao",
  huy: "trung-tinh"
};

export function NhanTrangThaiLead({ trangThai }: { trangThai: TrangThaiLead }) {
  return <Nhan tong={TONG_LEAD[trangThai]}>{NHAN_TRANG_THAI_LEAD[trangThai]}</Nhan>;
}

export function NhanLoaiLead({ loai }: { loai: LoaiLead }) {
  return <Nhan tong="trung-tinh">{NHAN_LOAI_LEAD[loai]}</Nhan>;
}

export function NhanNguonGiao({ nguon }: { nguon: NguonGiaoKhach }) {
  return <Nhan tong={nguon === "LEAD" ? "chinh" : nguon === "THU_CONG" ? "trung-tinh" : "chinh"}>{NHAN_NGUON_GIAO_KHACH[nguon]}</Nhan>;
}

export function NhanTrangThaiDon({ trangThai }: { trangThai: TrangThaiDonCrm }) {
  return <Nhan tong={TONG_DON[trangThai] ?? "trung-tinh"}>{NHAN_TRANG_THAI_DON[trangThai] ?? trangThai}</Nhan>;
}

/** 0912345678 -> "0912 345 678" */
export function dinhDangSdt(sdt: string | null | undefined): string {
  const s = (sdt ?? "").replace(/\D/g, "");
  if (s.length !== 10) return sdt ?? "—";
  return `${s.slice(0, 4)} ${s.slice(4, 7)} ${s.slice(7)}`;
}
