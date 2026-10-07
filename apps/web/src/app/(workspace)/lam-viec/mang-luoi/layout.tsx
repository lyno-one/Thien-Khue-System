"use client";

import { NutLienKet, Trong } from "@/components/ui";
import { ThanhTabMangLuoi, useVaiMangLuoi } from "@/features/mang-luoi/chung";
import { useXacThuc } from "@/providers/auth-provider";

/** Khu mang luoi: CTV, thuc tap sinh, KOL/KOC, mentor, quan ly (Sale xem thu nhap). API van tu kiem quyen. */
export default function MangLuoiLayout({ children }: { children: React.ReactNode }) {
  const { nguoiDung } = useXacThuc();
  const q = useVaiMangLuoi();
  if (!nguoiDung) return null;
  if (!q.coLienQuan) {
    return (
      <Trong
        tieuDe="Khu này dành cho mạng lưới bán hàng"
        moTa="Cộng tác viên, thực tập sinh, KOL / KOC đăng ký và học đạt khoá theo vai trò để được kích hoạt."
        hanhDong={
          <NutLienKet href="/hoc-vien" co="nho">
            Vào học viện
          </NutLienKet>
        }
      />
    );
  }
  return (
    <>
      <ThanhTabMangLuoi />
      {children}
    </>
  );
}
