"use client";

import type { Vai } from "@thien-khue/contracts";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { YeuCauDangNhap } from "@/components/khung/yeu-cau-dang-nhap";
import { lopNutPhu, TieuDeTrang } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useXacThuc } from "@/providers/auth-provider";

/** Tab khu quan ly thanh vien & doi tac — hien theo vai (quyen that kiem o Nest) */
const TAB: { href: string; nhan: string; vai: Vai[] }[] = [
  { href: "/thanh-vien/quan-ly", nhan: "Hạng thẻ", vai: ["QUAN_LY", "CSKH", "SALE"] },
  { href: "/thanh-vien/quan-ly/hanh-phuc", nhan: "Khách hàng hạnh phúc", vai: ["QUAN_LY", "CSKH"] },
  { href: "/thanh-vien/quan-ly/uu-dai", nhan: "Quà tặng & voucher", vai: ["QUAN_LY", "CSKH"] },
  { href: "/thanh-vien/quan-ly/doi-tac", nhan: "Đối tác chiến lược", vai: ["QUAN_LY"] }
];

export const VAI_QUAN_LY_THANH_VIEN: Vai[] = ["QUAN_LY", "CSKH", "SALE"];

export function KhungQuanLy({ children }: { children: React.ReactNode }) {
  const { coVai } = useXacThuc();
  const duongDan = usePathname();
  const tab = TAB.filter(t => coVai(...t.vai));
  return (
    <YeuCauDangNhap vai={VAI_QUAN_LY_THANH_VIEN}>
      <TieuDeTrang
        kicker="Khách hàng & đối tác"
        tieuDe="Quản lý thành viên"
        moTa="Hạng thẻ tính lại từ đơn hợp lệ trên CRM; quà và voucher đối tác phải qua thẩm định và Thiên Khuê duyệt mới đến tay khách."
      />
      <nav aria-label="Khu quản lý" className="cuon-mong -mx-1 mb-6 overflow-x-auto border-b border-vien">
        <ul className="m-0 flex min-w-max list-none items-center gap-1 px-1 pb-2">
          {tab.map(t => {
            const dangO = t.href === "/thanh-vien/quan-ly" ? duongDan === t.href : duongDan.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={dangO ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center whitespace-nowrap rounded-lg px-3 text-sm no-underline transition-colors duration-nhanh",
                    dangO ? "bg-chinh-nhat font-semibold text-chinh-dam" : "font-medium text-chu-phu hover:bg-be-mat-phu hover:text-chu"
                  )}
                >
                  {t.nhan}
                </Link>
              </li>
            );
          })}
          <li>
            <Link href="/thanh-vien" className="inline-flex h-9 items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium text-chinh no-underline hover:text-chinh-dam hover:underline">
              Trang thành viên →
            </Link>
          </li>
        </ul>
      </nav>
      {children}
    </YeuCauDangNhap>
  );
}

/** Phan trang gon: Truoc / Sau */
export function PhanTrangGon({ trang, tongTrang, doi }: { trang: number; tongTrang: number; doi: (t: number) => void }) {
  if (tongTrang <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-3 text-sm">
      <button type="button" className={lopNutPhu} disabled={trang <= 1} onClick={() => doi(trang - 1)}>
        ← Trước
      </button>
      <span className="text-chu-phu">
        Trang {trang}/{tongTrang}
      </span>
      <button type="button" className={lopNutPhu} disabled={trang >= tongTrang} onClick={() => doi(trang + 1)}>
        Sau →
      </button>
    </div>
  );
}
