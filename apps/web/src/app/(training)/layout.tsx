import { KhungSidebar } from "@/components/khung/khung-sidebar";
import { NAV_HOC_VIEN } from "@/components/khung/nav";
import { YeuCauDangNhap } from "@/components/khung/yeu-cau-dang-nhap";
import { TienDoSidebar } from "@/features/dao-tao/tien-do-sidebar";

/** Khung hoc vien (LMS.dc.html): thanh tren muc + sidebar Hoc tap / Quan tri. Trang con: agent dao-tao FE. */
export default function TrainingLayout({ children }: { children: React.ReactNode }) {
  return (
    <YeuCauDangNhap>
      <KhungSidebar nhanPhu="Học viện" nav={NAV_HOC_VIEN} chanSidebar={<TienDoSidebar />}>
        {children}
      </KhungSidebar>
    </YeuCauDangNhap>
  );
}
