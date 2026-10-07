import { YeuCauDangNhap } from "@/components/khung/yeu-cau-dang-nhap";
import { ManChamBai } from "@/features/dao-tao/man-cham-bai";

export const metadata = { title: "Chấm bài thực hành" };

/** Mentor / quan ly cham bai thuc hanh (quyen that kiem o Nest: @Vai("MENTOR","QUAN_LY")) */
export default function TrangChamBai() {
  return (
    <YeuCauDangNhap vai={["MENTOR", "QUAN_LY"]}>
      <ManChamBai />
    </YeuCauDangNhap>
  );
}
