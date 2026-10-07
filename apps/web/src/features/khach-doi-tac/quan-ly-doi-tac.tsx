"use client";

import type { BaoCaoDoiTac, DoiTac, HopDongDoiTac, KetQuaChienDich, LoaiDoiTac, LoaiHopDong, TrangThaiHopDong } from "@thien-khue/contracts";
import {
  DANH_SACH_LOAI_DOI_TAC,
  DANH_SACH_LOAI_HOP_DONG,
  DANH_SACH_TRANG_THAI_HOP_DONG,
  NHAN_LOAI_DOI_TAC,
  NHAN_LOAI_HOP_DONG,
  NHAN_TRANG_THAI_HOP_DONG
} from "@thien-khue/contracts";
import { useState } from "react";
import { Bang, DangTai, HopThoai, Loi, lopChip, Nhan, Nut, OChon, ONhap, OVanBan, The, TheSoLieu, TheTieuDe, ThongBaoNoiDong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";
import { apiKdt, useTai, useThaoTac } from "./api";

/*
 * Doi tac chien luoc (khu "Hanh phuc CEO / Doi tac" — nen chinh-nhat).
 * Bao cao tach: doanh thu ban qua / chi phi tai tro / ket qua chien dich. Khong co danh sach khach ca nhan.
 */

const NHAN_KET_QUA: Record<string, string> = { luot_tiep_can: "Lượt tiếp cận", don_hang: "Đơn hàng", doanh_thu: "Doanh thu" };

export function KetQuaGon({ kq }: { kq: KetQuaChienDich | null | undefined }) {
  const muc = Object.entries(kq ?? {}).filter(([, v]) => typeof v === "number");
  if (!muc.length) return <span className="text-chu-phu">—</span>;
  return (
    <span className="flex flex-col text-sm">
      {muc.map(([k, v]) => (
        <span key={k}>
          {NHAN_KET_QUA[k] ?? k}: <strong>{k === "doanh_thu" ? dinhDangTien(v) : (v as number).toLocaleString("vi-VN")}</strong>
        </span>
      ))}
    </span>
  );
}

export function BangBaoCao({ ds }: { ds: BaoCaoDoiTac[] }) {
  return (
    <Bang
      dong={ds}
      khoaDong={b => b.doi_tac_id}
      cot={[
        { khoa: "ten", tieuDe: "Đối tác", hienThi: b => <span className="flex flex-col"><strong>{b.ten}</strong><span className="text-sm text-chu-phu">{NHAN_LOAI_DOI_TAC[b.loai]}</span></span> },
        { khoa: "hd", tieuDe: "HĐ", canPhai: true, hienThi: b => b.so_hop_dong },
        { khoa: "dt", tieuDe: "Doanh thu bán quà", canPhai: true, hienThi: b => dinhDangTien(b.doanh_thu_qua) },
        { khoa: "cp", tieuDe: "Chi phí tài trợ", canPhai: true, hienThi: b => dinhDangTien(b.chi_phi_tai_tro) },
        { khoa: "kq", tieuDe: "Kết quả chiến dịch", hienThi: b => <KetQuaGon kq={b.ket_qua_chien_dich} /> },
        { khoa: "ud", tieuDe: "Ưu đãi (duyệt)", canPhai: true, hienThi: b => `${b.so_qua_da_duyet} quà · ${b.so_voucher_da_duyet} voucher` },
        { khoa: "luot", tieuDe: "Lượt cấp / dùng", canPhai: true, hienThi: b => `${b.luot_cap} / ${b.luot_dung}` }
      ]}
      rong={<p className="m-0 text-sm text-chu-phu">Chưa có đối tác.</p>}
    />
  );
}

export function QuanLyDoiTac() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [phienBan, setPhienBan] = useState(0);
  const ds = useTai(() => apiKdt.dsDoiTac({ tu_khoa: tuKhoa || undefined }), [tuKhoa, phienBan]);
  const baoCao = useTai(apiKdt.baoCao, [phienBan]);
  const [sua, setSua] = useState<DoiTac | "moi" | null>(null);
  const [chon, setChon] = useState<DoiTac | null>(null);

  const tong = (baoCao.data ?? []).reduce(
    (s, b) => ({ dt: s.dt + b.doanh_thu_qua, cp: s.cp + b.chi_phi_tai_tro, dung: s.dung + b.luot_dung }),
    { dt: 0, cp: 0, dung: 0 }
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-chinh/20 bg-chinh-nhat p-6 md:p-8">
        <span className={cn(lopChip, "mb-3 bg-be-mat text-chinh-dam")}>Doanh nghiệp & đối tác</span>
        <h2 className="m-0 text-h1 text-chu">Cùng xây dựng giá trị bền vững</h2>
        <p className="mb-0 mt-2 max-w-[680px] text-body text-chu-phu">
          Doanh nghiệp, ngân hàng, tổ chức đặt quà số lượng lớn hoặc hợp tác đồng thương hiệu. Đối tác chỉ thấy số liệu tổng hợp — không bao giờ thấy danh sách khách cá nhân.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <TheSoLieu nhan="Doanh thu bán quà" giaTri={dinhDangTien(tong.dt)} />
        <TheSoLieu nhan="Chi phí tài trợ" giaTri={dinhDangTien(tong.cp)} />
        <TheSoLieu nhan="Lượt ưu đãi đã dùng" giaTri={tong.dung.toLocaleString("vi-VN")} />
      </div>

      <The>
        <TheTieuDe
          kicker="Danh sách"
          tieuDe="Đối tác chiến lược"
          hanhDong={
            <Nut co="nho" onClick={() => setSua("moi")}>
              Thêm đối tác
            </Nut>
          }
        />
        <ONhap aria-label="Tìm đối tác" placeholder="Tìm theo tên…" value={tuKhoa} onChange={e => setTuKhoa(e.target.value)} lopKhung="mb-4 max-w-[360px]" />
        {ds.dangTai && !ds.data ? (
          <DangTai />
        ) : ds.loi ? (
          <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
        ) : (
          <Bang
            dong={ds.data?.data ?? []}
            khoaDong={d => d.id}
            onChonDong={d => setChon(d)}
            cot={[
              { khoa: "ten", tieuDe: "Tên", hienThi: d => <strong>{d.ten}</strong> },
              { khoa: "loai", tieuDe: "Loại", hienThi: d => NHAN_LOAI_DOI_TAC[d.loai] },
              { khoa: "lh", tieuDe: "Liên hệ", hienThi: d => <span className="flex flex-col text-sm"><span>{d.nguoi_lien_he ?? "—"}</span><span className="text-chu-phu">{d.sdt ?? d.email ?? ""}</span></span> },
              { khoa: "tk", tieuDe: "Tài khoản", hienThi: d => (d.ho_so_id ? <Nhan tong="chinh">Đã gắn</Nhan> : <Nhan tong="trung-tinh">Chưa</Nhan>) },
              { khoa: "bat", tieuDe: "", hienThi: d => (d.bat ? <Nhan tong="thanh-cong">Đang hợp tác</Nhan> : <Nhan tong="trung-tinh">Ngừng</Nhan>) },
              {
                khoa: "sua",
                tieuDe: "",
                canPhai: true,
                hienThi: d => (
                  <Nut
                    co="nho"
                    kieu="trong"
                    onClick={e => {
                      e.stopPropagation();
                      setSua(d);
                    }}
                  >
                    Sửa
                  </Nut>
                )
              }
            ]}
            rong={<p className="m-0 text-sm text-chu-phu">Chưa có đối tác.</p>}
          />
        )}
      </The>

      <The>
        <TheTieuDe kicker="Báo cáo" tieuDe="Tách doanh thu quà / chi phí tài trợ / kết quả chiến dịch" moTa="Số liệu tổng hợp theo hợp đồng (không tính hợp đồng huỷ)." />
        {baoCao.dangTai && !baoCao.data ? <DangTai /> : baoCao.loi ? <Loi chiTiet={baoCao.loi} thuLai={() => void baoCao.taiLai()} /> : <BangBaoCao ds={baoCao.data ?? []} />}
      </The>

      {sua && (
        <HopThoaiDoiTac
          dt={sua === "moi" ? null : sua}
          dong={() => setSua(null)}
          xong={() => {
            setSua(null);
            setPhienBan(x => x + 1);
          }}
        />
      )}
      {chon && <HopThoaiHopDong dt={chon} dong={() => setChon(null)} doi={() => setPhienBan(x => x + 1)} />}
    </div>
  );
}

