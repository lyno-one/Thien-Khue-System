import { KhungSidebar } from "@/components/khung/khung-sidebar";
import { NAV_QUAN_TRI, VAI_QUAN_TRI } from "@/components/khung/nav";
import { YeuCauDangNhap } from "@/components/khung/yeu-cau-dang-nhap";

/** Khu quan tri (QUAN_LY / ADMIN / THIEN_KHUE). Trang con: agent quan-tri. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <YeuCauDangNhap vai={VAI_QUAN_TRI}>
      <KhungSidebar nhanPhu="Quản trị" nav={NAV_QUAN_TRI}>
        {children}
      </KhungSidebar>
    </YeuCauDangNhap>
  );
}
