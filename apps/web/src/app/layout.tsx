import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { DIA_CHI_WEB } from "@/lib/dia-chi-web";
import { AuthProvider } from "@/providers/auth-provider";
import "./globals.css";

// Font theo he thiet ke CRM Lyno: Inter (variable, co bo dau tieng Viet) — mot ho chu duy nhat cho tieu de va noi dung
const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-inter",
  display: "swap"
});

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
    <html lang="vi" className={inter.variable}>
      <body className="min-h-screen bg-be-mat font-sans text-body text-chu antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
