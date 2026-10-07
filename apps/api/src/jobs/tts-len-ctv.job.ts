import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { VaiService } from "../services/ho-so-vai.service";

/** So phut mac dinh giua hai lan quet khi khong dat TTS_LEN_CTV_PHUT */
export const PHUT_QUET_TTS_MAC_DINH = 15;
const TRE_LAN_DAU_MS = 45_000;

/** Doc TTS_LEN_CTV_PHUT: trong / sai -> mac dinh 15; "0" (hoac <= 0) -> tat */
export function soPhutQuetTts(giaTri: string | undefined): number {
  const chuoi = (giaTri ?? "").trim();
  if (chuoi === "") return PHUT_QUET_TTS_MAC_DINH;
  const phut = Number(chuoi);
  if (!Number.isFinite(phut)) return PHUT_QUET_TTS_MAC_DINH;
  return phut <= 0 ? 0 : phut;
}

/**
 * Luoi an toan cho "TTS hoc dat khoa CTV -> tu them vai CTV": luong xet dat cua dao-tao khong goi sang ho-so,
 * nen ngoai viec xet ngay khi TTS tai ho so (GET /ho-so/toi), job nay quet dinh ky moi TTS chua co CTV.
 * Idempotent (VaiService.xetTtsLenCtv chi them khi chua co CTV), loi chi ghi log.
 */
@Injectable()
export class TtsLenCtvJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger("TtsLenCtv");
  private hen: NodeJS.Timeout | null = null;
  private henDau: NodeJS.Timeout | null = null;
  private dangChay = false;

  constructor(private readonly vai: VaiService) {}

  onApplicationBootstrap(): void {
    const phut = soPhutQuetTts(process.env.TTS_LEN_CTV_PHUT);
    if (phut <= 0) return;
    const ms = Math.max(1, phut) * 60_000;
    this.hen = setInterval(() => void this.chay(), ms);
    this.hen.unref();
    this.henDau = setTimeout(() => void this.chay(), Math.min(TRE_LAN_DAU_MS, ms));
    this.henDau.unref();
  }

  onModuleDestroy(): void {
    if (this.hen) clearInterval(this.hen);
    if (this.henDau) clearTimeout(this.henDau);
    this.hen = null;
    this.henDau = null;
  }

  async chay(): Promise<void> {
    if (this.dangChay) return;
    this.dangChay = true;
    try {
      const kq = await this.vai.quetTtsLenCtv();
      if (kq.len_ctv.length) this.logger.log(`Tự thêm vai CTV cho ${kq.len_ctv.length}/${kq.da_xet} thực tập sinh học đạt khoá CTV`);
    } catch (e) {
      this.logger.warn(`Quét thực tập sinh lên CTV lỗi: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.dangChay = false;
    }
  }
}
