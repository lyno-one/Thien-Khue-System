import { Suspense } from "react";
import { DangTai } from "@/components/ui";
import { ManLamBai } from "@/features/dao-tao/man-lam-bai";

export const metadata = { title: "Làm bài kiểm tra" };

/** Bai kiem tra cuoi khoa: /hoc-vien/bai-kiem-tra/<khoa_hoc_id>?de=<bai_kiem_tra_id> */
export default async function TrangLamBai({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<DangTai />}>
      <ManLamBai khoaHocId={id} />
    </Suspense>
  );
}
