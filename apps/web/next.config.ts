import type { NextConfig } from "next";

/** Header bao mat co ban (KHONG dat CSP day du — de tranh vo script/anh). HSTS chi ban production. */
const HEADER_BAO_MAT = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : [])
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // contracts build ra dist (CommonJS) — van khai bao de Next bien dich cung pipeline
  transpilePackages: ["@thien-khue/contracts"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: HEADER_BAO_MAT }];
  },
  // Cho phep build kiem tra ra thu muc rieng khi dev server dang dung .next (NEXT_DIST_DIR=.next-build pnpm build)
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
