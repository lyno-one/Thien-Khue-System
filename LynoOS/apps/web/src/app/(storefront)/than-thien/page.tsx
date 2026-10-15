import type { Metadata } from "next";
import { layCauHinhHang } from "@/features/storefront/lay-du-lieu";
import { TRANG_VAI_TRO } from "@/features/storefront/noi-dung";
import { TrangVaiTroDayDu } from "@/features/storefront/trang-vai-tro";
import { dinhDangTien } from "@/lib/dinh-dang";

const DU = TRANG_VAI_TRO["than-thien"];

export const metadata: Metadata = {
  title: "Khách hàng thân thiện",
  description: DU.hero.lead,
  alternates: { canonical: "/than-thien" },
  openGraph: { title: "Khách hàng thân thiện · LynoOS", description: DU.hero.lead, type: "website", locale: "vi_VN", images: ["/hero-nen-trang.jpg"] }
};

export const revalidate = 300;

/** Thay chu cho "Tích điểm" bang luat hang that: tong mua hop le -> Than thiet / VIP (bang hang_thanh_vien_cau_hinh) */
export default async function Trang() {
  const ds = await layCauHinhHang();
  const tt = ds?.find(h => h.hang === "THAN_THIET" && h.bat);
  const vip = ds?.find(h => h.hang === "VIP" && h.bat);
  const du = tt
    ? {
        ...DU,
        block: {
          ...DU.block,
          items: DU.block.items.map(m =>
            m.no === "01"
              ? {
                  ...m,
                  title: "Tích luỹ mỗi đơn hàng",
                  text: `Tổng mua từ ${dinhDangTien(tt.nguong_tich_luy)} lên hạng Thân thiết (giảm ${tt.giam_gia_phan_tram}%)${vip ? `, từ ${dinhDangTien(vip.nguong_tich_luy)} lên VIP (giảm ${vip.giam_gia_phan_tram}%)` : ""}.`
                }
              : m
          )
        }
      }
    : DU;
  return <TrangVaiTroDayDu du={du} />;
}
