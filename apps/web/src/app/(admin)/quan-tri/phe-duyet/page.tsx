import { Suspense } from "react";
import { DangTai } from "@/components/ui";
import { BanPheDuyet } from "@/features/quan-tri/ban-phe-duyet";

export const metadata = { title: "Bàn phê duyệt" };

/** Ban phe duyet maker-checker (de xuat / kiem / duyet). Suspense vi doc ?id= / ?lap= tu URL */
export default function TrangPheDuyet() {
  return (
    <Suspense fallback={<DangTai />}>
      <BanPheDuyet />
    </Suspense>
  );
}
