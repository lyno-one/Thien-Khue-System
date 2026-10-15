import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { GhiNhanDonService } from "../services/mang-luoi-hoa-hong.service";

/** So phut mac dinh khi khong dat MANG_LUOI_DONG_BO_PHUT (de trong) */
export const PHUT_DONG_BO_MAC_DINH = 10;
/** Lan chay dau sau khi API len (khong doi het chu ky dau — dev hay khoi dong lai) */
const TRE_LAN_DAU_MS = 30_000;

/**
 * Doc MANG_LUOI_DONG_BO_PHUT: de trong / khong dat -> mac dinh 10 phut; "0" (hoac so <= 0) -> tat ro rang;
 * gia tri khong phai so -> mac dinh (khong tat ngam vi go sai).
 */
export function soPhutDongBo(giaTri: string | undefined): number {
  const chuoi = (giaTri ?? "").trim();
  if (chuoi === "") return PHUT_DONG_BO_MAC_DINH;
  const phut = Number(chuoi);
  if (!Number.isFinite(phut)) return PHUT_DONG_BO_MAC_DINH;
  return phut <= 0 ? 0 : phut;
}

/**
 * Job dong bo don CRM -> ghi nhan / hoa hong, chay dinh ky bang setInterval. Day la duong chuyen hoa hong
 * CHO_DOI_SOAT -> DU_DIEU_KIEN (giao thanh cong) va -> BI_TRU (hoan / huy / tra hang), nen BAT MAC DINH.
 * MANG_LUOI_DONG_BO_PHUT: so phut giua hai lan (mac dinh 10); dat 0 de tat (chi chay tay qua POST /api/mang-luoi/dong-bo).
 * An toan khi chay nhieu lan: khoa trong tien trinh (khong chay chong ca voi lan bam tay), loi chi ghi log, khong lam sap API.
 */
@Injectable()
export class DongBoDonJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger("DongBoDon");
  private hen: NodeJS.Timeout | null = null;
  private henDau: NodeJS.Timeout | null = null;
  private dangChay = false;

  constructor(private readonly ghiNhan: GhiNhanDonService) {}

  onApplicationBootstrap(): void {
    const phut = soPhutDongBo(process.env.MANG_LUOI_DONG_BO_PHUT);
    if (phut <= 0) {
      this.logger.warn("Đồng bộ đơn mạng lưới đang TẮT (MANG_LUOI_DONG_BO_PHUT=0) — hoa hồng chỉ cập nhật khi bấm đồng bộ tay");
      return;
    }
    const ms = Math.max(1, phut) * 60_000;
    this.hen = setInterval(() => void this.chay(), ms);
    this.hen.unref();
    this.henDau = setTimeout(() => void this.chay(), Math.min(TRE_LAN_DAU_MS, ms));
    this.henDau.unref();
    this.logger.log(`Bật đồng bộ đơn mạng lưới mỗi ${phut} phút`);
  }

  onModuleDestroy(): void {
    if (this.hen) clearInterval(this.hen);
    if (this.henDau) clearTimeout(this.henDau);
    this.hen = null;
    this.henDau = null;
  }

  /** Mot lan dong bo. Bo qua neu lan truoc (job hoac bam tay) chua xong. Khong bao gio nem loi ra ngoai. */
  async chay(): Promise<void> {
    if (this.dangChay || this.ghiNhan.dangChay) return;
    this.dangChay = true;
    try {
      const kq = await this.ghiNhan.dongBo(null);
      if (kq.don_moi || kq.cap_nhat || kq.loi) {
        this.logger.log(`Đồng bộ: ${kq.don_moi} đơn mới, ${kq.cap_nhat} cập nhật, ${kq.bi_tru} bị trừ, ${kq.loi} lỗi`);
      }
    } catch (e) {
      this.logger.error(`Đồng bộ đơn lỗi: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.dangChay = false;
    }
  }
}
