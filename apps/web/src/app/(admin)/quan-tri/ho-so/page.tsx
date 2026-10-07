import { Suspense } from "react";
import { DangTai } from "@/components/ui";
import { HoSoLienKet } from "@/features/quan-tri/ho-so-lien-ket";

export const metadata = { title: "Hồ sơ liên kết" };

/** 6 nhom ho so: nguoi dung, khach hang, san pham, hoat dong, giao dich, doi tac (?nhom=) */
export default function TrangHoSoQuanTri() {
  return (
    <Suspense fallback={<DangTai />}>
      <HoSoLienKet />
    </Suspense>
  );
}
