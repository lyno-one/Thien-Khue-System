// Bai hoc Lyno (bai tao tren CRM) — ham thuan kiem du lieu truoc khi chuyen tiep sang CRM /api/kb/*.
import { CHI_SO_LUA_CHON_LYNO_TOI_DA, SO_CAU_QUIZ_LYNO_TOI_DA } from "@thien-khue/contracts";
import { laUuid } from "./dao-tao";

/**
 * Kiem bai lam quiz Lyno: object { cauHoiId (uuid) -> chi so lua chon nguyen 0..19 }, toi da 200 cau.
 * Tra cau loi tieng Viet, hop le -> null. CRM van cham lai — day chi chan body rac truoc khi goi CRM.
 */
export function kiemTraLoiQuizLyno(traLoi: unknown): string | null {
  if (typeof traLoi !== "object" || traLoi === null || Array.isArray(traLoi)) return "Bài làm không hợp lệ";
  const cap = Object.entries(traLoi as Record<string, unknown>);
  if (cap.length > SO_CAU_QUIZ_LYNO_TOI_DA) return `Bài làm có quá nhiều câu (tối đa ${SO_CAU_QUIZ_LYNO_TOI_DA})`;
  for (const [cauHoiId, chiSo] of cap) {
    if (!laUuid(cauHoiId)) return "Mã câu hỏi không hợp lệ";
    if (typeof chiSo !== "number" || !Number.isInteger(chiSo) || chiSo < 0 || chiSo > CHI_SO_LUA_CHON_LYNO_TOI_DA) {
      return "Lựa chọn trả lời không hợp lệ";
    }
  }
  return null;
}
