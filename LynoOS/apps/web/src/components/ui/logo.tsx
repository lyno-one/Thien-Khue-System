import { cn } from "@/lib/cn";

/**
 * Hinh thoi logo LynoOS — net theo mau chu (currentColor).
 * Doi mau bang prop `mau` (vd "text-chu-mo"), khong truyen class mau vao className: cn khong gop class trung loai.
 */
export function DauLogo({ co = 28, mau = "text-chinh", className }: { co?: number; mau?: string; className?: string }) {
  return (
    <svg width={co} height={co} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden className={cn(mau, className)}>
      <path d="M20 3 L37 20 L20 37 L3 20 Z" />
      <path d="M20 10 L30 20 L20 30 L10 20 Z" />
      <path d="M3 20 Q20 12 37 20" />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Chu LynoOS gian chu (storefront), OS dung mau chinh. */
export function ChuLogo({ className, chuS = "text-chinh" }: { className?: string; chuS?: string }) {
  return (
    <span className={cn("font-semibold leading-none tracking-[0.24em] text-chu", className)}>
      Lyno<span className={chuS}>OS</span>
    </span>
  );
}

/** Logo khung hoc vien / lam viec / quan tri tren thanh tren nen trang: hinh thoi + "LynoOS" + nhan phu */
export function LogoKhung({ nhanPhu }: { nhanPhu?: string }) {
  return (
    <span className="flex items-center gap-2">
      <DauLogo co={24} />
      <span className="whitespace-nowrap text-h3 text-chu">
        Lyno<span className="text-chinh">OS</span>
      </span>
      {nhanPhu && (
        <span className="hidden border-l border-vien pl-2 text-xs font-medium uppercase tracking-[0.04em] text-chu-mo sm:inline">{nhanPhu}</span>
      )}
    </span>
  );
}
