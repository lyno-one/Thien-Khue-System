import { BangDieuHanh } from "@/features/quan-tri/bang-dieu-hanh";

export const metadata = { title: "Bảng điều hành quản trị" };

/** Tong quan quan tri: so lieu tong + bang hoc vien (LMS.dc.html "Bảng điều hành") */
export default function TrangQuanTri() {
  return <BangDieuHanh />;
}
