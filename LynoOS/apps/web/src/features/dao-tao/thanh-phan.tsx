import { lopKicker, lopTab, TheSoLieu } from "@/components/ui";
import { cn } from "@/lib/cn";

/* Thanh phan nho dung lai trong cac trang hoc vien — he trang xanh (CRM DESIGN.md) */

/** Thanh tien do cao 8px: ranh `be-mat-phu`, thanh `chinh` (DESIGN.md "Thanh ngang") */
export function ThanhTienDo({
  phanTram,
  mau = "bg-chinh",
  nen = "bg-be-mat-phu",
  nhan,
  className
}: {
  phanTram: number;
  /** Class nen cua thanh (token), mac dinh bg-chinh */
  mau?: string;
  /** Class nen cua ranh (token), mac dinh bg-be-mat-phu */
  nen?: string;
  /** aria-label */
  nhan?: string;
  className?: string;
}) {
  const pt = Math.max(0, Math.min(100, Math.round(phanTram)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pt}
      aria-label={nhan ?? "Tiến độ"}
      className={cn("h-2 overflow-hidden rounded-full", nen, className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-vua ease-ra", mau)} style={{ width: `${pt}%` }} />
    </div>
  );
}

/** Kicker in hoa nho ("NỘI DUNG CHÍNH", "TÀI LIỆU"...) — lopKicker */
export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(lopKicker, className)}>{children}</div>;
}

/** O so lieu tong quan: nhan 14px chu-phu + so text-so tabular (TheSoLieu) */
export function OSoLieu({ nhan, giaTri }: { nhan: string; giaTri: React.ReactNode }) {
  return <TheSoLieu nhan={nhan} giaTri={giaTri} />;
}

/** Dau tron danh dau bai hoc (xong = nen `chinh` + dau tick) */
export function DauBai({ xong }: { xong: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
        xong ? "border-chinh bg-chinh text-tren-chinh" : "border-vien-dam bg-be-mat"
      )}
    >
      {xong && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5 9-10" />
        </svg>
      )}
    </span>
  );
}

/** Hinh thoi trang tri (chung chi, the trong) */
export function HinhThoi({ co = 32, className }: { co?: number; className?: string }) {
  return (
    <svg width={co} height={co} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden className={className}>
      <path d="M20 3 L37 20 L20 37 L3 20 Z" />
      <path d="M20 10 L30 20 L20 30 L10 20 Z" />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Muc bo loc dang tab (DESIGN.md "Bo loc dang tab") — dat trong khung `lopThanhTab` */
export function NutLoc({ dangChon, onClick, children }: { dangChon: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={dangChon} className={lopTab(dangChon)}>
      {children}
    </button>
  );
}
