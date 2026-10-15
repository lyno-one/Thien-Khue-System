// Quyen ban theo SKU (export cho module khac). Lop: QuyenSkuService.
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type TrangThaiQuyenSku } from "@prisma/client";
import type { BangChungQuyenSku, KetQuaKiemQuyenSku, KetQuaTangPhienBan, QuyenSkuCuaToi, YeuCauHocLai } from "@thien-khue/contracts";
import { anhXaQuyenSku, docBangChung, laUuid, yeuCauHocLai } from "../common/utils/dao-tao";
import { QuyenSkuRepository } from "../repositories/dao-tao.repository";
import { NhatKyService, ThongBaoService } from "./core.service";

/** Hanh dong voi san pham can quyen SKU */
export type HanhDongSku = "TU_VAN" | "LAY_MA_GIOI_THIEU" | "NHAN_CHIEN_DICH" | "BAN";

/** Ket qua kiem quyen (camelCase cho module khac dung trong service) */
export interface KetQuaKiemSku {
  duoc: boolean;
  /** Cau tieng Viet giai thich vi sao bi chan; null khi duoc */
  lyDo: string | null;
  trangThai: TrangThaiQuyenSku | null;
  mauId: string | null;
  maMau: string | null;
}

const MO_TA: Record<HanhDongSku, string> = {
  TU_VAN: "tư vấn",
  LAY_MA_GIOI_THIEU: "lấy mã giới thiệu",
  NHAN_CHIEN_DICH: "nhận chiến dịch",
  BAN: "bán"
};

/**
 * Quyen ban theo SKU (KIEN-TRUC muc 5). Module khac: imports: [DaoTaoModule] roi inject QuyenSkuService
 * (hoac dung QuyenSkuGuard + @CanQuyenSku(...)).
 *
 *   const kq = await quyenSku.kiem(hoSoId, mauIdHoacMa);           // { duoc, lyDo, ... } — khong nem loi
 *   await quyenSku.kiem(hoSoId, mauIdHoacMa, "BAN");               // nem 403 neu chua duoc (giu cach goi ban nen)
 *   await quyenSku.batBuoc(hoSoId, mauIdHoacMa, "TU_VAN");         // nhu tren, ro nghia hon
 *
 * Chi trang_thai HOAT_DONG moi duoc. CAN_HOC_LAI (tai lieu san pham vua doi) va THU_HOI deu bi chan.
 * Service chi kiem theo ho so — bo qua cho ADMIN / THIEN_KHUE (neu can) la viec cua noi goi / QuyenSkuGuard.
 */
