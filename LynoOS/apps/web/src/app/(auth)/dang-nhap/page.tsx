import { Suspense } from "react";
import { DangTai } from "@/components/ui";
import { FormDangNhap } from "./form-dang-nhap";

export const metadata = { title: "Đăng nhập" };

/** Dang nhap email + mat khau (Supabase Auth cua CRM). Agent ho-so co the mo rong (quen mat khau, dang ky). */
export default function TrangDangNhap() {
  return (
    <Suspense fallback={<DangTai />}>
      <FormDangNhap />
    </Suspense>
  );
}
