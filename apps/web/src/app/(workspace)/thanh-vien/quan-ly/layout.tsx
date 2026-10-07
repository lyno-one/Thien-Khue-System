import { KhungQuanLy } from "@/features/khach-doi-tac/khung-quan-ly";

/** Khu quan ly thanh vien & doi tac (QUAN_LY / CSKH / SALE; THIEN_KHUE, ADMIN luon qua) */
export default function QuanLyLayout({ children }: { children: React.ReactNode }) {
  return <KhungQuanLy>{children}</KhungQuanLy>;
}
