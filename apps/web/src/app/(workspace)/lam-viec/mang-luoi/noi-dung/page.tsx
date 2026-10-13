"use client";

import { useEffect, useState } from "react";
import type { ChienDichChoToi, LoaiNoiDungKocMl, NenTangNoiDungMl, NoiDungKocMl } from "@thien-khue/contracts";
import { DangTai, HopThoai, Loi, Nut, ONhap, OChon, OVanBan, The, TheTieuDe, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { NhanNoiDung, useTaiMl, useVaiMangLuoi } from "@/features/mang-luoi/chung";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangNgayGio } from "@/lib/dinh-dang";

const NEN_TANG: { giaTri: NenTangNoiDungMl; nhan: string }[] = [
  { giaTri: "TIKTOK", nhan: "TikTok" },
  { giaTri: "FACEBOOK", nhan: "Facebook" },
  { giaTri: "INSTAGRAM", nhan: "Instagram" },
  { giaTri: "YOUTUBE", nhan: "YouTube" },
  { giaTri: "KHAC", nhan: "Khác" }
];

interface Form {
  chien_dich_id: string;
  loai: LoaiNoiDungKocMl;
  tieu_de: string;
  ma_mau: string;
  kich_ban: string;
  link_video: string;
  nen_tang: string;
}

const FORM_TRONG: Form = { chien_dich_id: "", loai: "VIDEO", tieu_de: "", ma_mau: "", kich_ban: "", link_video: "", nen_tang: "TIKTOK" };

