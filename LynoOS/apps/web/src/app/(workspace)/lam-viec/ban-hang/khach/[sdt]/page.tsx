"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { ChiTietKhach, DonCuaKhach, KhachDuocGiao, NhanSuBanHang } from "@thien-khue/contracts";
import {
  Bang,
  DangTai,
  HopThoai,
  Loi,
  MuiTen,
  Nhan,
  Nut,
  NutLienKet,
  OChon,
  OVanBan,
  The,
  TheSoLieu,
  TheTieuDe,
  ThongBaoNoiDong,
  TieuDeTrang
} from "@/components/ui";
import { useTai } from "@/features/ban-hang/dung-tai";
import { NhanNguonGiao, NhanTrangThaiDon, dinhDangSdt } from "@/features/ban-hang/nhan-ban-hang";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangNgay, dinhDangNgayGio, dinhDangTien } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";

/** Chi tiet khach duoc giao: ho so + don CRM, ghi cham soc (qua CRM), tao don, giao lai (QUAN_LY) */
export default function TrangChiTietKhach() {
  const { sdt } = useParams<{ sdt: string }>();
  const router = useRouter();
  const { coVai } = useXacThuc();
  const laQuanLy = coVai("QUAN_LY");
  const { data, loi, dangTai, taiLai } = useTai(() => api.get<ChiTietKhach>(`/ban-hang/khach/${encodeURIComponent(sdt)}`), [sdt]);

  const [noiDung, setNoiDung] = useState("");
  const [dangGhi, setDangGhi] = useState(false);
  const [thongBao, setThongBao] = useState<{ kieu: "thanh-cong" | "canh-bao"; chu: string } | null>(null);
  const [moGiaoLai, setMoGiaoLai] = useState(false);
  const [moKetThuc, setMoKetThuc] = useState(false);

  async function ghiCham() {
    if (!noiDung.trim()) return;
    setDangGhi(true);
    setThongBao(null);
    try {
      await api.post(`/ban-hang/khach/${encodeURIComponent(sdt)}/cham`, { noi_dung: noiDung.trim() });
      setNoiDung("");
      setThongBao({ kieu: "thanh-cong", chu: "Đã ghi chăm sóc vào CRM." });
      await taiLai();
    } catch (e) {
      setThongBao({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setDangGhi(false);
    }
  }

  if (dangTai && !data) return <DangTai />;
  if (loi) return <Loi chiTiet={loi} thuLai={taiLai} />;
  if (!data) return null;
  const { giao, crm, tong_mua: tongMua, don } = data;
  const ten = crm?.ten || giao.ten_khach || "Khách";
  const linkTaoDon = `/lam-viec/ban-hang/tao-don?sdt=${giao.sdt_chuan}&ten=${encodeURIComponent(ten)}${crm?.dia_chi ? `&dia_chi=${encodeURIComponent(crm.dia_chi)}` : ""}`;

  return (
    <>
      <TieuDeTrang
        kicker={`Khách được giao · ${dinhDangSdt(giao.sdt_chuan)}`}
        tieuDe={ten}
        moTa={giao.ly_do ?? undefined}
        hanhDong={
          <>
            {laQuanLy && (
              <Nut kieu="vien" co="nho" onClick={() => setMoGiaoLai(true)}>
                Giao lại
              </Nut>
            )}
            <Nut kieu="trong" co="nho" onClick={() => setMoKetThuc(true)}>
              Kết thúc phụ trách
            </Nut>
            <NutLienKet href={linkTaoDon} nhay>
              Tạo đơn <MuiTen />
            </NutLienKet>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TheSoLieu nhan="Tổng mua hợp lệ" giaTri={dinhDangTien(tongMua.tong_tien)} />
        <TheSoLieu nhan="Số lần mua hợp lệ" giaTri={tongMua.so_don} />
        <TheSoLieu nhan="Lần mua cuối" giaTri={<span className="text-h2">{dinhDangNgay(tongMua.lan_mua_cuoi)}</span>} />
        <TheSoLieu nhan="Nguồn giao" giaTri={<NhanNguonGiao nguon={giao.nguon} />} phu={`Giao ${dinhDangNgayGio(giao.giao_luc)}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <The>
            <TheTieuDe kicker="CRM Lyno" tieuDe="Lịch sử đơn hàng" moTa="Đơn hợp lệ = bán hàng, không huỷ / hoàn — dùng để tính hạng thành viên." />
            <Bang<DonCuaKhach>
              dong={don}
              khoaDong={d => d.id}
              rong={<p className="m-0 text-sm text-chu-phu">Khách chưa có đơn nào trên CRM.</p>}
              cot={[
                { khoa: "ma_don", tieuDe: "Mã đơn", hienThi: d => <span className="font-semibold">{d.ma_don}</span> },
                { khoa: "ngay", tieuDe: "Ngày", hienThi: d => <span className="whitespace-nowrap">{dinhDangNgay(d.created_at)}</span> },
                {
                  khoa: "trang_thai",
                  tieuDe: "Trạng thái",
                  hienThi: d => (
                    <span className="flex flex-wrap gap-1">
                      <NhanTrangThaiDon trangThai={d.trang_thai} />
                      {d.loai_don === "DOI_TRA" && <Nhan tong="canh-bao">Đổi trả</Nhan>}
                    </span>
                  )
                },
                {
                  khoa: "tong_tien",
                  tieuDe: "Tổng tiền",
                  canPhai: true,
                  hienThi: d => <span className={d.hop_le ? "font-semibold" : "text-chu-phu line-through"}>{dinhDangTien(d.tong_tien)}</span>
                }
              ]}
            />
          </The>
        </div>

        <div className="flex flex-col gap-6">
          <The>
            <TheTieuDe kicker="Hồ sơ" tieuDe="Thông tin khách" />
            <dl className="m-0 grid grid-cols-[100px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-chu-phu">Điện thoại</dt>
              <dd className="m-0 font-semibold">{dinhDangSdt(giao.sdt_chuan)}</dd>
              <dt className="text-chu-phu">Địa chỉ</dt>
              <dd className="m-0 break-words">{crm?.dia_chi || "—"}</dd>
              <dt className="text-chu-phu">Ghi chú CRM</dt>
              <dd className="m-0 break-words">{crm?.ghi_chu || "—"}</dd>
              {giao.lead_nhu_cau && (
                <>
                  <dt className="text-chu-phu">Nhu cầu</dt>
                  <dd className="m-0 break-words">{giao.lead_nhu_cau}</dd>
                </>
              )}
              {giao.ma_mau_quan_tam && (
                <>
                  <dt className="text-chu-phu">Quan tâm</dt>
                  <dd className="m-0">Mã {giao.ma_mau_quan_tam}</dd>
                </>
              )}
            </dl>
            {!crm && (
              <ThongBaoNoiDong className="mt-4">Khách chưa có hồ sơ trên CRM — CRM sẽ tự tạo khi bạn tạo đơn đầu tiên.</ThongBaoNoiDong>
            )}
          </The>

          <The>
            <TheTieuDe kicker="Chăm sóc" tieuDe="Ghi chăm sóc" />
            {thongBao && (
              <ThongBaoNoiDong kieu={thongBao.kieu} className="mb-3">
                {thongBao.chu}
              </ThongBaoNoiDong>
            )}
            <OVanBan
              nhan="Nội dung"
              placeholder="Đã gọi tư vấn size, khách hẹn chốt cuối tuần…"
              value={noiDung}
              onChange={e => setNoiDung(e.target.value)}
              rows={3}
              maxLength={2000}
              disabled={!crm}
            />
            <Nut className="mt-3" rongHet onClick={ghiCham} dangXuLy={dangGhi} disabled={!crm || !noiDung.trim()}>
              Lưu vào CRM
            </Nut>
            <div className="mt-5 flex flex-col gap-3">
              {data.lich_su_cham === null ? (
                <p className="m-0 text-sm text-chu-phu">Không đọc được lịch sử chăm từ CRM lúc này.</p>
              ) : data.lich_su_cham.length ? (
                data.lich_su_cham.map(c => (
                  <div key={c.id} className="border-t border-vien pt-3 first:border-0 first:pt-0">
                    <p className="m-0 text-sm leading-relaxed">{c.noi_dung}</p>
                    <span className="text-xs text-chu-phu">
                      {c.nguoi_cham ?? "—"} · {dinhDangNgayGio(c.created_at)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="m-0 text-sm text-chu-phu">Chưa có lượt chăm sóc nào.</p>
              )}
            </div>
          </The>
        </div>
      </div>

      {laQuanLy && <HopGiaoLai mo={moGiaoLai} dong={() => setMoGiaoLai(false)} giao={giao} xong={() => router.push("/lam-viec/ban-hang/khach")} />}
      <HopKetThuc mo={moKetThuc} dong={() => setMoKetThuc(false)} sdt={giao.sdt_chuan} xong={() => router.push("/lam-viec/ban-hang/khach")} />
    </>
  );
}

function HopGiaoLai({ mo, dong, giao, xong }: { mo: boolean; dong: () => void; giao: KhachDuocGiao; xong: () => void }) {
  const nhanSu = useTai(() => (mo ? api.get<NhanSuBanHang[]>("/ban-hang/nhan-su") : Promise.resolve([] as NhanSuBanHang[])), [mo]);
  const [hoSoId, setHoSoId] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function gui() {
    setDangGui(true);
    setLoi(null);
    try {
      await api.post(`/ban-hang/khach/${giao.sdt_chuan}/giao-lai`, { ho_so_id: hoSoId || null, ly_do: lyDo.trim() });
      dong();
      xong();
    } catch (e) {
      setLoi(thongDiepLoi(e));
    } finally {
      setDangGui(false);
    }
  }

  return (
    <HopThoai
      mo={mo}
      dong={dong}
      tieuDe="Giao lại khách"
      moTa={`Đang phụ trách: ${giao.ho_ten_phu_trach ?? "—"}`}
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Huỷ
          </Nut>
          <Nut onClick={gui} dangXuLy={dangGui} disabled={lyDo.trim().length < 3}>
            Giao lại
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {loi && <ThongBaoNoiDong kieu="loi">{loi}</ThongBaoNoiDong>}
        <OChon
          nhan="Người nhận"
          value={hoSoId}
          onChange={e => setHoSoId(e.target.value)}
          goiYChon="Tự động (theo ca, năng lực, tải)"
          luaChon={(nhanSu.data ?? [])
            .filter(n => n.vai.length && n.ho_so_id !== giao.ho_so_id)
            .map(n => ({ giaTri: n.ho_so_id, nhan: `${n.ho_ten} · ${n.tai_hien_tai} khách${n.dang_trong_ca ? " · đang trong ca" : ""}` }))}
        />
        <OVanBan nhan="Lý do" batBuoc rows={3} value={lyDo} onChange={e => setLyDo(e.target.value)} placeholder="Nhân sự nghỉ phép, khách cần tư vấn chuyên sâu…" />
      </div>
    </HopThoai>
  );
}

function HopKetThuc({ mo, dong, sdt, xong }: { mo: boolean; dong: () => void; sdt: string; xong: () => void }) {
  const [lyDo, setLyDo] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function gui() {
    setDangGui(true);
    setLoi(null);
    try {
      await api.post(`/ban-hang/khach/${sdt}/ket-thuc`, { noi_dung: lyDo.trim() });
      dong();
      xong();
    } catch (e) {
      setLoi(thongDiepLoi(e));
    } finally {
      setDangGui(false);
    }
  }

  return (
    <HopThoai
      mo={mo}
      dong={dong}
      rong="nho"
      tieuDe="Kết thúc phụ trách"
      moTa="Khách sẽ rời khỏi danh sách của bạn. Lần sau khách quay lại sẽ được phân bổ mới."
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Huỷ
          </Nut>
          <Nut kieu="nguy-hiem" onClick={gui} dangXuLy={dangGui} disabled={!lyDo.trim()}>
            Kết thúc
          </Nut>
        </>
      }
    >
      {loi && <ThongBaoNoiDong kieu="loi" className="mb-3">{loi}</ThongBaoNoiDong>}
      <OVanBan nhan="Lý do" batBuoc rows={3} value={lyDo} onChange={e => setLyDo(e.target.value)} placeholder="Khách không còn nhu cầu…" />
    </HopThoai>
  );
}
