// Nen tang (core). Lop: NhatKyService, ThongBaoService, NguoiDungService.
import { Injectable, Logger } from "@nestjs/common";
import { LoaiThongBao, Prisma, TacNhan } from "@prisma/client";
import { CrmDocService } from "../infrastructure/crm/crm-doc.service";
import { chuanHoaSdt } from "../infrastructure/crm/chuan-hoa-sdt";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { type DoiVaiCrm, keHoachDongBoVaiCrm, mapVaiCrm, NGUON_CRM, VAI_MAC_DINH } from "../common/utils/core";
import type { TokenDaXacThuc } from "../infrastructure/supabase/xac-thuc-token.service";
import { type ClientNhatKy, type ClientThongBao, CoreRepository, type HoSoDaChon } from "../repositories/core.repository";

export interface GhiNhatKy {
  /** ho_so.id nguoi thuc hien; null = he thong */
  hoSoId: string | null;
  hanhDong: string;
  doiTuong: string;
  doiTuongId?: string | null;
  duLieu?: Prisma.InputJsonValue;
  tacNhan?: TacNhan;
  ip?: string | null;
}
/** Ghi thien_khue.nhat_ky (chi INSERT). Truyen tx de ghi trong cung transaction nghiep vu. */
@Injectable()
export class NhatKyService {
  private readonly logger = new Logger("NhatKy");

  constructor(private readonly repo: CoreRepository) {}

  async ghi(muc: GhiNhatKy, tx?: ClientNhatKy): Promise<void> {
    await this.repo.taoNhatKy(
      {
        ho_so_id: muc.hoSoId,
        tac_nhan: muc.tacNhan ?? (muc.hoSoId ? TacNhan.NGUOI : TacNhan.HE_THONG),
        hanh_dong: muc.hanhDong,
        doi_tuong: muc.doiTuong,
        doi_tuong_id: muc.doiTuongId ?? null,
        du_lieu: muc.duLieu,
        ip: muc.ip ?? null
      },
      tx
    );
  }

