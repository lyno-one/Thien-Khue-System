import Link from "next/link";
import { lopKicker, lopNutChinh } from "@/components/ui";

export default function KhongCoSanPham() {
  return (
    <section className="mx-auto flex max-w-tk flex-col items-start gap-4 px-4 py-24 md:px-10">
      <span className={lopKicker}>Sản phẩm</span>
      <h1 className="m-0 text-h1 text-chu md:text-hien-thi">Mẫu này không còn hiển thị</h1>
      <p className="m-0 text-body-lg text-chu-phu">Có thể mẫu đã ngừng bán hoặc mã chưa đúng. Xem các mẫu đang bán bên dưới.</p>
      <Link href="/san-pham" className={lopNutChinh}>
        Xem tất cả mẫu
      </Link>
    </section>
  );
}
