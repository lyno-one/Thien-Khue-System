import type { MetadataRoute } from "next";
import { layDanhSachSanPham } from "@/features/storefront/lay-du-lieu";
import { DIA_CHI_WEB } from "@/lib/dia-chi-web";

/** Lam moi sitemap moi gio (san pham doc tu CRM qua GET /api/cong-khai/san-pham) */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const bayGio = new Date();
  const tinh: MetadataRoute.Sitemap = ["", "/san-pham", "/dao-tao", "/vip", "/than-thien", "/doi-tac"].map(duong => ({
    url: `${DIA_CHI_WEB}${duong}`,
    lastModified: bayGio,
    changeFrequency: "weekly",
    priority: duong === "" ? 1 : 0.7
  }));
  // API loi -> van tra cac trang tinh (khong lam hong build)
  const sanPham = (await layDanhSachSanPham({ gioi_han: 48, sap_xep: "ma" })) ?? [];
  return [
    ...tinh,
    ...sanPham.map(sp => ({ url: `${DIA_CHI_WEB}/san-pham/${encodeURIComponent(sp.ma)}`, lastModified: bayGio, changeFrequency: "weekly" as const, priority: 0.6 }))
  ];
}