function HopThoaiDoiTac({ dt, dong, xong }: { dt: DoiTac | null; dong: () => void; xong: () => void }) {
  const [f, setF] = useState({
    ten: dt?.ten ?? "",
    loai: (dt?.loai ?? "DOANH_NGHIEP") as LoaiDoiTac,
    ma_so_thue: dt?.ma_so_thue ?? "",
    nguoi_lien_he: dt?.nguoi_lien_he ?? "",
    sdt: dt?.sdt ?? "",
    email: dt?.email ?? "",
    dia_chi: dt?.dia_chi ?? "",
    ho_so_id: dt?.ho_so_id ?? "",
    ghi_chu: dt?.ghi_chu ?? "",
    bat: dt?.bat ?? true
  });
  const tt = useThaoTac();
  const dat = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const luu = async () => {
    const body = {
      ten: f.ten.trim(),
      loai: f.loai,
      ma_so_thue: f.ma_so_thue.trim() || null,
      nguoi_lien_he: f.nguoi_lien_he.trim() || null,
      sdt: f.sdt.trim() || null,
      email: f.email.trim() || null,
      dia_chi: f.dia_chi.trim() || null,
      ho_so_id: f.ho_so_id.trim() || null,
      ghi_chu: f.ghi_chu.trim() || null
    };
    const r = await tt.chay(() => (dt ? apiKdt.capNhatDoiTac(dt.id, { ...body, bat: f.bat }) : apiKdt.taoDoiTac(body)));
    if (r) xong();
  };
  return (
    <HopThoai
      mo
      dong={dong}
      rong="lon"
      tieuDe={dt ? `Sửa đối tác ${dt.ten}` : "Thêm đối tác"}
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Huỷ
          </Nut>
          <Nut onClick={() => void luu()} dangXuLy={tt.dangXuLy} disabled={!f.ten.trim()}>
            Lưu
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {tt.loi && <ThongBaoNoiDong kieu="loi">{tt.loi}</ThongBaoNoiDong>}
        <div className="grid gap-4 sm:grid-cols-2">
          <ONhap nhan="Tên" batBuoc value={f.ten} onChange={dat("ten")} />
          <OChon nhan="Loại" value={f.loai} onChange={dat("loai")} luaChon={DANH_SACH_LOAI_DOI_TAC.map(l => ({ giaTri: l, nhan: NHAN_LOAI_DOI_TAC[l] }))} />
          <ONhap nhan="Mã số thuế" value={f.ma_so_thue} onChange={dat("ma_so_thue")} />
          <ONhap nhan="Người liên hệ" value={f.nguoi_lien_he} onChange={dat("nguoi_lien_he")} />
          <ONhap nhan="Điện thoại" type="tel" value={f.sdt} onChange={dat("sdt")} />
          <ONhap nhan="Email" type="email" value={f.email} onChange={dat("email")} />
        </div>
        <ONhap nhan="Địa chỉ" value={f.dia_chi} onChange={dat("dia_chi")} />
        <ONhap nhan="Mã hồ sơ tài khoản đối tác" value={f.ho_so_id} onChange={dat("ho_so_id")} goiY="ID hồ sơ có vai Đối tác — để đối tác tự xem cổng của mình." />
        <OVanBan nhan="Ghi chú" rows={2} value={f.ghi_chu} onChange={dat("ghi_chu")} />
        {dt && (
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={f.bat} onChange={e => setF({ ...f, bat: e.target.checked })} /> Đang hợp tác
          </label>
        )}
      </div>
    </HopThoai>
  );
}

