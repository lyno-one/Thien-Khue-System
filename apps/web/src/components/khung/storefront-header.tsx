"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChuLogo, DauLogo, MuiTen, lopNutChinh } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useXacThuc } from "@/providers/auth-provider";
import { NAV_STOREFRONT } from "./nav";

/*
 * Thanh tien ich + header trang cong khai theo bo cuc Main.dc.html (desktop) va Mobile.dc.html (menu ngan keo);
 * mau theo he trang xanh CRM: header nen trang ke `vien`, thanh tien ich nen `chinh-nhat`, muc dang chon nen `chinh-nhat`.
 * Danh muc mua sam tro https://lyno.vn/ nhu thiet ke; nav thanh vien / doi tac / dao tao la route that.
 */

const LYNO = "https://lyno.vn/";

const MUA_SAM = ["Bộ sưu tập", "Sơ mi", "Áo kiểu", "Váy & Quần", "Đầm & Blazer"];

function IconTim() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}
function IconNguoi() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}
function IconGio() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M5 8h14l-1 13H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

const LOP_ICON = "inline-flex h-11 w-11 items-center justify-center rounded-lg text-chu-phu transition-colors duration-nhanh hover:bg-be-mat-phu hover:text-chinh";

export function StorefrontHeader() {
  const duongDan = usePathname();
  const { nguoiDung } = useXacThuc();
  const [moMenu, setMoMenu] = useState(false);
  const linkTaiKhoan = nguoiDung ? "/tai-khoan" : "/dang-nhap";
  // Da dang nhap: co vai lam viec dang hoat dong -> Lam viec, con lai -> Hoc vien (menu chung o do di duoc moi khu)
  const linkHeThong = nguoiDung?.vai_chi_tiet.some(v => v.trang_thai === "HOAT_DONG" && v.vai !== "KHACH") ? "/lam-viec" : "/hoc-vien";

  useEffect(() => setMoMenu(false), [duongDan]);
  useEffect(() => {
    document.body.style.overflow = moMenu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [moMenu]);

  return (
    <>
      {/* THANH TIEN ICH */}
      <div className="border-b border-chinh/10 bg-chinh-nhat text-chinh-dam">
        <div className="mx-auto hidden max-w-tk items-center justify-between gap-6 px-10 py-2 text-xs font-medium md:flex">
          <span>Freeship đơn từ 450.000đ · Đổi trả trong 7 ngày · COD &amp; đồng kiểm toàn quốc</span>
          <span>Hotline/Zalo 0968 463 986 (9h–22h)</span>
        </div>
        <div className="px-4 py-2 text-center text-xs font-medium md:hidden">Freeship từ 450.000đ · Đổi trả 7 ngày · COD</div>
      </div>

      <header className="sticky top-0 z-30 border-b border-vien bg-be-mat">
        {/* Desktop */}
        <div className="mx-auto hidden h-[72px] max-w-tk grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 px-10 md:grid">
          <div className="flex items-center gap-1">
            <a href={LYNO} aria-label="Tìm kiếm sản phẩm" className={LOP_ICON}>
              <IconTim />
            </a>
            <span className="text-sm text-chu-mo">Tìm sơ mi, đầm, khăn lụa…</span>
          </div>
          <Link href="/" aria-label="Thiên Khuê S — Trang chủ" className="flex flex-col items-center gap-1 no-underline">
            <DauLogo />
            <ChuLogo className="text-xl" />
          </Link>
          <div className="flex items-center justify-end gap-1">
            <Link href={linkTaiKhoan} aria-label="Tài khoản" className={LOP_ICON}>
              <IconNguoi />
            </Link>
            <a href={LYNO} aria-label="Giỏ hàng" className={LOP_ICON}>
              <IconGio />
            </a>
            <Link
              href={linkHeThong}
              className={cn(lopNutChinh, "ml-2")}
            >
              {nguoiDung ? "Vào hệ thống" : "Vào học"}
              <MuiTen />
            </Link>
          </div>
        </div>
        <div className="hidden border-t border-vien md:block">
          <div className="mx-auto flex max-w-tk items-center justify-center gap-2 px-6 lg:px-10">
            {/* Nhom mua sam an duoi xl: o 768–1279px hai nhom nav khong vua mot dong */}
            <nav aria-label="Mua sắm" className="hidden items-center gap-5 whitespace-nowrap text-xs font-medium uppercase tracking-[0.04em] text-chu-phu xl:flex">
              {MUA_SAM.map(m => (
                <a key={m} href={LYNO} className="inline-flex min-h-12 items-center no-underline transition-colors duration-nhanh hover:text-chinh">
                  {m}
                </a>
              ))}
              <a href={LYNO} className="inline-flex min-h-12 items-center font-semibold text-chinh no-underline hover:text-chinh-dam">
                Khăn lụa Thiên Khuê
              </a>
            </nav>
            <span aria-hidden className="mx-4 hidden h-5 w-px bg-vien-dam xl:block" />
            <nav aria-label="Thành viên, đối tác và đào tạo" className="flex items-center gap-1 whitespace-nowrap py-2">
              {NAV_STOREFRONT.map(n => {
                const dangO = n.href === "/" ? duongDan === "/" : duongDan.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={dangO ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-lg px-3 text-sm no-underline transition-colors duration-nhanh",
                      dangO ? "bg-chinh-nhat font-semibold text-chinh-dam" : "text-chu-phu hover:bg-be-mat-phu hover:text-chu"
                    )}
                  >
                    {n.nhan}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile 390px */}
        <div className="grid h-[60px] grid-cols-[88px_minmax(0,1fr)_88px] items-center px-2 md:hidden">
          <button type="button" onClick={() => setMoMenu(true)} aria-label="Mở menu" aria-expanded={moMenu} className={LOP_ICON}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
              <path d="M3 7h18" />
              <path d="M3 12h18" />
              <path d="M3 17h12" />
            </svg>
          </button>
          <Link href="/" className="text-center no-underline">
            <ChuLogo className="text-base !tracking-[0.18em]" />
          </Link>
          <div className="flex justify-end">
            <a href={LYNO} aria-label="Tìm kiếm" className={LOP_ICON}>
              <IconTim />
            </a>
            <a href={LYNO} aria-label="Giỏ hàng" className={LOP_ICON}>
              <IconGio />
            </a>
          </div>
        </div>
      </header>

      {/* MENU NGAN KEO (mobile) */}
      {moMenu && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-be-mat md:hidden">
          <div className="flex h-[60px] items-center justify-between border-b border-vien pl-5 pr-2">
            <ChuLogo className="text-base !tracking-[0.18em]" />
            <button type="button" onClick={() => setMoMenu(false)} aria-label="Đóng menu" className={LOP_ICON}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </div>
          <nav aria-label="Menu" className="flex flex-col px-5 py-3">
            {MUA_SAM.map(m => (
              <a key={m} href={LYNO} className="flex min-h-14 items-center border-b border-vien text-h2 text-chu no-underline">
                {m}
              </a>
            ))}
            <a href={LYNO} className="flex min-h-14 items-center border-b border-vien text-h2 text-chinh no-underline">
              Khăn lụa Thiên Khuê
            </a>
          </nav>
          <div className="flex flex-col gap-1 p-5 text-sm">
            {NAV_STOREFRONT.filter(n => n.href !== "/").map(n => (
              <Link key={n.href} href={n.href} className="flex min-h-11 items-center text-chu-phu no-underline hover:text-chinh">
                {n.nhan}
              </Link>
            ))}
            <Link href="/hoc-vien" className="flex min-h-11 items-center text-chu-phu no-underline hover:text-chinh">
              Học viện
            </Link>
            <Link href={linkTaiKhoan} className="flex min-h-11 items-center text-chu-phu no-underline hover:text-chinh">
              {nguoiDung ? "Tài khoản" : "Đăng nhập"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
