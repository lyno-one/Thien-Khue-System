import type { Metadata, Viewport } from "next";
import { Inconsolata, Inter, Open_Sans } from "next/font/google";
import { DIA_CHI_WEB } from "@/lib/dia-chi-web";
import { AuthProvider } from "@/providers/auth-provider";
import "./globals.css";

// Font theo design-system SKILL.md: Open Sans (noi dung) · Inter (tieu de / hien thi) · Inconsolata (ma, so hieu). Deu co bo dau tieng Viet
const openSans = Open_Sans({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-body", display: "swap" });
const inter = Inter({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-display", display: "swap" });
const inconsolata = Inconsolata({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(DIA_CHI_WEB),
  title: { default: "Thiên Khuê S", template: "%s · Thiên Khuê S" },
  description: "Nền tảng vận hành hợp nhất Lyno & Thiên Khuê — mua sắm, học viện, không gian làm việc và quản trị."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // = be-mat (nen trang) — thanh trinh duyet tren dien thoai lien mau voi header trang
  themeColor: "#FFFFFF"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${openSans.variable} ${inter.variable} ${inconsolata.variable}`}>
      <body className="min-h-screen bg-be-mat font-sans text-body text-chu antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
