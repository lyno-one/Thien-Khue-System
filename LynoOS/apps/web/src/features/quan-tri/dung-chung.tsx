"use client";

import type { PhanTrangMeta, TrangThaiDeXuat } from "@thien-khue/contracts";
import { NHAN_TRANG_THAI_DE_XUAT, NHAN_VAI } from "@thien-khue/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { lopTab, lopThanhTab, Nhan, Nut, type TongNhan } from "@/components/ui";
import { cn } from "@/lib/cn";
import { thongDiepLoi } from "@/lib/api";

/*
 * Dung chung khu quan tri: hook tai du lieu, nhan trang thai, bo loc dang tab (CRM DESIGN.md "Bo loc dang tab"), phan trang.
 */

/** Tai du lieu theo deps; huy ket qua cu khi deps doi (tranh ghi de bang du lieu cu) */
export function useTaiDuLieu<T>(tai: () => Promise<T>, deps: unknown[]) {
  const [duLieu, setDuLieu] = useState<T | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const lan = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goi = useCallback(tai, deps);

  const taiLai = useCallback(async () => {
    const so = ++lan.current;
    setDangTai(true);
    setLoi(null);
    try {
      const kq = await goi();
      if (so === lan.current) setDuLieu(kq);
    } catch (e) {
      if (so === lan.current) setLoi(thongDiepLoi(e));
    } finally {
      if (so === lan.current) setDangTai(false);
    }
  }, [goi]);

  useEffect(() => {
    void taiLai();
  }, [taiLai]);

  return { duLieu, dangTai, loi, taiLai, setDuLieu };
}

export const TONG_TRANG_THAI_DE_XUAT: Record<TrangThaiDeXuat, TongNhan> = {
  CHO_KIEM: "canh-bao",
  CHO_DUYET: "chinh",
  DA_DUYET: "thanh-cong",
  TU_CHOI: "loi",
  HUY: "trung-tinh"
};

export function NhanDeXuat({ trangThai }: { trangThai: TrangThaiDeXuat }) {
  return <Nhan tong={TONG_TRANG_THAI_DE_XUAT[trangThai]}>{NHAN_TRANG_THAI_DE_XUAT[trangThai]}</Nhan>;
}

/** Nhan cho chuoi enum bat ky (trang thai qua, don, hoa hong...) */
const NHAN_CHUNG: Record<string, [string, TongNhan]> = {
  HOAT_DONG: ["Hoạt động", "thanh-cong"],
  DANG_HOC: ["Đang học", "chinh"],
  TAM_DUNG: ["Tạm dừng", "canh-bao"],
  KET_THUC: ["Kết thúc", "trung-tinh"],
  CAN_HOC_LAI: ["Cần học lại", "canh-bao"],
  THU_HOI: ["Thu hồi", "trung-tinh"],
  CHO_THAM_DINH: ["Chờ thẩm định", "canh-bao"],
  DA_DUYET: ["Đã duyệt", "thanh-cong"],
  TU_CHOI: ["Từ chối", "loi"],
  HOP_LE: ["Hợp lệ", "thanh-cong"],
  CHO_XAC_MINH: ["Chờ xác minh", "canh-bao"],
  BI_HUY: ["Bị huỷ", "trung-tinh"],
  DA_DOI_SOAT: ["Đã đối soát", "thanh-cong"],
  CHO_DOI_SOAT: ["Chờ đối soát", "canh-bao"],
  DU_DIEU_KIEN: ["Đủ điều kiện", "chinh"],
  DA_TRA: ["Đã trả", "thanh-cong"],
  BI_TRU: ["Bị trừ", "loi"],
  DA_CAP: ["Đã cấp", "chinh"],
  DA_DUNG: ["Đã dùng", "thanh-cong"],
  HET_HAN: ["Hết hạn", "trung-tinh"],
  HUY: ["Huỷ", "trung-tinh"],
  NHAP: ["Nháp", "trung-tinh"],
  HIEU_LUC: ["Hiệu lực", "thanh-cong"],
  dang_ban: ["Đang bán", "thanh-cong"],
  het_hang: ["Hết hàng", "canh-bao"],
  ngung: ["Ngừng", "trung-tinh"],
  moi: ["Mới", "chinh"],
  dang_giao: ["Đang giao", "chinh"],
  giao_thanh_cong: ["Giao thành công", "thanh-cong"],
  hoan: ["Hoàn", "canh-bao"],
  huy: ["Huỷ", "trung-tinh"]
};

export function NhanTrangThai({ giaTri }: { giaTri: string }) {
  const [nhan, tong] = NHAN_CHUNG[giaTri] ?? [giaTri, "trung-tinh" as TongNhan];
  return <Nhan tong={tong}>{nhan}</Nhan>;
}

export function tenVai(v: string): string {
  return (NHAN_VAI as Record<string, string>)[v] ?? v;
}

/** Bo loc dang tab (CRM DESIGN.md): muc dang chon nen be-mat chu chinh-dam, muc khac chu chu-phu */
export function BoLoc<T extends string>({ luaChon, giaTri, doi, nhanAria }: { luaChon: { giaTri: T; nhan: string }[]; giaTri: T; doi: (v: T) => void; nhanAria?: string }) {
  return (
    <div role="group" aria-label={nhanAria} className={lopThanhTab}>
      {luaChon.map(l => (
        <button key={l.giaTri} type="button" aria-pressed={giaTri === l.giaTri} onClick={() => doi(l.giaTri)} className={lopTab(giaTri === l.giaTri)}>
          {l.nhan}
        </button>
      ))}
    </div>
  );
}

export function PhanTrang({ meta, doiTrang }: { meta?: PhanTrangMeta | null; doiTrang: (t: number) => void }) {
  if (!meta || meta.tong_trang <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-chu-phu">
      <span className="so">
        Trang {meta.trang}/{meta.tong_trang} · {meta.tong.toLocaleString("vi-VN")} dòng
      </span>
      <div className="flex gap-2">
        <Nut kieu="vien" co="nho" disabled={meta.trang <= 1} onClick={() => doiTrang(meta.trang - 1)}>
          ← Trước
        </Nut>
        <Nut kieu="vien" co="nho" disabled={meta.trang >= meta.tong_trang} onClick={() => doiTrang(meta.trang + 1)}>
          Sau →
        </Nut>
      </div>
    </div>
  );
}

/** Thanh tien do (bang dieu hanh LMS) */
export function ThanhTienDo({ phanTram }: { phanTram: number }) {
  const p = Math.max(0, Math.min(100, Math.round(phanTram)));
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-[120px] overflow-hidden rounded bg-be-mat-phu" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded", p >= 100 ? "bg-thanh-cong" : "bg-chinh")} style={{ width: `${p}%` }} />
      </div>
      <span className="so text-chu-phu">{p}%</span>
    </div>
  );
}

/** Dong "nhan: gia tri" trong the chi tiet */
export function DongThongTin({ nhan, children }: { nhan: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-vien py-2 text-sm last:border-b-0">
      <span className="text-chu-phu">{nhan}</span>
      <span className="min-w-0 break-words text-right font-medium text-chu">{children}</span>
    </div>
  );
}
