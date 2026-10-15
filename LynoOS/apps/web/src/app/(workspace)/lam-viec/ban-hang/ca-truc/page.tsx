"use client";

import { useMemo, useState } from "react";
import type { CaTruc, NhanSuBanHang, TaoCaTrucBody, VaiCaTruc } from "@thien-khue/contracts";
import { Bang, DangTai, HopThoai, Loi, Nhan, Nut, OChon, ONhap, The, TheTieuDe, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { useTai } from "@/features/ban-hang/dung-tai";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangNgay } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";

/** "YYYY-MM-DD" hom nay theo gio Viet Nam */
function homNayVn(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function congNgay(ngay: string, so: number): string {
  const d = new Date(`${ngay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + so);
  return d.toISOString().slice(0, 10);
}

const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Ca truc: Sale / CSKH xem lich cua minh; QUAN_LY xep ca, xem nhan su + tai viec */
export default function TrangCaTruc() {
  const { coVai } = useXacThuc();
  const laQuanLy = coVai("QUAN_LY");
  const [tuNgay, setTuNgay] = useState(homNayVn);
  const denNgay = congNgay(tuNgay, 6);
  const [moTao, setMoTao] = useState(false);
  const [thongBao, setThongBao] = useState<string | null>(null);

  const ca = useTai(() => api.get<CaTruc[]>("/ban-hang/ca-truc", { tu_ngay: tuNgay, den_ngay: denNgay }), [tuNgay, denNgay]);
  const nhanSu = useTai(() => (laQuanLy ? api.get<NhanSuBanHang[]>("/ban-hang/nhan-su") : Promise.resolve([] as NhanSuBanHang[])), [laQuanLy]);

  const theoNgay = useMemo(() => {
    const ngay = Array.from({ length: 7 }, (_, i) => congNgay(tuNgay, i));
    return ngay.map(n => ({ ngay: n, ds: (ca.data ?? []).filter(c => c.ngay === n) }));
  }, [ca.data, tuNgay]);

  async function xoa(c: CaTruc) {
    if (!window.confirm(`Xoá ca ${c.tu_gio}–${c.den_gio} của ${c.ho_ten} ngày ${dinhDangNgay(`${c.ngay}T00:00:00+07:00`)}?`)) return;
    try {
      await api.delete(`/ban-hang/ca-truc/${c.id}`);
      setThongBao(null);
      await ca.taiLai();
    } catch (e) {
      setThongBao(thongDiepLoi(e));
    }
  }

  return (
    <>
      <TieuDeTrang
        kicker="Sale / CSKH"
        tieuDe="Ca trực"
        moTa="Khách mới chỉ tự động phân bổ cho người đang trong ca, ưu tiên người đủ quyền mã khách quan tâm và đang ít việc."
        hanhDong={
          <>
            <Nut kieu="vien" co="nho" onClick={() => setTuNgay(n => congNgay(n, -7))}>
              ← Tuần trước
            </Nut>
            <Nut kieu="trong" co="nho" onClick={() => setTuNgay(homNayVn())}>
              Hôm nay
            </Nut>
            <Nut kieu="vien" co="nho" onClick={() => setTuNgay(n => congNgay(n, 7))}>
              Tuần sau →
            </Nut>
            {laQuanLy && (
              <Nut co="nho" onClick={() => setMoTao(true)}>
                + Xếp ca
              </Nut>
            )}
          </>
        }
      />
      {thongBao && (
        <ThongBaoNoiDong kieu="canh-bao" className="mb-4">
          {thongBao}
        </ThongBaoNoiDong>
      )}
      {ca.dangTai && !ca.data ? (
        <DangTai />
      ) : ca.loi ? (
        <Loi chiTiet={ca.loi} thuLai={ca.taiLai} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {theoNgay.map(({ ngay, ds }) => {
            const homNay = ngay === homNayVn();
            return (
              <div key={ngay} className={`flex min-w-0 flex-col gap-2 rounded-xl border p-3 ${homNay ? "border-chinh/40 bg-chinh-nhat" : "border-vien bg-be-mat"}`}>
                <div className="flex items-baseline justify-between">
                  <strong className="text-h4">{THU[new Date(`${ngay}T00:00:00Z`).getUTCDay()]}</strong>
                  <span className="text-sm text-chu-phu">{ngay.slice(8, 10)}/{ngay.slice(5, 7)}</span>
                </div>
                {ds.length ? (
                  ds.map(c => (
                    <div key={c.id} className="flex flex-col gap-1 rounded-lg border border-vien bg-be-mat p-2 text-sm">
                      <span className="flex items-center justify-between gap-1">
                        <strong>
                          {c.tu_gio}–{c.den_gio}
                        </strong>
                        {c.dang_dien_ra ? <Nhan tong="thanh-cong">Đang trực</Nhan> : <Nhan tong={c.vai === "SALE" ? "chinh" : "trung-tinh"}>{c.vai}</Nhan>}
                      </span>
                      {laQuanLy && <span className="truncate text-chu-phu">{c.ho_ten}</span>}
                      <span className="text-chu-phu">
                        {c.so_khach_da_giao}
                        {c.so_khach_toi_da ? `/${c.so_khach_toi_da}` : ""} khách
                      </span>
                      {laQuanLy && (
                        <button type="button" onClick={() => xoa(c)} className="self-start rounded text-xs font-semibold text-loi hover:underline">
                          Xoá ca
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-chu-phu">Không có ca</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {laQuanLy && (
        <The className="mt-8">
          <TheTieuDe kicker="Quản lý" tieuDe="Nhân sự Sale / CSKH" moTa="Tải = số khách đang phụ trách. Chỉ vai đang hoạt động mới được phân bổ." />
          {nhanSu.loi ? (
            <Loi chiTiet={nhanSu.loi} thuLai={nhanSu.taiLai} />
          ) : (
            <Bang<NhanSuBanHang>
              dong={nhanSu.data ?? []}
              khoaDong={n => n.ho_so_id}
              rong={<Trong tieuDe="Chưa có nhân sự Sale / CSKH" />}
              cot={[
                {
                  khoa: "ten",
                  tieuDe: "Nhân sự",
                  hienThi: n => (
                    <div className="flex flex-col">
                      <span className="font-semibold">{n.ho_ten}</span>
                      <span className="text-sm text-chu-phu">{n.email ?? ""}</span>
                    </div>
                  )
                },
                { khoa: "vai", tieuDe: "Vai hoạt động", hienThi: n => (n.vai.length ? n.vai.join(", ") : <Nhan tong="chinh">Đang học</Nhan>) },
                { khoa: "ca", tieuDe: "Trong ca", hienThi: n => (n.dang_trong_ca ? <Nhan tong="thanh-cong">Đang trực</Nhan> : <Nhan tong="trung-tinh">Ngoài ca</Nhan>) },
                { khoa: "quyen", tieuDe: "Mã được quyền", canPhai: true, hienThi: n => n.so_ma_duoc_quyen },
                {
                  khoa: "nang_luc",
                  tieuDe: "Năng lực",
                  hienThi: n => (
                    <span className="text-sm text-chu-phu">{n.nang_luc.map(x => `${x.ma_mau ?? x.nhom} (${x.muc})`).join(", ") || "—"}</span>
                  )
                },
                { khoa: "tai", tieuDe: "Tải", canPhai: true, hienThi: n => <strong>{n.tai_hien_tai}</strong> }
              ]}
            />
          )}
        </The>
      )}

      {laQuanLy && (
        <HopXepCa
          mo={moTao}
          dong={() => setMoTao(false)}
          nhanSu={(nhanSu.data ?? []).filter(n => n.vai.length)}
          ngayMacDinh={tuNgay}
          xong={() => void ca.taiLai()}
        />
      )}
    </>
  );
}

function HopXepCa({ mo, dong, nhanSu, ngayMacDinh, xong }: { mo: boolean; dong: () => void; nhanSu: NhanSuBanHang[]; ngayMacDinh: string; xong: () => void }) {
  const [form, setForm] = useState<{ ho_so_id: string; ngay: string; tu_gio: string; den_gio: string; vai: VaiCaTruc; so_khach_toi_da: string; ghi_chu: string }>({
    ho_so_id: "",
    ngay: ngayMacDinh,
    tu_gio: "08:00",
    den_gio: "17:00",
    vai: "SALE",
    so_khach_toi_da: "",
    ghi_chu: ""
  });
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const nguoi = nhanSu.find(n => n.ho_so_id === form.ho_so_id);

  async function gui() {
    setDangGui(true);
    setLoi(null);
    try {
      const body: TaoCaTrucBody = {
        ho_so_id: form.ho_so_id,
        ngay: form.ngay,
        tu_gio: form.tu_gio,
        den_gio: form.den_gio,
        vai: form.vai,
        so_khach_toi_da: form.so_khach_toi_da ? Number(form.so_khach_toi_da) : null,
        ghi_chu: form.ghi_chu.trim() || null
      };
      await api.post("/ban-hang/ca-truc", body);
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
      tieuDe="Xếp ca trực"
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Huỷ
          </Nut>
          <Nut onClick={gui} dangXuLy={dangGui} disabled={!form.ho_so_id || !form.ngay}>
            Lưu ca
          </Nut>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {loi && <ThongBaoNoiDong kieu="loi" className="sm:col-span-2">{loi}</ThongBaoNoiDong>}
        <OChon
          nhan="Nhân sự"
          batBuoc
          lopKhung="sm:col-span-2"
          value={form.ho_so_id}
          onChange={e => {
            const n = nhanSu.find(x => x.ho_so_id === e.target.value);
            setForm(f => ({ ...f, ho_so_id: e.target.value, vai: n?.vai.includes(f.vai) ? f.vai : (n?.vai[0] ?? f.vai) }));
          }}
          goiYChon="Chọn nhân sự"
          luaChon={nhanSu.map(n => ({ giaTri: n.ho_so_id, nhan: `${n.ho_ten} · ${n.vai.join("/")}` }))}
        />
        <ONhap nhan="Ngày" type="date" batBuoc value={form.ngay} onChange={e => setForm(f => ({ ...f, ngay: e.target.value }))} />
        <OChon
          nhan="Vai trong ca"
          value={form.vai}
          onChange={e => setForm(f => ({ ...f, vai: e.target.value as VaiCaTruc }))}
          luaChon={(nguoi?.vai.length ? nguoi.vai : (["SALE", "CSKH"] as VaiCaTruc[])).map(v => ({ giaTri: v, nhan: v }))}
        />
        <ONhap nhan="Từ giờ" type="time" batBuoc value={form.tu_gio} onChange={e => setForm(f => ({ ...f, tu_gio: e.target.value }))} />
        <ONhap nhan="Đến giờ" type="time" batBuoc value={form.den_gio} onChange={e => setForm(f => ({ ...f, den_gio: e.target.value }))} />
        <ONhap
          nhan="Số khách tối đa trong ca"
          type="number"
          min={1}
          value={form.so_khach_toi_da}
          onChange={e => setForm(f => ({ ...f, so_khach_toi_da: e.target.value }))}
          goiY="Bỏ trống = không giới hạn"
        />
        <ONhap nhan="Ghi chú" value={form.ghi_chu} onChange={e => setForm(f => ({ ...f, ghi_chu: e.target.value }))} maxLength={500} />
      </div>
    </HopThoai>
  );
}
