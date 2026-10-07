import Link from "next/link";
import { NAV_STOREFRONT } from "./nav";

const LYNO = "https://lyno.vn/";

const LOP_NHOM = "pb-2 text-xs font-semibold uppercase tracking-[0.04em] text-chu-mo";
const LOP_LINK = "inline-flex min-h-8 items-center text-chu-phu no-underline transition-colors duration-nhanh hover:text-chinh";

/** Chan trang theo bo cuc Main.dc.html (dai hoa van lua + 4 cot) — mau he trang xanh: nen `nen`, ke `vien`, hoa van xanh nhat */
export function StorefrontFooter() {
  return (
    <footer className="border-t border-vien bg-nen text-chu-phu">
      <svg width="100%" height="32" aria-hidden className="block text-xanh-200">
        <defs>
          <pattern id="silkFoot" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M16 3 L29 16 L16 29 L3 16 Z" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <circle cx="16" cy="16" r="1.2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="32" fill="url(#silkFoot)" />
      </svg>
      <div className="mx-auto grid max-w-tk grid-cols-1 gap-8 px-4 pb-10 pt-10 text-sm sm:grid-cols-2 md:px-10 lg:grid-cols-[minmax(0,3fr)_repeat(3,minmax(0,2fr))]">
        <div className="flex flex-col gap-2">
          <span className="text-lg font-semibold tracking-[0.24em] text-chu">
            THIÊN KHUÊ <span className="text-chinh">S</span>
          </span>
          <span className="leading-6">
            Zalo/Hotline 0968 463 986 (9h–22h)
            <br />
            140A Lê Văn Sỹ, P.10, Q.Phú Nhuận, TP.HCM
          </span>
        </div>
        <div className="flex flex-col">
          <span className={LOP_NHOM}>Mua sắm</span>
          {["Sơ mi công sở", "Áo kiểu & áo lụa", "Đầm, set & blazer", "Khăn lụa Thiên Khuê"].map(m => (
            <a key={m} href={LYNO} className={LOP_LINK}>
              {m}
            </a>
          ))}
        </div>
        <div className="flex flex-col leading-8">
          <span className={LOP_NHOM}>Hỗ trợ</span>
          <span>Giao hàng 20.000đ</span>
          <span>Freeship từ 450.000đ</span>
          <span>Đổi trả trong 7 ngày</span>
          <span>COD &amp; đồng kiểm</span>
        </div>
        <div className="flex flex-col items-start">
          <span className={LOP_NHOM}>Thiên Khuê S</span>
          {NAV_STOREFRONT.filter(n => n.href !== "/").map(n => (
            <Link key={n.href} href={n.href} className={LOP_LINK}>
              {n.nhan}
            </Link>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-tk border-t border-vien px-4 pb-8 pt-5 text-xs text-chu-mo md:px-10">
        LYNO thuộc Công ty CP Sản xuất và Xuất nhập khẩu HNC. Khăn lụa Thiên Khuê thuộc Công ty TNHH Thương mại và Dịch vụ Thiên Khuê.
      </div>
    </footer>
  );
}
