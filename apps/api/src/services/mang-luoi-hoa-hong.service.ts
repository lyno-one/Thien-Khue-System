// Mang luoi — dong tien: ghi nhan don, hoa hong, vi. Lop: GhiNhanDonService, HoaHongService.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { type ghi_nhan_don, type NguonDon, Prisma, type TrangThaiGhiNhan, type TrangThaiHoaHong, type Vai } from "@prisma/client";
import type { DieuChinhHoaHongMl, GhiNhanDonMl, HoaHongDongMl, KetQuaDongBoMl, LichSuDuyetMl, ViHoaHong } from "@thien-khue/contracts";
import { CrmDocService, type DonCrm } from "../infrastructure/crm/crm-doc.service";
import { NhatKyService, ThongBaoService } from "./core.service";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { QuyenSkuService } from "./dao-tao-quyen-sku.service";
import {
  chonTyLe, chonVai, chuyenTrangThaiHoaHong, donBiHuy, iso, type KetQuaTinhHoaHong, kyDoiSoat, laTrungKhoa, lyDoDonRot, quyetDinhGhiNhan,
  tachMaGioiThieu, tinhHoaHong, trangThaiHoaHongBanDau, VAI_CHOT_DON, VAI_GIOI_THIEU
} from "../common/utils/mang-luoi";
import { LOAI_LICH_SU, NGAY_QUET_LAI, NHAN_DE_XUAT, VAI_TOI_CAO } from "../constants/mang-luoi.constants";
import {
  GhiNhanDonRepository, type GhiNhanKemHoaHong, HoaHongRepository, HoSoMangLuoiRepository, MaGioiThieuRepository
} from "../repositories/mang-luoi.repository";

/** Don CRM kem ghi_chu (noi chua "[MGT:...]") */
export type DonCoGhiChu = DonCrm & { ghi_chu?: string | null };
/**
 * Ham quet don co ma gioi thieu — agent nen se them vao CrmDocService (xem can_doi_chung).
 * Chua co thi job chi cap nhat cac don da ghi nhan (khong phat hien don moi tu ghi_chu CRM).
 */
type CoQuetMgt = { layDonCoMaGioiThieu?: (tuyChon: { tuLuc?: Date; gioiHan?: number }) => Promise<DonCoGhiChu[]> };
export type KetQuaXuLyDon = { ket_qua: "MOI" | "CAP_NHAT" | "BO_QUA"; id?: string; trang_thai?: TrangThaiGhiNhan; ly_do?: string };
/**
 * Ghi nhan nguoi ban cho don CRM + vong doi hoa hong (README 2.3):
 * - MOT don MOT dong ghi_nhan_don (crm_don_id unique) va toi da MOT hoa_hong (ghi_nhan_don_id unique) — tao trong transaction,
 *   trung khoa (hai luong cung ghi) thi bo qua, khong bao gio tao lan hai.
 * - Ma gioi thieu khac nguoi chot -> CHO_XAC_MINH, chua co hoa hong cho toi khi nguoi phu trach xac minh.
 * - Don giao thanh cong -> DU_DIEU_KIEN; hoan / huy -> BI_TRU (da chi tra thi ghi dieu chinh am).
 */
@Injectable()
export class GhiNhanDonService {
  private readonly logger = new Logger("GhiNhanDon");
  private dangDongBo = false;

