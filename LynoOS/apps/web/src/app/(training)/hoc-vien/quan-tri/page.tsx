import { YeuCauDangNhap } from "@/components/khung/yeu-cau-dang-nhap";
import { ManTienDoDoi } from "@/features/dao-tao/man-tien-do-doi";

export const metadata = { title: "Bảng điều hành đào tạo" };

/** Mentor / quan ly xem tien do doi (quyen that kiem o Nest: @Vai("MENTOR","QUAN_LY")) */
export default function TrangDieuHanhHocVien() {
  return (
    <YeuCauDangNhap vai={["MENTOR", "QUAN_LY"]}>
      <ManTienDoDoi />
    </YeuCauDangNhap>
  );
}
