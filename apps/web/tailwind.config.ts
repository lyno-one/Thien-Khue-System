import type { Config } from "tailwindcss";

/**
 * Noi Tailwind voi design token trong src/app/globals.css — he trang xanh chep tu CRM Lyno
 * (D:\intern\CRM_Lyno-\DESIGN.md + apps/web/tailwind.config.ts). KIEN-TRUC muc 8.
 * Mau khai bang kenh RGB trong bien CSS nen van dung duoc do mo: `bg-chinh/10`, `border-loi/30`.
 *
 * Code moi CHI dung token ngu nghia: bg-nen, bg-be-mat, bg-be-mat-phu, border-vien, border-vien-dam,
 * text-chu, text-chu-phu, text-chu-mo, bg-chinh, hover:bg-chinh-dam, bg-chinh-nhat, text-tren-chinh, ring-vong,
 * text-loi / bg-loi-nhat, text-canh-bao / bg-canh-bao-nhat, text-thanh-cong / bg-thanh-cong-nhat.
 * Class dieu khien dung chung: src/components/ui/lop.ts.
 */
const v = (ten: string) => `rgb(var(--${ten}) / <alpha-value>)`;
const thang = (ten: string, buoc: number[]) => Object.fromEntries(buoc.map(b => [b, v(`${ten}-${b}`)]));
const BUOC = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // Dark mode chi bat bang <html data-theme="dark"> (chua dung)
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Tang 1 — thang nguyen thuy (chi dung khi token ngu nghia khong du, vd nen toi xanh-800 / chu nhat tren nen toi muc-200)
        xanh: thang("xanh", BUOC),
        muc: thang("muc", [...BUOC, 950]),

        // Tang 2 — token ngu nghia
        nen: v("nen"),
        "be-mat": v("be-mat"),
        "be-mat-phu": v("be-mat-phu"),
        vien: v("vien"),
        "vien-dam": v("vien-dam"),
        chu: v("chu"),
        "chu-phu": v("chu-phu"),
        "chu-mo": v("chu-mo"),
        chinh: { DEFAULT: v("chinh"), dam: v("chinh-dam"), nhat: v("chinh-nhat") },
        "tren-chinh": v("tren-chinh"),
        vong: v("vong"),
        loi: { DEFAULT: v("loi"), nhat: v("loi-nhat") },
        "canh-bao": { DEFAULT: v("canh-bao"), nhat: v("canh-bao-nhat") },
        "thanh-cong": { DEFAULT: v("thanh-cong"), nhat: v("thanh-cong-nhat") },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "Segoe UI", "system-ui", "-apple-system", "sans-serif"],
      },
      // Vai tro chu: co / dong / do dam di cung nhau
      fontSize: {
        h1: ["1.5rem", { lineHeight: "2rem", fontWeight: "600", letterSpacing: "-0.015em" }],
        h2: ["1.125rem", { lineHeight: "1.75rem", fontWeight: "600", letterSpacing: "-0.01em" }],
        h3: ["1rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        h4: ["0.875rem", { lineHeight: "1.25rem", fontWeight: "600" }],
        body: ["0.875rem", { lineHeight: "1.25rem", fontWeight: "400" }],
        "body-lg": ["1rem", { lineHeight: "1.5rem", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1rem", fontWeight: "500" }],
        so: ["1.75rem", { lineHeight: "2.25rem", fontWeight: "600", letterSpacing: "-0.02em" }],
        // Rieng storefront: tieu de hero / muc lon (CRM khong co trang cong khai)
        "hien-thi": ["2.25rem", { lineHeight: "2.75rem", fontWeight: "600", letterSpacing: "-0.02em" }]
      },
      boxShadow: {
        sm: "var(--bong-1)",
        DEFAULT: "var(--bong-1)",
        md: "var(--bong-2)",
        lg: "var(--bong-2)",
        xl: "var(--bong-3)",
        "2xl": "var(--bong-3)"
      },
      maxWidth: {
        tk: "1320px"
      },
      ringColor: { DEFAULT: v("vong") },
      transitionTimingFunction: { ra: "var(--chuyen-ra)" },
      transitionDuration: { nhanh: "120ms", vua: "200ms" },
      keyframes: {
        "hien-nen": { from: { opacity: "0" }, to: { opacity: "1" } },
        "hien-hop": { from: { opacity: "0", transform: "translateY(8px) scale(0.98)" }, to: { opacity: "1", transform: "none" } }
      },
      animation: {
        "hien-nen": "hien-nen 160ms ease-out",
        "hien-hop": "hien-hop 220ms var(--chuyen-ra)"
      }
    }
  },
  plugins: []
};

export default config;
