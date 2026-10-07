"use client";

import { NutLienKet, Trong } from "@/components/ui";
import { ThanhTabBanHang } from "@/features/ban-hang/thanh-tab";
import { useXacThuc } from "@/providers/auth-provider";

/** Khu Sale / CSKH: chi vai SALE / CSKH / QUAN_LY dang hoat dong (API van tu kiem quyen) */
export default function BanHangLayout({ children }: { children: React.ReactNode }) {
  const { nguoiDung, coVai } = useXacThuc();
  if (!nguoiDung) return null;
  if (!coVai("SALE", "CSKH", "QUAN_LY")) {
    const dangHoc = nguoiDung.vai_chi_tiet.some(v => (v.vai === "SALE" || v.vai === "CSKH") && v.trang_thai === "DANG_HOC");
    return (
      <Trong
        tieuDe={dangHoc ? "Hoàn thành khoá học để bắt đầu bán" : "Khu này dành cho Sale / CSKH"}
        moTa={
          dangHoc
            ? "Vai Sale / CSKH của bạn đang ở trạng thái Đang học. Học xong kiến thức chung, phần riêng và đạt bài kiểm tra từ 90% để được kích hoạt."
            : "Bạn chưa có vai Sale / CSKH đang hoạt động."
        }
        hanhDong={
          dangHoc ? (
            <NutLienKet href="/hoc-vien" co="nho">
              Vào học viện
            </NutLienKet>
          ) : undefined
        }
      />
    );
  }
  return (
    <>
      <ThanhTabBanHang />
      {children}
    </>
  );
}