  /** Ghi khong chan luong chinh (loi chi log) — dung ngoai transaction cho viec phu */
  async ghiAnToan(muc: GhiNhatKy): Promise<void> {
    try {
      await this.ghi(muc);
    } catch (e) {
      this.logger.error(`Không ghi được nhật ký ${muc.hanhDong}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

export interface GuiThongBao {
  hoSoId: string;
  loai?: LoaiThongBao;
  tieuDe: string;
  noiDung?: string;
  lienKet?: string;
  duLieu?: Prisma.InputJsonValue;
}
/** Thong bao trong app (thien_khue.thong_bao). Truyen tx de gui trong cung transaction. */
@Injectable()
export class ThongBaoService {
  constructor(private readonly repo: CoreRepository) {}

  async gui(tb: GuiThongBao, tx?: ClientThongBao): Promise<void> {
    await this.repo.taoThongBao(
      {
        ho_so_id: tb.hoSoId,
        loai: tb.loai ?? LoaiThongBao.HE_THONG,
        tieu_de: tb.tieuDe,
        noi_dung: tb.noiDung,
        lien_ket: tb.lienKet,
        du_lieu: tb.duLieu
      },
      tx
    );
  }

  async guiNhieu(hoSoIds: string[], tb: Omit<GuiThongBao, "hoSoId">, tx?: ClientThongBao): Promise<number> {
    if (!hoSoIds.length) return 0;
    return this.repo.taoNhieuThongBao(
      [...new Set(hoSoIds)].map(id => ({
        ho_so_id: id,
        loai: tb.loai ?? LoaiThongBao.HE_THONG,
        tieu_de: tb.tieuDe,
        noi_dung: tb.noiDung,
        lien_ket: tb.lienKet,
        du_lieu: tb.duLieu
      })),
      tx
    );
  }

  /** Thong bao cua chinh nguoi dung (moi nhat truoc) */
  async layCuaToi(hoSoId: string, tuyChon: { chiChuaDoc?: boolean; gioiHan?: number } = {}) {
    const where: Prisma.thong_baoWhereInput = { ho_so_id: hoSoId, ...(tuyChon.chiChuaDoc ? { da_doc: false } : {}) };
    const [ds, chuaDoc] = await Promise.all([
      this.repo.dsThongBao(where, Math.min(tuyChon.gioiHan ?? 30, 100)),
      this.repo.demThongBaoChuaDoc(hoSoId)
    ]);
    return { ds, chuaDoc };
  }

  /** Danh dau da doc — chi thong bao cua chinh minh (where ho_so_id) */
  danhDauDaDoc(hoSoId: string, ids?: string[]): Promise<number> {
    return this.repo.danhDauThongBaoDaDoc(hoSoId, ids);
  }
}

/** Chu ky doi chieu lai vai voi nhan su CRM (moi ho so) — nhan su bi khoa / doi phong mat quyen toi da sau chu ky nay */
export const CHU_KY_DONG_BO_CRM_MS = 60_000;
const TOI_DA_MUC_CACHE = 5_000;
/**
 * "Mot ho so goc, nhieu vai" (KIEN-TRUC muc 4): moi request da xac thuc -> ho so + vai.
 * Lan dau dang nhap: tu tao ho_so; nhan su CRM dang lam -> gan crm_user_id + vai theo CRM; con lai -> KHACH.
 * Cac lan sau: doi chieu lai nhan su CRM (cache CHU_KY_DONG_BO_CRM_MS / ho so) — bi khoa -> vai CRM TAM_DUNG,
 * doi phong / role / chuc danh -> vai CRM cu KET_THUC + vai moi (keHoachDongBoVaiCrm) — ho so cu duoc bo sung vai moi
 * cua mapVaiCrm o lan xac thuc ke tiep. Ghi lich_su_vai_tro + nhat_ky.
 */
@Injectable()
export class NguoiDungService {
  private readonly logger = new Logger("NguoiDung");
  /** ho_so.id -> thoi diem doi chieu CRM gan nhat (ms) */
  private readonly lanDongBo = new Map<string, number>();
  /** Gop cac request dong thoi cua cung ho so vao mot lan dong bo */
  private readonly dangDongBo = new Map<string, Promise<boolean>>();

  constructor(
    private readonly repo: CoreRepository,
    private readonly crmDoc: CrmDocService,
    private readonly nhatKy: NhatKyService
  ) {}

  async layTuToken(token: TokenDaXacThuc): Promise<ThongTinNguoiDung> {
    let hoSo = await this.repo.layHoSo(token.sub);
    if (!hoSo) {
      hoSo = await this.taoLanDau(token);
      this.ghiNhoDongBo(hoSo.id);
    } else if (await this.dongBoNeuCan(hoSo)) {
      hoSo = (await this.repo.layHoSo(token.sub)) ?? hoSo;
    }
    return this.dung(token, hoSo);
  }

  /** Xoa cache dong bo (vd sau khi CRM doi nhan su va muon ap ngay) */
  boCacheDongBo(hoSoId?: string): void {
    if (hoSoId) this.lanDongBo.delete(hoSoId);
    else this.lanDongBo.clear();
  }

  private ghiNhoDongBo(hoSoId: string): void {
    const nay = Date.now();
    if (this.lanDongBo.size >= TOI_DA_MUC_CACHE) {
      for (const [id, luc] of this.lanDongBo) if (nay - luc >= CHU_KY_DONG_BO_CRM_MS) this.lanDongBo.delete(id);
      if (this.lanDongBo.size >= TOI_DA_MUC_CACHE) this.lanDongBo.clear();
    }
    this.lanDongBo.set(hoSoId, nay);
  }

  /** true = co doi vai (can doc lai ho so) */
  private async dongBoNeuCan(hoSo: HoSoDaChon): Promise<boolean> {
    const luc = this.lanDongBo.get(hoSo.id);
    if (luc !== undefined && Date.now() - luc < CHU_KY_DONG_BO_CRM_MS) return false;
    const dangChay = this.dangDongBo.get(hoSo.id);
    if (dangChay) return dangChay;
    const p = this.dongBoVaiCrm(hoSo)
      .then(doi => {
        this.ghiNhoDongBo(hoSo.id);
        return doi;
      })
      .catch(e => {
        // Khong doc duoc CRM: giu vai hien tai, lan request sau thu lai (khong ghi cache)
        this.logger.error(`Không đồng bộ được vai CRM của ${hoSo.id}: ${e instanceof Error ? e.message : String(e)}`);
        return false;
      })
      .finally(() => this.dangDongBo.delete(hoSo.id));
    this.dangDongBo.set(hoSo.id, p);
    return p;
  }

  /** Doi chieu vai voi nhan su CRM hien tai va ghi thay doi (cap nhat co dieu kien — request song song khong ghi trung) */
  async dongBoVaiCrm(hoSo: Pick<HoSoDaChon, "id" | "crm_user_id" | "vai_tro">): Promise<boolean> {
    const nhanSu = await this.crmDoc.layNhanSuCrm(hoSo.id);
    const daLienKet = !!hoSo.crm_user_id;
    const keHoach = keHoachDongBoVaiCrm(hoSo.vai_tro, nhanSu, daLienKet);
    const canLienKet = !daLienKet && nhanSu?.active === true && keHoach.some(d => d.nguon === NGUON_CRM);
    if (!keHoach.length && !canLienKet) return false;

    return this.repo.chayTrongGiaoDich(async tx => {
      const daDoi: DoiVaiCrm[] = [];
      const bay = new Date();
      for (const d of keHoach) {
        if (d.cu === null) {
          const soTao = await this.repo.themVaiNeuChuaCo({ ho_so_id: hoSo.id, vai: d.vai, trang_thai: d.moi, nguon: d.nguon, tu_luc: bay }, tx);
          if (!soTao) continue;
        } else {
          const soDoi = await this.repo.doiVaiNeu(
            hoSo.id,
            d.vai,
            d.cu,
            {
              trang_thai: d.moi,
              den_luc: d.moi === "KET_THUC" ? bay : null,
              ...(d.cu === "KET_THUC" ? { tu_luc: bay } : {}),
              ...(d.nguon ? { nguon: d.nguon } : {})
            },
            tx
          );
          if (!soDoi) continue;
        }
        await this.repo.ghiLichSuVai({ ho_so_id: hoSo.id, vai: d.vai, trang_thai_cu: d.cu, trang_thai_moi: d.moi, nguoi_doi_id: null, ly_do: d.ly_do }, tx);
        daDoi.push(d);
      }
      if (canLienKet) await this.repo.lienKetCrmNeuChua(hoSo.id, tx);
      if (!daDoi.length && !canLienKet) return false;
      await this.nhatKy.ghi(
        {
          hoSoId: null,
          hanhDong: "DONG_BO_VAI_CRM",
          doiTuong: "ho_so",
          doiTuongId: hoSo.id,
          duLieu: {
            doi: daDoi.map(d => `${d.vai}:${d.cu ?? "-"}->${d.moi}`),
            crm_active: nhanSu?.active ?? null,
            crm_role: nhanSu?.role ?? null,
            crm_nhom_quyen: nhanSu?.nhom_quyen ?? null,
            crm_phong_ban: nhanSu?.phong_ban ?? null,
            lien_ket_crm: canLienKet || daLienKet
          }
        },
        tx
      );
      if (daDoi.length) this.logger.warn(`Đồng bộ vai CRM ${hoSo.id}: ${daDoi.map(d => `${d.vai} ${d.cu ?? "-"}→${d.moi}`).join(", ")}`);
      return true;
    });
  }

  /** Doc lai theo id (sau khi doi vai) */
  async layTheoId(id: string): Promise<ThongTinNguoiDung | null> {
    const hoSo = await this.repo.layHoSo(id);
    return hoSo ? this.dung({ sub: id, email: hoSo.email, sdt: hoSo.sdt, hoTen: hoSo.ho_ten, sessionId: null }, hoSo) : null;
  }

  private dung(token: TokenDaXacThuc, hoSo: HoSoDaChon): ThongTinNguoiDung {
    const vaiChiTiet = hoSo.vai_tro.map(v => ({ vai: v.vai, trang_thai: v.trang_thai, tu_luc: v.tu_luc, den_luc: v.den_luc }));
    return {
      id: hoSo.id,
      email: token.email ?? hoSo.email,
      hoSo: {
        id: hoSo.id,
        ho_ten: hoSo.ho_ten,
        email: hoSo.email,
        sdt: hoSo.sdt,
        sdt_chuan: hoSo.sdt_chuan,
        crm_user_id: hoSo.crm_user_id,
        kich_hoat_lam_viec: hoSo.kich_hoat_lam_viec
      },
      vai: vaiChiTiet.filter(v => v.trang_thai === "HOAT_DONG").map(v => v.vai),
      vaiChiTiet
    };
  }

  private async taoLanDau(token: TokenDaXacThuc): Promise<HoSoDaChon> {
    const nhanSu = await this.crmDoc.layNhanSuCrm(token.sub);
    const laNhanSu = nhanSu?.active === true;
    const vaiCrm = mapVaiCrm(nhanSu);
    const dsVai = vaiCrm.length ? vaiCrm : [VAI_MAC_DINH];
    const nguon = vaiCrm.length ? "CRM" : "HE_THONG";
    const hoTen = (laNhanSu ? nhanSu?.full_name : null) ?? token.hoTen ?? token.email?.split("@")[0] ?? "Người dùng";

    try {
      return await this.repo.chayTrongGiaoDich(async tx => {
        const hoSo = await this.repo.taoHoSo(
          {
            id: token.sub,
            ho_ten: hoTen,
            email: token.email ?? nhanSu?.email ?? null,
            sdt: token.sdt,
            sdt_chuan: token.sdt ? chuanHoaSdt(token.sdt) : null,
            crm_user_id: laNhanSu ? token.sub : null,
            vai_tro: { create: dsVai.map(v => ({ vai: v.vai, trang_thai: v.trang_thai, nguon })) },
            lich_su_vai_tro: {
              create: dsVai.map(v => ({
                vai: v.vai,
                trang_thai_cu: null,
                trang_thai_moi: v.trang_thai,
                ly_do: vaiCrm.length ? "Đồng bộ từ nhân sự CRM lần đầu đăng nhập" : "Tạo hồ sơ lần đầu đăng nhập"
              }))
            }
          },
          tx
        );
        await this.nhatKy.ghi(
          {
            hoSoId: null,
            hanhDong: "TAO_HO_SO_LAN_DAU",
            doiTuong: "ho_so",
            doiTuongId: hoSo.id,
            duLieu: { vai: dsVai.map(v => `${v.vai}:${v.trang_thai}`), nhan_su_crm: laNhanSu }
          },
          tx
        );
        return hoSo;
      });
    } catch (e) {
      // Hai request dong thoi cung tao -> request sau doc lai ban da tao
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const daCo = await this.repo.layHoSo(token.sub);
        if (daCo) return daCo;
      }
      this.logger.error(`Không tạo được hồ sơ ${token.sub}: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }
}
