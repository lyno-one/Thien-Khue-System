import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { lopNutGoc } from "./lop";

/*
 * Nut theo he trang xanh (CRM DESIGN.md "Buttons"): bo vua 8px, chu 14px/600, chi doi mau khi re chuot.
 * Ten kieu giu nguyen de trang cu khong vo; mau da doi sang token:
 *   chinh     — nen `chinh`, chu trang (moi vung mot nut chinh)
 *   vien      — nut phu: vien `vien-dam`, nen trang, chu `chu`
 *   toi       — nen `chinh-dam` (nut chinh dam, vd tren nen nhat)
 *   bo        — nen trang chu `chinh-dam` (dung tren nen xanh dam)
 *   nhat      — nen `chinh-nhat`, chu `chinh-dam`
 *   trong     — khong nen (ghost)
 *   vien-toi  — nut phu tren nen toi (xanh-800): vien sang, chu trang
 *   vien-loi  — Danger theo DESIGN.md: nen trang, vien `loi/30`, chu `loi` (huy / go bo khong nghiem trong)
 *   nguy-hiem — nen `loi` (xoa / tu choi)
 * Co: nho 36/32 · vua 44/36 · lon 44/40 (dien thoai / tu sm). `nhay` giu de tuong thich, khong con hieu ung.
 */
export type KieuNut = "chinh" | "vien" | "toi" | "bo" | "nhat" | "trong" | "vien-toi" | "vien-loi" | "nguy-hiem";
export type CoNut = "nho" | "vua" | "lon";

const NUT_GOC = lopNutGoc.replace("whitespace-nowrap", "text-center");

const KIEU: Record<KieuNut, string> = {
  chinh: "bg-chinh text-tren-chinh hover:bg-chinh-dam hover:text-tren-chinh",
  vien: "border border-vien-dam bg-be-mat text-chu hover:bg-be-mat-phu",
  toi: "bg-xanh-800 text-tren-chinh hover:bg-xanh-900 hover:text-tren-chinh",
  bo: "bg-be-mat text-chu hover:bg-be-mat-phu",
  nhat: "border border-vien bg-chinh-nhat text-chu hover:bg-vien",
  trong: "bg-transparent text-chu-phu hover:bg-be-mat-phu hover:text-chu",
  "vien-toi": "border border-tren-chinh/40 bg-transparent text-tren-chinh hover:bg-tren-chinh/10 hover:text-tren-chinh",
  "vien-loi": "border border-loi/30 bg-be-mat text-loi hover:bg-loi-nhat hover:text-loi",
  "nguy-hiem": "bg-loi text-tren-chinh hover:bg-loi/90 hover:text-tren-chinh"
};

const CO: Record<CoNut, string> = {
  nho: "min-h-9 px-3 py-1 sm:min-h-8",
  vua: "min-h-11 px-4 py-2 sm:min-h-9",
  lon: "min-h-11 px-5 py-2 sm:min-h-10"
};

function lopNut(kieu: KieuNut, co: CoNut, _nhay: boolean, rongHet: boolean, them?: string) {
  // Cho phep xuong dong (nhan dai tren man 390px) nen dung min-h thay vi h co dinh
  return cn(NUT_GOC, KIEU[kieu], CO[co], rongHet && "w-full", them);
}

interface ChungNut {
  kieu?: KieuNut;
  co?: CoNut;
  /** Giu de tuong thich (truoc la bong phap phong) — khong con hieu ung */
  nhay?: boolean;
  rongHet?: boolean;
}

export interface NutProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ChungNut {
  dangXuLy?: boolean;
}

export const Nut = forwardRef<HTMLButtonElement, NutProps>(function Nut(
  { kieu = "chinh", co = "vua", nhay = false, rongHet = false, dangXuLy = false, className, children, disabled, type = "button", ...con },
  ref
) {
  return (
    <button ref={ref} type={type} disabled={disabled || dangXuLy} aria-busy={dangXuLy || undefined} className={lopNut(kieu, co, nhay, rongHet, className)} {...con}>
      {dangXuLy && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
});

export interface NutLienKetProps extends React.AnchorHTMLAttributes<HTMLAnchorElement>, ChungNut {
  href: string;
}

/** Nut dang lien ket: noi bo dung next/link, ngoai (https://) dung <a> */
export function NutLienKet({ kieu = "chinh", co = "vua", nhay = false, rongHet = false, className, href, children, ...con }: NutLienKetProps) {
  const lop = lopNut(kieu, co, nhay, rongHet, className);
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={lop} target={con.target ?? "_blank"} rel={con.rel ?? "noopener noreferrer"} {...con}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={lop} {...con}>
      {children}
    </Link>
  );
}

/** Mui ten trong nut "Vào học →" */
export function MuiTen({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}
