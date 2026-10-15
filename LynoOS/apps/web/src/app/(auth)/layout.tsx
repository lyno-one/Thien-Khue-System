import Link from "next/link";
import { ChuLogo, DauLogo } from "@/components/ui";

/** Khung trang dang nhap / dang ky — nen `nen`, header trang ke `vien` (he trang xanh CRM). Agent ho-so so huu cac trang trong (auth) */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-nen">
      <header className="flex h-[72px] items-center justify-center border-b border-vien bg-be-mat">
        <Link href="/" aria-label="LynoOS — Trang chủ" className="flex flex-col items-center gap-1 no-underline">
          <DauLogo />
          <ChuLogo className="text-lg" />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 md:items-center">{children}</main>
    </div>
  );
}
