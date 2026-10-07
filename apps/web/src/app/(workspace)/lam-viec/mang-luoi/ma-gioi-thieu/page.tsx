"use client";

import { useState } from "react";
import type { MaGioiThieuCuaToi, TaiLieuSanPhamMl } from "@thien-khue/contracts";
import { DangTai, Loi, Nhan, Nut, NutLienKet, OChon, The, TheTieuDe, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { NutSaoChep, duongDanGioiThieu, useTaiMl, useVaiMangLuoi } from "@/features/mang-luoi/chung";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangTien } from "@/lib/dinh-dang";

/** Ma / duong dan gioi thieu cua toi + tai lieu san pham (chi SKU da duoc cap quyen) */
export default function TrangMaGioiThieu() {
  const q = useVaiMangLuoi();
  const ma = useTaiMl(() => api.get<MaGioiThieuCuaToi[]>("/mang-luoi/ma-gioi-thieu"), []);
  const taiLieu = useTaiMl(() => api.get<TaiLieuSanPhamMl[]>("/mang-luoi/tai-lieu"), []);
  const [chon, setChon] = useState("");
  const [dangTao, setDangTao] = useState(false);
  const [loiTao, setLoiTao] = useState<string | null>(null);
  const [dangDoi, setDangDoi] = useState<string | null>(null);

  if (!q.gioiThieu) {
    return <Trong tieuDe="Chưa lấy được mã giới thiệu" moTa="Mã giới thiệu dành cho CTV, thực tập sinh, KOL, KOC đang hoạt động." />;
  }

  const duocLay = (taiLieu.data ?? []).filter(t => t.trang_thai_quyen === "HOAT_DONG" && t.trang_thai_ban !== "ngung");

  async function taoMa() {
    if (!chon) return;
    setDangTao(true);
    setLoiTao(null);
    try {
      await api.post<MaGioiThieuCuaToi>("/mang-luoi/ma-gioi-thieu", { mau_id: chon });
      setChon("");
      await ma.taiLai();
    } catch (e) {
      setLoiTao(thongDiepLoi(e));
    } finally {
      setDangTao(false);
    }
  }

  async function doiTrangThai(m: MaGioiThieuCuaToi) {
    setDangDoi(m.id);
    try {
      await api.patch(`/mang-luoi/ma-gioi-thieu/${m.id}`, { bat: !m.bat });
      await ma.taiLai();
    } catch (e) {
      setLoiTao(thongDiepLoi(e));
    } finally {
      setDangDoi(null);
    }
  }

  return (
    <>
      <TieuDeTrang
        kicker="CTV · KOL · KOC"
        tieuDe="Mã giới thiệu của tôi"
        moTa="Mỗi sản phẩm một mã. Khách mua qua mã / đường dẫn của bạn sẽ được ghi nhận sau khi đối soát với CRM."
      />

      <The className="mb-6">
        <TheTieuDe kicker="Lấy mã mới" tieuDe="Chọn sản phẩm đã được cấp quyền" moTa="Chỉ hiện mã sản phẩm bạn đã học và đạt bài kiểm tra." />
        {taiLieu.dangTai && !taiLieu.data ? (
          <DangTai />
        ) : duocLay.length ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <OChon
              nhan="Sản phẩm"
              lopKhung="flex-1"
              value={chon}
              onChange={e => setChon(e.target.value)}
              goiYChon="Chọn mã sản phẩm"
              luaChon={duocLay.map(t => ({ giaTri: t.mau_id, nhan: `${t.ma_mau} · ${t.ten}` }))}
            />
            <Nut onClick={taoMa} dangXuLy={dangTao} disabled={!chon}>
              Lấy mã
            </Nut>
          </div>
        ) : (
          <Trong
            tieuDe="Chưa có sản phẩm được cấp quyền"
            moTa="Học khoá sản phẩm và đạt bài kiểm tra từ 90% để được lấy mã giới thiệu cho mã đó."
            hanhDong={
              <NutLienKet href="/hoc-vien/khoa-hoc" co="nho">
                Xem khoá sản phẩm
              </NutLienKet>
            }
          />
        )}
        {loiTao && (
          <ThongBaoNoiDong kieu="canh-bao" className="mt-4">
            {loiTao}
          </ThongBaoNoiDong>
        )}
      </The>

      {ma.dangTai && !ma.data ? (
        <DangTai />
      ) : ma.loi ? (
        <Loi chiTiet={ma.loi} thuLai={ma.taiLai} />
      ) : ma.data?.length ? (
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {ma.data.map(m => {
            const link = duongDanGioiThieu(m.ma, m.ma_mau);
            return (
              <The key={m.id} className={m.bat ? "" : "opacity-70"}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.04em] text-chu-mo">
                      {m.ma_mau ?? "Mã chung"}
                      {m.ten_chien_dich ? ` · ${m.ten_chien_dich}` : ""}
                    </span>
                    <strong className="text-h1 tracking-[0.04em]">{m.ma}</strong>
                    {m.ten_mau && <span className="text-sm text-chu-phu">{m.ten_mau}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!m.bat && <Nhan tong="trung-tinh">Đã tắt</Nhan>}
                    {!m.con_quyen && <Nhan tong="canh-bao">Mất quyền SKU</Nhan>}
                  </div>
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-be-mat-phu p-2">
                    <div className="so text-h2">{m.so_click}</div>
                    lượt bấm
                  </div>
                  <div className="rounded-lg bg-be-mat-phu p-2">
                    <div className="so text-h2">{m.so_don}</div>
                    đơn hợp lệ
                  </div>
                  <div className="rounded-lg bg-be-mat-phu p-2">
                    <div className="so text-h4 leading-7">{dinhDangTien(m.doanh_so)}</div>
                    doanh số
                  </div>
                </div>
                <p className="m-0 mb-3 break-all rounded-lg border border-vien bg-be-mat px-3 py-2 text-sm text-chu-phu">{link}</p>
                <div className="flex flex-wrap gap-2">
                  <NutSaoChep giaTri={m.ma} nhan="Chép mã" />
                  <NutSaoChep giaTri={link} nhan="Chép đường dẫn" />
                  <Nut kieu="trong" co="nho" dangXuLy={dangDoi === m.id} onClick={() => doiTrangThai(m)}>
                    {m.bat ? "Tắt mã" : "Bật lại"}
                  </Nut>
                </div>
              </The>
            );
          })}
        </div>
      ) : (
        <Trong className="mb-8" tieuDe="Bạn chưa có mã giới thiệu" moTa="Chọn một sản phẩm đã được cấp quyền ở trên để lấy mã." />
      )}

      <The>
        <TheTieuDe kicker="Tài liệu" tieuDe="Sản phẩm bạn được giới thiệu" moTa="Thông tin tư vấn lấy từ CRM — dùng đúng giá và chất liệu khi đăng bài." />
        {taiLieu.loi ? (
          <Loi chiTiet={taiLieu.loi} thuLai={taiLieu.taiLai} />
        ) : taiLieu.data?.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {taiLieu.data.map(t => (
              <li key={t.mau_id} className="flex flex-col gap-2 border-t border-vien py-4 first:border-0 first:pt-0 sm:flex-row sm:gap-4">
                {t.anh_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.anh_url} alt={t.ten} className="h-[96px] w-[96px] shrink-0 rounded-lg border border-vien object-cover" />
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-h4">
                      {t.ma_mau} · {t.ten}
                    </strong>
                    {t.trang_thai_quyen === "CAN_HOC_LAI" && <Nhan tong="canh-bao">Cần học lại</Nhan>}
                    {t.trang_thai_ban === "het_hang" && <Nhan tong="trung-tinh">Hết hàng</Nhan>}
                  </div>
                  <span className="text-chu-phu">
                    Giá {dinhDangTien(t.gia_ban)}
                    {t.chat_lieu ? ` · ${t.chat_lieu}` : ""}
                    {t.form_dang ? ` · ${t.form_dang}` : ""}
                  </span>
                  {t.cau_tu_van && <p className="m-0 whitespace-pre-line leading-relaxed text-chu-phu">{t.cau_tu_van}</p>}
                  <div className="flex flex-wrap gap-3 pt-1">
                    {t.khoa_hoc && (
                      <a href={`/hoc-vien/khoa-hoc/${t.khoa_hoc.id}`} className="font-semibold text-chinh hover:text-chinh-dam hover:underline">
                        Khoá học sản phẩm
                      </a>
                    )}
                    {t.anh_size_chart && (
                      <a href={t.anh_size_chart} target="_blank" rel="noopener noreferrer" className="font-semibold text-chinh hover:text-chinh-dam hover:underline">
                        Bảng size
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-chu-phu">Chưa có sản phẩm nào được cấp quyền.</p>
        )}
      </The>
    </>
  );
}