  constructor(
    private readonly repo: GhiNhanDonRepository,
    private readonly maRepo: MaGioiThieuRepository,
    private readonly hoSoRepo: HoSoMangLuoiRepository,
    private readonly crmDoc: CrmDocService,
    private readonly quyenSku: QuyenSkuService,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  // ---------------------------------------------------------------- xac dinh cac ben

  /** Chu ma hop le: ma dang bat + chu ma co vai mang luoi HOAT_DONG */
  async timChuMa(ma: string): Promise<{ id: string; ma: string; chu: { hoSoId: string; vai: Vai } } | null> {
    const row = await this.maRepo.timTheoMa(ma.trim().toUpperCase());
    if (!row || !row.bat) return null;
    const vai = chonVai(await this.hoSoRepo.layVaiHoatDong(row.ho_so_id), VAI_GIOI_THIEU);
    return vai ? { id: row.id, ma: row.ma, chu: { hoSoId: row.ho_so_id, vai } } : null;
  }

  /** Nguoi chot = ho so Sale / CSKH tao don tren CRM (don_hang.nguoi_tao = ho_so.crm_user_id) */
  async timNguoiChot(crmUserId: string | null): Promise<{ hoSoId: string; vai: Vai } | null> {
    if (!crmUserId) return null;
    const hs = await this.hoSoRepo.timTheoCrmUser(crmUserId);
    if (!hs) return null;
    // Ke ca DANG_HOC: van la nguoi chot that tren CRM -> phai xet xung dot
    const vai = VAI_CHOT_DON.find(v => hs.vai_tro.some(x => x.vai === v && x.trang_thai !== "KET_THUC"));
    return vai ? { hoSoId: hs.id, vai } : null;
  }

  /** Vai dung tra ty le cho nguoi ban theo nguon da chot */
  private async vaiTinhTheoNguon(hoSoId: string, nguon: NguonDon): Promise<Vai> {
    const vai = await this.hoSoRepo.layVaiHoatDong(hoSoId);
    if (nguon === "SALE") return chonVai(vai, VAI_CHOT_DON) ?? "SALE";
    if (nguon === "CTV") return chonVai(vai, ["CTV", "THUC_TAP"]) ?? "CTV";
    return nguon; // KOL / KOC
  }

  /** Hoa hong cua nguoi ban cho don: chi dong SKU da duoc cap quyen; ty le hieu luc luc tao don */
  async tinhChoNguoiBan(hoSoId: string, vai: Vai, don: Pick<DonCrm, "id" | "tong_tien" | "created_at">): Promise<KetQuaTinhHoaHong> {
    const [dong, duocPhep] = await Promise.all([this.crmDoc.layDongDon(don.id), this.quyenSku.layMauDuocPhep(hoSoId)]);
    const mauIds = [...new Set(dong.map(d => d.mau_id))];
    const luc = new Date(don.created_at);
    const tyLe = await this.repo.layTyLeChoDon(vai, luc, mauIds);
    const ds = tyLe.map(t => ({ mau_id: t.mau_id, ty_le: Number(t.ty_le), hieu_luc_tu: t.hieu_luc_tu }));
    return tinhHoaHong(dong, Number(don.tong_tien), new Set(duocPhep), id => chonTyLe(ds, id, luc));
  }

  // ---------------------------------------------------------------- ghi nhan mot don

  /**
   * Xu ly mot don CRM (idempotent): chua co -> tao ghi nhan (+ hoa hong neu HOP_LE); da co -> cap nhat theo trang thai don.
   * maGioiThieu: ma nhap tay (uu tien hon ghi_chu). buocXacMinh: ma nhap tay sau khi tao don (bat ke vai nguoi nhap) -> luon CHO_XAC_MINH.
   */
  async xuLyDon(don: DonCoGhiChu, tuyChon: { maGioiThieu?: string | null; nguoiThucHien?: string | null; buocXacMinh?: boolean } = {}): Promise<KetQuaXuLyDon> {
    if (don.loai_don !== "BAN_HANG") return { ket_qua: "BO_QUA", ly_do: "Không phải đơn bán hàng" };

    const daCo = await this.repo.timTheoCrmDonKemHoaHong(don.id);
    if (daCo) {
      const { doi } = await this.capNhatTheoDon(daCo, don);
      return { ket_qua: doi ? "CAP_NHAT" : "BO_QUA", id: daCo.id, trang_thai: daCo.trang_thai, ly_do: doi ? undefined : "Đơn đã được ghi nhận" };
    }

    const ma = tuyChon.maGioiThieu?.trim().toUpperCase() || tachMaGioiThieu(don.ghi_chu);
    const maHopLe = ma ? await this.timChuMa(ma) : null;
    const nguoiChot = await this.timNguoiChot(don.nguoi_tao);
    const qd = quyetDinhGhiNhan({ trangThaiDon: don, chuMa: maHopLe?.chu ?? null, nguoiChot });
    if (!qd) return { ket_qua: "BO_QUA", ly_do: ma ? `Mã giới thiệu ${ma} không hợp lệ hoặc đã tắt` : "Đơn không có mã giới thiệu / người chốt thuộc Thiên Khuê" };

    const lyDo: string[] = [];
    if (qd.ly_do) lyDo.push(qd.ly_do);
    if (ma && !maHopLe) lyDo.push(`Mã giới thiệu ${ma} không hợp lệ hoặc đã tắt`);
    // Ma nhap tay (khong nam trong ghi chu CRM) -> khong tu chi tra, ke ca QUAN_LY / ADMIN / THIEN_KHUE nhap
    if (qd.trang_thai === "HOP_LE" && tuyChon.buocXacMinh && maHopLe) {
      qd.trang_thai = "CHO_XAC_MINH";
      qd.nguoi_ban_ho_so_id = null;
      qd.vai_tinh = null;
      lyDo.push("Mã giới thiệu nhập tay sau khi tạo đơn — chờ người phụ trách xác minh");
    }

    const tinh = qd.trang_thai === "HOP_LE" && qd.nguoi_ban_ho_so_id && qd.vai_tinh ? await this.tinhChoNguoiBan(qd.nguoi_ban_ho_so_id, qd.vai_tinh, don) : null;

    let gn: ghi_nhan_don;
    try {
      gn = await this.repo.chayTrongGiaoDich(async tx => {
        const moi = await this.repo.taoGhiNhan(
          {
            crm_don_id: don.id,
            ma_don: don.ma_don,
            sdt_chuan: don.sdt_chuan,
            tong_tien: new Prisma.Decimal(Math.round(Number(don.tong_tien) || 0)),
            nguoi_ban_ho_so_id: qd.nguoi_ban_ho_so_id,
            nguon: qd.nguon,
            ma_gioi_thieu: maHopLe?.ma ?? ma ?? null,
            ma_gioi_thieu_id: maHopLe?.id ?? null,
            nguoi_chot_ho_so_id: nguoiChot?.hoSoId ?? null,
            trang_thai: qd.trang_thai,
            ly_do: lyDo.length ? lyDo.join(". ") : null
          },
          tx
        );
        if (tinh && qd.nguoi_ban_ho_so_id) {
          await this.repo.taoHoaHong(
            {
              ghi_nhan_don_id: moi.id,
              ho_so_id: qd.nguoi_ban_ho_so_id,
              so_tien: new Prisma.Decimal(tinh.so_tien),
              ty_le: new Prisma.Decimal(tinh.ty_le),
              trang_thai: trangThaiHoaHongBanDau(don),
              ky: kyDoiSoat(new Date(don.created_at))
            },
            tx
          );
        }
        await this.nhatKy.ghi(
          {
            hoSoId: tuyChon.nguoiThucHien ?? null,
            hanhDong: "GHI_NHAN_DON",
            doiTuong: "ghi_nhan_don",
            doiTuongId: moi.id,
            duLieu: {
              ma_don: don.ma_don,
              trang_thai: qd.trang_thai,
              nguon: qd.nguon,
              ma_gioi_thieu: maHopLe?.ma ?? ma ?? null,
              nguoi_ban: qd.nguoi_ban_ho_so_id,
              nguoi_chot: nguoiChot?.hoSoId ?? null,
              // Ma nhap tay: nguoi nhap la nguoi lien quan, khong duoc tham gia xac minh don nay
              ...(tuyChon.maGioiThieu?.trim() ? { nguoi_nhap_ma: tuyChon.nguoiThucHien ?? null } : {}),
              hoa_hong: tinh ? { so_tien: tinh.so_tien, ty_le: tinh.ty_le, mau_bo_qua: tinh.mau_bo_qua } : null
            }
          },
          tx
        );
        return moi;
      });
    } catch (e) {
      // Luong khac (job / Sale) vua ghi nhan cung don -> unique crm_don_id chan, KHONG tao lan hai
      if (laTrungKhoa(e)) return { ket_qua: "BO_QUA", ly_do: "Đơn đã được ghi nhận" };
      throw e;
    }

    await this.thongBaoSauGhiNhan(gn, maHopLe?.chu.hoSoId ?? null, tinh?.so_tien ?? null);
    return { ket_qua: "MOI", id: gn.id, trang_thai: gn.trang_thai, ly_do: gn.ly_do ?? undefined };
  }

  private async thongBaoSauGhiNhan(gn: ghi_nhan_don, chuMa: string | null, soTien: number | null): Promise<void> {
    try {
      if (gn.trang_thai === "CHO_XAC_MINH") {
        const lienQuan = [chuMa, gn.nguoi_chot_ho_so_id].filter((x): x is string => !!x);
        await this.thongBao.guiNhieu(lienQuan, {
          loai: "DON_HANG",
          tieuDe: `Đơn ${gn.ma_don} đang chờ xác minh người bán`,
          noiDung: "Mã giới thiệu và người chốt đơn khác nhau. Đơn chỉ được ghi nhận cho một người sau khi người phụ trách xác minh.",
          lienKet: "/lam-viec/mang-luoi/thu-nhap"
        });
        const phuTrach = (await this.hoSoRepo.layNguoiPhuTrach()).filter(id => !lienQuan.includes(id));
        await this.thongBao.guiNhieu(phuTrach, {
          loai: "PHE_DUYET",
          tieuDe: `Cần xác minh người bán đơn ${gn.ma_don}`,
          noiDung: gn.ly_do ?? undefined,
          lienKet: "/lam-viec/mang-luoi/quan-ly"
        });
      } else if (gn.trang_thai === "HOP_LE" && gn.nguoi_ban_ho_so_id) {
        await this.thongBao.gui({
          hoSoId: gn.nguoi_ban_ho_so_id,
          loai: "HOA_HONG",
          tieuDe: `Đơn ${gn.ma_don} đã ghi nhận cho bạn`,
          noiDung: soTien !== null ? `Hoa hồng tạm tính ${soTien.toLocaleString("vi-VN")}đ — đủ điều kiện khi đơn giao thành công.` : undefined,
          lienKet: "/lam-viec/mang-luoi/thu-nhap"
        });
      }
    } catch (e) {
      this.logger.warn(`Không gửi được thông báo ghi nhận ${gn.ma_don}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Tao hoa hong cho ghi nhan HOP_LE chua co (vd quan-tri duyet XAC_MINH_DON) — unique chan tao lan hai */
  async taoHoaHongNeuThieu(ghiNhanId: string, nguoiThucHien: string | null = null): Promise<boolean> {
    const gn = await this.repo.timTheoIdKemHoaHong(ghiNhanId);
    if (!gn || gn.hoa_hong || gn.trang_thai !== "HOP_LE" || !gn.nguoi_ban_ho_so_id) return false;
    const don = await this.crmDoc.layDon(gn.crm_don_id);
    if (!don || donBiHuy(don)) return false;
    const vai = await this.vaiTinhTheoNguon(gn.nguoi_ban_ho_so_id, gn.nguon);
    const tinh = await this.tinhChoNguoiBan(gn.nguoi_ban_ho_so_id, vai, don);
    try {
      await this.repo.chayTrongGiaoDich(async tx => {
        const hh = await this.repo.taoHoaHong(
          {
            ghi_nhan_don_id: gn.id,
            ho_so_id: gn.nguoi_ban_ho_so_id!,
            so_tien: new Prisma.Decimal(tinh.so_tien),
            ty_le: new Prisma.Decimal(tinh.ty_le),
            trang_thai: trangThaiHoaHongBanDau(don),
            ky: kyDoiSoat(new Date(don.created_at))
          },
          tx
        );
        await this.nhatKy.ghi(
          { hoSoId: nguoiThucHien, hanhDong: "TAO_HOA_HONG", doiTuong: "hoa_hong", doiTuongId: hh.id, duLieu: { ma_don: gn.ma_don, so_tien: tinh.so_tien, ty_le: tinh.ty_le } },
          tx
        );
      });
      return true;
    } catch (e) {
      if (laTrungKhoa(e)) return false;
      throw e;
    }
  }

  /**
   * Cap nhat ghi nhan + hoa hong theo trang thai don CRM moi nhat. Doi trang thai bang updateMany co dieu kien
   * trang thai cu -> hai luong chay cung luc chi mot luong doi duoc (khong ghi dieu chinh hai lan).
   * Hoan / huy: ghi_nhan_don -> BI_HUY va hoa_hong -> BI_TRU (+ dieu chinh am neu da tra) trong CUNG mot transaction
   * -> khong bao gio con ghi nhan BI_HUY ma hoa hong van DU_DIEU_KIEN / DA_TRA (dong bo sau cung bat lai ca nay).
   */
  async capNhatTheoDon(gn: GhiNhanKemHoaHong, don: Pick<DonCrm, "trang_thai" | "ma_don" | "da_tra_hang">): Promise<{ doi: boolean; biTru: boolean; duDieuKien: boolean }> {
    const kq = { doi: false, biTru: false, duDieuKien: false };
    const huy = donBiHuy(don);
    const doiGhiNhan = huy && gn.trang_thai !== "BI_HUY";
    const hh = gn.hoa_hong;

    if (!hh && !doiGhiNhan) {
      if (!huy && gn.trang_thai === "HOP_LE" && gn.nguoi_ban_ho_so_id) kq.doi = await this.taoHoaHongNeuThieu(gn.id);
      return kq;
    }

    let chuyen = hh ? chuyenTrangThaiHoaHong(hh.trang_thai, don) : null;
    // Ghi nhan da huy (vd xac minh "khong tinh cho ai") ma don van song: khong nang hoa hong len du dieu kien
    if (chuyen && gn.trang_thai === "BI_HUY" && chuyen.moi !== "BI_TRU") chuyen = null;
    if (!doiGhiNhan && !chuyen) return kq;

    const r = await this.repo.chayTrongGiaoDich(async tx => {
      let doiGn = false;
      let doiHh = false;
      if (doiGhiNhan) {
        const n = await this.repo.capNhatGhiNhanNeu(gn.id, gn.trang_thai, { trang_thai: "BI_HUY", ly_do: [gn.ly_do, lyDoDonRot(don)].filter(Boolean).join(". ") }, tx);
        doiGn = n > 0;
      }
      if (hh && chuyen) {
        const n = await this.repo.doiTrangThaiHoaHongNeu(hh.id, hh.trang_thai, chuyen.moi, tx);
        if (n > 0) {
          doiHh = true;
          if (chuyen.ghiDieuChinhTru && Number(hh.so_tien) > 0) {
            await this.repo.taoDieuChinh(
              {
                hoa_hong_id: hh.id,
                ho_so_id: hh.ho_so_id,
                so_tien: new Prisma.Decimal(-Number(hh.so_tien)),
                ly_do: `Đơn ${don.ma_don} hoàn / huỷ / trả hàng sau khi đã chi trả — trừ vào kỳ sau`,
                ky: kyDoiSoat(new Date())
              },
              tx
            );
          }
          await this.nhatKy.ghi(
            {
              hoSoId: null,
              hanhDong: chuyen.moi === "BI_TRU" ? "TRU_HOA_HONG" : "HOA_HONG_DU_DIEU_KIEN",
              doiTuong: "hoa_hong",
              doiTuongId: hh.id,
              duLieu: { ma_don: don.ma_don, tu: hh.trang_thai, sang: chuyen.moi, trang_thai_don: don.trang_thai, so_tien: Number(hh.so_tien) }
            },
            tx
          );
        }
      }
      return { doiGn, doiHh };
    });
    kq.doi = r.doiGn || r.doiHh;
    if (!r.doiHh || !hh || !chuyen) return kq;
    kq.biTru = chuyen.moi === "BI_TRU";
    kq.duDieuKien = chuyen.moi === "DU_DIEU_KIEN";
    try {
      await this.thongBao.gui({
        hoSoId: hh.ho_so_id,
        loai: "HOA_HONG",
        tieuDe: kq.biTru ? `Đơn ${don.ma_don} hoàn / huỷ / trả hàng — hoa hồng bị trừ` : `Hoa hồng đơn ${don.ma_don} đủ điều kiện`,
        noiDung: `${Number(hh.so_tien).toLocaleString("vi-VN")}đ`,
        lienKet: "/lam-viec/mang-luoi/thu-nhap"
      });
    } catch {
      // thong bao khong chan doi soat
    }
    return kq;
  }

  // ---------------------------------------------------------------- dong bo dinh ky

  get dangChay(): boolean {
    return this.dangDongBo;
  }

  /** Quet lai: don CRM moi co [MGT:] (neu core ho tro) + cap nhat trang thai cac don da ghi nhan */
  /** Doc don CRM theo lo 500 (CrmDocService.layDonTheoIds); mock / ban cu khong co thi doc tung don */
  private async layDonTheoLo(ids: string[]): Promise<Map<string, DonCrm>> {
    const kq = new Map<string, DonCrm>();
    const theoLo = (this.crmDoc as unknown as { layDonTheoIds?: (ids: string[]) => Promise<DonCrm[]> }).layDonTheoIds;
    const duyNhat = [...new Set(ids)];
    if (typeof theoLo === "function") {
      for (let i = 0; i < duyNhat.length; i += 500) for (const d of await theoLo.call(this.crmDoc, duyNhat.slice(i, i + 500))) kq.set(d.id, d);
      return kq;
    }
    for (const id of duyNhat) {
      const d = await this.crmDoc.layDon(id);
      if (d) kq.set(id, d);
    }
    return kq;
  }

  async dongBo(nguoiThucHien: string | null = null): Promise<KetQuaDongBoMl> {
    if (this.dangDongBo) throw new ConflictException("Đang đồng bộ, thử lại sau ít phút");
    this.dangDongBo = true;
    const batDau = new Date();
    const kq: KetQuaDongBoMl = {
      don_moi: 0,
      cap_nhat: 0,
      cho_xac_minh: 0,
      bi_tru: 0,
      du_dieu_kien: 0,
      bo_qua: 0,
      loi: 0,
      quet_don_moi: false,
      bat_dau: batDau.toISOString(),
      ket_thuc: batDau.toISOString()
    };
    try {
      const tuLuc = new Date(Date.now() - NGAY_QUET_LAI * 86_400_000);
      const quet = (this.crmDoc as unknown as CoQuetMgt).layDonCoMaGioiThieu;
      if (typeof quet === "function") {
        kq.quet_don_moi = true;
        const ds = await quet.call(this.crmDoc, { tuLuc, gioiHan: 500 });
        for (const don of ds) {
          try {
            const r = await this.xuLyDon(don, { nguoiThucHien });
            if (r.ket_qua === "MOI") {
              kq.don_moi++;
              if (r.trang_thai === "CHO_XAC_MINH") kq.cho_xac_minh++;
            } else if (r.ket_qua === "BO_QUA") kq.bo_qua++;
          } catch (e) {
            kq.loi++;
            this.logger.error(`Đồng bộ đơn ${don.ma_don}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      // Ghi nhan con mo + ghi nhan da huy nhung hoa hong chua bi tru (du lieu cu / loi giua chung) -> tru bu
      const mo = await this.repo.layCanDongBo(tuLuc);
      const donTheoId = await this.layDonTheoLo(mo.map(g => g.crm_don_id));
      for (const gn of mo) {
        try {
          const don = donTheoId.get(gn.crm_don_id) ?? null;
          if (!don) {
            kq.bo_qua++;
            continue;
          }
          const r = await this.capNhatTheoDon(gn, don);
          if (r.doi) kq.cap_nhat++;
          if (r.biTru) kq.bi_tru++;
          if (r.duDieuKien) kq.du_dieu_kien++;
        } catch (e) {
          kq.loi++;
          this.logger.error(`Cập nhật ghi nhận ${gn.ma_don}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      kq.ket_thuc = new Date().toISOString();
      await this.nhatKy.ghiAnToan({ hoSoId: nguoiThucHien, hanhDong: "DONG_BO_DON", doiTuong: "ghi_nhan_don", duLieu: { ...kq } });
      return kq;
    } finally {
      this.dangDongBo = false;
    }
  }

  // ---------------------------------------------------------------- thao tac nguoi dung

  /**
   * Sale / quan ly ghi nhan mot don CRM theo ma don (kem ma gioi thieu khach dua neu co).
   * Ma gioi thieu nhap tay sau khi don da tao LUON vao CHO_XAC_MINH (ke ca QUAN_LY / ADMIN / THIEN_KHUE nhap);
   * khong ai tu gan ma cua chinh minh.
   */
  async ghiNhanTheoMaDon(nd: ThongTinNguoiDung, maDon: string, maGioiThieu?: string): Promise<GhiNhanDonMl> {
    const don = await this.crmDoc.layDonTheoMa(maDon);
    if (!don) throw new NotFoundException(`Không tìm thấy đơn ${maDon.trim()} trên CRM`);
    if (don.loai_don !== "BAN_HANG") throw new BadRequestException("Chỉ ghi nhận đơn bán hàng (không phải đơn đổi trả)");
    const daCo = await this.repo.timIdTheoCrmDon(don.id);
    if (daCo) throw new ConflictException(`Đơn ${don.ma_don} đã được ghi nhận — mỗi đơn chỉ một người bán`);
    const maNhap = maGioiThieu?.trim().toUpperCase() || null;
    if (maNhap) {
      const chu = await this.maRepo.timTheoMa(maNhap);
      if (chu?.ho_so_id === nd.id) throw new ForbiddenException("Không được tự gắn mã giới thiệu của chính mình vào đơn — nhờ người phụ trách khác");
    }
    const r = await this.xuLyDon(don, { maGioiThieu: maNhap, nguoiThucHien: nd.id, buocXacMinh: !!maNhap });
    if (!r.id) throw new BadRequestException(r.ly_do ?? "Đơn không đủ điều kiện ghi nhận");
    return this.chiTiet(r.id, nd.id);
  }

  /**
   * Xac minh don CHO_XAC_MINH (ca trung nguon / ma nhap tay) = quyet dinh dong tien -> maker-checker:
   * route nay CHI lap de_xuat_duyet XAC_MINH_DON (CHO_KIEM). Doi ghi_nhan_don + tao hoa hong chi chay khi de xuat
   * DA_DUYET (quan-tri ApDungDeXuatService.apDungXacMinhDon + DeXuatService.sauKhiDuyet) — 3 nguoi khac nhau,
   * khong ai la nguoi lien quan (nguoi gioi thieu / nguoi chot / nguoi ban hien tai / nguoi nhap ma).
   */
  async xacMinh(
    nd: ThongTinNguoiDung,
    id: string,
    chon: "GIOI_THIEU" | "NGUOI_CHOT" | "KHONG_AI",
    lyDo: string
  ): Promise<{ de_xuat_duyet_id: string; trang_thai: "CHO_KIEM"; ghi_nhan: GhiNhanDonMl }> {
    const gn = await this.repo.timTheoId(id);
    if (!gn) throw new NotFoundException("Không tìm thấy ghi nhận đơn");
    if (gn.trang_thai !== "CHO_XAC_MINH") throw new ConflictException("Đơn không ở trạng thái chờ xác minh");
    const chuMa = gn.ma_gioi_thieu_id
      ? ((await this.maRepo.timTheoId(gn.ma_gioi_thieu_id))?.ho_so_id ?? null)
      : null;
    const nguoiNhap = await this.hoSoRepo.layNguoiNhapMa(gn.id);
    const lienQuan = [...new Set([chuMa, gn.nguoi_chot_ho_so_id, gn.nguoi_ban_ho_so_id, ...nguoiNhap].filter((x): x is string => !!x))];
    if (lienQuan.includes(nd.id)) {
      throw new ForbiddenException("Bạn có liên quan tới đơn này (giới thiệu / chốt / nhập mã) — cần người phụ trách khác đề xuất xác minh");
    }

    let nguoiBan: string | null = null;
    let nguon: NguonDon = gn.nguon;
    if (chon === "GIOI_THIEU") {
      if (!chuMa) throw new BadRequestException("Đơn không có mã giới thiệu hợp lệ để ghi nhận");
      nguoiBan = chuMa;
    } else if (chon === "NGUOI_CHOT") {
      if (!gn.nguoi_chot_ho_so_id) throw new BadRequestException("Đơn không có người chốt thuộc Thiên Khuê");
      nguoiBan = gn.nguoi_chot_ho_so_id;
      nguon = "SALE";
    }

    const dx = await this.repo.chayTrongGiaoDich(async tx => {
      const trung = await this.repo.timDeXuatXacMinhDangMo(id, tx);
      if (trung) throw new ConflictException("Đơn đã có đề xuất xác minh đang chờ kiểm / duyệt");
      const duLieu = {
        ma_don: gn.ma_don,
        tong_tien: Number(gn.tong_tien),
        chon,
        ket_qua: nguoiBan ? "GHI_NHAN" : "HUY",
        nguoi_ban_ho_so_id: nguoiBan,
        nguon: nguoiBan ? nguon : null,
        nguoi_ban_cu_id: gn.nguoi_ban_ho_so_id,
        nguon_cu: gn.nguon,
        nguoi_chot_ho_so_id: gn.nguoi_chot_ho_so_id,
        chu_ma_ho_so_id: chuMa,
        ma_gioi_thieu: gn.ma_gioi_thieu
      };
      const moi = await this.repo.taoDeXuatXacMinh(id, duLieu, lyDo.trim(), nd.id, tx);
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "DE_XUAT_TAO", doiTuong: "de_xuat_duyet", doiTuongId: moi.id, duLieu: { loai: moi.loai, doi_tuong: moi.doi_tuong, doi_tuong_id: id, du_lieu: duLieu } }, tx);
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "DE_XUAT_XAC_MINH_DON", doiTuong: "ghi_nhan_don", doiTuongId: id, duLieu: { de_xuat_duyet_id: moi.id, ma_don: gn.ma_don, chon, nguoi_ban: nguoiBan } }, tx);
      return moi;
    });

    try {
      // Nguoi kiem: QUAN_LY / ADMIN / THIEN_KHUE khac nguoi de xuat + nguoi lien quan
      const kiem = await this.hoSoRepo.layHoSoIdCoVai(VAI_TOI_CAO, [nd.id, ...lienQuan]);
      await this.thongBao.guiNhieu([...new Set(kiem)], {
        loai: "PHE_DUYET",
        tieuDe: `Đề xuất xác minh người bán đơn ${gn.ma_don} cần kiểm`,
        noiDung: lyDo.trim(),
        lienKet: `/quan-tri/phe-duyet?id=${dx.id}`,
        duLieu: { de_xuat_duyet_id: dx.id, ghi_nhan_don_id: id }
      });
    } catch {
      // thong bao khong chan de xuat
    }
    return { de_xuat_duyet_id: dx.id, trang_thai: "CHO_KIEM", ghi_nhan: await this.chiTiet(id, nd.id) };
  }

  // ---------------------------------------------------------------- doc

  async chiTiet(id: string, xemBoi?: string): Promise<GhiNhanDonMl> {
    const gn = await this.repo.timTheoIdKemHoaHong(id);
    if (!gn) throw new NotFoundException("Không tìm thấy ghi nhận đơn");
    return (await this.dinhDang([gn], xemBoi))[0]!;
  }

  /** Danh sach cho quan ly (loc trang thai) */
  async danhSach(tuyChon: { trang_thai?: TrangThaiGhiNhan; skip: number; take: number }): Promise<{ ds: GhiNhanDonMl[]; tong: number }> {
    const { ds, tong } = await this.repo.danhSach(tuyChon);
    return { ds: await this.dinhDang(ds), tong };
  }

  /** Nguon don cua toi: don toi la nguoi ban / nguoi gioi thieu / nguoi chot (ca don cho xac minh) */
  async cuaToi(hoSoId: string, tuyChon: { trang_thai?: TrangThaiGhiNhan; skip: number; take: number }): Promise<{ ds: GhiNhanDonMl[]; tong: number }> {
    const maIds = await this.maRepo.layIdsCuaHoSo(hoSoId);
    const { ds, tong } = await this.repo.danhSachLienQuan(hoSoId, maIds, tuyChon);
    return { ds: await this.dinhDang(ds, hoSoId), tong };
  }

  async dinhDang(ds: GhiNhanKemHoaHong[], xemBoi?: string): Promise<GhiNhanDonMl[]> {
    const maIds = [...new Set(ds.map(d => d.ma_gioi_thieu_id).filter((x): x is string => !!x))];
    const ma = maIds.length ? await this.maRepo.layChuMaTheoIds(maIds) : [];
    const chuMa = new Map(ma.map(m => [m.id, m.ho_so_id]));
    const ten = await this.hoSoRepo.layTenHoSo(
      ds.flatMap(d => [d.nguoi_ban_ho_so_id, d.nguoi_chot_ho_so_id, d.nguoi_xac_minh_id, d.ma_gioi_thieu_id ? chuMa.get(d.ma_gioi_thieu_id) : null])
    );
    const nguoi = (id: string | null | undefined) => (id ? (ten.get(id) ?? { id, ho_ten: "—" }) : null);
    return ds.map(d => {
      const gioiThieu = d.ma_gioi_thieu_id ? (chuMa.get(d.ma_gioi_thieu_id) ?? null) : null;
      const vaiTro =
        xemBoi === undefined
          ? undefined
          : d.nguoi_ban_ho_so_id === xemBoi
            ? ("NGUOI_BAN" as const)
            : gioiThieu === xemBoi
              ? ("NGUOI_GIOI_THIEU" as const)
              : d.nguoi_chot_ho_so_id === xemBoi
                ? ("NGUOI_CHOT" as const)
                : null;
      // Nguoi xem khong phai nguoi ban -> khong lo so hoa hong cua nguoi khac
      const hienHoaHong = xemBoi === undefined || d.hoa_hong?.ho_so_id === xemBoi;
      return {
        id: d.id,
        crm_don_id: d.crm_don_id,
        ma_don: d.ma_don,
        tong_tien: Number(d.tong_tien),
        nguon: d.nguon,
        ma_gioi_thieu: d.ma_gioi_thieu,
        trang_thai: d.trang_thai,
        ly_do: d.ly_do,
        nguoi_ban: nguoi(d.nguoi_ban_ho_so_id),
        nguoi_gioi_thieu: nguoi(gioiThieu),
        nguoi_chot: nguoi(d.nguoi_chot_ho_so_id),
        nguoi_xac_minh: nguoi(d.nguoi_xac_minh_id),
        xac_minh_luc: iso(d.xac_minh_luc),
        hoa_hong:
          d.hoa_hong && hienHoaHong
            ? { id: d.hoa_hong.id, so_tien: Number(d.hoa_hong.so_tien), ty_le: d.hoa_hong.ty_le === null ? null : Number(d.hoa_hong.ty_le), trang_thai: d.hoa_hong.trang_thai, ky: d.hoa_hong.ky }
            : null,
        ...(vaiTro !== undefined ? { vai_tro_cua_toi: vaiTro } : {}),
        created_at: d.created_at.toISOString()
      };
    });
  }
}

/** Vi hoa hong: tong hop theo trang thai, danh sach, dieu chinh (qua de_xuat_duyet maker-checker), lich su duyet */
@Injectable()
export class HoaHongService {
  constructor(
    private readonly repo: HoaHongRepository,
    private readonly maRepo: MaGioiThieuRepository,
    private readonly hoSoRepo: HoSoMangLuoiRepository,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  async layVi(hoSoId: string): Promise<ViHoaHong> {
    const maIds = await this.maRepo.layIdsCuaHoSo(hoSoId);
    const [nhom, dieuChinh, dsDieuChinh, daChiTra, choXacMinh, vai] = await Promise.all([
      this.repo.tongTheoTrangThai(hoSoId),
      this.repo.tongDieuChinh(hoSoId),
      this.repo.layDieuChinhGon(hoSoId),
      // Dieu chinh da dua vao ky chi tra (de xuat CHI_TRA_HOA_HONG da duyet) -> khong cong lai vao tam tinh
      this.repo.layDeXuatChiTraDaDuyet(),
      this.repo.tongChoXacMinh(hoSoId, maIds),
      this.hoSoRepo.layVaiHoatDong(hoSoId)
    ]);
    const theo = (tt: TrangThaiHoaHong) => {
      const n = nhom.find(x => x.trang_thai === tt);
      return { so_tien: Number(n?._sum.so_tien ?? 0), so_dong: n?._count._all ?? 0 };
    };
    const duDieuKien = theo("DU_DIEU_KIEN");
    const dc = { so_tien: Number(dieuChinh._sum.so_tien ?? 0), so_dong: dieuChinh._count._all };
    const dcDaTra = new Set(
      daChiTra.flatMap(d => {
        const ids = (d.du_lieu as { dieu_chinh_ids?: unknown } | null)?.dieu_chinh_ids;
        return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
      })
    );
    const dcChuaTra = dsDieuChinh.filter(x => !x.de_xuat_chi_tra_id && !dcDaTra.has(x.id)).reduce((t, x) => t + Number(x.so_tien), 0);

    const vaiTinh = vai.filter(v => VAI_GIOI_THIEU.includes(v) || VAI_CHOT_DON.includes(v));
    const bayGio = new Date();
    const tyLe = vaiTinh.length ? await this.repo.layTyLeHieuLuc(vaiTinh, bayGio) : [];
    // Moi (vai, mau) lay dong moi nhat
    const daCo = new Set<string>();
    const tyLeApDung: ViHoaHong["ty_le_ap_dung"] = [];
    for (const t of tyLe) {
      const k = `${t.vai}|${t.mau_id ?? ""}`;
      if (daCo.has(k)) continue;
      daCo.add(k);
      tyLeApDung.push({ vai: t.vai, ty_le: Number(t.ty_le), ma_mau: t.ma_mau });
    }

    return {
      du_dieu_kien: duDieuKien,
      cho_doi_soat: theo("CHO_DOI_SOAT"),
      cho_xac_minh: { so_don: choXacMinh._count._all, tong_tien: Number(choXacMinh._sum.tong_tien ?? 0) },
      bi_tru: theo("BI_TRU"),
      da_tra: theo("DA_TRA"),
      dieu_chinh: dc,
      // Tam tinh = khoan du dieu kien chua tra + dieu chinh chua dua vao ky chi tra nao
      tam_tinh: duDieuKien.so_tien + dcChuaTra,
      ty_le_ap_dung: tyLeApDung
    };
  }

  async danhSach(hoSoId: string, q: { trang_thai?: TrangThaiHoaHong; ky?: string; skip: number; take: number }): Promise<{ ds: HoaHongDongMl[]; tong: number }> {
    const { ds, tong } = await this.repo.danhSach(hoSoId, q);
    return {
      tong,
      ds: ds.map(h => ({
        id: h.id,
        so_tien: Number(h.so_tien),
        ty_le: h.ty_le === null ? null : Number(h.ty_le),
        trang_thai: h.trang_thai,
        ky: h.ky,
        tra_luc: iso(h.tra_luc),
        don: {
          id: h.ghi_nhan_don.crm_don_id,
          ma_don: h.ghi_nhan_don.ma_don,
          tong_tien: Number(h.ghi_nhan_don.tong_tien),
          nguon: h.ghi_nhan_don.nguon,
          ma_gioi_thieu: h.ghi_nhan_don.ma_gioi_thieu,
          trang_thai_ghi_nhan: h.ghi_nhan_don.trang_thai
        },
        created_at: h.created_at.toISOString(),
        updated_at: h.updated_at.toISOString()
      }))
    };
  }

  async dieuChinhCuaToi(hoSoId: string): Promise<DieuChinhHoaHongMl[]> {
    const ds = await this.repo.dieuChinhCuaHoSo(hoSoId);
    const ten = await this.hoSoRepo.layTenHoSo(ds.map(d => d.nguoi_tao_id));
    return ds.map(d => ({
      id: d.id,
      hoa_hong_id: d.hoa_hong_id,
      ma_don: d.hoa_hong?.ghi_nhan_don.ma_don ?? null,
      so_tien: Number(d.so_tien),
      ly_do: d.ly_do,
      ky: d.ky,
      de_xuat_duyet_id: d.de_xuat_duyet_id,
      nguoi_tao: d.nguoi_tao_id ? (ten.get(d.nguoi_tao_id) ?? null) : null,
      created_at: d.created_at.toISOString()
    }));
  }

  /** Lich su duyet lien quan toi toi: xac minh don + de xuat dieu chinh / chi tra / chuyen vai */
  async lichSuDuyet(hoSoId: string): Promise<LichSuDuyetMl[]> {
    const maIds = await this.maRepo.layIdsCuaHoSo(hoSoId);
    const [xacMinh, deXuat] = await Promise.all([this.repo.ghiNhanDaXacMinh(hoSoId, maIds), this.repo.deXuatVeHoSo(hoSoId, LOAI_LICH_SU)]);
    const ten = await this.hoSoRepo.layTenHoSo([...xacMinh.map(x => x.nguoi_xac_minh_id), ...deXuat.flatMap(d => [d.nguoi_duyet_id, d.nguoi_kiem_id])]);
    const ds: LichSuDuyetMl[] = [
      ...xacMinh.map(x => ({
        id: x.id,
        loai: "XAC_MINH_DON" as const,
        tieu_de: `Xác minh người bán đơn ${x.ma_don}`,
        trang_thai: x.nguoi_ban_ho_so_id === hoSoId ? "Ghi nhận cho bạn" : x.trang_thai === "BI_HUY" ? "Đơn không tính" : "Ghi nhận cho người khác",
        nguoi_quyet_dinh: x.nguoi_xac_minh_id ? (ten.get(x.nguoi_xac_minh_id) ?? null) : null,
        y_kien: x.ly_do,
        luc: (x.xac_minh_luc ?? x.updated_at).toISOString()
      })),
      ...deXuat.map(d => {
        const duLieu = (d.du_lieu ?? {}) as { so_tien?: number; vai?: string };
        const tieuDe =
          d.loai === "DIEU_CHINH_HOA_HONG"
            ? `Điều chỉnh hoa hồng ${typeof duLieu.so_tien === "number" ? `${duLieu.so_tien > 0 ? "+" : ""}${duLieu.so_tien.toLocaleString("vi-VN")}đ` : ""}`.trim()
            : d.loai === "CHI_TRA_HOA_HONG"
              ? "Chi trả hoa hồng"
              : `Đề xuất chuyển vai${duLieu.vai ? ` sang ${duLieu.vai}` : ""}`;
        const nguoi = d.nguoi_duyet_id ?? d.nguoi_kiem_id;
        return {
          id: d.id,
          loai: d.loai as LichSuDuyetMl["loai"],
          tieu_de: tieuDe,
          trang_thai: NHAN_DE_XUAT[d.trang_thai] ?? d.trang_thai,
          nguoi_quyet_dinh: nguoi ? (ten.get(nguoi) ?? null) : null,
          y_kien: d.y_kien_duyet ?? d.y_kien_kiem ?? d.ly_do,
          luc: (d.duyet_luc ?? d.kiem_luc ?? d.created_at).toISOString()
        };
      })
    ];
    return ds.sort((a, b) => b.luc.localeCompare(a.luc));
  }

  // ---------------------------------------------------------------- dieu chinh (maker-checker)

  /** QUAN_LY lap de xuat dieu chinh (+/-) — duyet o ban phe duyet (nguoi kiem, nguoi duyet khac nguoi de xuat) */
  async deXuatDieuChinh(nd: ThongTinNguoiDung, body: { ho_so_id: string; so_tien: number; ly_do: string; ky?: string; hoa_hong_id?: string }) {
    if (body.ho_so_id === nd.id) throw new ForbiddenException("Không tự đề xuất điều chỉnh hoa hồng cho chính mình");
    if (!Number.isInteger(body.so_tien) || body.so_tien === 0) throw new BadRequestException("Số tiền điều chỉnh phải là số nguyên khác 0 (đồng)");
    const hs = await this.hoSoRepo.timCoBan(body.ho_so_id);
    if (!hs) throw new NotFoundException("Không tìm thấy hồ sơ");
    if (body.hoa_hong_id) {
      const hh = await this.repo.timChuHoaHong(body.hoa_hong_id);
      if (!hh || hh.ho_so_id !== body.ho_so_id) throw new BadRequestException("Khoản hoa hồng không thuộc hồ sơ này");
    }
    const ky = body.ky ?? kyDoiSoat(new Date());
    const dx = await this.repo.chayTrongGiaoDich(async tx => {
      const dx = await this.repo.taoDeXuatDieuChinh(
        body.ho_so_id,
        { ho_so_id: body.ho_so_id, ho_ten: hs.ho_ten, so_tien: body.so_tien, ky, hoa_hong_id: body.hoa_hong_id ?? null, ly_do: body.ly_do },
        body.ly_do,
        nd.id,
        tx
      );
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "DE_XUAT_DIEU_CHINH_HOA_HONG", doiTuong: "de_xuat_duyet", doiTuongId: dx.id, duLieu: { ho_so_id: body.ho_so_id, so_tien: body.so_tien, ky } }, tx);
      return dx;
    });
    return { id: dx.id, trang_thai: dx.trang_thai };
  }

  /** De xuat dieu chinh DA_DUYET chua ap dung (de quan ly bam ap dung) */
  async deXuatChoApDung() {
    const ds = await this.repo.layDeXuatDieuChinhDaDuyet();
    if (!ds.length) return [];
    const daApDung = await this.repo.layDeXuatDaApDung(ds.map(d => d.id));
    return ds
      .filter(d => !daApDung.has(d.id))
      .map(d => ({ id: d.id, du_lieu: d.du_lieu, ly_do: d.ly_do, duyet_luc: iso(d.duyet_luc), created_at: d.created_at.toISOString() }));
  }

  /**
   * Ap dung de xuat DA_DUYET -> ghi dieu_chinh_hoa_hong (idempotent: moi de xuat toi da mot dong).
   * Serializable de hai lan bam cung luc khong ghi hai dong.
   */
  async apDungDieuChinh(nguoiThucHien: string | null, deXuatId: string): Promise<DieuChinhHoaHongMl> {
    const dx = await this.repo.timDeXuat(deXuatId);
    if (!dx || dx.loai !== "DIEU_CHINH_HOA_HONG") throw new NotFoundException("Không tìm thấy đề xuất điều chỉnh hoa hồng");
    if (dx.trang_thai !== "DA_DUYET") throw new ConflictException("Đề xuất chưa được duyệt");
    const d = (dx.du_lieu ?? {}) as { ho_so_id?: string; so_tien?: number; ky?: string; hoa_hong_id?: string | null; ly_do?: string };
    if (!d.ho_so_id || typeof d.so_tien !== "number" || !d.so_tien) throw new BadRequestException("Dữ liệu đề xuất không hợp lệ");

    const dc = await this.repo
      .chayTrongGiaoDich(
        async tx => {
          const daCo = await this.repo.timDieuChinhTheoDeXuat(dx.id, tx);
          if (daCo) throw new ConflictException("Đề xuất này đã được áp dụng");
          const dc = await this.repo.taoDieuChinh(
            {
              hoa_hong_id: d.hoa_hong_id ?? null,
              ho_so_id: d.ho_so_id!,
              so_tien: new Prisma.Decimal(Math.round(d.so_tien!)),
              ly_do: d.ly_do ?? dx.ly_do ?? "Điều chỉnh theo đề xuất đã duyệt",
              ky: d.ky ?? kyDoiSoat(new Date()),
              de_xuat_duyet_id: dx.id,
              nguoi_tao_id: dx.nguoi_de_xuat_id
            },
            tx
          );
          await this.nhatKy.ghi(
            { hoSoId: nguoiThucHien, hanhDong: "AP_DUNG_DIEU_CHINH_HOA_HONG", doiTuong: "dieu_chinh_hoa_hong", doiTuongId: dc.id, duLieu: { de_xuat_duyet_id: dx.id, so_tien: d.so_tien } },
            tx
          );
          return dc;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
      .catch(e => {
        // Unique dieu_chinh_hoa_hong.de_xuat_duyet_id: hai luong ap dung cung luc -> 409
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ConflictException("Đề xuất này đã được áp dụng");
        throw e;
      });
    try {
      await this.thongBao.gui({
        hoSoId: dc.ho_so_id,
        loai: "HOA_HONG",
        tieuDe: `Ví hoa hồng được điều chỉnh ${Number(dc.so_tien) > 0 ? "+" : ""}${Number(dc.so_tien).toLocaleString("vi-VN")}đ`,
        noiDung: dc.ly_do,
        lienKet: "/lam-viec/mang-luoi/thu-nhap"
      });
    } catch {
      // bo qua
    }
    return {
      id: dc.id,
      hoa_hong_id: dc.hoa_hong_id,
      ma_don: null,
      so_tien: Number(dc.so_tien),
      ly_do: dc.ly_do,
      ky: dc.ky,
      de_xuat_duyet_id: dc.de_xuat_duyet_id,
      nguoi_tao: null,
      created_at: dc.created_at.toISOString()
    };
  }
}
