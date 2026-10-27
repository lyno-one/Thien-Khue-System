import { YeuCauDangNhap } from "@/components/khung/yeu-cau-dang-nhap";
import { ManQuanTriKhoa } from "@/features/dao-tao/man-quan-tri-khoa";

export const metadata = { title: "Quản trị khóa học" };

/** Quyen that kiem o Nest: @Vai("QUAN_LY") tren /api/dao-tao/quan-tri/* */
export default function TrangQuanTriKhoa() {
  return (
    <YeuCauDangNhap vai={["QUAN_LY"]}>
      <ManQuanTriKhoa />
    </YeuCauDangNhap>
  );
}
