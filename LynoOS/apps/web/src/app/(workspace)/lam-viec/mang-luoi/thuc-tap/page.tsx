"use client";

import { useState } from "react";
import type { BaiTapTts, DanhGiaTts, KhoaHocLoTrinhTts } from "@thien-khue/contracts";
import { DangTai, HopThoai, Loi, Nut, ONhap, OChon, OVanBan, The, TheSoLieu, TheTieuDe, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { NhanBaiTap, useTaiMl, useVaiMangLuoi } from "@/features/mang-luoi/chung";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangNgayGio } from "@/lib/dinh-dang";

/** Thuc tap sinh: lo trinh + bai tap; mentor: cham bai. Vai do CRM cap — khong de xuat chuyen vai o day */
export default function TrangThucTap() {
  const q = useVaiMangLuoi();
  return (
    <>
      <TieuDeTrang
        kicker="Thực tập sinh"
        tieuDe="Lộ trình & bài tập"
        moTa="Học lộ trình, nộp bài tập để mentor chấm. Vai trò do CRM cấp — liên hệ quản lý để đổi."
      />
      {q.thucTap && <KhuThucTapSinh />}
      {q.mentor && <KhuMentor />}
      {!q.thucTap && !q.mentor && <Trong tieuDe="Khu này dành cho thực tập sinh và mentor" />}
    </>
  );
}

// ------------------------------------------------------------------ thuc tap sinh

function KhuThucTapSinh() {
  const loTrinh = useTaiMl(() => api.get<KhoaHocLoTrinhTts[]>("/mang-luoi/thuc-tap/lo-trinh"), []);
  const baiTap = useTaiMl(() => api.get<BaiTapTts[]>("/mang-luoi/thuc-tap/bai-tap"), []);
  const danhGia = useTaiMl(() => api.get<DanhGiaTts>("/mang-luoi/thuc-tap/danh-gia"), []);
  const [form, setForm] = useState({ khoa_hoc_id: "", tieu_de: "", mo_ta: "", link: "" });
  const [dangGui, setDangGui] = useState(false);
  const [tb, setTb] = useState<{ kieu: "thanh-cong" | "canh-bao"; chu: string } | null>(null);

  async function nop() {
    setDangGui(true);
    setTb(null);
    try {
      await api.post("/mang-luoi/thuc-tap/bai-tap", { ...form, mo_ta: form.mo_ta || undefined, link: form.link || undefined });
      setForm({ khoa_hoc_id: "", tieu_de: "", mo_ta: "", link: "" });
      setTb({ kieu: "thanh-cong", chu: "Đã nộp bài tập — mentor sẽ chấm và nhận xét." });
      await Promise.all([baiTap.taiLai(), loTrinh.taiLai(), danhGia.taiLai()]);
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setDangGui(false);
    }
  }

  return (
    <div className="mb-10 flex flex-col gap-6">
      {danhGia.data && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <TheSoLieu nhan="Bài học đã xong" giaTri={`${danhGia.data.bai_hoc.xong}/${danhGia.data.bai_hoc.tong}`} />
          <TheSoLieu nhan="Bài kiểm tra đạt" giaTri={`${danhGia.data.kiem_tra.dat}/${danhGia.data.kiem_tra.tong}`} phu={danhGia.data.kiem_tra.diem_tb !== null ? `điểm TB ${danhGia.data.kiem_tra.diem_tb}%` : undefined} />
          <TheSoLieu nhan="Bài tập đạt" giaTri={`${danhGia.data.bai_tap.dat}/${danhGia.data.bai_tap.tong}`} phu={danhGia.data.bai_tap.cho_cham ? `${danhGia.data.bai_tap.cho_cham} bài chờ chấm` : undefined} />
        </div>
      )}

      <The>
        <TheTieuDe kicker="Lộ trình" tieuDe="Khoá học của thực tập sinh" />
        {loTrinh.dangTai && !loTrinh.data ? (
          <DangTai />
        ) : loTrinh.loi ? (
          <Loi chiTiet={loTrinh.loi} thuLai={loTrinh.taiLai} />
        ) : loTrinh.data?.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {loTrinh.data.map(k => {
              const pt = k.so_bai_hoc ? Math.round((k.so_bai_xong / k.so_bai_hoc) * 100) : 0;
              return (
                <li key={k.id} className="flex flex-col gap-2 border-t border-vien py-4 first:border-0 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a href={`/hoc-vien/khoa-hoc/${k.id}`} className="text-h3 text-chu no-underline hover:text-chinh">
                      {k.ten}
                    </a>
                    <span className="text-sm text-chu-phu">
                      {k.so_bai_xong}/{k.so_bai_hoc} bài · kiểm tra {k.diem_kiem_tra === null ? "chưa làm" : `${k.diem_kiem_tra}%${k.dat_kiem_tra ? " (đạt)" : ""}`} · bài tập {k.bai_tap.dat}/
                      {k.bai_tap.tong}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-be-mat-phu" role="progressbar" aria-valuenow={pt} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-chinh" style={{ width: `${pt}%` }} />
                  </div>
                  {k.yeu_cau_thuc_hanh && <p className="m-0 text-sm text-chu-phu">Yêu cầu thực hành: {k.yeu_cau_thuc_hanh}</p>}
                </li>
              );
            })}
          </ul>
        ) : (
          <Trong tieuDe="Chưa có khoá học cho thực tập sinh" />
        )}
      </The>

      <The>
        <TheTieuDe kicker="Bài tập" tieuDe="Nộp bài tập cho mentor" />
        {tb && (
          <ThongBaoNoiDong kieu={tb.kieu} className="mb-4">
            {tb.chu}
          </ThongBaoNoiDong>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <OChon
            nhan="Khoá học"
            batBuoc
            value={form.khoa_hoc_id}
            onChange={e => setForm({ ...form, khoa_hoc_id: e.target.value })}
            goiYChon="Chọn khoá"
            luaChon={(loTrinh.data ?? []).map(k => ({ giaTri: k.id, nhan: k.ten }))}
          />
          <ONhap nhan="Tiêu đề bài" batBuoc value={form.tieu_de} onChange={e => setForm({ ...form, tieu_de: e.target.value })} />
          <ONhap nhan="Đường dẫn bài làm" type="url" placeholder="https://" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} lopKhung="md:col-span-2" />
          <OVanBan nhan="Mô tả" value={form.mo_ta} onChange={e => setForm({ ...form, mo_ta: e.target.value })} lopKhung="md:col-span-2" />
        </div>
        <div className="mt-4 flex justify-end">
          <Nut onClick={nop} dangXuLy={dangGui} disabled={!form.khoa_hoc_id || form.tieu_de.trim().length < 3}>
            Nộp bài
          </Nut>
        </div>
        <div className="mt-6">
          <DanhSachBaiTap ds={baiTap.data} dangTai={baiTap.dangTai} loi={baiTap.loi} taiLai={baiTap.taiLai} />
        </div>
      </The>
    </div>
  );
}

