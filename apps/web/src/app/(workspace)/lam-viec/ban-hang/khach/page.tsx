"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { KhachDuocGiao, NhanSuBanHang, PhanTrangMeta } from "@thien-khue/contracts";
import { Bang, DangTai, Loi, Nut, ONhap, OChon, TieuDeTrang, Trong } from "@/components/ui";
import { useTai } from "@/features/ban-hang/dung-tai";
import { NhanNguonGiao, dinhDangSdt } from "@/features/ban-hang/nhan-ban-hang";
import { api } from "@/lib/api";
import { dinhDangNgayGio } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";

/** Danh sach khach duoc giao — Sale / CSKH chi thay khach cua minh; QUAN_LY loc theo nguoi */
export default function TrangKhachDuocGiao() {
  const router = useRouter();
  const { coVai } = useXacThuc();
  const laQuanLy = coVai("QUAN_LY");
  const [trang, setTrang] = useState(1);
  const [tuKhoa, setTuKhoa] = useState("");
  const [q, setQ] = useState("");
  const [hoSoId, setHoSoId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(tuKhoa.trim());
      setTrang(1);
    }, 350);
    return () => clearTimeout(t);
  }, [tuKhoa]);

  const { data, loi, dangTai, taiLai } = useTai(
    () => api.layCoMeta<KhachDuocGiao[], PhanTrangMeta>("/ban-hang/khach", { trang, so_dong: 20, q, ho_so_id: hoSoId || undefined }),
    [trang, q, hoSoId]
  );
  const nhanSu = useTai(() => (laQuanLy ? api.get<NhanSuBanHang[]>("/ban-hang/nhan-su") : Promise.resolve([] as NhanSuBanHang[])), [laQuanLy]);
  const meta = data?.meta;

  return (
    <>
      <TieuDeTrang
        kicker="Sale / CSKH"
        tieuDe="Khách được giao"
        moTa={laQuanLy ? "Quản lý xem được mọi khách đang có người phụ trách." : "Bạn chỉ thấy khách đang được giao cho mình. Dữ liệu mua hàng lấy trực tiếp từ CRM."}
      />
      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
        <ONhap placeholder="Tìm theo tên hoặc số điện thoại" value={tuKhoa} onChange={e => setTuKhoa(e.target.value)} aria-label="Tìm khách" />
        {laQuanLy && (
          <OChon
            aria-label="Lọc người phụ trách"
            value={hoSoId}
            onChange={e => {
              setHoSoId(e.target.value);
              setTrang(1);
            }}
            goiYChon="Mọi người phụ trách"
            luaChon={(nhanSu.data ?? []).map(n => ({ giaTri: n.ho_so_id, nhan: `${n.ho_ten} (${n.tai_hien_tai})` }))}
          />
        )}
      </div>
      {dangTai && !data ? (
        <DangTai />
      ) : loi ? (
        <Loi chiTiet={loi} thuLai={taiLai} />
      ) : (
        <>
          <Bang<KhachDuocGiao>
            dong={data?.data ?? []}
            khoaDong={k => k.giao_khach_id}
            onChonDong={k => router.push(`/lam-viec/ban-hang/khach/${k.sdt_chuan}`)}
            rong={<Trong tieuDe="Chưa có khách nào" moTa={q ? "Không tìm thấy khách khớp từ khoá." : "Khách sẽ được phân bổ theo ca trực, năng lực và tải việc."} />}
            cot={[
              {
                khoa: "khach",
                tieuDe: "Khách",
                hienThi: k => (
                  <div className="flex flex-col">
                    <span className="font-semibold">{k.ten_khach || "Khách"}</span>
                    <span className="text-sm text-chu-phu">{dinhDangSdt(k.sdt_chuan)}</span>
                  </div>
                )
              },
              { khoa: "nguon", tieuDe: "Nguồn", hienThi: k => <NhanNguonGiao nguon={k.nguon} /> },
              {
                khoa: "nhu_cau",
                tieuDe: "Nhu cầu",
                hienThi: k => (
                  <span className="line-clamp-2 max-w-[280px] text-sm text-chu-phu">
                    {[k.lead_nhu_cau, k.ma_mau_quan_tam ? `Mã ${k.ma_mau_quan_tam}` : null].filter(Boolean).join(" · ") || "—"}
                  </span>
                )
              },
              ...(laQuanLy ? [{ khoa: "phu_trach", tieuDe: "Phụ trách", hienThi: (k: KhachDuocGiao) => k.ho_ten_phu_trach ?? "—" }] : []),
              { khoa: "giao_luc", tieuDe: "Giao lúc", canPhai: true, hienThi: k => <span className="whitespace-nowrap text-sm">{dinhDangNgayGio(k.giao_luc)}</span> }
            ]}
          />
          {meta && meta.tong_trang > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-chu-phu">
              <span>
                Trang {meta.trang}/{meta.tong_trang} · {meta.tong} khách
              </span>
              <div className="flex gap-2">
                <Nut kieu="vien" co="nho" disabled={trang <= 1} onClick={() => setTrang(t => t - 1)}>
                  Trước
                </Nut>
                <Nut kieu="vien" co="nho" disabled={trang >= meta.tong_trang} onClick={() => setTrang(t => t + 1)}>
                  Sau
                </Nut>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
