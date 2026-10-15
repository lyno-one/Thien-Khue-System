import Link from "next/link";
import type { ChiTietSanPhamCongKhai } from "@thien-khue/contracts";
import { lopKicker, lopNutGoc, lopThe, NutLienKet } from "@/components/ui";

import { FormLienHe } from "./form-lien-he";
import { GhiMaGioiThieu } from "./ma-gioi-thieu";
import { LYNO } from "./noi-dung";
import { AnhSanPham, giaHienThi, LOP_CHIP_HET_HANG } from "./the-san-pham";

/*
 * Chi tiet san pham cong khai (du lieu that public.mau qua API): ten, gia, anh, trang thai, chat lieu,
 * bang size, mau / size con hang (khong so luong). Mua -> lyno.vn; "Tư vấn cho tôi" -> lead.
 * He trang xanh CRM: anh bo 12, dong thong tin ke `vien`, bang size dang bang du lieu (dau bang `be-mat-phu`).
 */

/** Nut phu co lon (44 / 40) tro xuong form tu van trong trang — <a> thuong de giu cuon trong trang */
const LOP_NUT_TU_VAN = `${lopNutGoc} min-h-11 border border-vien-dam bg-be-mat px-5 text-chu hover:bg-be-mat-phu sm:min-h-10`;

const NHAN_COT: Record<string, string> = { nguc: "Ngực", eo: "Eo", vai: "Vai", dai: "Dài", mong: "Mông", tay: "Tay" };

