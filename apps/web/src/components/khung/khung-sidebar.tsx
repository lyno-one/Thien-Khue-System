"use client";

import { NHAN_VAI } from "@thien-khue/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogoKhung, lopNhomNav, lopNutPhu } from "@/components/ui";
import { cn } from "@/lib/cn";
import { chuCaiDau } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";
import type { MucNav, NhomNav } from "./nav";

/*
 * Khung co sidebar dung chung cho hoc vien / lam viec / quan tri — bo cuc LMS.dc.html, mau theo CRM DESIGN.md "Navigation":
 * thanh tren nen trang (logo = ve trang chu, avatar; nut thu gon nam trong sidebar), sidebar 224px nen trang, muc menu 36px bo 8
 * (dang o: nen `chinh-nhat`, chu `chinh-dam`), noi dung tren nen `nen`.
 * Mobile: sidebar thanh dai tab cuon ngang duoi thanh tren (trang khong cuon ngang).
 */

const KHOA_THU_NHO = "tk.sidebar.thuNho";

/** Thu tu vai tu cao xuong thap — header chi hien vai dau tien */
const THU_TU_VAI = ["THIEN_KHUE", "ADMIN", "QUAN_LY", "MENTOR", "SALE", "CSKH", "KOL", "KOC", "CTV", "THUC_TAP", "DOI_TAC", "KHACH"];
const thuTuVai = (v: string) => {
  const i = THU_TU_VAI.indexOf(v);
  return i < 0 ? THU_TU_VAI.length : i;
};

const lopNutThuGon =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-chu-mo transition-colors duration-nhanh hover:bg-be-mat-phu hover:text-chu";

function IconThuGon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}

