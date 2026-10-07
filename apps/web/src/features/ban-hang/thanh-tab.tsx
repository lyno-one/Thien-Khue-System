"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Vai } from "@thien-khue/contracts";
import { cn } from "@/lib/cn";
import { useXacThuc } from "@/providers/auth-provider";

const TAB: { href: string; nhan: string; chinhXac?: boolean; vai?: Vai[] }[] = [
  { href: "/lam-viec/ban-hang", nhan: "Hộp việc hôm nay", chinhXac: true },
  { href: "/lam-viec/ban-hang/khach", nhan: "Khách được giao" },
  { href: "/lam-viec/ban-hang/lead", nhan: "Lead" },
  { href: "/lam-viec/ban-hang/tao-don", nhan: "Tạo đơn" },
  { href: "/lam-viec/ban-hang/ca-truc", nhan: "Ca trực" },
  { href: "/lam-viec/ban-hang/ho-tro", nhan: "Hỗ trợ KOL/KOC" }
];

/** Thanh tab khu Ban hang — cuon ngang trong khung tren mobile */
export function ThanhTabBanHang() {
  const duongDan = usePathname();
  const { coVai } = useXacThuc();
  return (
    <nav aria-label="Khu bán hàng" className="cuon-mong -mx-1 mb-6 overflow-x-auto border-b border-vien">
      <ul className="m-0 flex min-w-max list-none gap-1 px-1 pb-2">
        {TAB.filter(t => !t.vai || coVai(...t.vai)).map(t => {
          const dangO = t.chinhXac ? duongDan === t.href : duongDan === t.href || duongDan.startsWith(`${t.href}/`);
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
      </ul>
    </nav>
  );
}
