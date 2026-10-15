import type { Metadata } from "next";
import { layCauHinhHang } from "@/features/storefront/lay-du-lieu";
import { TRANG_VAI_TRO, type TrangVaiTro } from "@/features/storefront/noi-dung";
import { TrangVaiTroDayDu } from "@/features/storefront/trang-vai-tro";
import { dinhDangTien } from "@/lib/dinh-dang";

const DU = TRANG_VAI_TRO["vip"];

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Khách hàng VIP",
  description: DU.hero.lead,
  alternates: { canonical: "/vip" },
  openGraph: { title: "Khách hàng VIP · LynoOS", description: DU.hero.lead, type: "website", locale: "vi_VN", images: ["/hero-nen-trang.jpg"] }
};

/** Dien nguong / muc giam that cua hang VIP (bang hang_thanh_vien_cau_hinh) vao cho chu cho cua thiet ke */
function voiNguongThat(du: TrangVaiTro, ds: Awaited<ReturnType<typeof layCauHinhHang>>): TrangVaiTro {
  const vip = ds?.find(h => h.hang === "VIP" && h.bat);
  if (!vip) return du;
  return {
    ...du,
    block: {
      ...du.block,
      items: du.block.items.map(m =>
        m.no === "03" && vip.giam_gia_phan_tram ? { ...m, text: `Giảm ${vip.giam_gia_phan_tram}% cho thành viên VIP, cộng ưu đãi sinh nhật và dịp đặc biệt.` } : m
      ),
      note: `Điều kiện trở thành VIP: tổng mua hợp lệ từ ${dinhDangTien(vip.nguong_tich_luy)} (đơn hoàn / huỷ không tính).`
    }
  };
}

export default async function Trang() {
  return <TrangVaiTroDayDu du={voiNguongThat(DU, await layCauHinhHang())} />;
}