export function KhungSidebar({
  nhanPhu,
  nav,
  chanSidebar,
  children
}: {
  /** Chu nho canh logo, vd "Học viện", "Làm việc", "Quản trị" */
  nhanPhu: string;
  nav: NhomNav[];
  /** Noi dung cuoi sidebar (vd tien do hoc) */
  chanSidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const duongDan = usePathname();
  const router = useRouter();
  const { nguoiDung, coVai, dangXuat } = useXacThuc();

  const hien = (m: MucNav) =>
    !m.vai?.length ||
    coVai(...m.vai) ||
    (!!m.kemDangHoc && !!nguoiDung?.vai_chi_tiet.some(v => m.vai!.includes(v.vai) && v.trang_thai === "DANG_HOC"));
  const dangO = (m: MucNav) => (m.chinhXac ? duongDan === m.href : duongDan === m.href || duongDan.startsWith(`${m.href}/`));
  const nhom = nav.map(n => ({ ...n, muc: n.muc.filter(hien) })).filter(n => n.muc.length);
  // Thu gon tung nhom nhu sidebar CRM; nhom chua trang dang o luon mo
  const [dong, setDong] = useState<Record<string, boolean>>({});
  const nhomDangO = nhom.find(n => n.muc.some(dangO))?.tieuDe;
  useEffect(() => {
    if (nhomDangO) setDong(d => (d[nhomDangO] ? { ...d, [nhomDangO]: false } : d));
  }, [nhomDangO]);
  // Header chi hien VAI CAO NHAT (+N vai), re chuot de xem du danh sach
  const vaiXep = [...(nguoiDung?.vai ?? [])].sort((a, b) => thuTuVai(a) - thuTuVai(b));
  const vaiHien = vaiXep.length ? NHAN_VAI[vaiXep[0]] + (vaiXep.length > 1 ? ` +${vaiXep.length - 1} vai` : "") : "";
  const vaiDayDu = vaiXep.map(v => NHAN_VAI[v]).join(" · ");

  // Thu gon sidebar (nho trong localStorage, Ctrl + B) — trang hoc bai / lam bai tu thu gon de chi con muc luc bai hoc
  const trangTapTrung = /^\/hoc-vien\/(khoa-hoc|bai-kiem-tra)\/[^/]+/.test(duongDan);
  const [thuNho, setThuNho] = useState(false);
  const [moTam, setMoTam] = useState(false);
  useEffect(() => {
    try { setThuNho(localStorage.getItem(KHOA_THU_NHO) === "1"); } catch { /* storage bi chan */ }
  }, []);
  useEffect(() => setMoTam(false), [duongDan]);
  const anSidebar = trangTapTrung ? !moTam : thuNho;
  const doiThuNho = () => {
    if (trangTapTrung) return setMoTam(v => !v);
    setThuNho(v => {
      try { localStorage.setItem(KHOA_THU_NHO, v ? "0" : "1"); } catch { /* storage bi chan */ }
      return !v;
    });
  };
  useEffect(() => {
    const phim = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        doiThuNho();
      }
    };
    document.addEventListener("keydown", phim);
    return () => document.removeEventListener("keydown", phim);
  });

  return (
    <div className="flex min-h-screen flex-col bg-nen">
      {/* THANH TREN — nen trang, ke duoi `vien` */}
      <header className="sticky top-0 z-30 border-b border-vien bg-be-mat">
        <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="no-underline" title="Về trang chủ">
              <LogoKhung nhanPhu={nhanPhu} />
            </Link>
          </div>
          {nguoiDung && (
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden min-w-0 flex-col items-end text-right lg:flex">
                <span className="truncate text-sm font-semibold text-chu">{nguoiDung.ho_so.ho_ten}</span>
                {vaiHien && <span className="truncate text-xs text-chu-mo" title={vaiDayDu}>{vaiHien}</span>}
              </div>
              <button
                type="button"
                onClick={async () => {
                  await dangXuat();
                  router.replace("/dang-nhap");
                }}
                className={cn(lopNutPhu, "hidden sm:inline-flex")}
              >
                Đăng xuất
              </button>
              <Link
                href="/tai-khoan"
                aria-label="Tài khoản"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chinh-nhat text-sm font-semibold text-chinh-dam no-underline ring-1 ring-chinh/15 hover:bg-xanh-100"
              >
                {chuCaiDau(nguoiDung.ho_so.ho_ten)}
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className={cn("flex flex-1 flex-col md:grid", anSidebar ? "md:grid-cols-[48px_minmax(0,1fr)]" : "md:grid-cols-[224px_minmax(0,1fr)]")}>
        {/* Thu gon: chi con dai hep 48px voi nut mo lai (nhu CRM — nut nam trong sidebar, khong nam tren header) */}
        {anSidebar && (
          <div className="hidden flex-col items-center border-r border-vien bg-be-mat py-3 md:flex">
            <button type="button" onClick={doiThuNho} aria-label="Mở menu" title="Mở menu (Ctrl + B)" aria-expanded={false} className={lopNutThuGon}>
              <IconThuGon />
            </button>
          </div>
        )}
        {/* SIDEBAR desktop — nen trang 224px, muc 36px, dang chon nen `chinh-nhat` chu `chinh-dam` */}
        <aside className={cn("hidden flex-col gap-1 border-r border-vien bg-be-mat px-3 py-3", !anSidebar && "md:flex")}>
          <div className="flex justify-end pb-1">
            <button type="button" onClick={doiThuNho} aria-label="Thu gọn menu" title="Thu gọn menu (Ctrl + B)" aria-expanded className={lopNutThuGon}>
              <IconThuGon />
            </button>
          </div>
          {nhom.map((n, i) => (
            <nav key={n.tieuDe} aria-label={n.tieuDe} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setDong(d => ({ ...d, [n.tieuDe]: !d[n.tieuDe] }))}
                aria-expanded={!dong[n.tieuDe]}
                className={cn(lopNhomNav, "flex w-full items-center justify-between pb-1 text-left", i > 0 && "pt-4")}
              >
                {n.tieuDe}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden
                  className={cn("transition-transform duration-nhanh", dong[n.tieuDe] && "-rotate-90")}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {!dong[n.tieuDe] && n.muc.map(m => (
                <Link
                  key={m.href}
                  href={m.href}
                  aria-current={dangO(m) ? "page" : undefined}
                  className={cn(
                    "flex h-9 w-full items-center rounded-lg px-3 text-left text-sm no-underline transition-colors duration-nhanh",
                    dangO(m) ? "bg-chinh-nhat font-semibold text-chinh-dam" : "text-chu-phu hover:bg-be-mat-phu hover:text-chu"
                  )}
                >
                  {m.nhan}
                </Link>
              ))}
            </nav>
          ))}
          {chanSidebar && <div className="mt-6">{chanSidebar}</div>}
        </aside>

        {/* NAV mobile: tab cuon ngang duoi thanh tren (trang khong cuon ngang) */}
        <nav aria-label={nhanPhu} className="cuon-mong flex gap-1 overflow-x-auto border-b border-vien bg-be-mat px-4 py-2 md:hidden">
          {nhom.flatMap(n => n.muc).map(m => (
            <Link
              key={m.href}
              href={m.href}
              aria-current={dangO(m) ? "page" : undefined}
              className={cn(
                "inline-flex h-10 shrink-0 items-center rounded-lg px-3 text-sm no-underline transition-colors duration-nhanh",
                dangO(m) ? "bg-chinh-nhat font-semibold text-chinh-dam" : "text-chu-phu hover:bg-be-mat-phu hover:text-chu"
              )}
            >
              {m.nhan}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 px-4 pb-16 pt-6 md:px-8 md:pt-8">{children}</main>
      </div>
    </div>
  );
}
