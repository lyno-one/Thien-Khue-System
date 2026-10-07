"use client";

import type { HoSoTheoSdt, HuyXacMinhSdtBody, XacMinhSdtBody } from "@thien-khue/contracts";
import { NHAN_VAI } from "@thien-khue/contracts";
import { useState } from "react";
import { Nhan, Nut, ONhap, The, TheTieuDe, ThongBaoNoiDong } from "@/components/ui";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangNgay, dinhDangNgayGio } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";

/*
 * Xac minh SDT tai khoan khach (CSKH / Quan ly). SDT khach tu khai chi noi voi lich su mua hang, hang,
 * uu dai khi da xac minh. Chua co OTP: goi vao chinh so do, nguoi nghe xac nhan dung chu tai khoan
 * (ho ten, email dang ky) roi moi bam xac minh. Moi lan xac minh / huy deu ghi nhat ky.
 */

export function KhoiXacMinhSdt() {
  const { nguoiDung, coVai } = useXacThuc();
  const [sdt, setSdt] = useState("");
  const [ds, setDs] = useState<HoSoTheoSdt[] | null>(null);
  const [dangTim, setDangTim] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [xong, setXong] = useState<string | null>(null);

  async function tim(e?: React.FormEvent) {
    e?.preventDefault();
    setDangTim(true);
    setLoi(null);
    setXong(null);
    try {
      setDs(await api.get<HoSoTheoSdt[]>("/ho-so/xac-minh-sdt", { sdt: sdt.trim() }));
    } catch (err) {
      setDs(null);
      setLoi(thongDiepLoi(err));
    } finally {
      setDangTim(false);
    }
  }

  return (
    <The>
      <TheTieuDe
        kicker="Xác minh"
        tieuDe="Số điện thoại tài khoản khách"
        moTa="Khách chỉ xem được hạng, đơn hàng và ưu đãi sau khi số điện thoại được xác minh. Gọi vào chính số đó, hỏi lại họ tên và email đăng ký — đúng chủ tài khoản mới bấm xác minh."
      />
      <form onSubmit={e => void tim(e)} className="flex flex-wrap items-end gap-3">
        <ONhap nhan="Số điện thoại" type="tel" inputMode="tel" placeholder="09xx xxx xxx" value={sdt} onChange={e => setSdt(e.target.value)} lopKhung="min-w-[220px] flex-1" />
        <Nut type="submit" dangXuLy={dangTim} disabled={!sdt.trim()}>
          Tìm tài khoản
        </Nut>
      </form>
      {loi && (
        <ThongBaoNoiDong kieu="canh-bao" className="mt-4">
          {loi}
        </ThongBaoNoiDong>
      )}
      {xong && (
        <ThongBaoNoiDong kieu="thanh-cong" className="mt-4">
          {xong}
        </ThongBaoNoiDong>
      )}
      {ds && !ds.length && <p className="mb-0 mt-4 text-sm text-chu-mo">Chưa có tài khoản nào khai số này.</p>}
      {ds && ds.length > 0 && (
        <ul className="m-0 mt-4 flex list-none flex-col divide-y divide-vien overflow-hidden rounded-xl border border-vien p-0">
          {ds.map(h => (
            <DongHoSo
              key={h.id}
              h={h}
              laChinhMinh={h.id === nguoiDung?.id}
              duocHuy={coVai("QUAN_LY")}
              capNhat={(moi, thongDiep) => {
                setDs(moi);
                setXong(thongDiep);
              }}
            />
          ))}
        </ul>
      )}
    </The>
  );
}

function DongHoSo({
  h,
  laChinhMinh,
  duocHuy,
  capNhat
}: {
  h: HoSoTheoSdt;
  laChinhMinh: boolean;
  duocHuy: boolean;
  capNhat: (ds: HoSoTheoSdt[], thongDiep: string) => void;
}) {
  const [ghiChu, setGhiChu] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const sdt = h.sdt_chuan ?? h.sdt ?? "";

  async function xacMinh() {
    setDangGui(true);
    setLoi(null);
    try {
      const body: XacMinhSdtBody = { sdt, ghi_chu: ghiChu.trim() };
      capNhat(await api.post<HoSoTheoSdt[]>(`/ho-so/${h.id}/xac-minh-sdt`, body), `Đã xác minh số ${sdt} cho ${h.ho_ten}.`);
      setGhiChu("");
    } catch (err) {
      setLoi(thongDiepLoi(err));
    } finally {
      setDangGui(false);
    }
  }

  async function huy() {
    setDangGui(true);
    setLoi(null);
    try {
      const body: HuyXacMinhSdtBody = { ly_do: ghiChu.trim() };
      await api.post(`/ho-so/${h.id}/huy-xac-minh-sdt`, body);
      capNhat(await api.get<HoSoTheoSdt[]>("/ho-so/xac-minh-sdt", { sdt }), `Đã huỷ xác minh số ${sdt} của ${h.ho_ten}.`);
      setGhiChu("");
    } catch (err) {
      setLoi(thongDiepLoi(err));
    } finally {
      setDangGui(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 bg-be-mat p-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-h3 text-chu">{h.ho_ten}</strong>
        {h.email_an && <span className="text-sm text-chu-phu">{h.email_an}</span>}
        {h.sdt_xac_minh_luc ? <Nhan tong="thanh-cong">Đã xác minh {dinhDangNgayGio(h.sdt_xac_minh_luc)}</Nhan> : <Nhan tong="canh-bao">Chưa xác minh</Nhan>}
        {h.vai.map(v => (
          <Nhan key={v} tong="trung-tinh">
            {NHAN_VAI[v]}
          </Nhan>
        ))}
      </div>
      <span className="text-xs text-chu-mo">Tạo tài khoản {dinhDangNgay(h.created_at)}</span>
      {laChinhMinh ? (
        <span className="text-xs text-chu-mo">Tài khoản của bạn — nhờ đồng nghiệp khác xác minh.</span>
      ) : !h.sdt_xac_minh_luc || duocHuy ? (
        <div className="flex flex-wrap items-end gap-3">
          <ONhap
            nhan={h.sdt_xac_minh_luc ? "Lý do huỷ xác minh" : "Cách đã xác nhận"}
            placeholder={h.sdt_xac_minh_luc ? "VD: xác minh nhầm người" : "VD: gọi lại số này, khách xác nhận email đăng ký"}
            value={ghiChu}
            onChange={e => setGhiChu(e.target.value)}
            maxLength={500}
            lopKhung="min-w-[240px] flex-1"
          />
          {h.sdt_xac_minh_luc ? (
            <Nut kieu="vien-loi" co="nho" dangXuLy={dangGui} disabled={ghiChu.trim().length < 3} onClick={() => void huy()}>
              Huỷ xác minh
            </Nut>
          ) : (
            <Nut co="nho" dangXuLy={dangGui} disabled={ghiChu.trim().length < 3} onClick={() => void xacMinh()}>
              Đã gọi xác nhận — Xác minh
            </Nut>
          )}
        </div>
      ) : null}
      {loi && <p role="alert" className="m-0 text-xs font-medium text-loi">{loi}</p>}
    </li>
  );
}