function DanhSachBaiTap({ ds, dangTai, loi, taiLai, onCham }: { ds: BaiTapTts[] | null; dangTai: boolean; loi: string | null; taiLai: () => void; onCham?: (b: BaiTapTts) => void }) {
  if (dangTai && !ds) return <DangTai />;
  if (loi) return <Loi chiTiet={loi} thuLai={taiLai} />;
  if (!ds?.length) return <Trong tieuDe="Chưa có bài tập" />;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {ds.map(b => (
        <li key={b.id} className="flex flex-col gap-1 border-t border-vien py-3 first:border-0 first:pt-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-h4">{b.tieu_de ?? "Bài tập"}</strong>
            <span className="flex items-center gap-2">
              {b.diem !== null && <span className="text-sm font-semibold">{b.diem}/100</span>}
              <NhanBaiTap tt={b.trang_thai} />
            </span>
          </div>
          <span className="text-sm text-chu-phu">
            {onCham ? `${b.ho_so.ho_ten} · ` : ""}
            {b.khoa_hoc.ten} · nộp {dinhDangNgayGio(b.nop_luc)}
            {b.nguoi_cham ? ` · chấm bởi ${b.nguoi_cham.ho_ten}` : ""}
          </span>
          {b.link && (
            <a href={b.link} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-medium text-chinh hover:text-chinh-dam hover:underline">
              {b.link}
            </a>
          )}
          {b.mo_ta && <p className="m-0 whitespace-pre-line text-sm text-chu-phu">{b.mo_ta}</p>}
          {b.nhan_xet && <p className="m-0 rounded-lg border border-vien bg-be-mat-phu px-3 py-2 text-sm text-chu">Mentor: {b.nhan_xet}</p>}
          {onCham && b.trang_thai === "CHO_CHAM" && (
            <div>
              <Nut co="nho" onClick={() => onCham(b)}>
                Chấm bài
              </Nut>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ mentor

function KhuMentor() {
  const tts = useTaiMl(() => api.get<DanhGiaTts[]>("/mang-luoi/mentor/tts"), []);
  const baiTap = useTaiMl(() => api.get<BaiTapTts[]>("/mang-luoi/mentor/bai-tap", { trang_thai: "CHO_CHAM" }), []);
  const [cham, setCham] = useState<{ b: BaiTapTts; ket_qua: "DAT" | "CHUA_DAT"; diem: string; nhan_xet: string } | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [tb, setTb] = useState<{ kieu: "thanh-cong" | "canh-bao"; chu: string } | null>(null);

  async function guiCham() {
    if (!cham) return;
    setDangGui(true);
    try {
      await api.post(`/mang-luoi/mentor/bai-tap/${cham.b.id}/cham`, { ket_qua: cham.ket_qua, diem: Number(cham.diem), nhan_xet: cham.nhan_xet });
      setTb({ kieu: "thanh-cong", chu: `Đã chấm bài của ${cham.b.ho_so.ho_ten}.` });
      setCham(null);
      await Promise.all([baiTap.taiLai(), tts.taiLai()]);
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
      setCham(null);
    } finally {
      setDangGui(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {tb && <ThongBaoNoiDong kieu={tb.kieu}>{tb.chu}</ThongBaoNoiDong>}
      <The>
        <TheTieuDe kicker="Mentor" tieuDe="Bài tập chờ chấm" />
        <DanhSachBaiTap ds={baiTap.data} dangTai={baiTap.dangTai} loi={baiTap.loi} taiLai={baiTap.taiLai} onCham={b => setCham({ b, ket_qua: "DAT", diem: "90", nhan_xet: "" })} />
      </The>

      <The>
        <TheTieuDe kicker="Mentor" tieuDe="Thực tập sinh" moTa="Tiến độ học và bài tập. Đổi vai trò làm ở CRM (phòng ban / nhóm quyền của nhân sự)." />
        {tts.dangTai && !tts.data ? (
          <DangTai />
        ) : tts.loi ? (
          <Loi chiTiet={tts.loi} thuLai={tts.taiLai} />
        ) : tts.data?.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {tts.data.map(t => (
              <li key={t.ho_so.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-vien py-3 first:border-0 first:pt-0">
                <span className="flex min-w-0 flex-col">
                  <strong className="text-h4">{t.ho_so.ho_ten}</strong>
                  <span className="text-sm text-chu-phu">
                    Bài học {t.bai_hoc.xong}/{t.bai_hoc.tong} · kiểm tra đạt {t.kiem_tra.dat}/{t.kiem_tra.tong} · bài tập đạt {t.bai_tap.dat}/{t.bai_tap.tong}
                    {t.bai_tap.diem_tb !== null ? ` (TB ${t.bai_tap.diem_tb})` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Trong tieuDe="Chưa có thực tập sinh" />
        )}
      </The>

      <HopThoai
        mo={!!cham}
        dong={() => setCham(null)}
        tieuDe="Chấm bài tập"
        moTa={cham ? `${cham.b.ho_so.ho_ten} · ${cham.b.tieu_de ?? ""}` : undefined}
        rong="nho"
        chanTrang={
          <Nut onClick={guiCham} dangXuLy={dangGui} disabled={!cham || cham.nhan_xet.trim().length < 3}>
            Lưu kết quả
          </Nut>
        }
      >
        {cham && (
          <div className="flex flex-col gap-4">
            <OChon
              nhan="Kết quả"
              value={cham.ket_qua}
              onChange={e => setCham({ ...cham, ket_qua: e.target.value as "DAT" | "CHUA_DAT" })}
              luaChon={[
                { giaTri: "DAT", nhan: "Đạt" },
                { giaTri: "CHUA_DAT", nhan: "Chưa đạt" }
              ]}
            />
            <ONhap nhan="Điểm (0–100)" type="number" min={0} max={100} value={cham.diem} onChange={e => setCham({ ...cham, diem: e.target.value })} />
            <OVanBan nhan="Nhận xét" batBuoc value={cham.nhan_xet} onChange={e => setCham({ ...cham, nhan_xet: e.target.value })} />
          </div>
        )}
      </HopThoai>
    </div>
  );
}
