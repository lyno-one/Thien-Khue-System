"use client";

import type { Vai } from "@thien-khue/contracts";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { DangTai, Loi, NutLienKet, Trong } from "@/components/ui";
import { useXacThuc } from "@/providers/auth-provider";

/**
 * Chan noi dung khi chua dang nhap (chuyen sang /dang-nhap?tiep=...) hoac thieu vai.
 * Day chi la lop UX — quyen that luon kiem o Nest (JwtGuard / VaiGuard).
 */
export function YeuCauDangNhap({ vai, children }: { vai?: Vai[]; children: React.ReactNode }) {
  const { phien, nguoiDung, dangTai, loi, coVai, taiLai } = useXacThuc();
  const router = useRouter();
  const duongDan = usePathname();

  useEffect(() => {
    if (!dangTai && !phien) router.replace(`/dang-nhap?tiep=${encodeURIComponent(duongDan)}`);
  }, [dangTai, phien, duongDan, router]);

  if (dangTai || !phien) return <DangTai toanTrang chu="Đang kiểm tra phiên đăng nhập…" />;
  if (!nguoiDung) return <Loi className="m-6" tieuDe="Không tải được hồ sơ" chiTiet={loi} thuLai={() => void taiLai()} />;
  if (vai?.length && !coVai(...vai)) {
    return (
      <Trong
        className="m-6"
        tieuDe="Bạn chưa có quyền vào khu vực này"
        moTa="Khu vực này dành cho vai trò khác hoặc vai trò của bạn chưa được kích hoạt (cần hoàn thành học và đạt bài kiểm tra)."
        hanhDong={
          <NutLienKet href="/hoc-vien" kieu="vien" co="nho">
            Vào học viện
          </NutLienKet>
        }
      />
    );
  }
  return <>{children}</>;
}