@Injectable()
export class QuyenSkuService {
  constructor(
    private readonly repo: QuyenSkuRepository,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  /** Kiem quyen. Truyen hanhDong -> nem 403 khi khong duoc (nhu ban nen); khong truyen -> chi tra ket qua. */
  async kiem(hoSoId: string, mauIdHoacMa: string, hanhDong?: HanhDongSku): Promise<KetQuaKiemSku> {
    const kq = await this.xet(hoSoId, mauIdHoacMa, hanhDong);
    if (!kq.duoc && hanhDong) throw new ForbiddenException(kq.lyDo);
    return kq;
  }

  /** Nem 403 neu chua co quyen — goi truoc moi thao tac voi san pham */
  async batBuoc(hoSoId: string, mauIdHoacMa: string, hanhDong: HanhDongSku): Promise<void> {
    await this.kiem(hoSoId, mauIdHoacMa, hanhDong);
  }

  private async xet(hoSoId: string, mauIdHoacMa: string, hanhDong?: HanhDongSku): Promise<KetQuaKiemSku> {
    const viec = hanhDong ? MO_TA[hanhDong] : "thao tác với sản phẩm này";
    if (!mauIdHoacMa?.trim()) return { duoc: false, lyDo: "Thiếu mã sản phẩm", trangThai: null, mauId: null, maMau: null };
    const q = await this.repo.timTrangThai(hoSoId, mauIdHoacMa);
    const goc = { trangThai: q?.trang_thai ?? null, mauId: q?.mau_id ?? null, maMau: q?.ma_mau ?? null };
    if (q?.trang_thai === "HOAT_DONG") return { duoc: true, lyDo: null, ...goc };
    if (q?.trang_thai === "CAN_HOC_LAI") {
      return { duoc: false, lyDo: `Mã ${q.ma_mau} vừa cập nhật tài liệu — cần xác nhận / học lại trước khi ${viec}`, ...goc };
    }
    if (q?.trang_thai === "THU_HOI") return { duoc: false, lyDo: `Quyền bán mã ${q.ma_mau} đã bị thu hồi`, ...goc };
    return { duoc: false, lyDo: `Bạn chưa được cấp quyền sản phẩm này — hãy học và đạt khoá sản phẩm trước khi ${viec}`, ...goc };
  }

  /** Kiem nhieu mau mot lan: Map<mau_id | ma (nhu dau vao), duoc> */
  async kiemNhieu(hoSoId: string, mauIdHoacMa: string[]): Promise<Map<string, boolean>> {
    const ds = await this.repo.dsMauVaMaHoatDong(hoSoId);
    const ids = new Set(ds.map(d => d.mau_id));
    const mas = new Set(ds.map(d => d.ma_mau.toUpperCase()));
    return new Map(mauIdHoacMa.map(x => [x, laUuid(x.trim()) ? ids.has(x.trim()) : mas.has(x.trim().toUpperCase())]));
  }

  /** Co quyen HOAT_DONG voi mau nay khong (mau id hoac ma) */
  async coQuyen(hoSoId: string, mauIdHoacMa: string): Promise<boolean> {
    return (await this.xet(hoSoId, mauIdHoacMa)).duoc;
  }

  /** mau_id dang HOAT_DONG cua ho so */
  async layMauDuocPhep(hoSoId: string): Promise<string[]> {
    const ds = await this.repo.dsMauHoatDong(hoSoId);
    return ds.map(d => d.mau_id);
  }

  /** ma mau (vd "AL01") dang HOAT_DONG cua ho so */
  async layMaMauDuocPhep(hoSoId: string): Promise<string[]> {
    const ds = await this.repo.dsMaMauHoatDong(hoSoId);
    return ds.map(d => d.ma_mau);
  }

  /** Ho so dang co quyen HOAT_DONG voi mau (vd chia khach theo nang luc) */
  async layHoSoDuocPhep(mauId: string): Promise<string[]> {
    const ds = await this.repo.dsHoSoHoatDongTheoMau(mauId);
    return ds.map(d => d.ho_so_id);
  }

  // ---------------------------------------------------------------- dung cho controller dao-tao

  async kiemChoClient(hoSoId: string, mauIdHoacMa: string): Promise<KetQuaKiemQuyenSku> {
    const kq = await this.xet(hoSoId, mauIdHoacMa);
    return { duoc: kq.duoc, ly_do: kq.lyDo, mau_id: kq.mauId, ma_mau: kq.maMau, trang_thai: kq.trangThai };
  }

  async cuaToi(hoSoId: string): Promise<QuyenSkuCuaToi[]> {
    const ds = await this.repo.dsCuaHoSo(hoSoId);
    return ds.map(anhXaQuyenSku);
  }

  /**
   * Nguoi hoc xac nhan da doc thay doi tai lieu -> HOAT_DONG lai o phien ban moi.
   * Chi khi lan tang phien ban yeu cau XAC_NHAN; THI_LAI thi phai thi dat lai (XetDatService tu mo lai).
   */
  async xacNhanDocThayDoi(hoSoId: string, mauIdHoacMa: string): Promise<QuyenSkuCuaToi> {
    const q = await this.repo.timChiTiet(hoSoId, mauIdHoacMa);
    if (!q) throw new NotFoundException("Bạn chưa có quyền với mã sản phẩm này");
    if (q.trang_thai !== "CAN_HOC_LAI") throw new BadRequestException("Quyền mã này không cần xác nhận lại");
    const bc = docBangChung(q.bang_chung);
    if (yeuCauHocLai(bc, q.trang_thai) === "THI_LAI") {
      throw new BadRequestException(`Tài liệu mã ${q.ma_mau} thay đổi lớn — bạn cần làm lại bài kiểm tra sản phẩm`);
    }
    const phienBan = q.khoa_hoc?.phien_ban_tai_lieu ?? bc?.can_hoc_lai?.phien_ban_moi ?? q.phien_ban_tai_lieu;
    const bayGio = new Date();
    const bangMoi: BangChungQuyenSku | null = bc ? { ...bc, xac_nhan_luc: bayGio.toISOString(), can_hoc_lai: null } : null;

    return this.repo.chayTrongGiaoDich(async tx => {
      // Doi co dieu kien: chi doi khi van CAN_HOC_LAI (tranh ghi de khi vua bi thu hoi)
      const soDoi = await this.repo.kichHoatLaiNeuCanHocLai(
        q.id,
        {
          trang_thai: "HOAT_DONG",
          phien_ban_tai_lieu: phienBan,
          ly_do: null,
          bang_chung: bangMoi ? (bangMoi as unknown as Prisma.InputJsonValue) : Prisma.DbNull
        },
        tx
      );
      if (!soDoi) throw new BadRequestException("Quyền mã này vừa thay đổi — tải lại trang");
      await this.nhatKy.ghi(
        { hoSoId, hanhDong: "XAC_NHAN_DOC_THAY_DOI_SKU", doiTuong: "quyen_sku", doiTuongId: q.id, duLieu: { ma_mau: q.ma_mau, phien_ban_tai_lieu: phienBan } },
        tx
      );
      const moi = await this.repo.layChiTiet(q.id, tx);
      return anhXaQuyenSku(moi);
    });
  }

  /**
   * Tang phien_ban_tai_lieu khoa SAN_PHAM -> moi quyen SKU cua mau chuyen CAN_HOC_LAI + thong bao.
   * Goi tu quan tri noi dung (QUAN_LY / ADMIN / THIEN_KHUE).
   */
  async tangPhienBan(nguoiDoiId: string, khoaHocId: string, lyDo: string, yeuCau: YeuCauHocLai = "XAC_NHAN"): Promise<KetQuaTangPhienBan> {
    const khoa = await this.repo.timKhoa(khoaHocId);
    if (!khoa) throw new NotFoundException("Không tìm thấy khoá học");
    if (khoa.loai !== "SAN_PHAM" || !khoa.mau_id) throw new BadRequestException("Chỉ khoá sản phẩm (gắn mã SKU) mới tăng phiên bản tài liệu");
    const mauId = khoa.mau_id;

    return this.repo.chayTrongGiaoDich(async tx => {
      const k = await this.repo.tangPhienBanKhoa(khoa.id, tx);
      const bayGio = new Date();
      const ds = await this.repo.dsConHieuLucTheoMau(mauId, tx);
      for (const q of ds) {
        const bc = docBangChung(q.bang_chung);
        const canHocLai = { phien_ban_moi: k.phien_ban_tai_lieu, yeu_cau: yeuCau, ly_do: lyDo, luc: bayGio.toISOString() };
        await this.repo.sua(
          q.id,
          {
            trang_thai: "CAN_HOC_LAI",
            ly_do: `Tài liệu cập nhật lên phiên bản ${k.phien_ban_tai_lieu}: ${lyDo}`,
            bang_chung: { ...(bc ?? {}), can_hoc_lai: canHocLai } as unknown as Prisma.InputJsonValue
          },
          tx
        );
      }
      await this.thongBao.guiNhieu(
        ds.map(q => q.ho_so_id),
        {
          loai: "QUYEN_SKU",
          tieuDe: `Mã ${khoa.ma_mau} vừa cập nhật thông tin quan trọng`,
          noiDung:
            yeuCau === "THI_LAI"
              ? `${lyDo}. Bạn cần học và làm lại bài kiểm tra trước khi tiếp tục bán mã ${khoa.ma_mau}.`
              : `${lyDo}. Hãy đọc lại tài liệu và xác nhận trước khi tiếp tục bán mã ${khoa.ma_mau}.`,
          lienKet: `/hoc-vien/khoa-hoc/${khoa.id}`,
          duLieu: { khoa_hoc_id: khoa.id, mau_id: mauId, ma_mau: khoa.ma_mau, phien_ban_tai_lieu: k.phien_ban_tai_lieu, yeu_cau: yeuCau }
        },
        tx
      );
      await this.nhatKy.ghi(
        {
          hoSoId: nguoiDoiId,
          hanhDong: "TANG_PHIEN_BAN_TAI_LIEU",
          doiTuong: "khoa_hoc",
          doiTuongId: khoa.id,
          duLieu: { phien_ban_tai_lieu: k.phien_ban_tai_lieu, ly_do: lyDo, yeu_cau: yeuCau, so_quyen_can_hoc_lai: ds.length }
        },
        tx
      );
      return { khoa_hoc_id: khoa.id, phien_ban_tai_lieu: k.phien_ban_tai_lieu, so_quyen_can_hoc_lai: ds.length };
    });
  }
}
