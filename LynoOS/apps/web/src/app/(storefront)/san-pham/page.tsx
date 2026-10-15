import type { Metadata } from "next";
import { lopKicker, lopLienKet, lopNutChinh, lopO, lopTrong } from "@/components/ui";
import { layDanhSachSanPham } from "@/features/storefront/lay-du-lieu";
import { LYNO } from "@/features/storefront/noi-dung";
import { TheSanPham } from "@/features/storefront/the-san-pham";

export const metadata: Metadata = {
  title: "Sản phẩm",
  description: "Sơ mi, áo kiểu, váy, đầm, blazer và phụ kiện công sở LYNO — size S–3XL, đổi trả 7 ngày, COD & đồng kiểm toàn quốc.",
  alternates: { canonical: "/san-pham" }
};

/** Danh sach mau dang hien thi (du lieu that CRM). ?q= tim theo ma / ten */
export default async function Trang({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 60) ?? "";
  const ds = await layDanhSachSanPham({ tu_khoa: q || undefined, gioi_han: 48, sap_xep: "moi" });

  return (
    <section className="mx-auto flex max-w-tk flex-col gap-8 px-4 pb-20 pt-10 md:px-10 md:pb-24 md:pt-14">
      <div className="flex flex-col gap-4 border-b border-vien pb-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <span className={lopKicker}>Mua sắm</span>
          <h1 className="m-0 text-h1 text-chu md:text-hien-thi">{q ? `Kết quả cho “${q}”` : "Tất cả mẫu"}</h1>
        </div>
        <form action="/san-pham" method="get" role="search" className="flex w-full items-center gap-2 md:w-auto">
          <label htmlFor="tim-san-pham" className="sr-only">
            Tìm sản phẩm
          </label>
          <input id="tim-san-pham" name="q" defaultValue={q} placeholder="Tìm sơ mi, đầm, khăn lụa…" maxLength={60} className={`${lopO} min-w-0 md:w-72`} />
          <button type="submit" className={lopNutChinh}>
            Tìm
          </button>
        </form>
      </div>

      {ds === null ? (
        <p className={`m-0 ${lopTrong}`}>
          Chưa tải được danh sách sản phẩm. Vui lòng thử lại sau hoặc xem tại{" "}
          <a href={LYNO} target="_blank" rel="noopener noreferrer" className={lopLienKet}>
            lyno.vn
          </a>
          .
        </p>
      ) : ds.length === 0 ? (
        <p className={`m-0 ${lopTrong}`}>Không tìm thấy mẫu phù hợp. Thử từ khoá khác nhé.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:gap-6 lg:grid-cols-4">
          {ds.map(s => (
            <TheSanPham key={s.ma} sp={s} />
          ))}
        </div>
      )}
    </section>
  );
}
