import Link from "next/link";
import type { SanPhamCongKhai } from "@thien-khue/contracts";
import { DauLogo, lopChip, lopNutPhu } from "@/components/ui";
import { dinhDangTien } from "@/lib/dinh-dang";
import { LYNO } from "./noi-dung";

/*
 * The san pham "Mới về" (Main.dc.html desktop 4 cot, Mobile.dc.html 2x2).
 * Anh / ten -> trang chi tiet (du lieu that CRM); nut mua -> lyno.vn nhu thiet ke.
 * Anh tu Supabase Storage cua CRM (host tuy moi truong) nen dung <img> thuong, khong next/image.
 * He trang xanh CRM: khung anh bo 12 nen `be-mat-phu`, ten `chu` (re chuot `chinh`), gia `chu` dam, nut phu vien.
 */

export function giaHienThi(gia: number | null): string {
  return gia === null ? "Liên hệ" : dinhDangTien(gia);
}

export function AnhSanPham({ sp, className }: { sp: Pick<SanPhamCongKhai, "anh_url" | "ten">; className?: string }) {
  if (!sp.anh_url) {
    // Mau chua co anh trong CRM: khung nhat co dau logo + ten mau, khong de chu cho [...]
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-be-mat-phu p-4 text-center ${className ?? ""}`}>
        <DauLogo co={32} mau="text-chu-mo" />
        <span className="line-clamp-3 text-caption text-chu-mo">{sp.ten}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={sp.anh_url} alt={sp.ten} loading="lazy" decoding="async" className={`bg-be-mat-phu object-cover ${className ?? ""}`} />
  );
}

/** Chip "Hết hàng" dat tren goc anh */
export const LOP_CHIP_HET_HANG = `${lopChip} absolute left-2 top-2 bg-be-mat/90 text-chu-phu md:left-3 md:top-3`;

export function TheSanPham({ sp }: { sp: SanPhamCongKhai }) {
  const link = `/san-pham/${encodeURIComponent(sp.ma)}`;
  return (
    <div className="group flex flex-col gap-3">
      <Link href={link} className="relative block aspect-[3/4] overflow-hidden rounded-xl border border-vien bg-be-mat-phu no-underline" aria-label={sp.ten}>
        <AnhSanPham sp={sp} className="absolute inset-0 h-full w-full" />
        {!sp.con_hang && <span className={LOP_CHIP_HET_HANG}>Hết hàng</span>}
      </Link>
      <div className="flex flex-col gap-1">
        <span className="text-caption text-chu-mo">{sp.nhom}</span>
        <Link href={link} className="text-body text-chu no-underline transition-colors duration-nhanh hover:text-chinh group-hover:text-chinh md:text-body-lg">
          {sp.ten}
        </Link>
        <span className="so text-h4 text-chu md:text-h3">{giaHienThi(sp.gia_ban)}</span>
      </div>
      <a href={LYNO} target="_blank" rel="noopener noreferrer" className={`${lopNutPhu} hidden w-full md:inline-flex`}>
        {sp.con_hang ? "Thêm vào giỏ" : "Xem tại LYNO"}
      </a>
    </div>
  );
}

/** Ban chu cho khi API chua san sang (giu bo cuc thiet ke) */
const CHO: { nhom: string; ten: string }[] = [
  { nhom: "Sơ mi công sở", ten: "[Tên mẫu sơ mi cơ bản]" },
  { nhom: "Sơ mi lụa họa tiết", ten: "[Tên mẫu sơ mi lụa]" },
  { nhom: "Blazer", ten: "[Tên mẫu blazer]" },
  { nhom: "Khăn lụa Thiên Khuê", ten: "[Tên mẫu khăn]" }
];

export function TheSanPhamCho() {
  return (
    <>
      {CHO.map(c => (
        <a key={c.ten} href={LYNO} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-3 text-chu no-underline">
          <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-vien bg-be-mat-phu text-caption text-chu-mo">
            [Ảnh sản phẩm]
          </div>
          <span className="flex flex-col gap-1">
            <span className="text-caption text-chu-mo">{c.nhom}</span>
            <span className="text-body md:text-body-lg">{c.ten}</span>
            <span className="text-h4 text-chu-mo">[Giá bán]</span>
          </span>
        </a>
      ))}
    </>
  );
}
