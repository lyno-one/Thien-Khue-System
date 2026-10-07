"use client";

import { Suspense } from "react";
import { DangTai, TieuDeTrang } from "@/components/ui";
import { FormTaoDon } from "@/features/ban-hang/form-tao-don";

/** Tao don qua CRM — chi hien ma SKU duoc cap quyen */
export default function TrangTaoDon() {
  return (
    <>
      <TieuDeTrang kicker="Sale / CSKH" tieuDe="Tạo đơn" moTa="Học trước khi bán: chỉ bán được những mã bạn đã đạt khoá sản phẩm." />
      <Suspense fallback={<DangTai />}>
        <FormTaoDon />
      </Suspense>
    </>
  );
}
