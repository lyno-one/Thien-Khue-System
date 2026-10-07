import type { Metadata } from "next";
import { laLoTrinh } from "@/features/storefront/noi-dung";
import { TrangDaoTao } from "@/features/storefront/trang-dao-tao";

const MO_TA =
  "Học viện Thiên Khuê S: lộ trình Sale/CSKH, CTV online, KOL/KOC — học online, thực hành với sản phẩm thật của LYNO và khăn lụa Thiên Khuê, nhận chứng chỉ và bắt đầu làm việc.";

export const metadata: Metadata = {
  title: "Đào tạo",
  description: MO_TA,
  alternates: { canonical: "/dao-tao" },
  openGraph: { title: "Học nghề thời trang · Học viện Thiên Khuê S", description: MO_TA, type: "website", locale: "vi_VN", images: ["/hero-nen-trang.jpg"] }
};

/** ?lo-trinh=sale|ctv|kol|other — chon san lo trinh o khu dang ky (link tu trang chu / the lo trinh) */
export default async function Trang({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const lt = Array.isArray(sp["lo-trinh"]) ? sp["lo-trinh"][0] : sp["lo-trinh"];
  return <TrangDaoTao loTrinh={laLoTrinh(lt) ? lt : "sale"} />;
}
