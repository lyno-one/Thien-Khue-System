import type { Metadata } from "next";
import { layDanhSachSanPham } from "@/features/storefront/lay-du-lieu";
import { TrangChu } from "@/features/storefront/trang-chu";

// San pham doc tu CRM qua API cong khai; lam moi moi 2 phut (ISR) — khong can render lai moi lan vao
export const revalidate = 120;

const MO_TA = "Thời trang công sở LYNO và khăn lụa Thiên Khuê — cổ điển mà hiện đại, tinh tế mà phóng khoáng. Size S–3XL, đổi trả 7 ngày, COD & đồng kiểm toàn quốc.";

export const metadata: Metadata = {
  title: { absolute: "Thiên Khuê S — Thời trang công sở LYNO & khăn lụa Thiên Khuê" },
  description: MO_TA,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Thiên Khuê S — Khí chất không cần lên tiếng",
    description: MO_TA,
    type: "website",
    locale: "vi_VN",
    siteName: "Thiên Khuê S",
    images: [{ url: "/hero-nen-trang.jpg", alt: "Người mẫu mặc áo khoác trắng trên nền trắng" }]
  }
};

export default async function Trang() {
  const sanPham = await layDanhSachSanPham({ sap_xep: "moi", gioi_han: 4 });
  return <TrangChu sanPham={sanPham} />;
}
