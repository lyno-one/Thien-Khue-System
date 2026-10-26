import { IsObject } from "class-validator";
import type { NopQuizBaiLynoBody } from "@thien-khue/contracts";

/**
 * Body nop quiz Lyno. `traLoi` la Record<cauHoiId, chiSo> — class-validator khong kiem duoc khoa dong, nen DTO chi giu
 * khung (pipe toan cuc van chan truong la o cap tren, khong cat gi ben trong `traLoi`); tung cap kiem o
 * BaiLynoService bang kiemTraLoiQuizLyno (common/utils/dao-tao-bai-lyno.ts).
 */
export class NopQuizBaiLynoDto implements NopQuizBaiLynoBody {
  @IsObject({ message: "Bài làm không hợp lệ" })
  traLoi: Record<string, number>;
}
