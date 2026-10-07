import type { Metadata } from "next";
import { TRANG_VAI_TRO } from "@/features/storefront/noi-dung";
import { TrangVaiTroDayDu } from "@/features/storefront/trang-vai-tro";

const DU = TRANG_VAI_TRO["doi-tac"];

export const metadata: Metadata = {
  title: "Hạnh phúc CEO / Đối tác",
  description: DU.hero.lead,
  alternates: { canonical: "/doi-tac" },
  openGraph: { title: "Hạnh phúc CEO / Đối tác · Thiên Khuê S", description: DU.hero.lead, type: "website", locale: "vi_VN", images: ["/hero-nen-trang.jpg"] }
};

export default function Trang() {
  return <TrangVaiTroDayDu du={DU} />;
}
