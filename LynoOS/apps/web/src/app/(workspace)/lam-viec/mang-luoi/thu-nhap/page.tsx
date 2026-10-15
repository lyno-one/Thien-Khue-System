"use client";

import { useState } from "react";
import {
  NHAN_NGUON_DON_ML,
  type DieuChinhHoaHongMl,
  type GhiNhanDonMl,
  type HoaHongDongMl,
  type LichSuDuyetMl,
  type PhanTrangMeta,
  type TrangThaiHoaHongMl,
  type ViHoaHong
} from "@thien-khue/contracts";
import { Bang, DangTai, Loi, lopTab, lopThanhTab, Nut, TheSoLieu, TieuDeTrang, Trong } from "@/components/ui";
import { NhanGhiNhan, NhanHoaHong, useTaiMl } from "@/features/mang-luoi/chung";
import { api } from "@/lib/api";
import { dinhDangNgay, dinhDangNgayGio, dinhDangTien } from "@/lib/dinh-dang";

type Tab = "DU_DIEU_KIEN" | "CHO_DOI_SOAT" | "BI_TRU" | "DIEU_CHINH" | "LICH_SU" | "NGUON_DON";

const TAB: { khoa: Tab; nhan: string }[] = [
  { khoa: "DU_DIEU_KIEN", nhan: "Đủ điều kiện" },
  { khoa: "CHO_DOI_SOAT", nhan: "Chờ đối soát" },
  { khoa: "BI_TRU", nhan: "Bị trừ" },
  { khoa: "DIEU_CHINH", nhan: "Điều chỉnh" },
  { khoa: "LICH_SU", nhan: "Lịch sử duyệt" },
  { khoa: "NGUON_DON", nhan: "Nguồn đơn" }
];

const VAI_TRO: Record<string, string> = { NGUOI_BAN: "Người bán", NGUOI_GIOI_THIEU: "Giới thiệu", NGUOI_CHOT: "Chốt đơn" };

/** Bang thu nhap & vi hoa hong: du dieu kien / cho doi soat / bi tru / dieu chinh / lich su duyet */
export default function TrangThuNhap() {
  const [tab, setTab] = useState<Tab>("DU_DIEU_KIEN");
  const vi = useTaiMl(() => api.get<ViHoaHong>("/mang-luoi/thu-nhap/vi"), []);

  return (
    <>
      <TieuDeTrang
        kicker="Ví hoa hồng"
        tieuDe="Bảng thu nhập"
        moTa="Hoa hồng đủ điều kiện khi đơn giao thành công. Đơn hoàn / huỷ bị trừ khỏi tích luỹ. Đơn có mã giới thiệu khác người chốt chờ xác minh — không bao giờ tính hai lần."
      />
      {vi.loi ? (
        <Loi chiTiet={vi.loi} thuLai={vi.taiLai} className="mb-6" />
      ) : vi.data ? (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <TheSoLieu nhan="Đủ điều kiện" giaTri={dinhDangTien(vi.data.du_dieu_kien.so_tien)} phu={`${vi.data.du_dieu_kien.so_dong} khoản`} />
          <TheSoLieu nhan="Chờ đối soát" giaTri={dinhDangTien(vi.data.cho_doi_soat.so_tien)} phu={`${vi.data.cho_doi_soat.so_dong} khoản · ${vi.data.cho_xac_minh.so_don} đơn chờ xác minh`} />
          <TheSoLieu nhan="Bị trừ" giaTri={dinhDangTien(vi.data.bi_tru.so_tien)} phu={`${vi.data.bi_tru.so_dong} đơn hoàn / huỷ`} />
          <TheSoLieu nhan="Điều chỉnh" giaTri={dinhDangTien(vi.data.dieu_chinh.so_tien)} phu={`${vi.data.dieu_chinh.so_dong} khoản`} />
          <TheSoLieu nhan="Đã chi trả" giaTri={dinhDangTien(vi.data.da_tra.so_tien)} phu={`Tạm tính còn lại ${dinhDangTien(vi.data.tam_tinh)}`} className="col-span-2 lg:col-span-1" />
        </div>
      ) : (
        <DangTai />
      )}

      <div className="cuon-mong mb-4 overflow-x-auto" role="tablist" aria-label="Loại thu nhập">
        <div className={`${lopThanhTab} min-w-max flex-nowrap`}>
          {TAB.map(t => (
            <button key={t.khoa} type="button" aria-pressed={tab === t.khoa} onClick={() => setTab(t.khoa)} className={lopTab(tab === t.khoa)}>
              {t.nhan}
            </button>
          ))}
        </div>
      </div>

      {tab === "DU_DIEU_KIEN" || tab === "CHO_DOI_SOAT" || tab === "BI_TRU" ? (
        <BangHoaHong key={tab} trangThai={tab} />
      ) : tab === "DIEU_CHINH" ? (
        <BangDieuChinh />
      ) : tab === "LICH_SU" ? (
        <BangLichSu />
      ) : (
        <BangNguonDon />
      )}
    </>
  );
}

