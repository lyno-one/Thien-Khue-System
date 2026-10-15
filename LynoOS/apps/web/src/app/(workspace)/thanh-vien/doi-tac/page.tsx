import { CongDoiTac } from "@/features/khach-doi-tac/cong-doi-tac";

export const metadata = { title: "Cổng đối tác" };

/** Doi tac (vai DOI_TAC) xem so lieu tong hop cua minh — khong co du lieu khach ca nhan */
export default function Trang() {
  return <CongDoiTac />;
}
