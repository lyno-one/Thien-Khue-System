"use client";

import type { NhatKyQt, PhanTrangMeta } from "@thien-khue/contracts";
import { useState } from "react";
import { DangTai, Loi, Nhan, Nut, ONhap, The, TieuDeTrang, Trong } from "@/components/ui";
import { api } from "@/lib/api";
import { dinhDangNgayGio } from "@/lib/dinh-dang";
import { PhanTrang, useTaiDuLieu } from "./dung-chung";

/*
 * Nhat ky (nhom "Hoạt động"): moi hanh dong quan trong — nguoi / he thong / AI. Bang chi INSERT (trigger DB).
 */

/** Ten hanh dong de doc — hanh dong la, giu nguyen ma */
const NHAN_HANH_DONG: Record<string, string> = {
  DE_XUAT_TAO: "Lập đề xuất",
  DE_XUAT_KIEM_DONG_Y: "Kiểm đạt",
  DE_XUAT_KIEM_TU_CHOI: "Kiểm không đạt",
  DE_XUAT_DUYET: "Duyệt đề xuất",
  DE_XUAT_TU_CHOI: "Từ chối đề xuất",
  DE_XUAT_HUY: "Rút đề xuất",
  DE_XUAT_AP_DUNG: "Áp dụng quyết định",
  DE_XUAT_AP_DUNG_TU_CHOI: "Áp dụng từ chối",
  AP_DUNG_CHUYEN_VAI: "Đổi vai",
  AP_DUNG_CAP_QUYEN_SKU: "Cấp quyền SKU",
  AP_DUNG_THU_HOI_QUYEN_SKU: "Thu hồi quyền SKU",
  AP_DUNG_DUYET_QUA_TANG: "Duyệt quà tặng",
  AP_DUNG_TU_CHOI_QUA_TANG: "Từ chối quà tặng",
  AP_DUNG_DUYET_VOUCHER: "Duyệt voucher",
  AP_DUNG_TU_CHOI_VOUCHER: "Từ chối voucher",
  AP_DUNG_XAC_MINH_DON: "Xác minh đơn",
  AP_DUNG_HUY_GHI_NHAN_DON: "Huỷ ghi nhận đơn",
  AP_DUNG_DOI_TY_LE_HOA_HONG: "Đổi tỷ lệ hoa hồng",
  AP_DUNG_DOI_NGUONG_HANG: "Đổi ngưỡng hạng"
};

export function DongNhatKy({ n, children }: { n: NhatKyQt; children?: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-1 border-b border-vien py-3 text-sm last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
      <span className="so shrink-0 text-xs text-chu-mo sm:w-[140px]">{dinhDangNgayGio(n.created_at)}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="font-semibold text-chu">{NHAN_HANH_DONG[n.hanh_dong] ?? n.hanh_dong}</strong>
          {n.tac_nhan !== "NGUOI" && <Nhan tong={n.tac_nhan === "AI" ? "chinh" : "trung-tinh"}>{n.tac_nhan === "AI" ? "AI" : "Hệ thống"}</Nhan>}
          <span className="text-chu-phu">· {n.ho_so?.ho_ten ?? "Hệ thống"}</span>
        </div>
        <span className="break-all font-mono text-xs text-chu-phu">
          {n.doi_tuong}
          {n.doi_tuong_id ? ` · ${n.doi_tuong_id}` : ""}
        </span>
        {children}
      </div>
    </li>
  );
}

export function TrangNhatKy() {
  const [loc, setLoc] = useState({ hanh_dong: "", doi_tuong: "", tu_ngay: "", den_ngay: "" });
  const [apDung, setApDung] = useState(loc);
  const [trang, setTrang] = useState(1);
  const [moRong, setMoRong] = useState<string | null>(null);
  const nk = useTaiDuLieu(() => api.layCoMeta<NhatKyQt[], PhanTrangMeta>("/quan-tri/ho-so/hoat-dong", { ...apDung, trang, so_dong: 50 }), [apDung, trang]);

  return (
    <div className="flex flex-col gap-6">
      <TieuDeTrang kicker="Quản trị" tieuDe="Nhật ký hoạt động" moTa="Mọi hành động quan trọng của người, hệ thống và AI — chỉ ghi thêm, không sửa / xoá được." />
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end"
        onSubmit={e => {
          e.preventDefault();
          setTrang(1);
          setApDung({ ...loc });
        }}
      >
        <ONhap nhan="Hành động" placeholder="vd DE_XUAT" value={loc.hanh_dong} onChange={e => setLoc(s => ({ ...s, hanh_dong: e.target.value }))} />
        <ONhap nhan="Đối tượng" placeholder="vd de_xuat_duyet, ho_so" value={loc.doi_tuong} onChange={e => setLoc(s => ({ ...s, doi_tuong: e.target.value }))} />
        <ONhap nhan="Từ ngày" type="date" value={loc.tu_ngay} onChange={e => setLoc(s => ({ ...s, tu_ngay: e.target.value }))} />
        <ONhap nhan="Đến ngày" type="date" value={loc.den_ngay} onChange={e => setLoc(s => ({ ...s, den_ngay: e.target.value }))} />
        <Nut type="submit">
          Lọc
        </Nut>
      </form>

      {nk.loi ? (
        <Loi chiTiet={nk.loi} thuLai={() => void nk.taiLai()} />
      ) : !nk.duLieu && nk.dangTai ? (
        <DangTai />
      ) : !nk.duLieu?.data.length ? (
        <Trong tieuDe="Chưa có nhật ký phù hợp" />
      ) : (
        <>
          <The className="px-4 py-1 md:px-5 md:py-1">
            <ul className="m-0 flex list-none flex-col p-0">
              {nk.duLieu.data.map(n => (
                <DongNhatKy key={n.id} n={n}>
                  {n.du_lieu != null && (
                    <div>
                      <button type="button" className="min-h-[32px] text-sm font-medium text-chinh hover:text-chinh-dam" aria-expanded={moRong === n.id} onClick={() => setMoRong(moRong === n.id ? null : n.id)}>
                        {moRong === n.id ? "Ẩn dữ liệu" : "Xem dữ liệu"}
                      </button>
                      {moRong === n.id && <pre className="cuon-mong mt-2 max-h-[240px] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-be-mat-phu p-3 text-xs text-chu">{JSON.stringify(n.du_lieu, null, 2)}</pre>}
                    </div>
                  )}
                </DongNhatKy>
              ))}
            </ul>
          </The>
          <PhanTrang meta={nk.duLieu.meta} doiTrang={setTrang} />
        </>
      )}
    </div>
  );
}
