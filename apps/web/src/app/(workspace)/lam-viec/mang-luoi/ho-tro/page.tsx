"use client";

import type { TaoYeuCauHoTroBody, YeuCauHoTro } from "@thien-khue/contracts";
import { useState } from "react";
import { DangTai, Loi, Nhan, Nut, ONhap, OVanBan, The, TheTieuDe, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { useTaiMl, useVaiMangLuoi } from "@/features/mang-luoi/chung";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangNgayGio } from "@/lib/dinh-dang";

/** KOL / KOC gui yeu cau ho tro chuyen mon (kich ban, kien thuc san pham) — he thong giao cho Sale / CSKH dang truc */
export default function TrangHoTroKoc() {
  const q = useVaiMangLuoi();
  const ds = useTaiMl(() => (q.hoTro ? api.get<YeuCauHoTro[]>("/ban-hang/ho-tro/da-gui") : Promise.resolve([] as YeuCauHoTro[])), [q.hoTro]);
  const [noiDung, setNoiDung] = useState("");
  const [maMau, setMaMau] = useState("");
  const [lienKet, setLienKet] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [tb, setTb] = useState<{ kieu: "thanh-cong" | "canh-bao"; chu: string } | null>(null);

  if (!q.hoTro) {
    return <Trong tieuDe="Dành cho KOL / KOC" moTa="Mục hỗ trợ chuyên môn mở khi vai KOL hoặc KOC đã được kích hoạt." />;
  }

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    setDangGui(true);
    setTb(null);
    try {
      const body: TaoYeuCauHoTroBody = { noi_dung: noiDung.trim(), ma_mau: maMau.trim() || null, lien_ket: lienKet.trim() || null };
      const yc = await api.post<YeuCauHoTro>("/ban-hang/ho-tro", body);
      setTb({ kieu: "thanh-cong", chu: `Đã gửi — ${yc.nguoi_ho_tro_ten ?? "Sale / CSKH"} sẽ trả lời bạn.` });
      setNoiDung("");
      setMaMau("");
      setLienKet("");
      await ds.taiLai();
    } catch (loi) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(loi) });
    } finally {
      setDangGui(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <TieuDeTrang kicker="Mạng lưới" tieuDe="Hỗ trợ chuyên môn" moTa="Cần góp ý kịch bản hay kiến thức sản phẩm? Gửi yêu cầu, Sale / CSKH đang trực sẽ trả lời." />
      <The>
        <TheTieuDe tieuDe="Gửi yêu cầu mới" />
        <form onSubmit={gui} className="flex flex-col gap-4">
          <OVanBan nhan="Nội dung cần hỗ trợ" batBuoc value={noiDung} onChange={e => setNoiDung(e.target.value)} minLength={5} maxLength={2000} rows={4} />
          <div className="grid gap-4 md:grid-cols-2">
            <ONhap nhan="Mã sản phẩm (nếu có)" value={maMau} onChange={e => setMaMau(e.target.value)} maxLength={50} placeholder="VD: AL01" />
            <ONhap nhan="Link kịch bản / video" value={lienKet} onChange={e => setLienKet(e.target.value)} maxLength={500} type="url" placeholder="https://" />
          </div>
          {tb && <ThongBaoNoiDong kieu={tb.kieu}>{tb.chu}</ThongBaoNoiDong>}
          <div>
            <Nut type="submit" disabled={dangGui || noiDung.trim().length < 5}>
              {dangGui ? "Đang gửi…" : "Gửi yêu cầu"}
            </Nut>
          </div>
        </form>
      </The>

      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-h2">Yêu cầu đã gửi</h2>
        {ds.loi ? (
          <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
        ) : !ds.data && ds.dangTai ? (
          <DangTai />
        ) : !ds.data?.length ? (
          <Trong tieuDe="Chưa có yêu cầu nào" />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {ds.data.map(y => (
              <li key={y.id}>
                <The className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-chu-phu">
                      {dinhDangNgayGio(y.created_at)}
                      {y.ma_mau ? ` · mã ${y.ma_mau}` : ""} · {y.nguoi_ho_tro_ten ?? "—"}
                    </span>
                    <Nhan tong={y.da_xu_ly ? "thanh-cong" : "canh-bao"}>{y.da_xu_ly ? "Đã trả lời" : "Đang chờ"}</Nhan>
                  </div>
                  <p className="m-0 whitespace-pre-wrap text-sm">{y.noi_dung}</p>
                  {y.lien_ket && (
                    <a href={y.lien_ket} target="_blank" rel="noreferrer" className="break-all text-sm font-medium text-chinh hover:text-chinh-dam hover:underline">
                      {y.lien_ket}
                    </a>
                  )}
                  {y.tra_loi && <p className="m-0 whitespace-pre-wrap rounded-lg border border-vien bg-be-mat-phu p-3 text-sm">{y.tra_loi}</p>}
                </The>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
