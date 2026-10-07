"use client";

import type {
  DoiTacChiTietQt,
  DoiTacDongQt,
  GiaoDichDongQt,
  KhachHangChiTietQt,
  KhachHangDongQt,
  NguoiDungChiTietQt,
  NguoiDungDongQt,
  NhatKyQt,
  PhanTrangMeta,
  SanPhamChiTietQt,
  SanPhamDongQt
} from "@thien-khue/contracts";
import { DANH_SACH_VAI, NHAN_HANG_QT, NHAN_KICH_HOAT_LAM_VIEC, NHAN_NGUON_DON_QT, NHAN_VAI, trangThaiKichHoatLamViec } from "@thien-khue/contracts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Bang, DangTai, HopThoai, Loi, lopKicker, Nhan, Nut, NutLienKet, OChon, ONhap, The, TieuDeTrang, Trong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { dinhDangNgay, dinhDangNgayGio, dinhDangTien } from "@/lib/dinh-dang";
import { BoLoc, DongThongTin, NhanTrangThai, PhanTrang, tenVai, useTaiDuLieu } from "./dung-chung";
import { DongNhatKy } from "./nhat-ky";

/*
 * 6 nhom ho so lien ket (README muc 4): Nguoi dung · Khach hang (CRM) · San pham (CRM + khoa hoc / quyen SKU)
 * · Hoat dong (nhat ky) · Giao dich (ghi nhan don, hoa hong) · Doi tac. Chi xem — thay doi di qua ban phe duyet.
 */

type Nhom = "nguoi-dung" | "khach-hang" | "san-pham" | "hoat-dong" | "giao-dich" | "doi-tac";
const NHOM: { giaTri: Nhom; nhan: string }[] = [
  { giaTri: "nguoi-dung", nhan: "Người dùng" },
  { giaTri: "khach-hang", nhan: "Khách hàng" },
  { giaTri: "san-pham", nhan: "Sản phẩm" },
  { giaTri: "hoat-dong", nhan: "Hoạt động" },
  { giaTri: "giao-dich", nhan: "Giao dịch" },
  { giaTri: "doi-tac", nhan: "Đối tác" }
];

export function HoSoLienKet() {
  const tham = useSearchParams();
  const router = useRouter();
  const duongDan = usePathname();
  const nhomVao = tham.get("nhom") as Nhom | null;
  const nhom: Nhom = NHOM.some(n => n.giaTri === nhomVao) ? (nhomVao as Nhom) : "nguoi-dung";

  return (
    <div className="flex flex-col gap-6">
      <TieuDeTrang kicker="Quản trị" tieuDe="Hồ sơ liên kết" moTa="Con người – Sản phẩm – Công việc – Giao dịch trên một chỗ. Khách hàng và sản phẩm đọc trực tiếp từ CRM Lyno." />
      <BoLoc nhanAria="Nhóm hồ sơ" luaChon={NHOM} giaTri={nhom} doi={v => router.replace(`${duongDan}?nhom=${v}`, { scroll: false })} />
      {nhom === "nguoi-dung" && <NhomNguoiDung />}
      {nhom === "khach-hang" && <NhomKhachHang />}
      {nhom === "san-pham" && <NhomSanPham />}
      {nhom === "hoat-dong" && <NhomHoatDong />}
      {nhom === "giao-dich" && <NhomGiaoDich />}
      {nhom === "doi-tac" && <NhomDoiTac />}
    </div>
  );
}

// ================================================================== NGUOI DUNG

