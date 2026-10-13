"use client";

import { useState } from "react";
import type { YeuCauHoTro } from "@thien-khue/contracts";
import { DangTai, Loi, Nhan, Nut, OLuaChon, OVanBan, The, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { useTai } from "@/features/ban-hang/dung-tai";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangNgayGio } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";

/** Ho tro chuyen mon cho KOL / KOC: yeu cau giao cho minh (QUAN_LY thay het) */
export default function TrangHoTro() {
  const { coVai } = useXacThuc();
  const laQuanLy = coVai("QUAN_LY");
  const [chiChuaXuLy, setChiChuaXuLy] = useState(true);
  const { data, loi, dangTai, taiLai } = useTai(() => api.get<YeuCauHoTro[]>("/ban-hang/ho-tro", { chua_xu_ly: chiChuaXuLy ? 1 : undefined }), [chiChuaXuLy]);

  return (
    <>
      <TieuDeTrang
        kicker="Sale / CSKH"
        tieuDe="Hỗ trợ KOL / KOC"
        moTa="KOL/KOC gửi câu hỏi về sản phẩm, góp ý kịch bản / video — hệ thống giao cho người đang trực, ưu tiên người đủ quyền mã liên quan."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <OLuaChon daChon={chiChuaXuLy} onClick={() => setChiChuaXuLy(true)}>
          Chờ trả lời
        </OLuaChon>
        <OLuaChon daChon={!chiChuaXuLy} onClick={() => setChiChuaXuLy(false)}>
          Tất cả
        </OLuaChon>
      </div>
      {dangTai && !data ? (
        <DangTai />
      ) : loi ? (
        <Loi chiTiet={loi} thuLai={taiLai} />
      ) : !data?.length ? (
        <Trong tieuDe={chiChuaXuLy ? "Không có yêu cầu nào chờ bạn" : "Chưa có yêu cầu hỗ trợ"} />
      ) : (
        <div className="flex flex-col gap-4">
          {data.map(y => (
            <TheYeuCau key={y.id} y={y} hienNguoiHoTro={laQuanLy} xong={taiLai} />
          ))}
        </div>
      )}
    </>
  );
}

function TheYeuCau({ y, hienNguoiHoTro, xong }: { y: YeuCauHoTro; hienNguoiHoTro: boolean; xong: () => Promise<void> }) {
  const [traLoi, setTraLoi] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function gui() {
    setDangGui(true);
    setLoi(null);
    try {
      await api.post(`/ban-hang/ho-tro/${y.id}/tra-loi`, { tra_loi: traLoi.trim() });
      setTraLoi("");
      await xong();
    } catch (e) {
      setLoi(thongDiepLoi(e));
    } finally {
      setDangGui(false);
    }
  }

  return (
    <The>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-h3">{y.nguoi_gui_ten}</strong>
          {y.ma_mau && <Nhan tong="trung-tinh">Mã {y.ma_mau}</Nhan>}
          {y.da_xu_ly ? <Nhan tong="thanh-cong">Đã trả lời</Nhan> : <Nhan tong="chinh">Chờ trả lời</Nhan>}
        </div>
        <span className="text-sm text-chu-phu">
          {dinhDangNgayGio(y.created_at)}
          {hienNguoiHoTro && y.nguoi_ho_tro_ten ? ` · giao cho ${y.nguoi_ho_tro_ten}` : ""}
        </span>
      </div>
      <p className="m-0 whitespace-pre-line text-body">{y.noi_dung}</p>
      {y.lien_ket && (
        <a href={y.lien_ket} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block break-all text-sm font-medium text-lien-ket hover:underline hover:underline">
          {y.lien_ket}
        </a>
      )}
      {y.da_xu_ly ? (
        <div className="mt-4 rounded-lg border border-vien bg-be-mat-phu p-3">
          <span className="text-xs font-semibold uppercase tracking-[0.04em] text-chu-mo">Trả lời · {dinhDangNgayGio(y.xu_ly_luc)}</span>
          <p className="m-0 mt-1 whitespace-pre-line text-sm leading-relaxed">{y.tra_loi}</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {loi && <ThongBaoNoiDong kieu="loi">{loi}</ThongBaoNoiDong>}
          <OVanBan nhan="Trả lời" rows={3} value={traLoi} onChange={e => setTraLoi(e.target.value)} maxLength={2000} placeholder="Góp ý chuyên môn: chất liệu, form, cách tư vấn size…" />
          <Nut className="self-end" co="nho" onClick={gui} dangXuLy={dangGui} disabled={!traLoi.trim()}>
            Gửi trả lời
          </Nut>
        </div>
      )}
    </The>
  );
}