function BangSize({ bang }: { bang: ChiTietSanPhamCongKhai["bang_size"] }) {
  const cot = [...new Set(bang.flatMap(d => Object.keys(d)).filter(k => k !== "size"))];
  return (
    <div className="flex flex-col gap-2">
      <span aria-hidden className="text-h4 text-chu">
        Bảng size (cm)
      </span>
      <div className="cuon-mong overflow-x-auto rounded-xl border border-vien">
        <table className="w-full min-w-[280px] border-collapse text-body">
          <caption className="sr-only">Bảng size (cm)</caption>
          <thead>
            <tr className="bg-be-mat-phu text-left text-caption text-chu-phu">
              <th scope="col" className="px-3 py-2 font-semibold">
                Size
              </th>
              {cot.map(c => (
                <th key={c} scope="col" className="px-3 py-2 text-right font-semibold">
                {NHAN_COT[c] ?? c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bang.map(d => (
            <tr key={d.size} className="border-t border-vien">
              <th scope="row" className="px-3 py-2 text-left font-semibold text-chu">
                {d.size}
              </th>
              {cot.map(c => (
                <td key={c} className="px-3 py-2 text-right text-chu-phu">
                  {d[c] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

function DongThongTin({ nhan, children }: { nhan: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 border-t border-vien py-3 text-body">
      <span className="text-chu-mo">{nhan}</span>
      <span className="whitespace-pre-line text-chu">{children}</span>
    </div>
  );
}

export function ChiTietSanPham({ sp, ma }: { sp: ChiTietSanPhamCongKhai | null; ma: string }) {
  if (!sp) {
    return (
      <section className="mx-auto flex max-w-tk flex-col items-start gap-4 px-4 py-20 md:px-10">
        <h1 className="m-0 text-h1 text-chu">Chưa tải được sản phẩm {ma}</h1>
        <p className="m-0 text-body-lg text-chu-phu">Máy chủ đang bận, vui lòng thử lại sau ít phút hoặc xem trực tiếp tại lyno.vn.</p>
        <NutLienKet href={LYNO} co="lon">
          Mở lyno.vn
        </NutLienKet>
      </section>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: sp.ten,
    sku: sp.ma,
    brand: { "@type": "Brand", name: "LYNO" },
    ...(sp.anh_url ? { image: [sp.anh_url] } : {}),
    ...(sp.chat_lieu ? { material: sp.chat_lieu } : {}),
    ...(sp.gia_ban !== null
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "VND",
            price: sp.gia_ban,
            availability: sp.con_hang ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: LYNO
          }
        }
      : {})
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Đường dẫn" className="mx-auto max-w-tk px-4 pt-6 text-caption text-chu-mo md:px-10">
        <Link href="/" className="no-underline transition-colors duration-nhanh hover:text-chinh">
          Trang chủ
        </Link>{" "}
        /{" "}
        <Link href="/san-pham" className="no-underline transition-colors duration-nhanh hover:text-chinh">
          Sản phẩm
        </Link>{" "}
        / <span className="text-chu">{sp.ma}</span>
      </nav>

      <section className="mx-auto grid max-w-tk grid-cols-1 items-start gap-8 px-4 pb-16 pt-6 md:grid-cols-2 md:gap-14 md:px-10 md:pb-24 md:pt-10">
        <div className="tk-up relative aspect-[3/4] overflow-hidden rounded-xl border border-vien bg-be-mat-phu">
          <AnhSanPham sp={sp} className="absolute inset-0 h-full w-full" />
          {!sp.con_hang && <span className={LOP_CHIP_HET_HANG}>Hết hàng</span>}
        </div>

        <div className="flex flex-col gap-5">
          <div className="tk-up tk-d1 flex flex-col gap-2">
            <span className={lopKicker}>
              {sp.nhom} · {sp.ma}
            </span>
            <h1 className="m-0 text-h1 text-chu md:text-hien-thi">{sp.ten}</h1>
            <span className="so text-h1 text-chu">{giaHienThi(sp.gia_ban)}</span>
          </div>

          <div className="tk-up tk-d2 flex flex-col">
            {sp.chat_lieu && <DongThongTin nhan="Chất liệu">{sp.chat_lieu}</DongThongTin>}
            {sp.form_dang && <DongThongTin nhan="Form dáng">{sp.form_dang}</DongThongTin>}
            <DongThongTin nhan="Tình trạng">{sp.con_hang ? "Đang bán" : "Tạm hết hàng"}</DongThongTin>
            {sp.size_con.length > 0 && <DongThongTin nhan="Size còn">{sp.size_con.join(" · ")}</DongThongTin>}
            {sp.mau_sac.length > 0 && <DongThongTin nhan="Màu còn">{sp.mau_sac.join(" · ")}</DongThongTin>}
          </div>

          {sp.bang_size.length > 0 && <BangSize bang={sp.bang_size} />}

          <div className="flex flex-wrap gap-3 pt-2">
            <NutLienKet href={LYNO} co="lon">
              Mua tại lyno.vn
            </NutLienKet>
            <a href="#tu-van" className={LOP_NUT_TU_VAN}>
              Tư vấn cho tôi
            </a>
          </div>
          <p className="m-0 text-body text-chu-phu">Freeship đơn từ 450.000đ · Đổi trả trong 7 ngày · COD &amp; đồng kiểm toàn quốc</p>
        </div>
      </section>

      <GhiMaGioiThieu />
      <section id="tu-van" className="scroll-mt-28 border-t border-vien bg-nen">
        <div className="mx-auto max-w-[640px] px-4 py-14 md:px-10 md:py-20">
          <div className={`${lopThe} p-5 md:p-8`}>
            <FormLienHe
              trang="SAN_PHAM"
              maMauQuanTam={sp.ma}
              moTa={`Để lại số điện thoại, đội ngũ LYNO sẽ tư vấn size và phối đồ cho mẫu ${sp.ten}.`}
              form={{
                title: "Tư vấn cho tôi",
                selectLabel: "Bạn cần tư vấn",
                options: ["Chọn size", "Phối đồ", "Mua số lượng / quà tặng"],
                noteLabel: "Chiều cao, cân nặng hoặc câu hỏi của bạn",
                cta: "Gửi yêu cầu tư vấn"
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
