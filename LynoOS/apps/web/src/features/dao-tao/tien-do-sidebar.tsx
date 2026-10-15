"use client";

import { useLoTrinh } from "./hooks";
import { ThanhTienDo } from "./thanh-phan";

/**
 * O "Tiến độ chung" cuoi sidebar hoc vien: so bai da hoc / tong bai trong lo trinh theo vai cua toi.
 * Layout (training) goi component nay.
 */
export function TienDoSidebar() {
  const { data, loi } = useLoTrinh();
  if (loi && !data) return null;
  const t = data?.tong;
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-be-mat-phu p-3">
      <div className="text-h4 text-chu">Tiến độ chung</div>
      <ThanhTienDo phanTram={t?.phan_tram ?? 0} nen="bg-vien" nhan="Tiến độ chung" />
      <div className="text-xs text-chu-phu">{t ? `${t.so_bai_xong}/${t.so_bai} bài học` : "Đang tải…"}</div>
    </div>
  );
}