function BangHoaHong({ trangThai }: { trangThai: TrangThaiHoaHongMl }) {
  const [trang, setTrang] = useState(1);
  const ds = useTaiMl(() => api.layCoMeta<HoaHongDongMl[], PhanTrangMeta>("/mang-luoi/thu-nhap/hoa-hong", { trang_thai: trangThai, trang, so_dong: 20 }), [trangThai, trang]);
  const choXacMinh = useTaiMl(
    () => (trangThai === "CHO_DOI_SOAT" ? api.get<GhiNhanDonMl[]>("/mang-luoi/thu-nhap/don", { trang_thai: "CHO_XAC_MINH", so_dong: 50 }) : Promise.resolve([])),
    [trangThai]
  );
  if (ds.dangTai && !ds.data) return <DangTai />;
  if (ds.loi) return <Loi chiTiet={ds.loi} thuLai={ds.taiLai} />;
  const meta = ds.data?.meta;
  return (
    <div className="flex flex-col gap-4">
      {trangThai === "CHO_DOI_SOAT" && choXacMinh.data && choXacMinh.data.length > 0 && (
        <div className="rounded-xl border border-canh-bao/30 bg-canh-bao-nhat p-4 text-sm text-canh-bao">
          <strong>{choXacMinh.data.length} đơn chờ xác minh người bán</strong> — mã giới thiệu và người chốt khác nhau, người phụ trách sẽ chọn một người:{" "}
          {choXacMinh.data.map(d => d.ma_don).join(", ")}
        </div>
      )}
      <Bang<HoaHongDongMl>
        dong={ds.data?.data ?? []}
        khoaDong={r => r.id}
        rong={<Trong tieuDe="Chưa có khoản nào" />}
        cot={[
          { khoa: "ma_don", tieuDe: "Đơn", hienThi: r => <strong>{r.don.ma_don}</strong> },
          { khoa: "nguon", tieuDe: "Nguồn", hienThi: r => `${NHAN_NGUON_DON_ML[r.don.nguon]}${r.don.ma_gioi_thieu ? ` · ${r.don.ma_gioi_thieu}` : ""}` },
          { khoa: "ky", tieuDe: "Kỳ" },
          { khoa: "tong", tieuDe: "Giá trị đơn", canPhai: true, hienThi: r => dinhDangTien(r.don.tong_tien) },
          { khoa: "ty_le", tieuDe: "Tỷ lệ", canPhai: true, hienThi: r => (r.ty_le === null ? "—" : `${r.ty_le}%`) },
          { khoa: "so_tien", tieuDe: "Hoa hồng", canPhai: true, hienThi: r => <strong className={r.trang_thai === "BI_TRU" ? "text-loi line-through" : ""}>{dinhDangTien(r.so_tien)}</strong> },
          { khoa: "trang_thai", tieuDe: "Trạng thái", hienThi: r => <NhanHoaHong tt={r.trang_thai} /> },
          { khoa: "cap_nhat", tieuDe: "Cập nhật", hienThi: r => dinhDangNgay(r.updated_at) }
        ]}
      />
      {meta && meta.tong_trang > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <Nut kieu="vien" co="nho" disabled={trang <= 1} onClick={() => setTrang(t => t - 1)}>
            Trước
          </Nut>
          <span>
            Trang {meta.trang}/{meta.tong_trang}
          </span>
          <Nut kieu="vien" co="nho" disabled={trang >= meta.tong_trang} onClick={() => setTrang(t => t + 1)}>
            Sau
          </Nut>
        </div>
      )}
    </div>
  );
}

