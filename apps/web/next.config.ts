import path from "node:path";
import type { NextConfig } from "next";

/** NEXT_OUTPUT=standalone (Dockerfile deploy) -> ban chay doc lap .next/standalone; trace tu goc monorepo de lay ca packages/contracts */
const STANDALONE = process.env.NEXT_OUTPUT === "standalone";

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
  ...(STANDALONE ? { output: "standalone" as const, outputFileTracingRoot: path.join(__dirname, "../..") } : {}),
  async headers() {
    return [{ source: "/:path*", headers: HEADER_BAO_MAT }];
  },
  // Cho phep build kiem tra ra thu muc rieng khi dev server dang dung .next (NEXT_DIST_DIR=.next-build pnpm build)
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
