import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { layChiTietSanPham } from "@/features/storefront/lay-du-lieu";
import { ChiTietSanPham } from "@/features/storefront/chi-tiet-san-pham";

export const revalidate = 120;

type Props = { params: Promise<{ ma: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ma } = await params;
  const sp = await layChiTietSanPham(ma);
  if (!sp || sp === "khong-co") return { title: "Sản phẩm", robots: { index: false } };
  const moTa = [sp.nhom, sp.chat_lieu, sp.form_dang?.replace(/\s+/g, " ")].filter(Boolean).join(" · ") || `${sp.ten} — LYNO`;
  return {
    title: sp.ten,
    description: `${sp.ten} (${sp.ma}) — ${moTa}. Thời trang công sở LYNO, đổi trả 7 ngày, COD & đồng kiểm.`,
    alternates: { canonical: `/san-pham/${encodeURIComponent(sp.ma)}` },
    openGraph: { title: `${sp.ten} · LYNO`, description: moTa, type: "website", locale: "vi_VN", images: sp.anh_url ? [sp.anh_url] : ["/hero-nen-trang.jpg"] }
  };
}

export default async function Trang({ params }: Props) {
  const { ma } = await params;
  const sp = await layChiTietSanPham(ma);
  if (sp === "khong-co") notFound();
  return <ChiTietSanPham sp={sp} ma={ma} />;
}
