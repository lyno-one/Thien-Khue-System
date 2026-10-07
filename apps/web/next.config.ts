import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // contracts build ra dist (CommonJS) — van khai bao de Next bien dich cung pipeline
  transpilePackages: ["@thien-khue/contracts"],
  poweredByHeader: false,
  // Cho phep build kiem tra ra thu muc rieng khi dev server dang dung .next (NEXT_DIST_DIR=.next-build pnpm build)
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