function BangDieuChinh() {
  const ds = useTaiMl(() => api.get<DieuChinhHoaHongMl[]>("/mang-luoi/thu-nhap/dieu-chinh"), []);
  if (ds.dangTai && !ds.data) return <DangTai />;
  if (ds.loi) return <Loi chiTiet={ds.loi} thuLai={ds.taiLai} />;
  return (
    <Bang<DieuChinhHoaHongMl>
      dong={ds.data ?? []}
      khoaDong={r => r.id}
      rong={<Trong tieuDe="Chưa có khoản điều chỉnh" moTa="Điều chỉnh (+/-) phải qua đề xuất và duyệt bởi người khác người đề xuất." />}
      cot={[
        { khoa: "created_at", tieuDe: "Ngày", hienThi: r => dinhDangNgay(r.created_at) },
        { khoa: "ky", tieuDe: "Kỳ" },
        { khoa: "ly_do", tieuDe: "Lý do", hienThi: r => r.ly_do },
        { khoa: "ma_don", tieuDe: "Đơn", hienThi: r => r.ma_don ?? "—" },
        { khoa: "nguon", tieuDe: "Nguồn", hienThi: r => (r.de_xuat_duyet_id ? "Đề xuất đã duyệt" : "Hệ thống (đơn hoàn sau chi trả)") },
        {
          khoa: "so_tien",
          tieuDe: "Số tiền",
          canPhai: true,
          hienThi: r => <strong className={r.so_tien < 0 ? "text-loi" : "text-thanh-cong"}>{`${r.so_tien > 0 ? "+" : ""}${dinhDangTien(r.so_tien)}`}</strong>
        }
      ]}
    />
  );
}

function BangLichSu() {
  const ds = useTaiMl(() => api.get<LichSuDuyetMl[]>("/mang-luoi/thu-nhap/lich-su-duyet"), []);
  if (ds.dangTai && !ds.data) return <DangTai />;
  if (ds.loi) return <Loi chiTiet={ds.loi} thuLai={ds.taiLai} />;
  if (!ds.data?.length) return <Trong tieuDe="Chưa có lịch sử duyệt" />;
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {ds.data.map(l => (
        <li key={`${l.loai}-${l.id}`} className="rounded-xl border border-vien bg-be-mat p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-h4">{l.tieu_de}</strong>
            <span className="text-sm font-semibold text-chinh-dam">{l.trang_thai}</span>
          </div>
          <p className="m-0 mt-1 text-sm text-chu-phu">
            {dinhDangNgayGio(l.luc)}
            {l.nguoi_quyet_dinh ? ` · ${l.nguoi_quyet_dinh.ho_ten}` : ""}
          </p>
          {l.y_kien && <p className="m-0 mt-2 text-sm text-chu-phu">{l.y_kien}</p>}
        </li>
      ))}
    </ol>
  );
}

function BangNguonDon() {
  const [trang, setTrang] = useState(1);
  const ds = useTaiMl(() => api.layCoMeta<GhiNhanDonMl[], PhanTrangMeta>("/mang-luoi/thu-nhap/don", { trang, so_dong: 20 }), [trang]);
  if (ds.dangTai && !ds.data) return <DangTai />;
  if (ds.loi) return <Loi chiTiet={ds.loi} thuLai={ds.taiLai} />;
  const meta = ds.data?.meta;
  return (
    <div className="flex flex-col gap-4">
      <Bang<GhiNhanDonMl>
        dong={ds.data?.data ?? []}
        khoaDong={r => r.id}
        rong={<Trong tieuDe="Chưa có đơn nào" moTa="Đơn có mã giới thiệu của bạn hoặc do bạn chốt sẽ hiện ở đây." />}
        cot={[
          { khoa: "ma_don", tieuDe: "Đơn", hienThi: r => <strong>{r.ma_don}</strong> },
          { khoa: "ngay", tieuDe: "Ngày", hienThi: r => dinhDangNgay(r.created_at) },
          { khoa: "nguon", tieuDe: "Nguồn", hienThi: r => `${NHAN_NGUON_DON_ML[r.nguon]}${r.ma_gioi_thieu ? ` · ${r.ma_gioi_thieu}` : ""}` },
          { khoa: "vai_tro", tieuDe: "Vai của bạn", hienThi: r => (r.vai_tro_cua_toi ? VAI_TRO[r.vai_tro_cua_toi] : "—") },
          { khoa: "nguoi_ban", tieuDe: "Người bán", hienThi: r => r.nguoi_ban?.ho_ten ?? "—" },
          { khoa: "tong", tieuDe: "Giá trị", canPhai: true, hienThi: r => dinhDangTien(r.tong_tien) },
          { khoa: "hoa_hong", tieuDe: "Hoa hồng", canPhai: true, hienThi: r => (r.hoa_hong ? dinhDangTien(r.hoa_hong.so_tien) : "—") },
          { khoa: "trang_thai", tieuDe: "Ghi nhận", hienThi: r => <NhanGhiNhan tt={r.trang_thai} /> }
        ]}
      />
      {meta && meta.tong_trang > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <Nut kieu="vien" co="nho" disabled={trang <= 1} onClick={() => setTrang(t => t - 1)}>
            Trước
          </Nut>
          <span>
            Trang {meta.trang}/{meta.tong_trang}
          </span>
          <Nut kieu="vien" co="nho" disabled={trang >= meta.tong_trang} onClick={() => setTrang(t => t + 1)}>
            Sau
          </Nut>
        </div>
      )}
    </div>
  );
}