/** Hop dong cua mot doi tac: danh sach + them / sua (tach doanh thu qua / chi phi tai tro / ket qua) */
function HopThoaiHopDong({ dt, dong, doi }: { dt: DoiTac; dong: () => void; doi: () => void }) {
  const ds = useTai(() => apiKdt.dsHopDong(dt.id), [dt.id]);
  const [sua, setSua] = useState<HopDongDoiTac | "moi" | null>(null);
  return (
    <HopThoai mo dong={dong} rong="lon" tieuDe={`Hợp đồng — ${dt.ten}`} moTa={NHAN_LOAI_DOI_TAC[dt.loai]}>
      {sua ? (
        <FormHopDong
          doiTacId={dt.id}
          hd={sua === "moi" ? null : sua}
          huy={() => setSua(null)}
          xong={() => {
            setSua(null);
            void ds.taiLai();
            doi();
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <Nut co="nho" onClick={() => setSua("moi")}>
              Thêm hợp đồng
            </Nut>
          </div>
          {ds.dangTai && !ds.data ? (
            <DangTai />
          ) : ds.loi ? (
            <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
          ) : (
            <Bang
              dong={ds.data ?? []}
              khoaDong={h => h.id}
              onChonDong={h => setSua(h)}
              cot={[
                { khoa: "ten", tieuDe: "Hợp đồng", hienThi: h => <span className="flex flex-col"><strong>{h.ten}</strong><span className="text-sm text-chu-phu">{h.so_hop_dong ?? ""} · {NHAN_LOAI_HOP_DONG[h.loai]}</span></span> },
                { khoa: "dt", tieuDe: "Doanh thu quà", canPhai: true, hienThi: h => dinhDangTien(h.doanh_thu_qua) },
                { khoa: "cp", tieuDe: "Chi phí tài trợ", canPhai: true, hienThi: h => dinhDangTien(h.chi_phi_tai_tro) },
                { khoa: "kq", tieuDe: "Kết quả", hienThi: h => <KetQuaGon kq={h.ket_qua_chien_dich} /> },
                { khoa: "han", tieuDe: "Thời hạn", hienThi: h => `${dinhDangNgay(h.bat_dau)} – ${dinhDangNgay(h.ket_thuc)}` },
                { khoa: "tt", tieuDe: "", hienThi: h => <Nhan tong={h.trang_thai === "HIEU_LUC" ? "thanh-cong" : h.trang_thai === "NHAP" ? "chinh" : "trung-tinh"}>{NHAN_TRANG_THAI_HOP_DONG[h.trang_thai]}</Nhan> }
              ]}
              rong={<p className="m-0 text-sm text-chu-phu">Chưa có hợp đồng.</p>}
            />
          )}
        </div>
      )}
    </HopThoai>
  );
}

function FormHopDong({ doiTacId, hd, huy, xong }: { doiTacId: string; hd: HopDongDoiTac | null; huy: () => void; xong: () => void }) {
  const kq = hd?.ket_qua_chien_dich ?? {};
  const [f, setF] = useState({
    so_hop_dong: hd?.so_hop_dong ?? "",
    ten: hd?.ten ?? "",
    loai: (hd?.loai ?? "DAT_QUA") as LoaiHopDong,
    trang_thai: (hd?.trang_thai ?? "NHAP") as TrangThaiHopDong,
    gia_tri_hop_dong: hd?.gia_tri_hop_dong != null ? String(hd.gia_tri_hop_dong) : "",
    doanh_thu_qua: String(hd?.doanh_thu_qua ?? 0),
    chi_phi_tai_tro: String(hd?.chi_phi_tai_tro ?? 0),
    luot_tiep_can: kq.luot_tiep_can != null ? String(kq.luot_tiep_can) : "",
    don_hang: kq.don_hang != null ? String(kq.don_hang) : "",
    doanh_thu: kq.doanh_thu != null ? String(kq.doanh_thu) : "",
    ket_qua_ghi_chu: hd?.ket_qua_ghi_chu ?? "",
    bat_dau: hd?.bat_dau?.slice(0, 10) ?? "",
    ket_thuc: hd?.ket_thuc?.slice(0, 10) ?? ""
  });
  const tt = useThaoTac();
  const dat = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const so = (s: string) => (s.trim() === "" ? undefined : Number(s));
  const luu = async () => {
    const ketQua: KetQuaChienDich = {};
    for (const k of ["luot_tiep_can", "don_hang", "doanh_thu"] as const) {
      const v = so(f[k]);
      if (v !== undefined) ketQua[k] = v;
    }
    const body = {
      so_hop_dong: f.so_hop_dong.trim() || null,
      ten: f.ten.trim(),
      loai: f.loai,
      trang_thai: f.trang_thai,
      gia_tri_hop_dong: so(f.gia_tri_hop_dong) ?? null,
      doanh_thu_qua: so(f.doanh_thu_qua) ?? 0,
      chi_phi_tai_tro: so(f.chi_phi_tai_tro) ?? 0,
      ket_qua_chien_dich: Object.keys(ketQua).length ? ketQua : null,
      ket_qua_ghi_chu: f.ket_qua_ghi_chu.trim() || null,
      bat_dau: f.bat_dau || null,
      ket_thuc: f.ket_thuc || null
    };
    const r = await tt.chay(() => (hd ? apiKdt.capNhatHopDong(hd.id, body) : apiKdt.taoHopDong(doiTacId, body)));
    if (r) xong();
  };
  return (
    <div className="flex flex-col gap-4">
      {tt.loi && <ThongBaoNoiDong kieu="loi">{tt.loi}</ThongBaoNoiDong>}
      <div className="grid gap-4 sm:grid-cols-2">
        <ONhap nhan="Tên hợp đồng" batBuoc value={f.ten} onChange={dat("ten")} />
        <ONhap nhan="Số hợp đồng" value={f.so_hop_dong} onChange={dat("so_hop_dong")} />
        <OChon nhan="Loại" value={f.loai} onChange={dat("loai")} luaChon={DANH_SACH_LOAI_HOP_DONG.map(l => ({ giaTri: l, nhan: NHAN_LOAI_HOP_DONG[l] }))} />
        <OChon nhan="Trạng thái" value={f.trang_thai} onChange={dat("trang_thai")} luaChon={DANH_SACH_TRANG_THAI_HOP_DONG.map(l => ({ giaTri: l, nhan: NHAN_TRANG_THAI_HOP_DONG[l] }))} />
        <ONhap nhan="Bắt đầu" type="date" value={f.bat_dau} onChange={dat("bat_dau")} />
        <ONhap nhan="Kết thúc" type="date" value={f.ket_thuc} onChange={dat("ket_thuc")} />
      </div>
      <h4 className="m-0 mt-2 text-xs font-semibold uppercase tracking-[0.04em] text-chu-mo">Tách dòng tiền</h4>
      <div className="grid gap-4 sm:grid-cols-3">
        <ONhap nhan="Giá trị hợp đồng" type="number" min={0} value={f.gia_tri_hop_dong} onChange={dat("gia_tri_hop_dong")} />
        <ONhap nhan="Doanh thu bán quà" type="number" min={0} value={f.doanh_thu_qua} onChange={dat("doanh_thu_qua")} />
        <ONhap nhan="Chi phí tài trợ" type="number" min={0} value={f.chi_phi_tai_tro} onChange={dat("chi_phi_tai_tro")} />
      </div>
      <h4 className="m-0 mt-2 text-xs font-semibold uppercase tracking-[0.04em] text-chu-mo">Kết quả chiến dịch (chỉ số tổng hợp)</h4>
      <div className="grid gap-4 sm:grid-cols-3">
        <ONhap nhan="Lượt tiếp cận" type="number" min={0} value={f.luot_tiep_can} onChange={dat("luot_tiep_can")} />
        <ONhap nhan="Đơn hàng" type="number" min={0} value={f.don_hang} onChange={dat("don_hang")} />
        <ONhap nhan="Doanh thu chiến dịch" type="number" min={0} value={f.doanh_thu} onChange={dat("doanh_thu")} />
      </div>
      <OVanBan nhan="Ghi chú kết quả" rows={2} value={f.ket_qua_ghi_chu} onChange={dat("ket_qua_ghi_chu")} goiY="Không ghi tên / số điện thoại khách cá nhân." />
      <div className="flex justify-end gap-3">
        <Nut kieu="trong" onClick={huy}>
          Quay lại
        </Nut>
        <Nut onClick={() => void luu()} dangXuLy={tt.dangXuLy} disabled={!f.ten.trim()}>
          Lưu hợp đồng
        </Nut>
      </div>
    </div>
  );
}
