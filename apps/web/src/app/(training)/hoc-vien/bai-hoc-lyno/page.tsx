import { ManBaiLyno } from "@/features/dao-tao/man-bai-lyno";

export const metadata = { title: "Bài học Lyno" };

/** Bai hoc Lyno (soan tren CRM, doc qua API) — chi nhan su Lyno */
export default function TrangBaiHocLyno() {
  return <ManBaiLyno />;
}