/** Nop kich ban / video (link), gan ma san pham, cap nhat luot xem / tuong tac */
export default function TrangNoiDung() {
  const q = useVaiMangLuoi();
  const ds = useTaiMl(() => api.get<NoiDungKocMl[]>("/mang-luoi/noi-dung"), []);
  const cd = useTaiMl(() => api.get<ChienDichChoToi[]>("/mang-luoi/chien-dich"), []);
  const [form, setForm] = useState<Form>(FORM_TRONG);
  const [dangSua, setDangSua] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [tb, setTb] = useState<{ kieu: "thanh-cong" | "canh-bao"; chu: string } | null>(null);
  const [soLieu, setSoLieu] = useState<{ nd: NoiDungKocMl; xem: string; tuongTac: string; daDang: boolean } | null>(null);

  useEffect(() => {
    // ?chien_dich=<id> tu trang chien dich
    const id = new URLSearchParams(window.location.search).get("chien_dich");
    if (id) setForm(f => ({ ...f, chien_dich_id: id }));
  }, []);

  if (!q.taoNoiDung) return <Trong tieuDe="Chưa nộp được nội dung" moTa="Khu này dành cho KOL, KOC, CTV đang hoạt động." />;

  const chienDichDaNhan = (cd.data ?? []).filter(c => c.tham_gia?.trang_thai === "DA_DUYET");
  const cdChon = chienDichDaNhan.find(c => c.id === form.chien_dich_id);
  const doi = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function gui(luuNhap: boolean) {
    setDangGui(true);
    setTb(null);
    const body = {
      loai: form.loai,
      tieu_de: form.tieu_de,
      ma_mau: form.ma_mau || undefined,
      kich_ban: form.kich_ban || undefined,
      link_video: form.link_video || undefined,
      nen_tang: (form.nen_tang || undefined) as NenTangNoiDungMl | undefined,
      luu_nhap: luuNhap
    };
    try {
      if (dangSua) await api.patch(`/mang-luoi/noi-dung/${dangSua}`, body);
      else await api.post("/mang-luoi/noi-dung", { ...body, chien_dich_id: form.chien_dich_id || undefined });
      setTb({ kieu: "thanh-cong", chu: luuNhap ? "Đã lưu nháp." : "Đã gửi duyệt — người phụ trách sẽ phản hồi." });
      setForm(FORM_TRONG);
      setDangSua(null);
      await ds.taiLai();
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setDangGui(false);
    }
  }

  function suaLai(nd: NoiDungKocMl) {
    setDangSua(nd.id);
    setForm({
      chien_dich_id: nd.chien_dich_id ?? "",
      loai: nd.loai,
      tieu_de: nd.tieu_de,
      ma_mau: nd.ma_mau ?? "",
      kich_ban: nd.kich_ban ?? "",
      link_video: nd.link_video ?? "",
      nen_tang: nd.nen_tang ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function luuSoLieu() {
    if (!soLieu) return;
    setDangGui(true);
    try {
      await api.patch(`/mang-luoi/noi-dung/${soLieu.nd.id}/so-lieu`, {
        luot_xem: Number(soLieu.xem) || 0,
        luot_tuong_tac: Number(soLieu.tuongTac) || 0,
        da_dang: soLieu.daDang || undefined
      });
      setSoLieu(null);
      await ds.taiLai();
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
      setSoLieu(null);
    } finally {
      setDangGui(false);
    }
  }

  return (
    <>
      <TieuDeTrang kicker="KOL · KOC" tieuDe="Nộp kịch bản & video" moTa="Gửi đường dẫn video / kịch bản, gắn mã sản phẩm bạn đã được cấp quyền. Sau khi duyệt và đăng, cập nhật lượt xem để nghiệm thu." />
      {tb && (
        <ThongBaoNoiDong kieu={tb.kieu} className="mb-6">
          {tb.chu}
        </ThongBaoNoiDong>
      )}

      <The className="mb-6">
        <TheTieuDe kicker={dangSua ? "Sửa nội dung" : "Nội dung mới"} tieuDe={dangSua ? "Sửa và gửi duyệt lại" : "Gửi nội dung"} />
        <div className="grid gap-4 md:grid-cols-2">
          <OChon
            nhan="Chiến dịch"
            value={form.chien_dich_id}
            onChange={doi("chien_dich_id")}
            disabled={!!dangSua}
            goiYChon="Không thuộc chiến dịch"
            luaChon={chienDichDaNhan.map(c => ({ giaTri: c.id, nhan: c.ten }))}
          />
          <OChon
            nhan="Loại"
            value={form.loai}
            onChange={doi("loai")}
            luaChon={[
              { giaTri: "VIDEO", nhan: "Video" },
              { giaTri: "KICH_BAN", nhan: "Kịch bản" }
            ]}
          />
          <ONhap nhan="Tiêu đề" batBuoc value={form.tieu_de} onChange={doi("tieu_de")} placeholder="VD: Phối sơ mi AL01 đi làm" />
          {cdChon ? (
            <OChon nhan="Mã sản phẩm" value={form.ma_mau} onChange={doi("ma_mau")} goiYChon="Chọn mã" luaChon={cdChon.ma_maus.map(m => ({ giaTri: m, nhan: m }))} />
          ) : (
            <ONhap nhan="Mã sản phẩm" value={form.ma_mau} onChange={doi("ma_mau")} placeholder="VD: AL01" goiY="Chỉ mã bạn đã được cấp quyền" />
          )}
          <ONhap
            nhan={form.loai === "VIDEO" ? "Đường dẫn video" : "Đường dẫn tài liệu (tuỳ chọn)"}
            batBuoc={form.loai === "VIDEO"}
            type="url"
            value={form.link_video}
            onChange={doi("link_video")}
            placeholder="https://"
          />
          <OChon nhan="Nền tảng" value={form.nen_tang} onChange={doi("nen_tang")} luaChon={NEN_TANG} />
          <OVanBan nhan="Kịch bản" lopKhung="md:col-span-2" rows={5} value={form.kich_ban} onChange={doi("kich_ban")} placeholder="Hook 3 giây đầu, nội dung chính, lời kêu gọi…" />
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          {dangSua && (
            <Nut
              kieu="trong"
              onClick={() => {
                setDangSua(null);
                setForm(FORM_TRONG);
              }}
            >
              Huỷ sửa
            </Nut>
          )}
          <Nut kieu="vien" onClick={() => gui(true)} dangXuLy={dangGui} disabled={!form.tieu_de.trim()}>
            Lưu nháp
          </Nut>
          <Nut onClick={() => gui(false)} dangXuLy={dangGui} disabled={!form.tieu_de.trim()}>
            Gửi duyệt
          </Nut>
        </div>
      </The>

      <The>
        <TheTieuDe kicker="Của tôi" tieuDe="Nội dung đã nộp" />
        {ds.dangTai && !ds.data ? (
          <DangTai />
        ) : ds.loi ? (
          <Loi chiTiet={ds.loi} thuLai={ds.taiLai} />
        ) : ds.data?.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {ds.data.map(nd => (
              <li key={nd.id} className="flex flex-col gap-2 border-t border-vien py-4 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-h4">{nd.tieu_de}</strong>
                  <NhanNoiDung tt={nd.trang_thai} />
                </div>
                <span className="text-sm text-chu-phu">
                  {nd.loai === "VIDEO" ? "Video" : "Kịch bản"}
                  {nd.ma_mau ? ` · ${nd.ma_mau}` : ""}
                  {nd.ten_chien_dich ? ` · ${nd.ten_chien_dich}` : ""} · {dinhDangNgayGio(nd.created_at)}
                </span>
                {nd.link_video && (
                  <a href={nd.link_video} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-medium text-lien-ket hover:underline hover:underline">
                    {nd.link_video}
                  </a>
                )}
                {nd.nhan_xet && <p className="m-0 rounded-lg border border-vien bg-be-mat-phu px-3 py-2 text-sm text-chu">Nhận xét: {nd.nhan_xet}</p>}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span>
                    <strong>{nd.luot_xem.toLocaleString("vi-VN")}</strong> lượt xem · <strong>{nd.luot_tuong_tac.toLocaleString("vi-VN")}</strong> tương tác
                  </span>
                  {(nd.trang_thai === "DA_DUYET" || nd.trang_thai === "DA_DANG") && (
                    <Nut kieu="vien" co="nho" onClick={() => setSoLieu({ nd, xem: String(nd.luot_xem), tuongTac: String(nd.luot_tuong_tac), daDang: false })}>
                      Cập nhật số liệu
                    </Nut>
                  )}
                  {(nd.trang_thai === "NHAP" || nd.trang_thai === "CAN_SUA" || nd.trang_thai === "TU_CHOI") && (
                    <Nut kieu="vien" co="nho" onClick={() => suaLai(nd)}>
                      Sửa & gửi lại
                    </Nut>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Trong tieuDe="Chưa có nội dung" moTa="Nhận chiến dịch rồi gửi kịch bản / video đầu tiên của bạn." />
        )}
      </The>

      <HopThoai
        mo={!!soLieu}
        dong={() => setSoLieu(null)}
        tieuDe="Cập nhật số liệu"
        moTa={soLieu?.nd.tieu_de}
        rong="nho"
        chanTrang={
          <Nut onClick={luuSoLieu} dangXuLy={dangGui}>
            Lưu
          </Nut>
        }
      >
        {soLieu && (
          <div className="flex flex-col gap-4">
            <ONhap nhan="Lượt xem" type="number" min={0} value={soLieu.xem} onChange={e => setSoLieu({ ...soLieu, xem: e.target.value })} />
            <ONhap nhan="Lượt tương tác" type="number" min={0} value={soLieu.tuongTac} onChange={e => setSoLieu({ ...soLieu, tuongTac: e.target.value })} />
            {soLieu.nd.trang_thai === "DA_DUYET" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={soLieu.daDang} onChange={e => setSoLieu({ ...soLieu, daDang: e.target.checked })} className="h-5 w-5 accent-chinh" />
                Đã đăng lên kênh
              </label>
            )}
          </div>
        )}
      </HopThoai>
    </>
  );
}
