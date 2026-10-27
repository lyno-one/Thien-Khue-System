import { YeuCauDangNhap } from "@/components/khung/yeu-cau-dang-nhap";
import { ManQuanTriChiTietKhoa } from "@/features/dao-tao/man-quan-tri-chi-tiet-khoa";

export const metadata = { title: "Soạn khóa học" };

export default async function TrangSoanKhoa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <YeuCauDangNhap vai={["QUAN_LY"]}>
      <ManQuanTriChiTietKhoa id={id} />
    </YeuCauDangNhap>
  );
}
