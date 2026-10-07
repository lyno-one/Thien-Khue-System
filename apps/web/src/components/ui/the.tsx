import { cn } from "@/lib/cn";
import { lopKicker, lopThe } from "./lop";

/*
 * The (card) theo CRM DESIGN.md "Cards": nen `be-mat`, vien `vien`, bo 12px, dem 16px (20px tu md), khong bong khi o yen.
 * `noi` = the bam duoc: re chuot dam vien + bong nhe (tk-lift da tiet che).
 * TheTieuDe: kicker caption in hoa + tieu de H3.
 */

export function The({ className, noi = false, children, ...con }: React.HTMLAttributes<HTMLDivElement> & { noi?: boolean }) {
  return (
    <div className={cn(lopThe, "p-4 md:p-5", noi && "tk-lift", className)} {...con}>
      {children}
    </div>
  );
}

export function TheTieuDe({ kicker, tieuDe, moTa, hanhDong, className }: { kicker?: React.ReactNode; tieuDe: React.ReactNode; moTa?: React.ReactNode; hanhDong?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {kicker && <span className={lopKicker}>{kicker}</span>}
        <h3 className="m-0 text-h3 text-chu">{tieuDe}</h3>
        {moTa && <p className="m-0 text-sm text-chu-phu">{moTa}</p>}
      </div>
      {hanhDong && <div className="flex shrink-0 flex-wrap items-center gap-2">{hanhDong}</div>}
    </div>
  );
}

/** O so lieu (DESIGN.md "Dai so"): nhan 14px chu-phu, so text-so tabular, dong phu 12px chu-mo. Khong icon. */
export function TheSoLieu({ nhan, giaTri, phu, className }: { nhan: React.ReactNode; giaTri: React.ReactNode; phu?: React.ReactNode; className?: string }) {
  return (
    <div className={cn(lopThe, "flex flex-col gap-2 p-5", className)}>
      <span className="text-sm text-chu-phu">{nhan}</span>
      <span className="so text-so text-chu">{giaTri}</span>
      {phu && <span className="text-xs text-chu-mo">{phu}</span>}
    </div>
  );
}

/** Tieu de trang trong khung lam viec / hoc vien: H1 24px, mo ta 14px chu-phu */
export function TieuDeTrang({ kicker, tieuDe, moTa, hanhDong }: { kicker?: React.ReactNode; tieuDe: React.ReactNode; moTa?: React.ReactNode; hanhDong?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div className="flex min-w-0 flex-col gap-1">
        {kicker && <span className={lopKicker}>{kicker}</span>}
        <h1 className="m-0 text-h1 text-chu">{tieuDe}</h1>
        {moTa && <p className="m-0 max-w-[640px] text-sm text-chu-phu">{moTa}</p>}
      </div>
      {hanhDong && <div className="flex flex-wrap items-center gap-2">{hanhDong}</div>}
    </header>
  );
}
