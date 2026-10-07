import { cn } from "@/lib/cn";
import { lopThe } from "./lop";
import { Nut } from "./nut";

/* Trang thai tai / loi / trong — dung chung moi man hinh (CRM DESIGN.md "Khung bieu do": trong / loi trong khung) */

export function DangTai({ chu = "Đang tải…", className, toanTrang = false }: { chu?: string; className?: string; toanTrang?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-3 py-12 text-sm text-chu-phu", toanTrang && "min-h-[60vh]", className)}>
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-chinh border-t-transparent" />
      {chu}
    </div>
  );
}

/** Khung xam nhap nhay giu cho khi dang tai (skeleton) */
export function KhungCho({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-be-mat-phu", className)} />;
}

/** Loi tai du lieu: icon chấm than `loi`, cau bao `chu`, chi tiet `chu-phu`, nut phu "Thử lại" */
export function Loi({ tieuDe = "Không tải được dữ liệu", chiTiet, thuLai, className }: { tieuDe?: string; chiTiet?: string | null; thuLai?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn(lopThe, "flex flex-wrap items-start gap-3 p-4", className)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="mt-0.5 shrink-0 text-loi">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5" />
        <path d="M12 16.5h.01" />
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <strong className="text-h4 text-chu">{tieuDe}</strong>
        {chiTiet && <p className="m-0 text-sm text-chu-phu">{chiTiet}</p>}
      </div>
      {thuLai && (
        <Nut kieu="vien" co="nho" onClick={thuLai} className="shrink-0">
          Thử lại
        </Nut>
      )}
    </div>
  );
}

export function Trong({ tieuDe = "Chưa có gì ở đây", moTa, hanhDong, className }: { tieuDe?: string; moTa?: React.ReactNode; hanhDong?: React.ReactNode; className?: string }) {
  return (
    <div className={cn(lopThe, "flex flex-col items-center gap-2 px-4 py-8 text-center", className)}>
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden className="text-chu-mo">
        <path d="M20 3 L37 20 L20 37 L3 20 Z" />
        <path d="M20 10 L30 20 L20 30 L10 20 Z" />
        <circle cx="20" cy="20" r="1.6" fill="currentColor" />
      </svg>
      <strong className="text-h4 text-chu">{tieuDe}</strong>
      {moTa && <p className="m-0 max-w-[420px] text-sm text-chu-mo">{moTa}</p>}
      {hanhDong && <div className="mt-2">{hanhDong}</div>}
    </div>
  );
}

/** Thong bao noi dong: nen `-nhat` + chu mau tin hieu (khong dat chu xam len nen mau) */
export function ThongBaoNoiDong({ kieu = "thong-tin", children, className }: { kieu?: "thanh-cong" | "thong-tin" | "canh-bao" | "loi"; children: React.ReactNode; className?: string }) {
  const lop =
    kieu === "thanh-cong"
      ? "bg-thanh-cong-nhat border-thanh-cong/30 text-thanh-cong"
      : kieu === "canh-bao"
        ? "bg-canh-bao-nhat border-canh-bao/30 text-canh-bao"
        : kieu === "loi"
          ? "bg-loi-nhat border-loi/30 text-loi"
          : "bg-chinh-nhat border-chinh/20 text-chinh-dam";
  return (
    <div role={kieu === "canh-bao" || kieu === "loi" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", lop, className)}>
      {children}
    </div>
  );
}
