"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DANH_SACH_KENH_DON,
  NHAN_KENH_DON,
  type KenhDon,
  type KetQuaTaoDon,
  type MauDuocPhep,
  type TaoDonBody,
  type TonKhoMau
} from "@thien-khue/contracts";
import { DangTai, Loi, Nhan, Nut, NutLienKet, OChon, ONhap, OVanBan, The, TheTieuDe, ThongBaoNoiDong, Trong } from "@/components/ui";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangTien } from "@/lib/dinh-dang";
import { useTai } from "./dung-tai";

interface DongForm {
  khoa: number;
  mau_id: string;
  size: string;
  mau_sac: string;
  so_luong: string;
  don_gia: string;
}

let demKhoa = 0;
const dongMoi = (): DongForm => ({ khoa: ++demKhoa, mau_id: "", size: "", mau_sac: "", so_luong: "1", don_gia: "" });

/**
 * Form tao don qua CRM: chi hien ma SKU minh da duoc cap quyen (API van kiem lai moi ma).
 * Khach lay tu query (?sdt=&ten=&dia_chi=) khi mo tu trang chi tiet khach.
 */
export function FormTaoDon() {
  const thamSo = useSearchParams();
  const mau = useTai(() => api.get<MauDuocPhep[]>("/ban-hang/mau-duoc-phep"), []);
  const [sdt, setSdt] = useState(thamSo.get("sdt") ?? "");
  const [ten, setTen] = useState(thamSo.get("ten") ?? "");
  const [diaChi, setDiaChi] = useState(thamSo.get("dia_chi") ?? "");
  const [kenh, setKenh] = useState<KenhDon>("facebook");
  const [ghiChu, setGhiChu] = useState("");
  const [maGioiThieu, setMaGioiThieu] = useState("");
  const [dong, setDong] = useState<DongForm[]>(() => [dongMoi()]);
  const [tonKho, setTonKho] = useState<Record<string, TonKhoMau[]>>({});
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [ketQua, setKetQua] = useState<KetQuaTaoDon | null>(null);

  const theoId = useMemo(() => new Map((mau.data ?? []).map(m => [m.id, m])), [mau.data]);

  // Tai ton kho cho mau moi chon (de goi y size / mau sac)
  useEffect(() => {
    for (const d of dong) {
      if (d.mau_id && !tonKho[d.mau_id]) {
        const id = d.mau_id;
        setTonKho(t => ({ ...t, [id]: [] }));
        api
          .get<TonKhoMau[]>(`/ban-hang/mau/${id}/ton-kho`)
          .then(ds => setTonKho(t => ({ ...t, [id]: ds })))
          .catch(() => undefined);
      }
    }
  }, [dong, tonKho]);

  const suaDong = (khoa: number, sua: Partial<DongForm>) => setDong(ds => ds.map(d => (d.khoa === khoa ? { ...d, ...sua } : d)));

  const tongTien = dong.reduce((t, d) => {
    const gia = d.don_gia !== "" ? Number(d.don_gia) : (theoId.get(d.mau_id)?.gia_ban ?? 0);
    return t + (Number(d.so_luong) || 0) * (gia || 0);
  }, 0);

  const hopLe = sdt.replace(/\D/g, "").length >= 9 && ten.trim() && dong.length > 0 && dong.every(d => d.mau_id && Number(d.so_luong) > 0);

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    if (!hopLe) return;
    setDangGui(true);
    setLoi(null);
    try {
      const body: TaoDonBody = {
        kenh,
        khach_ten: ten.trim(),
        khach_sdt: sdt.trim(),
        khach_dia_chi: diaChi.trim() || null,
        ghi_chu: ghiChu.trim() || null,
        ma_gioi_thieu: maGioiThieu.trim() || null,
        dong: dong.map(d => ({
          mau_id: d.mau_id,
          size: d.size || undefined,
          mau_sac: d.mau_sac || undefined,
          so_luong: Number(d.so_luong),
          ...(d.don_gia !== "" ? { don_gia: Number(d.don_gia) } : {})
        }))
      };
      setKetQua(await api.post<KetQuaTaoDon>("/ban-hang/don", body));
    } catch (e2) {
      setLoi(thongDiepLoi(e2));
    } finally {
      setDangGui(false);
    }
  }

  if (ketQua) {
    return (
      <The className="flex flex-col items-start gap-4">
        <Nhan tong="thanh-cong">Đã tạo đơn trên CRM</Nhan>
        <h2 className="m-0 text-h1">Đơn {ketQua.ma_don}</h2>
        <p className="m-0 text-body-lg text-chu-phu">Tổng tiền {dinhDangTien(ketQua.tong_tien)}.</p>
        {ketQua.ghi_nhan.trang_thai === "CHO_XAC_MINH" ? (
          <ThongBaoNoiDong kieu="canh-bao">
            Đơn có mã giới thiệu của người khác nên đang <strong>chờ xác minh người bán</strong> — {ketQua.ghi_nhan.ly_do}
          </ThongBaoNoiDong>
        ) : ketQua.ghi_nhan.trang_thai === "HOP_LE" ? (
          <ThongBaoNoiDong kieu="thanh-cong">Đơn đã ghi nhận cho bạn là người bán.</ThongBaoNoiDong>
        ) : null}
        {ketQua.canh_bao && <ThongBaoNoiDong kieu="canh-bao">{ketQua.canh_bao}</ThongBaoNoiDong>}
        <div className="flex flex-wrap gap-3">
          <NutLienKet href={`/lam-viec/ban-hang/khach/${sdt.replace(/\D/g, "").replace(/^84/, "0")}`} kieu="vien">
            Về hồ sơ khách
          </NutLienKet>
          <Nut
            onClick={() => {
              setKetQua(null);
              setDong([dongMoi()]);
              setGhiChu("");
              setMaGioiThieu("");
            }}
          >
            Tạo đơn khác
          </Nut>
        </div>
      </The>
    );
  }

  if (mau.dangTai && !mau.data) return <DangTai />;
  if (mau.loi) return <Loi chiTiet={mau.loi} thuLai={mau.taiLai} />;
  if (!mau.data?.length) {
    return (
      <Trong
        tieuDe="Bạn chưa được cấp quyền bán mã nào"
        moTa="Học và đạt khoá sản phẩm (bài kiểm tra từ 90%) của mã nào thì mới được bán mã đó."
        hanhDong={
          <NutLienKet href="/hoc-vien/khoa-hoc" co="nho">
            Vào khoá sản phẩm
          </NutLienKet>
        }
      />
    );
  }

  return (
    <form onSubmit={gui} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        <The>
          <TheTieuDe kicker="Bước 1" tieuDe="Khách hàng" moTa="Khách phải đang được giao cho bạn. Chỉ khách mới hoàn toàn (SĐT chưa có trên CRM) mới tự giao cho bạn sau khi đơn tạo thành công; khách cũ chưa ai phụ trách phải nhờ quản lý phân bổ." />
          <div className="grid gap-4 md:grid-cols-2">
            <ONhap nhan="Số điện thoại" batBuoc inputMode="tel" value={sdt} onChange={e => setSdt(e.target.value)} placeholder="0912 345 678" />
            <ONhap nhan="Tên khách" batBuoc value={ten} onChange={e => setTen(e.target.value)} maxLength={200} />
            <ONhap nhan="Địa chỉ giao" lopKhung="md:col-span-2" value={diaChi} onChange={e => setDiaChi(e.target.value)} maxLength={500} />
            <OChon
              nhan="Kênh"
              value={kenh}
              onChange={e => setKenh(e.target.value as KenhDon)}
              luaChon={DANH_SACH_KENH_DON.map(k => ({ giaTri: k, nhan: NHAN_KENH_DON[k] }))}
            />
            <ONhap
              nhan="Mã giới thiệu (CTV / KOC)"
              value={maGioiThieu}
              onChange={e => setMaGioiThieu(e.target.value)}
              maxLength={50}
              goiY="Khác người chốt thì đơn chờ xác minh — không chi trả hai lần."
            />
          </div>
        </The>

        <The>
          <TheTieuDe
            kicker="Bước 2"
            tieuDe="Sản phẩm"
            moTa={`Chỉ hiện ${mau.data.length} mã bạn đã được cấp quyền bán.`}
            hanhDong={
              <Nut kieu="vien" co="nho" onClick={() => setDong(ds => [...ds, dongMoi()])} disabled={dong.length >= 50}>
                + Thêm dòng
              </Nut>
            }
          />
          <div className="flex flex-col gap-4">
            {dong.map((d, i) => {
              const m = theoId.get(d.mau_id);
              const ton = d.mau_id ? (tonKho[d.mau_id] ?? []) : [];
              const sizes = [...new Set(ton.map(t => t.size).filter(Boolean))];
              const mauSac = [...new Set(ton.filter(t => !d.size || t.size === d.size).map(t => t.mau_sac).filter(Boolean))];
              const conLai = ton.find(t => t.size === d.size && t.mau_sac === d.mau_sac)?.so_luong;
              return (
                <div key={d.khoa} className="rounded-xl border border-vien bg-be-mat-phu p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <strong className="text-h4">Dòng {i + 1}</strong>
                    {dong.length > 1 && (
                      <button type="button" className="min-h-[36px] rounded-lg px-2 text-sm font-semibold text-loi hover:bg-loi-nhat" onClick={() => setDong(ds => ds.filter(x => x.khoa !== d.khoa))}>
                        Xoá
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <OChon
                      nhan="Mẫu"
                      batBuoc
                      lopKhung="md:col-span-2"
                      value={d.mau_id}
                      onChange={e => suaDong(d.khoa, { mau_id: e.target.value, size: "", mau_sac: "", don_gia: "" })}
                      goiYChon="Chọn mã được quyền"
                      luaChon={mau.data!.map(x => ({
                        giaTri: x.id,
                        nhan: `${x.ma} · ${x.ten}${x.gia_ban !== null ? ` · ${dinhDangTien(x.gia_ban)}` : ""}${x.trang_thai === "het_hang" ? " (hết hàng)" : ""}`
                      }))}
                    />
                    <ONhap nhan="Size" list={`size-${d.khoa}`} value={d.size} onChange={e => suaDong(d.khoa, { size: e.target.value })} maxLength={50} />
                    <datalist id={`size-${d.khoa}`}>
                      {sizes.map(s => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                    <ONhap nhan="Màu sắc" list={`mau-${d.khoa}`} value={d.mau_sac} onChange={e => suaDong(d.khoa, { mau_sac: e.target.value })} maxLength={50} goiY={conLai !== undefined ? `Tồn kho: ${conLai}` : undefined} />
                    <datalist id={`mau-${d.khoa}`}>
                      {mauSac.map(s => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                    <ONhap nhan="Số lượng" batBuoc type="number" min={1} max={100000} value={d.so_luong} onChange={e => suaDong(d.khoa, { so_luong: e.target.value })} />
                    <ONhap
                      nhan="Đơn giá (đ)"
                      type="number"
                      min={0}
                      step={1000}
                      value={d.don_gia}
                      placeholder={m?.gia_ban != null ? String(m.gia_ban) : "Nhập giá"}
                      onChange={e => suaDong(d.khoa, { don_gia: e.target.value })}
                      goiY={m?.gia_ban != null ? "Bỏ trống = giá bán hiện tại" : undefined}
                    />
                  </div>
                  {m?.cau_tu_van && <p className="m-0 mt-3 text-sm leading-relaxed text-chinh-dam">Gợi ý tư vấn: {m.cau_tu_van}</p>}
                </div>
              );
            })}
          </div>
        </The>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-[72px] lg:self-start">
        <The>
          <TheTieuDe kicker="Bước 3" tieuDe="Xác nhận" />
          <OVanBan nhan="Ghi chú đơn" rows={3} value={ghiChu} onChange={e => setGhiChu(e.target.value)} maxLength={2000} />
          <div className="mt-4 flex items-baseline justify-between border-t border-vien pt-4">
            <span className="text-sm text-chu-phu">Tạm tính</span>
            <strong className="so text-so">{dinhDangTien(tongTien)}</strong>
          </div>
          {loi && (
            <ThongBaoNoiDong kieu="canh-bao" className="mt-4">
              {loi}
            </ThongBaoNoiDong>
          )}
          <Nut type="submit" className="mt-4" rongHet nhay dangXuLy={dangGui} disabled={!hopLe}>
            Tạo đơn trên CRM
          </Nut>
          <p className="m-0 mt-3 text-xs leading-relaxed text-chu-phu">
            Đơn được tạo trên CRM Lyno bằng tài khoản của bạn. Tạo đơn chưa trừ kho — kho trừ khi giao thành công.{" "}
            <Link href="/lam-viec/ban-hang/khach" className="font-medium text-chinh hover:text-chinh-dam hover:underline">
              Danh sách khách
            </Link>
          </p>
        </The>
      </div>
    </form>
  );
}
