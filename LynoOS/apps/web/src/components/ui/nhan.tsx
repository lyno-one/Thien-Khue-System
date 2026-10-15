import { cn } from "@/lib/cn";
import { lopChip, lopChipTong } from "./lop";

/*
 * Nhan trang thai (chip) theo CRM DESIGN.md "Chips": nen `-nhat` + chu mau tin hieu, caption, bo nho 4px.
 * Tong: chinh · trung-tinh · thanh-cong · canh-bao · loi · dam (cac tong mau cu bo/tim/ngoc/cam... da go).
 */
export type TongNhan = keyof typeof lopChipTong;

const TONG: Record<TongNhan, string> = lopChipTong;

export function Nhan({ tong = "chinh", className, children }: { tong?: TongNhan; className?: string; children: React.ReactNode }) {
  return <span className={cn(lopChip, TONG[tong], className)}>{children}</span>;
}
