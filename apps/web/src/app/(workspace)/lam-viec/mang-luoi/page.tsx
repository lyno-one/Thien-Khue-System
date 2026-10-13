"use client";

import Link from "next/link";
import { NHAN_NGUON_DON_ML, NHAN_VAI, type GhiNhanDonMl, type ViHoaHong } from "@thien-khue/contracts";
import { DangTai, Loi, MuiTen, NutLienKet, The, TheSoLieu, TheTieuDe, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { NhanGhiNhan, useTaiMl, useVaiMangLuoi } from "@/features/mang-luoi/chung";
import { api } from "@/lib/api";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";

/** Tong quan mang luoi: vi hoa hong, vai, don gan day, loi tat */
export default function TrangTongQuanMangLuoi() {
  const { nguoiDung } = useXacThuc();
  const q = useVaiMangLuoi();
  const vi = useTaiMl(() => api.get<ViHoaHong>("/mang-luoi/thu-nhap/vi"), []);
  const don = useTaiMl(() => api.get<GhiNhanDonMl[]>("/mang-luoi/thu-nhap/don", { so_dong: 5 }), []);
  const vaiMangLuoi = (nguoiDung?.vai_chi_tiet ?? []).filter(v => ["CTV", "THUC_TAP", "KOL", "KOC", "MENTOR"].includes(v.vai));
  const dangHoc = vaiMangLuoi.filter(v => v.trang_thai === "DANG_HOC");

  return (
    <>
      <TieuDeTrang
        kicker="Mạng lưới & hoa hồng"
        tieuDe="Không gian cộng tác"
        moTa="Mỗi đơn hợp lệ chỉ ghi nhận một người bán. Mã giới thiệu chỉ cấp cho sản phẩm bạn đã học đạt."
        hanhDong={
          q.gioiThieu ? (
            <NutLienKet href="/lam-viec/mang-luoi/ma-gioi-thieu" nhay>
              Lấy mã giới thiệu <MuiTen />
            </NutLienKet>
          ) : undefined
        }
      />

      {dangHoc.length > 0 && (
        <ThongBaoNoiDong kieu="canh-bao" className="mb-6">
          Vai {dangHoc.map(v => NHAN_VAI[v.vai]).join(", ")} đang ở trạng thái <strong>Đang học</strong>. Hoàn thành khoá học và đạt bài kiểm tra (từ 90%) để
          lấy mã giới thiệu và nhận chiến dịch.{" "}
          <NutLienKet href="/hoc-vien" kieu="vien" co="nho" className="ml-2">
            Vào học
          </NutLienKet>
        </ThongBaoNoiDong>
      )}

      {vi.dangTai && !vi.data ? (
        <DangTai />
      ) : vi.loi ? (
        <Loi chiTiet={vi.loi} thuLai={vi.taiLai} />
      ) : vi.data ? (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <TheSoLieu nhan="Đủ điều kiện" giaTri={dinhDangTien(vi.data.du_dieu_kien.so_tien)} phu={`${vi.data.du_dieu_kien.so_dong} đơn đã giao thành công`} />
          <TheSoLieu
            nhan="Chờ đối soát"
            giaTri={dinhDangTien(vi.data.cho_doi_soat.so_tien)}
            phu={vi.data.cho_xac_minh.so_don ? `+ ${vi.data.cho_xac_minh.so_don} đơn chờ xác minh` : `${vi.data.cho_doi_soat.so_dong} đơn đang giao`}
          />
          <TheSoLieu nhan="Bị trừ (hoàn / huỷ)" giaTri={dinhDangTien(vi.data.bi_tru.so_tien)} phu={`${vi.data.bi_tru.so_dong} đơn`} />
          <TheSoLieu nhan="Tạm tính" giaTri={dinhDangTien(vi.data.tam_tinh)} phu={vi.data.dieu_chinh.so_dong ? `gồm điều chỉnh ${dinhDangTien(vi.data.dieu_chinh.so_tien)}` : "đủ điều kiện + điều chỉnh"} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <The>
          <TheTieuDe
            kicker="Nguồn đơn"
            tieuDe="Đơn gần đây"
            hanhDong={
              <Link href="/lam-viec/mang-luoi/thu-nhap" className="text-sm font-semibold text-lien-ket hover:underline hover:underline">
                Bảng thu nhập
              </Link>
            }
          />
          {don.dangTai && !don.data ? (
            <DangTai />
          ) : don.loi ? (
            <Loi chiTiet={don.loi} thuLai={don.taiLai} />
          ) : don.data?.length ? (
            <ul className="m-0 flex list-none flex-col p-0">
              {don.data.map(d => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-vien py-3 first:border-0 first:pt-0">
                  <span className="flex min-w-0 flex-col">
                    <strong className="text-h4">{d.ma_don}</strong>
                    <span className="text-sm text-chu-phu">
                      {NHAN_NGUON_DON_ML[d.nguon]}
                      {d.ma_gioi_thieu ? ` · mã ${d.ma_gioi_thieu}` : ""} · {dinhDangNgay(d.created_at)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{dinhDangTien(d.tong_tien)}</span>
                    <NhanGhiNhan tt={d.trang_thai} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Trong tieuDe="Chưa có đơn nào" moTa="Đơn có mã giới thiệu của bạn sẽ hiện ở đây sau khi hệ thống đồng bộ với CRM." />
          )}
        </The>

        <The>
          <TheTieuDe kicker="Vai trò" tieuDe="Bạn trong mạng lưới" />
          {vaiMangLuoi.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              {vaiMangLuoi.map(v => (
                <li key={v.vai} className="flex justify-between gap-3">
                  <span className="font-semibold">{NHAN_VAI[v.vai]}</span>
                  <span className="text-chu-phu">{v.trang_thai === "HOAT_DONG" ? "Hoạt động" : v.trang_thai === "DANG_HOC" ? "Đang học" : "Tạm dừng"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-chu-phu">Bạn xem khu này với vai trò quản lý / Sale.</p>
          )}
          {vi.data?.ty_le_ap_dung.length ? (
            <div className="mt-4 border-t border-vien pt-4 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.04em] text-chu-mo">Tỷ lệ hoa hồng</span>
              <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
                {vi.data.ty_le_ap_dung.map(t => (
                  <li key={`${t.vai}-${t.ma_mau ?? ""}`} className="flex justify-between">
                    <span>
                      {NHAN_VAI[t.vai]}
                      {t.ma_mau ? ` · ${t.ma_mau}` : ""}
                    </span>
                    <strong>{t.ty_le}%</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </The>
      </div>
    </>
  );
}