function NhomNguoiDung() {
  const [tk, setTk] = useState("");
  const [loc, setLoc] = useState<{ tu_khoa: string; vai: string }>({ tu_khoa: "", vai: "" });
  const [trang, setTrang] = useState(1);
  const [chon, setChon] = useState<string | null>(null);
  const ds = useTaiDuLieu(() => api.layCoMeta<NguoiDungDongQt[], PhanTrangMeta>("/quan-tri/ho-so/nguoi-dung", { ...loc, trang }), [loc, trang]);

  return (
    <section className="flex flex-col gap-4">
      <form
        className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end"
        onSubmit={e => {
          e.preventDefault();
          setTrang(1);
          setLoc(s => ({ ...s, tu_khoa: tk.trim() }));
        }}
      >
        <ONhap nhan="Tìm" placeholder="Họ tên, email, SĐT" value={tk} onChange={e => setTk(e.target.value)} />
        <OChon
          nhan="Vai"
          value={loc.vai}
          onChange={e => {
            setTrang(1);
            setLoc(s => ({ ...s, vai: e.target.value }));
          }}
          goiYChon="Tất cả vai"
          luaChon={DANH_SACH_VAI.map(v => ({ giaTri: v, nhan: NHAN_VAI[v] }))}
        />
        <Nut type="submit">
          Tìm
        </Nut>
      </form>
      <KetQua tai={ds}>
        {d => (
          <>
            <Bang<NguoiDungDongQt>
              dong={d.data}
              khoaDong={r => r.id}
              onChonDong={r => setChon(r.id)}
              cot={[
                { khoa: "ten", tieuDe: "Họ tên", hienThi: r => <span className="font-medium">{r.ho_ten}</span> },
                { khoa: "lien_he", tieuDe: "Liên hệ", hienThi: r => <span className="text-chu-phu">{[r.email, r.sdt].filter(Boolean).join(" · ") || "—"}</span> },
                {
                  khoa: "vai",
                  tieuDe: "Vai",
                  hienThi: r => (
                    <div className="flex flex-wrap gap-1">
                      {r.vai.map(v => (
                        <Nhan key={v.vai} tong={v.trang_thai === "HOAT_DONG" ? "thanh-cong" : v.trang_thai === "DANG_HOC" ? "chinh" : "trung-tinh"}>
                          {tenVai(v.vai)}
                        </Nhan>
                      ))}
                    </div>
                  )
                },
                { khoa: "sku", tieuDe: "Quyền SKU", canPhai: true, hienThi: r => r.so_quyen_sku },
                { khoa: "nguon", tieuDe: "Nguồn", hienThi: r => (r.crm_user_id ? <Nhan tong="chinh">Nhân sự CRM</Nhan> : <span className="text-chu-mo">Đăng ký</span>) }
              ]}
            />
            <PhanTrang meta={d.meta} doiTrang={setTrang} />
          </>
        )}
      </KetQua>
      <ChiTietNguoiDung id={chon} dong={() => setChon(null)} />
    </section>
  );
}

