"use client";

import Link from "next/link";
import type { HopViecHomNay } from "@thien-khue/contracts";
import { DangTai, Loi, MuiTen, Nhan, NutLienKet, The, TheSoLieu, TheTieuDe, TieuDeTrang, Trong } from "@/components/ui";
import { useTai } from "@/features/ban-hang/dung-tai";
import { NhanLoaiLead, NhanNguonGiao, dinhDangSdt } from "@/features/ban-hang/nhan-ban-hang";
import { api } from "@/lib/api";
import { dinhDangNgay, dinhDangNgayGio, dinhDangTien } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";

/** Hop viec hom nay cua Sale / CSKH */
export default function TrangHopViec() {
  const { nguoiDung } = useXacThuc();
  const { data, loi, dangTai, taiLai } = useTai(() => api.get<HopViecHomNay>("/ban-hang/hop-viec"), []);

  return (
    <>
      <TieuDeTrang
        kicker="Sale / CSKH"
        tieuDe="Hộp việc hôm nay"
        moTa={data ? `${dinhDangNgay(`${data.ngay}T00:00:00+07:00`)} · Chào ${nguoiDung?.ho_so.ho_ten ?? ""}, đây là những việc cần làm trong ca.` : undefined}
        hanhDong={
          <NutLienKet href="/lam-viec/ban-hang/tao-don" nhay>
            Tạo đơn <MuiTen />
          </NutLienKet>
        }
      />
      {dangTai && !data ? (
        <DangTai />
      ) : loi ? (
        <Loi chiTiet={loi} thuLai={taiLai} />
      ) : data ? (
        <div className="flex flex-col gap-6">
          <The className={data.ca_hien_tai ? "border-chinh/40 bg-chinh-nhat" : "bg-be-mat-phu"}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.04em] text-chu-mo">Ca trực</span>
                <strong className="text-h2 text-chu">
                  {data.ca_hien_tai
                    ? `Đang trong ca ${data.ca_hien_tai.tu_gio}–${data.ca_hien_tai.den_gio} · ${data.ca_hien_tai.vai}`
                    : data.ca_hom_nay.length
                      ? "Ngoài giờ ca"
                      : "Hôm nay bạn không có ca"}
                </strong>
                <span className="text-body text-chu-phu">
                  {data.ca_hom_nay.length
                    ? data.ca_hom_nay.map(c => `${c.tu_gio}–${c.den_gio}`).join(" · ")
                    : "Khách mới chỉ tự động phân bổ cho người đang trong ca."}
                </span>
              </div>
              <NutLienKet href="/lam-viec/ban-hang/ca-truc" kieu="vien" co="nho">
                Xem lịch ca
              </NutLienKet>
            </div>
          </The>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <TheSoLieu nhan="Khách đang phụ trách" giaTri={data.tong_dang_phu_trach} phu={`${data.khach_moi_hom_nay.length} khách mới hôm nay`} />
            <TheSoLieu nhan="Lead cần liên hệ" giaTri={data.lead_can_lien_he.length} />
            <TheSoLieu nhan="Đơn hôm nay" giaTri={data.don_hom_nay.so_don} phu={dinhDangTien(data.don_hom_nay.tong_tien)} />
            <TheSoLieu
              nhan="Hỗ trợ KOL/KOC chờ"
              giaTri={data.yeu_cau_ho_tro_mo}
              phu={data.don_hom_nay.cho_xac_minh ? `${data.don_hom_nay.cho_xac_minh} đơn chờ xác minh` : undefined}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <The>
              <TheTieuDe
                kicker="Ưu tiên"
                tieuDe="Lead cần liên hệ"
                hanhDong={
                  <Link href="/lam-viec/ban-hang/lead" className="text-sm font-semibold text-chinh hover:text-chinh-dam hover:underline">
                    Tất cả
                  </Link>
                }
              />
              {data.lead_can_lien_he.length ? (
                <ul className="m-0 flex list-none flex-col p-0">
                  {data.lead_can_lien_he.map(l => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-vien py-3 first:border-0 first:pt-0">
                      <div className="flex min-w-0 flex-col gap-1">
                        <Link href={`/lam-viec/ban-hang/khach/${l.sdt_chuan}`} className="font-semibold text-chu no-underline hover:text-chinh">
                          {l.ten} · {dinhDangSdt(l.sdt_chuan)}
                        </Link>
                        <span className="text-sm text-chu-phu">
                          {l.nhu_cau || "Chưa ghi nhu cầu"}
                          {l.ma_mau_quan_tam ? ` · quan tâm ${l.ma_mau_quan_tam}` : ""} · phân bổ {dinhDangNgayGio(l.phan_bo_luc)}
                        </span>
                      </div>
                      <NhanLoaiLead loai={l.loai} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-sm text-chu-phu">Không có lead nào chờ liên hệ.</p>
              )}
            </The>

            <The>
              <TheTieuDe
                kicker="Hôm nay"
                tieuDe="Khách mới được giao"
                hanhDong={
                  <Link href="/lam-viec/ban-hang/khach" className="text-sm font-semibold text-chinh hover:text-chinh-dam hover:underline">
                    Danh sách khách
                  </Link>
                }
              />
              {data.khach_moi_hom_nay.length ? (
                <ul className="m-0 flex list-none flex-col p-0">
                  {data.khach_moi_hom_nay.map(k => (
                    <li key={k.giao_khach_id} className="flex flex-wrap items-center justify-between gap-2 border-t border-vien py-3 first:border-0 first:pt-0">
                      <div className="flex min-w-0 flex-col gap-1">
                        <Link href={`/lam-viec/ban-hang/khach/${k.sdt_chuan}`} className="font-semibold text-chu no-underline hover:text-chinh">
                          {k.ten_khach || "Khách"} · {dinhDangSdt(k.sdt_chuan)}
                        </Link>
                        <span className="line-clamp-2 text-sm text-chu-phu">{k.ly_do}</span>
                      </div>
                      <NhanNguonGiao nguon={k.nguon} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Trong tieuDe="Chưa có khách mới" moTa="Khách mới sẽ xuất hiện ở đây khi được phân bổ theo ca trực." className="py-8" />
              )}
            </The>
          </div>

          {data.yeu_cau_ho_tro_mo > 0 && (
            <The className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-body">
                <Nhan tong="canh-bao">{data.yeu_cau_ho_tro_mo}</Nhan> yêu cầu hỗ trợ chuyên môn từ KOL/KOC đang chờ bạn trả lời.
              </span>
              <NutLienKet href="/lam-viec/ban-hang/ho-tro" kieu="vien" co="nho">
                Trả lời
              </NutLienKet>
            </The>
          )}
        </div>
      ) : null}
    </>
  );
}
