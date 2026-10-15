import { KhungSidebar } from "@/components/khung/khung-sidebar";
import { NAV_LAM_VIEC } from "@/components/khung/nav";
import { YeuCauDangNhap } from "@/components/khung/yeu-cau-dang-nhap";

/** Khong gian lam viec theo vai (Sale/CSKH, mang luoi, thanh vien). Trang con: agent ban-hang, mang-luoi, khach-doi-tac. */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <YeuCauDangNhap>
      <KhungSidebar nhanPhu="Làm việc" nav={NAV_LAM_VIEC}>
        {children}
      </KhungSidebar>
    </YeuCauDangNhap>
  );
}