function ChiTietNguoiDung({ id, dong }: { id: string | null; dong: () => void }) {
  const ct = useTaiDuLieu(() => (id ? api.get<NguoiDungChiTietQt>(`/quan-tri/ho-so/nguoi-dung/${id}`) : Promise.resolve(null)), [id]);
  const h = ct.duLieu;
  const lienKet = (lap: string) => (h ? `/quan-tri/phe-duyet?lap=${lap}&ho_so=${h.id}&ten=${encodeURIComponent(h.ho_ten)}` : "#");
  return (
    <HopThoai
      mo={!!id}
      dong={dong}
      rong="lon"
      tieuDe={h?.ho_ten ?? "Hồ sơ"}
      moTa={h ? [h.email, h.sdt].filter(Boolean).join(" · ") : undefined}
      chanTrang={
        h && (
          <>
            <NutLienKet href={lienKet("CAP_QUYEN_SKU")} kieu="vien" co="nho">
              Đề xuất quyền SKU
            </NutLienKet>
            <NutLienKet href={lienKet("CHUYEN_VAI")} co="nho">
              Đề xuất chuyển vai
            </NutLienKet>
          </>
        )
      }
    >
      {ct.loi ? (
        <Loi chiTiet={ct.loi} />
      ) : !h ? (
        <DangTai />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SoNho nhan="Đơn ghi nhận" giaTri={h.giao_dich.so_don.toLocaleString("vi-VN")} />
            <SoNho nhan="Doanh số" giaTri={dinhDangTien(h.giao_dich.doanh_so)} />
            <SoNho nhan="Hoa hồng chờ" giaTri={dinhDangTien(h.giao_dich.hoa_hong_cho)} />
            <SoNho nhan="Đã trả" giaTri={dinhDangTien(h.giao_dich.hoa_hong_da_tra)} />
          </div>
          <Muc tieuDe="Vai trò">
            <div className="flex flex-col">
              {h.vai.map(v => (
                <DongThongTin key={v.vai} nhan={tenVai(v.vai)}>
                  <span className="inline-flex flex-wrap items-center justify-end gap-2">
                    <NhanTrangThai giaTri={v.trang_thai} />
                    <span className="text-xs text-chu-mo">từ {dinhDangNgay(v.tu_luc)}{v.nguon ? ` · ${v.nguon}` : ""}</span>
                  </span>
                </DongThongTin>
              ))}
              <DongThongTin nhan="Kích hoạt làm việc">{NHAN_KICH_HOAT_LAM_VIEC[trangThaiKichHoatLamViec(h.vai, h.kich_hoat_lam_viec)]}</DongThongTin>
            </div>
          </Muc>
          <Muc tieuDe="Quyền bán theo SKU">
            {h.quyen_sku.length ? (
              <div className="flex flex-wrap gap-2">
                {h.quyen_sku.map(q => (
                  <span key={q.mau_id} className="inline-flex items-center gap-2 rounded-lg border border-vien bg-be-mat px-3 py-1 text-sm">
                    <strong className="font-mono text-xs text-chu">{q.ma_mau}</strong>
                    <NhanTrangThai giaTri={q.trang_thai} />
                  </span>
                ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-chu-mo">Chưa có quyền SKU.</p>
            )}
          </Muc>
          <Muc tieuDe="Bài kiểm tra & chứng chỉ">
            {h.luot_lam.length || h.chung_chi.length ? (
              <div className="flex flex-col">
                {h.chung_chi.map(c => (
                  <DongThongTin key={c.ma_chung_chi} nhan={`Chứng chỉ · ${c.khoa_hoc}`}>
                    {c.ma_chung_chi} · {dinhDangNgay(c.cap_luc)}
                  </DongThongTin>
                ))}
                {h.luot_lam.map((l, i) => (
                  <DongThongTin key={i} nhan={l.bai_kiem_tra}>
                    <span className={l.dat ? "font-semibold text-thanh-cong" : "font-semibold text-canh-bao"}>
                      {l.diem}% · {l.dat ? "Đạt" : "Chưa đạt"}
                    </span>{" "}
                    <span className="text-xs text-chu-mo">{dinhDangNgayGio(l.nop_luc)}</span>
                  </DongThongTin>
                ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-chu-mo">Chưa làm bài kiểm tra.</p>
            )}
          </Muc>
          <Muc tieuDe="Lịch sử chuyển vai">
            {h.lich_su_vai.length ? (
              <div className="flex flex-col">
                {h.lich_su_vai.map((l, i) => (
                  <DongThongTin key={i} nhan={`${dinhDangNgayGio(l.created_at)} · ${tenVai(l.vai)}`}>
                    {l.trang_thai_cu ?? "—"} → {l.trang_thai_moi ?? "—"}
                    {l.nguoi_doi ? ` · ${l.nguoi_doi.ho_ten}` : ""}
                  </DongThongTin>
                ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-chu-mo">Chưa có.</p>
            )}
          </Muc>
          <Muc tieuDe="Hoạt động gần đây">
            <DsNhatKy ds={h.nhat_ky} />
          </Muc>
        </div>
      )}
    </HopThoai>
  );
}

// ================================================================== KHACH HANG (CRM)

function NhomKhachHang() {
  const [sdt, setSdt] = useState("");
  const [loc, setLoc] = useState<{ sdt?: string; so_lan_toi_thieu: number }>({ so_lan_toi_thieu: 1 });
  const [chon, setChon] = useState<string | null>(null);
  const ds = useTaiDuLieu(() => api.get<KhachHangDongQt[]>("/quan-tri/ho-so/khach-hang", { ...loc, gioi_han: 50 }), [loc]);

  return (
    <section className="flex flex-col gap-4">
      <form
        className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end"
        onSubmit={e => {
          e.preventDefault();
          setLoc(s => ({ ...s, sdt: sdt.trim() || undefined }));
        }}
      >
        <ONhap nhan="Số điện thoại" inputMode="tel" placeholder="Bỏ trống để xem khách mua nhiều nhất" value={sdt} onChange={e => setSdt(e.target.value)} />
        <OChon
          nhan="Số lần mua tối thiểu"
          value={String(loc.so_lan_toi_thieu)}
          onChange={e => setLoc(s => ({ ...s, so_lan_toi_thieu: Number(e.target.value) }))}
          luaChon={[1, 2, 5, 10].map(n => ({ giaTri: String(n), nhan: n === 10 ? "10 lần (KH hạnh phúc)" : `${n} lần` }))}
        />
        <Nut type="submit">
          Tìm
        </Nut>
      </form>
      <p className="m-0 text-xs text-chu-mo">Tích luỹ chỉ tính đơn bán hợp lệ (không huỷ / hoàn) — hạng tự tính lại khi đơn bị hoàn.</p>
      <KetQua tai={ds}>
        {d => (
          <Bang<KhachHangDongQt>
            dong={d}
            khoaDong={r => r.sdt_chuan}
            onChonDong={r => setChon(r.sdt_chuan)}
            rong={<Trong tieuDe="Không tìm thấy khách" />}
            cot={[
              { khoa: "ten", tieuDe: "Khách", hienThi: r => <span className="font-medium">{r.ten ?? "—"}</span> },
              { khoa: "sdt", tieuDe: "SĐT", hienThi: r => r.sdt_chuan },
              { khoa: "so_don", tieuDe: "Lần mua", canPhai: true, hienThi: r => r.so_don },
              { khoa: "tong", tieuDe: "Tích luỹ", canPhai: true, hienThi: r => dinhDangTien(r.tong_tien) },
              { khoa: "hang", tieuDe: "Hạng", hienThi: r => (r.hang ? <Nhan tong={r.hang === "VIP" ? "dam" : "chinh"}>{NHAN_HANG_QT[r.hang]}</Nhan> : <span className="text-chu-mo">—</span>) },
              { khoa: "cuoi", tieuDe: "Mua gần nhất", hienThi: r => dinhDangNgay(r.lan_mua_cuoi) }
            ]}
          />
        )}
      </KetQua>
      <ChiTietKhach sdt={chon} dong={() => setChon(null)} />
    </section>
  );
}

function ChiTietKhach({ sdt, dong }: { sdt: string | null; dong: () => void }) {
  const ct = useTaiDuLieu(() => (sdt ? api.get<KhachHangChiTietQt>(`/quan-tri/ho-so/khach-hang/${encodeURIComponent(sdt)}`) : Promise.resolve(null)), [sdt]);
  const k = ct.duLieu;
  return (
    <HopThoai mo={!!sdt} dong={dong} rong="lon" tieuDe={k?.ten ?? "Khách hàng"} moTa={k ? `${k.sdt_chuan}${k.dia_chi ? ` · ${k.dia_chi}` : ""}` : undefined}>
      {ct.loi ? (
        <Loi chiTiet={ct.loi} />
      ) : !k ? (
        <DangTai />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <SoNho nhan="Tích luỹ hợp lệ" giaTri={dinhDangTien(k.tong_tien)} />
            <SoNho nhan="Lần mua" giaTri={String(k.so_don)} />
            <SoNho nhan="Hạng" giaTri={k.hang ? NHAN_HANG_QT[k.hang] : "Chưa có"} />
          </div>
          <Muc tieuDe="Phụ trách & chương trình">
            <DongThongTin nhan="Sale / CSKH phụ trách">{k.phu_trach?.ho_so?.ho_ten ?? "Chưa giao"}</DongThongTin>
            <DongThongTin nhan="Khách hàng hạnh phúc">{k.kh_hanh_phuc ? <NhanTrangThai giaTri={k.kh_hanh_phuc.trang_thai} /> : "Chưa mời"}</DongThongTin>
            {k.ghi_chu && <DongThongTin nhan="Ghi chú CRM">{k.ghi_chu}</DongThongTin>}
          </Muc>
          <Muc tieuDe="Đơn hàng (CRM)">
            {k.don.length ? (
              <div className="flex flex-col">
                {k.don.map(d => (
                  <DongThongTin key={d.id} nhan={`${d.ma_don} · ${dinhDangNgay(d.created_at)}${d.loai_don === "DOI_TRA" ? " · đổi trả" : ""}`}>
                    <span className="inline-flex items-center gap-2">
                      {dinhDangTien(d.tong_tien)} <NhanTrangThai giaTri={d.trang_thai} />
                    </span>
                  </DongThongTin>
                ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-chu-mo">Chưa có đơn.</p>
            )}
          </Muc>
          <Muc tieuDe="Ưu đãi đã cấp">
            {k.uu_dai.length ? (
              <div className="flex flex-col">
                {k.uu_dai.map(u => (
                  <DongThongTin key={u.id} nhan={`${u.loai === "VOUCHER" ? "Voucher" : "Quà"} · ${u.ten}`}>
                    <NhanTrangThai giaTri={u.trang_thai} />
                  </DongThongTin>
                ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-chu-mo">Chưa có.</p>
            )}
          </Muc>
        </div>
      )}
    </HopThoai>
  );
}

// ================================================================== SAN PHAM

function NhomSanPham() {
  const [tk, setTk] = useState("");
  const [loc, setLoc] = useState({ tu_khoa: "", bao_gom_ngung: false });
  const [trang, setTrang] = useState(1);
  const [chon, setChon] = useState<string | null>(null);
  const ds = useTaiDuLieu(
    () => api.layCoMeta<SanPhamDongQt[], { trang: number; so_dong: number; co_trang_sau: boolean }>("/quan-tri/ho-so/san-pham", { ...loc, trang, so_dong: 30 }),
    [loc, trang]
  );
  return (
    <section className="flex flex-col gap-4">
      <form
        className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_auto_auto] sm:items-end"
        onSubmit={e => {
          e.preventDefault();
          setTrang(1);
          setLoc(s => ({ ...s, tu_khoa: tk.trim() }));
        }}
      >
        <ONhap nhan="Tìm sản phẩm" placeholder="Mã (AL01) hoặc tên" value={tk} onChange={e => setTk(e.target.value)} />
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-chu sm:min-h-[36px]">
          <input type="checkbox" className="h-4 w-4 accent-chinh" checked={loc.bao_gom_ngung} onChange={e => setLoc(s => ({ ...s, bao_gom_ngung: e.target.checked }))} />
          Gồm mã ngừng bán
        </label>
        <Nut type="submit">
          Tìm
        </Nut>
      </form>
      <KetQua tai={ds}>
        {d => (
          <>
            <Bang<SanPhamDongQt>
              dong={d.data}
              khoaDong={r => r.id}
              onChonDong={r => setChon(r.id)}
              cot={[
                { khoa: "ma", tieuDe: "Mã", hienThi: r => <span className="font-mono text-xs font-semibold text-chu">{r.ma}</span> },
                { khoa: "ten", tieuDe: "Tên", hienThi: r => r.ten },
                { khoa: "gia", tieuDe: "Giá bán", canPhai: true, hienThi: r => dinhDangTien(r.gia_ban) },
                { khoa: "tt", tieuDe: "Trạng thái", hienThi: r => <NhanTrangThai giaTri={r.trang_thai} /> },
                { khoa: "khoa", tieuDe: "Khoá học", hienThi: r => (r.khoa_hoc ? `v${r.khoa_hoc.phien_ban_tai_lieu}` : <span className="text-canh-bao">Chưa có</span>) },
                {
                  khoa: "quyen",
                  tieuDe: "Người được bán",
                  canPhai: true,
                  hienThi: r => (
                    <span>
                      {r.quyen_sku.hoat_dong}
                      {r.quyen_sku.can_hoc_lai ? <span className="text-canh-bao"> · {r.quyen_sku.can_hoc_lai} cần học lại</span> : null}
                    </span>
                  )
                }
              ]}
            />
            <div className="flex justify-end gap-2">
              <Nut kieu="vien" co="nho" disabled={trang <= 1} onClick={() => setTrang(t => t - 1)}>
                ← Trước
              </Nut>
              <Nut kieu="vien" co="nho" disabled={!d.meta?.co_trang_sau} onClick={() => setTrang(t => t + 1)}>
                Sau →
              </Nut>
            </div>
          </>
        )}
      </KetQua>
      <ChiTietSanPham id={chon} dong={() => setChon(null)} />
    </section>
  );
}

function ChiTietSanPham({ id, dong }: { id: string | null; dong: () => void }) {
  const ct = useTaiDuLieu(() => (id ? api.get<SanPhamChiTietQt>(`/quan-tri/ho-so/san-pham/${id}`) : Promise.resolve(null)), [id]);
  const s = ct.duLieu;
  return (
    <HopThoai mo={!!id} dong={dong} rong="lon" tieuDe={s ? `${s.ma} · ${s.ten}` : "Sản phẩm"} moTa={s ? [s.chat_lieu, s.form_dang].filter(Boolean).join(" · ") || undefined : undefined}>
      {ct.loi ? (
        <Loi chiTiet={ct.loi} />
      ) : !s ? (
        <DangTai />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <SoNho nhan="Giá bán" giaTri={dinhDangTien(s.gia_ban)} />
            <SoNho nhan="Tồn kho" giaTri={s.ton_kho.reduce((t, x) => t + x.so_luong, 0).toLocaleString("vi-VN")} />
            <SoNho nhan="Người được bán" giaTri={String(s.quyen_sku.hoat_dong)} />
          </div>
          <Muc tieuDe="Khoá học sản phẩm">
            {s.khoa_hoc ? (
              <DongThongTin nhan={s.khoa_hoc.ten}>Tài liệu phiên bản {s.khoa_hoc.phien_ban_tai_lieu}</DongThongTin>
            ) : (
              <p className="m-0 text-sm text-canh-bao">Chưa có khoá học — chưa ai được cấp quyền bán mã này.</p>
            )}
          </Muc>
          <Muc tieuDe="Tồn kho theo size / màu">
            {s.ton_kho.length ? (
              <div className="flex flex-wrap gap-2">
                {s.ton_kho.map(t => (
                  <span key={`${t.size}-${t.mau_sac}`} className="rounded border border-vien bg-be-mat px-2 py-1 text-xs font-medium text-chu">
                    {t.size} · {t.mau_sac}: <strong>{t.so_luong}</strong>
                  </span>
                ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-chu-mo">Không có dữ liệu tồn.</p>
            )}
          </Muc>
          <Muc tieuDe="Quyền bán theo người">
            {s.nguoi_co_quyen.length ? (
              <div className="flex flex-col">
                {s.nguoi_co_quyen.map(q => (
                  <DongThongTin key={q.ho_so.id} nhan={q.ho_so.ho_ten}>
                    <span className="inline-flex items-center gap-2">
                      <NhanTrangThai giaTri={q.trang_thai} />
                      <span className="text-xs text-chu-mo">v{q.phien_ban_tai_lieu} · {dinhDangNgay(q.cap_luc)}</span>
                    </span>
                  </DongThongTin>
                ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-chu-mo">Chưa ai được cấp quyền.</p>
            )}
          </Muc>
        </div>
      )}
    </HopThoai>
  );
}

// ================================================================== HOAT DONG

function NhomHoatDong() {
  const ds = useTaiDuLieu(() => api.layCoMeta<NhatKyQt[], PhanTrangMeta>("/quan-tri/ho-so/hoat-dong", { so_dong: 30 }), []);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-chu-phu">30 hoạt động gần nhất.</p>
        <NutLienKet href="/quan-tri/nhat-ky" kieu="vien" co="nho">
          Mở nhật ký đầy đủ
        </NutLienKet>
      </div>
      <KetQua tai={ds}>
        {d => (
          <The className="px-4 py-1 md:px-5 md:py-1">
            <DsNhatKy ds={d.data} />
          </The>
        )}
      </KetQua>
    </section>
  );
}

// ================================================================== GIAO DICH

function NhomGiaoDich() {
  const [loc, setLoc] = useState<{ trang_thai: string; nguon: string }>({ trang_thai: "", nguon: "" });
  const [trang, setTrang] = useState(1);
  const ds = useTaiDuLieu(() => api.layCoMeta<GiaoDichDongQt[], PhanTrangMeta>("/quan-tri/ho-so/giao-dich", { ...loc, trang }), [loc, trang]);
  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-[640px]">
        <OChon
          nhan="Trạng thái ghi nhận"
          value={loc.trang_thai}
          onChange={e => {
            setTrang(1);
            setLoc(s => ({ ...s, trang_thai: e.target.value }));
          }}
          goiYChon="Tất cả"
          luaChon={[
            { giaTri: "HOP_LE", nhan: "Hợp lệ" },
            { giaTri: "CHO_XAC_MINH", nhan: "Chờ xác minh" },
            { giaTri: "DA_DOI_SOAT", nhan: "Đã đối soát" },
            { giaTri: "BI_HUY", nhan: "Bị huỷ" }
          ]}
        />
        <OChon
          nhan="Nguồn"
          value={loc.nguon}
          onChange={e => {
            setTrang(1);
            setLoc(s => ({ ...s, nguon: e.target.value }));
          }}
          goiYChon="Tất cả nguồn"
          luaChon={(["SALE", "CTV", "KOC", "KOL"] as const).map(n => ({ giaTri: n, nhan: NHAN_NGUON_DON_QT[n] }))}
        />
      </div>
      <KetQua tai={ds}>
        {d => (
          <>
            <Bang<GiaoDichDongQt>
              dong={d.data}
              khoaDong={r => r.id}
              rong={<Trong tieuDe="Chưa có đơn được ghi nhận" />}
              cot={[
                { khoa: "ma", tieuDe: "Đơn", hienThi: r => <span className="font-mono text-xs font-semibold text-chu">{r.ma_don}</span> },
                { khoa: "tien", tieuDe: "Tổng tiền", canPhai: true, hienThi: r => dinhDangTien(r.tong_tien) },
                { khoa: "nguon", tieuDe: "Nguồn", hienThi: r => NHAN_NGUON_DON_QT[r.nguon] },
                { khoa: "ban", tieuDe: "Người bán", hienThi: r => r.nguoi_ban?.ho_ten ?? "—" },
                { khoa: "tt", tieuDe: "Ghi nhận", hienThi: r => <NhanTrangThai giaTri={r.trang_thai} /> },
                {
                  khoa: "hh",
                  tieuDe: "Hoa hồng",
                  hienThi: r =>
                    r.hoa_hong ? (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {dinhDangTien(r.hoa_hong.so_tien)}
                        <NhanTrangThai giaTri={r.hoa_hong.trang_thai} />
                      </span>
                    ) : (
                      <span className="text-chu-mo">—</span>
                    )
                },
                { khoa: "ngay", tieuDe: "Ngày", hienThi: r => dinhDangNgay(r.created_at) }
              ]}
            />
            <PhanTrang meta={d.meta} doiTrang={setTrang} />
          </>
        )}
      </KetQua>
    </section>
  );
}

// ================================================================== DOI TAC

const NHAN_LOAI_DOI_TAC: Record<DoiTacDongQt["loai"], string> = {
  DOANH_NGHIEP: "Doanh nghiệp",
  NGAN_HANG: "Ngân hàng",
  TO_CHUC: "Tổ chức",
  NHA_CUNG_CAP_QUA: "Nhà cung cấp quà"
};

function NhomDoiTac() {
  const [trang, setTrang] = useState(1);
  const [chon, setChon] = useState<string | null>(null);
  const ds = useTaiDuLieu(() => api.layCoMeta<DoiTacDongQt[], PhanTrangMeta>("/quan-tri/ho-so/doi-tac", { trang }), [trang]);
  return (
    <section className="flex flex-col gap-4">
      <KetQua tai={ds}>
        {d => (
          <>
            <Bang<DoiTacDongQt>
              dong={d.data}
              khoaDong={r => r.id}
              onChonDong={r => setChon(r.id)}
              rong={<Trong tieuDe="Chưa có đối tác" />}
              cot={[
                { khoa: "ten", tieuDe: "Đối tác", hienThi: r => <span className="font-medium">{r.ten}</span> },
                { khoa: "loai", tieuDe: "Loại", hienThi: r => NHAN_LOAI_DOI_TAC[r.loai] },
                { khoa: "qua", tieuDe: "Quà / voucher", canPhai: true, hienThi: r => `${r.so_qua} / ${r.so_voucher}` },
                { khoa: "hd", tieuDe: "Hợp đồng", canPhai: true, hienThi: r => r.so_hop_dong },
                { khoa: "dt", tieuDe: "Doanh thu quà", canPhai: true, hienThi: r => dinhDangTien(r.doanh_thu_qua) },
                { khoa: "cp", tieuDe: "Chi phí tài trợ", canPhai: true, hienThi: r => dinhDangTien(r.chi_phi_tai_tro) }
              ]}
            />
            <PhanTrang meta={d.meta} doiTrang={setTrang} />
          </>
        )}
      </KetQua>
      <ChiTietDoiTac id={chon} dong={() => setChon(null)} />
    </section>
  );
}

function ChiTietDoiTac({ id, dong }: { id: string | null; dong: () => void }) {
  const ct = useTaiDuLieu(() => (id ? api.get<DoiTacChiTietQt>(`/quan-tri/ho-so/doi-tac/${id}`) : Promise.resolve(null)), [id]);
  const d = ct.duLieu;
  return (
    <HopThoai mo={!!id} dong={dong} rong="lon" tieuDe={d?.ten ?? "Đối tác"} moTa={d ? NHAN_LOAI_DOI_TAC[d.loai] : undefined}>
      {ct.loi ? (
        <Loi chiTiet={ct.loi} />
      ) : !d ? (
        <DangTai />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <SoNho nhan="Doanh thu bán quà" giaTri={dinhDangTien(d.doanh_thu_qua)} />
            <SoNho nhan="Chi phí tài trợ" giaTri={dinhDangTien(d.chi_phi_tai_tro)} />
          </div>
          <Muc tieuDe="Liên hệ">
            <DongThongTin nhan="Người liên hệ">{d.nguoi_lien_he ?? "—"}</DongThongTin>
            <DongThongTin nhan="SĐT / email">{[d.sdt, d.email].filter(Boolean).join(" · ") || "—"}</DongThongTin>
            <DongThongTin nhan="Mã số thuế">{d.ma_so_thue ?? "—"}</DongThongTin>
            <DongThongTin nhan="Địa chỉ">{d.dia_chi ?? "—"}</DongThongTin>
          </Muc>
          <Muc tieuDe="Hợp đồng">
            {d.hop_dong.length ? (
              d.hop_dong.map(h => (
                <DongThongTin key={h.id} nhan={h.ten}>
                  <span className="inline-flex flex-wrap items-center justify-end gap-2">
                    <NhanTrangThai giaTri={h.trang_thai} />
                    <span className="text-xs text-chu-mo">
                      quà {dinhDangTien(h.doanh_thu_qua)} · tài trợ {dinhDangTien(h.chi_phi_tai_tro)}
                    </span>
                  </span>
                </DongThongTin>
              ))
            ) : (
              <p className="m-0 text-sm text-chu-mo">Chưa có hợp đồng.</p>
            )}
          </Muc>
          <Muc tieuDe="Quà tặng & voucher">
            {d.qua_tang.map(q => (
              <DongThongTin key={q.id} nhan={`Quà · ${q.ten}`}>
                <NhanTrangThai giaTri={q.trang_thai} />
              </DongThongTin>
            ))}
            {d.voucher.map(v => (
              <DongThongTin key={v.id} nhan={`Voucher · ${v.ma}`}>
                <NhanTrangThai giaTri={v.trang_thai} />
              </DongThongTin>
            ))}
            {!d.qua_tang.length && !d.voucher.length && <p className="m-0 text-sm text-chu-mo">Chưa có.</p>}
          </Muc>
        </div>
      )}
    </HopThoai>
  );
}

// ================================================================== tro giup hien thi

function KetQua<T>({ tai, children }: { tai: { duLieu: T | null; dangTai: boolean; loi: string | null; taiLai: () => Promise<void> }; children: (d: T) => React.ReactNode }) {
  if (tai.loi) return <Loi chiTiet={tai.loi} thuLai={() => void tai.taiLai()} />;
  if (!tai.duLieu) return <DangTai />;
  return <div className={tai.dangTai ? "opacity-60 transition-opacity" : undefined}>{children(tai.duLieu)}</div>;
}

function Muc({ tieuDe, children }: { tieuDe: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className={cn(lopKicker, "m-0")}>{tieuDe}</h3>
      {children}
    </section>
  );
}

function SoNho({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg bg-be-mat-phu px-4 py-3">
      <span className="text-xs font-medium text-chu-phu">{nhan}</span>
      <span className="so break-words text-h3 text-chu">{giaTri}</span>
    </div>
  );
}

function DsNhatKy({ ds }: { ds: NhatKyQt[] }) {
  if (!ds.length) return <p className="m-0 text-sm text-chu-mo">Chưa có hoạt động.</p>;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {ds.map(n => (
        <DongNhatKy key={n.id} n={n} />
      ))}
    </ul>
  );
}

