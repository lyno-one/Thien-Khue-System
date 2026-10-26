import { ManHocBaiLyno } from "@/features/dao-tao/man-hoc-bai-lyno";

export const metadata = { title: "Học bài Lyno" };

/** Hoc mot bai Lyno: /hoc-vien/bai-hoc-lyno/<bai_id cua CRM> */
export default async function TrangHocBaiLyno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ManHocBaiLyno id={id} />;
}
