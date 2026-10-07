import { Suspense } from "react";
import { DangTai } from "@/components/ui";
import { ManHocBai } from "@/features/dao-tao/man-hoc-bai";

export const metadata = { title: "Học bài" };

/** Hoc bai: /hoc-vien/khoa-hoc/<khoa_hoc_id>?bai=<bai_hoc_id> */
export default async function TrangHocBai({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<DangTai />}>
      <ManHocBai id={id} />
    </Suspense>
  );
}
