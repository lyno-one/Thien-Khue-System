"use client";

import { useState } from "react";
import { NHAN_VAI, type ChienDichChoToi, type MaGioiThieuCuaToi } from "@thien-khue/contracts";
import { DangTai, Loi, Nhan, Nut, NutLienKet, The, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { NhanChienDich, NhanThamGia, NutSaoChep, useTaiMl, useVaiMangLuoi } from "@/features/mang-luoi/chung";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";

/** Chien dich cho KOL / KOC: chi nhan duoc khi MOI SKU cua chien dich deu da duoc cap quyen */
export default function TrangChienDich() {
  const q = useVaiMangLuoi();
  const ds = useTaiMl(() => api.get<ChienDichChoToi[]>("/mang-luoi/chien-dich"), []);
  const [dangXuLy, setDangXuLy] = useState<string | null>(null);
  const [thongBao, setThongBao] = useState<{ kieu: "thanh-cong" | "canh-bao"; chu: string } | null>(null);
  const [maMoi, setMaMoi] = useState<Record<string, MaGioiThieuCuaToi>>({});

  if (!q.taoNoiDung) return <Trong tieuDe="Chưa nhận được chiến dịch" moTa="Chiến dịch dành cho KOL, KOC, CTV đang hoạt động." />;

  async function nhan(cd: ChienDichChoToi) {
    setDangXuLy(cd.id);
    setThongBao(null);
    try {
      await api.post(`/mang-luoi/chien-dich/${cd.id}/nhan`, {});
      setThongBao({ kieu: "thanh-cong", chu: `Đã đăng ký "${cd.ten}" — chờ người phụ trách duyệt.` });
      await ds.taiLai();
    } catch (e) {
      setThongBao({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setDangXuLy(null);
    }
  }

  async function layMa(cd: ChienDichChoToi, maMau: string) {
    const khoa = `${cd.id}|${maMau}`;
    setDangXuLy(khoa);
    setThongBao(null);
    try {
      const m = await api.post<MaGioiThieuCuaToi>("/mang-luoi/ma-gioi-thieu", { ma_mau: maMau, chien_dich_id: cd.id });
      setMaMoi(s => ({ ...s, [khoa]: m }));
    } catch (e) {
      setThongBao({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setDangXuLy(null);
    }
  }

  return (
    <>
      <TieuDeTrang kicker="KOL · KOC" tieuDe="Chiến dịch" moTa="Nhận chiến dịch khi bạn đã được cấp quyền mọi sản phẩm trong chiến dịch. Sau khi được duyệt, nộp kịch bản / video và gắn mã sản phẩm." />
      {thongBao && (
        <ThongBaoNoiDong kieu={thongBao.kieu} className="mb-6">
          {thongBao.chu}
        </ThongBaoNoiDong>
      )}
      {ds.dangTai && !ds.data ? (
        <DangTai />
      ) : ds.loi ? (
        <Loi chiTiet={ds.loi} thuLai={ds.taiLai} />
      ) : ds.data?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {ds.data.map(cd => {
            const tg = cd.tham_gia;
            return (
              <The key={cd.id} noi>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="m-0 text-h3">{cd.ten}</h3>
                    <span className="text-sm text-chu-phu">
                      {cd.vai_ap_dung.map(v => NHAN_VAI[v]).join(" · ") || "Mọi vai"}
                      {cd.han ? ` · hạn ${dinhDangNgay(cd.han)}` : ""}
                      {cd.ngan_sach ? ` · ngân sách ${dinhDangTien(cd.ngan_sach)}` : ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {tg ? <NhanThamGia tt={tg.trang_thai} /> : <NhanChienDich tt={cd.trang_thai} />}
                  </div>
                </div>
                {cd.mo_ta && <p className="m-0 mb-3 whitespace-pre-line text-sm leading-relaxed text-chu-phu">{cd.mo_ta}</p>}
                <div className="mb-3 flex flex-wrap gap-2">
                  {cd.ma_maus.map(m => (
                    <Nhan key={m} tong={cd.ma_mau_thieu_quyen.includes(m) ? "canh-bao" : "thanh-cong"}>
                      {m}
                      {cd.ma_mau_thieu_quyen.includes(m) ? " · chưa có quyền" : ""}
                    </Nhan>
                  ))}
                </div>
                {tg?.ghi_chu && <p className="m-0 mb-3 text-sm text-chu-phu">Ghi chú: {tg.ghi_chu}</p>}

                {!tg ? (
                  cd.du_quyen ? (
                    <Nut onClick={() => nhan(cd)} dangXuLy={dangXuLy === cd.id} disabled={cd.trang_thai !== "DANG_CHAY"}>
                      Nhận chiến dịch
                    </Nut>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-canh-bao">Cần học đạt {cd.ma_mau_thieu_quyen.join(", ")} trước khi nhận.</span>
                      <NutLienKet href="/hoc-vien/khoa-hoc" kieu="vien" co="nho">
                        Học sản phẩm
                      </NutLienKet>
                    </div>
                  )
                ) : tg.trang_thai === "DA_DUYET" ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      <NutLienKet href={`/lam-viec/mang-luoi/noi-dung?chien_dich=${cd.id}`} co="nho">
                        Nộp kịch bản / video
                      </NutLienKet>
                      {cd.ma_maus.map(m => {
                        const khoa = `${cd.id}|${m}`;
                        return (
                          <Nut key={m} kieu="vien" co="nho" dangXuLy={dangXuLy === khoa} onClick={() => layMa(cd, m)}>
                            Mã {m}
                          </Nut>
                        );
                      })}
                    </div>
                    {cd.ma_maus.map(m => {
                      const ma = maMoi[`${cd.id}|${m}`];
                      return ma ? (
                        <div key={m} className="flex flex-wrap items-center gap-2 rounded-lg border border-vien bg-be-mat-phu px-3 py-2 text-sm">
                          <strong className="tracking-[0.04em]">{ma.ma}</strong>
                          <NutSaoChep giaTri={ma.ma} />
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : null}
              </The>
            );
          })}
        </div>
      ) : (
        <Trong tieuDe="Chưa có chiến dịch đang chạy" moTa="Khi Thiên Khuê mở chiến dịch mới phù hợp vai trò của bạn, chiến dịch sẽ hiện ở đây." />
      )}
    </>
  );
}
