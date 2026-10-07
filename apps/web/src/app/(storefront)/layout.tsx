import { StorefrontFooter } from "@/components/khung/storefront-footer";
import { StorefrontHeader } from "@/components/khung/storefront-header";

/** Khung trang cong khai (Main.dc.html): thanh tien ich + header + footer. Trang con: agent cong-khai. */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-be-mat">
      <StorefrontHeader />
      <main className="flex-grow">{children}</main>
      <StorefrontFooter />
    </div>
  );
}
