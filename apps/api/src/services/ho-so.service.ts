// Ho so cua toi, xac minh SDT. Lop: HoSoService, XacMinhSdtService.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { HoSoCuaToi, HoSoTheoSdt } from "@thien-khue/contracts";
import { chuanHoaSdt, laSdtHopLe } from "../infrastructure/crm/chuan-hoa-sdt";
import { NhatKyService, ThongBaoService } from "./core.service";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import type { CapNhatHoSoDto, HuyXacMinhSdtDto, XacMinhSdtDto } from "../dto/ho-so/ho-so.dto";
import { anEmail } from "../common/utils/ho-so";
import { HoSoRepository, XacMinhSdtRepository } from "../repositories/ho-so.repository";

/**
 * Ho so cua chinh minh (KIEN-TRUC muc 4). Danh tinh luon tu token (@NguoiDung()).
 * Khong tu tao tai khoan / tu dang ky vai: tai khoan + vai do admin tao trong CRM.
 */
@Injectable()
export class HoSoService {
  constructor(
    private readonly repo: HoSoRepository,
    private readonly nhatKy: NhatKyService
  ) {}

  // ---------------------------------------------------------------- GET /toi

  /** Doc lai tu DB (khong dung nd.hoSo / nd.vai) de phan anh ngay thay doi vua ghi trong cung request */
  async layCuaToi(nd: Pick<ThongTinNguoiDung, "id" | "email">): Promise<HoSoCuaToi> {
    const [hoSo, quyen] = await Promise.all([this.repo.layHoSoCuaToi(nd.id), this.repo.dsQuyenSku(nd.id)]);
    if (!hoSo) throw new NotFoundException("Không tìm thấy hồ sơ");
    return {
      id: hoSo.id,
      email: nd.email ?? hoSo.email,
      ho_so: {
        id: hoSo.id,
        ho_ten: hoSo.ho_ten,
        email: hoSo.email,
        sdt: hoSo.sdt,
        crm_user_id: hoSo.crm_user_id,
        kich_hoat_lam_viec: hoSo.kich_hoat_lam_viec
      },
      vai: hoSo.vai_tro.filter(v => v.trang_thai === "HOAT_DONG").map(v => v.vai),
      vai_chi_tiet: hoSo.vai_tro.map(v => ({
        vai: v.vai,
        trang_thai: v.trang_thai,
        tu_luc: v.tu_luc.toISOString(),
        den_luc: v.den_luc ? v.den_luc.toISOString() : null
      })),
      chi_tiet: {
        anh_dai_dien: hoSo.anh_dai_dien,
        kich_hoat_luc: hoSo.kich_hoat_luc ? hoSo.kich_hoat_luc.toISOString() : null,
        sdt_xac_minh_luc: hoSo.sdt_xac_minh_luc ? hoSo.sdt_xac_minh_luc.toISOString() : null,
        created_at: hoSo.created_at.toISOString()
      },
      quyen_sku: {
        hoat_dong: quyen.filter(q => q.trang_thai === "HOAT_DONG").length,
        can_hoc_lai: quyen.filter(q => q.trang_thai === "CAN_HOC_LAI").length,
        thu_hoi: quyen.filter(q => q.trang_thai === "THU_HOI").length,
        ds: quyen.map(q => ({ mau_id: q.mau_id, ma_mau: q.ma_mau, trang_thai: q.trang_thai, cap_luc: q.cap_luc.toISOString() }))
      }
    };
  }

  // ---------------------------------------------------------------- PATCH /toi

  /**
   * Sua ho so cua minh: ho ten, SDT (chan trung voi ho so khac da xac minh), anh dai dien. Email doi qua Supabase Auth.
   * Doi SDT (khac so chuan cu) -> XOA xac minh: so moi chua duoc noi voi du lieu khach CRM (LOI-CAN-SUA muc 1, 3).
   * Trigger DB ho_so_xoa_xac_minh_khi_doi_sdt chan them moi duong ghi khac.
   */
  async capNhatCuaToi(nd: ThongTinNguoiDung, dto: CapNhatHoSoDto): Promise<void> {
    const data: Prisma.ho_soUpdateInput = {};
    if (dto.ho_ten !== undefined) data.ho_ten = dto.ho_ten;
    if (dto.anh_dai_dien !== undefined) data.anh_dai_dien = dto.anh_dai_dien || null;
    let boXacMinh = false;
    if (dto.sdt !== undefined) {
      const chuan = dto.sdt ? this.chuanHoaSdtHopLe(dto.sdt) : null;
      if (chuan) await this.kiemTrungSdt(chuan, nd.id);
      const cu = await this.repo.laySdtHienTai(nd.id);
      data.sdt = dto.sdt || null;
      data.sdt_chuan = chuan;
      if (chuan !== (cu?.sdt_chuan ?? null)) {
        data.sdt_xac_minh_luc = null;
        data.sdt_xac_minh_boi_id = null;
        boXacMinh = !!cu?.sdt_xac_minh_luc;
      }
    }
    if (!Object.keys(data).length) throw new BadRequestException("Không có thông tin nào để cập nhật");
    await this.repo.chayTrongGiaoDich(async tx => {
      await this.repo.capNhat(nd.id, data, tx);
      await this.nhatKy.ghi(
        {
          hoSoId: nd.id,
          hanhDong: "SUA_HO_SO",
          doiTuong: "ho_so",
          doiTuongId: nd.id,
          duLieu: { truong: Object.keys(data), ...(boXacMinh ? { bo_xac_minh_sdt: true } : {}) }
        },
        tx
      );
    });
  }

  // ---------------------------------------------------------------- tien ich

  private chuanHoaSdtHopLe(sdt: string): string {
    if (!laSdtHopLe(sdt)) throw new BadRequestException("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)");
    return chuanHoaSdt(sdt);
  }

  /**
   * SDT chuan da XAC MINH cho ho so khac -> 409. Ho so khac chi tu khai (chua xac minh) thi khong chan:
   * neu khong, ai do khai truoc SDT cua khach that se chiem mat so, khach that khong dang ky / xac minh duoc.
   */
  private async kiemTrungSdt(sdtChuan: string, boQuaHoSoId: string | null): Promise<void> {
    const trung = await this.repo.timHoSoDaXacMinhSdt(sdtChuan, boQuaHoSoId);
    if (trung) throw new ConflictException("Số điện thoại đã được đăng ký cho tài khoản khác");
  }
}

/*
 * Xac minh SDT ho so (LOI-CAN-SUA muc 1, 3). SDT do nguoi dung tu khai -> chua duoc coi la SDT mua hang
 * cho toi khi xac minh (ho_so.sdt_xac_minh_luc). Hien chua co SMS / OTP: CSKH / Quan ly goi vao so do,
 * nguoi nghe xac nhan dung la chu tai khoan thi bam xac minh.
 * Sau nay gan OTP: goi apXacMinh(..., { cach: "OTP", nguoiXacMinhId: null }) sau khi verifyOtp thanh cong.
 */

export type CachXacMinhSdt = "NHAN_VIEN" | "OTP";
@Injectable()
export class XacMinhSdtService {
  constructor(
    private readonly repo: XacMinhSdtRepository,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  private chuanHoa(sdt: string): string {
    const chuan = chuanHoaSdt(sdt);
    if (!laSdtHopLe(chuan)) throw new BadRequestException("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)");
    return chuan;
  }

  /** Ho so dang khai SDT nay (CSKH / Quan ly tim de goi xac nhan). Email che bot. */
  async timTheoSdt(sdt: string): Promise<HoSoTheoSdt[]> {
    const chuan = this.chuanHoa(sdt);
    const ds = await this.repo.dsHoSoTheoSdt(chuan);
    return ds.map(h => ({
      id: h.id,
      ho_ten: h.ho_ten,
      email_an: anEmail(h.email),
      sdt: h.sdt,
      sdt_chuan: h.sdt_chuan,
      sdt_xac_minh_luc: h.sdt_xac_minh_luc ? h.sdt_xac_minh_luc.toISOString() : null,
      created_at: h.created_at.toISOString(),
      vai: h.vai_tro.filter(v => v.trang_thai === "HOAT_DONG").map(v => v.vai)
    }));
  }

  /**
   * Nhan vien xac minh SDT cua ho so KHAC (sau khi goi vao so do). Phai gui lai dung SDT da goi:
   * neu chu ho so vua doi so thi tu choi (khong xac minh nham so moi chua goi).
   */
  async xacMinhBoiNhanVien(nd: ThongTinNguoiDung, hoSoId: string, dto: XacMinhSdtDto): Promise<void> {
    if (hoSoId === nd.id) throw new ForbiddenException("Không tự xác minh số điện thoại của chính mình — nhờ CSKH / Quản lý khác");
    await this.apXacMinh(hoSoId, this.chuanHoa(dto.sdt), { cach: "NHAN_VIEN", nguoiXacMinhId: nd.id, ghiChu: dto.ghi_chu });
  }

  /** Ghi xac minh — dung chung cho xac minh tay va OTP sau nay */
  async apXacMinh(hoSoId: string, sdtChuan: string, opt: { cach: CachXacMinhSdt; nguoiXacMinhId: string | null; ghiChu?: string | null }): Promise<void> {
    const hs = await this.repo.layTrangThaiSdt(hoSoId);
    if (!hs) throw new NotFoundException("Không tìm thấy hồ sơ");
    if (!hs.sdt_chuan) throw new BadRequestException("Hồ sơ chưa khai số điện thoại");
    if (hs.sdt_chuan !== sdtChuan) throw new ConflictException("Số điện thoại trên hồ sơ không khớp số vừa xác nhận (có thể vừa đổi) — tải lại và gọi xác nhận số hiện tại");
    if (hs.sdt_xac_minh_luc) throw new ConflictException("Số điện thoại của hồ sơ này đã được xác minh");
    const daCoChu = await this.repo.timChuDaXacMinh(sdtChuan, hoSoId);
    if (daCoChu) throw new ConflictException("Số này đã được xác minh cho tài khoản khác — cần Quản lý huỷ xác minh cũ trước");

    const luc = new Date();
    try {
      await this.repo.chayTrongGiaoDich(async tx => {
        // Dieu kien trong WHERE: chong doi SDT / xac minh dong thoi giua luc doc va luc ghi
        const soDong = await this.repo.ghiXacMinhCoDieuKien(hoSoId, sdtChuan, luc, opt.nguoiXacMinhId, tx);
        if (soDong !== 1) throw new ConflictException("Hồ sơ vừa thay đổi — tải lại rồi thử lại");
        await this.nhatKy.ghi(
          {
            hoSoId: opt.nguoiXacMinhId,
            hanhDong: "XAC_MINH_SDT",
            doiTuong: "ho_so",
            doiTuongId: hoSoId,
            duLieu: { sdt_chuan: sdtChuan, cach: opt.cach, ghi_chu: opt.ghiChu ?? null }
          },
          tx
        );
        await this.thongBao.gui(
          {
            hoSoId,
            loai: "HE_THONG",
            tieuDe: "Số điện thoại đã được xác minh",
            noiDung: "Bạn đã xem được hạng thành viên, đơn hàng và ưu đãi theo số điện thoại này.",
            lienKet: "/thanh-vien"
          },
          tx
        );
      });
    } catch (e) {
      // Unique mot phan ho_so(sdt_chuan) WHERE da xac minh: hai ho so cung so xac minh dong thoi
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
        throw new ConflictException("Số này đã được xác minh cho tài khoản khác");
      throw e;
    }
  }

  /** Quan ly huy xac minh (xac minh nham / so da doi chu) — ghi ly do */
  async huyXacMinh(nd: ThongTinNguoiDung, hoSoId: string, dto: HuyXacMinhSdtDto): Promise<void> {
    const hs = await this.repo.layThongTinXacMinh(hoSoId);
    if (!hs) throw new NotFoundException("Không tìm thấy hồ sơ");
    if (!hs.sdt_xac_minh_luc) throw new ConflictException("Số điện thoại của hồ sơ này chưa được xác minh");
    await this.repo.chayTrongGiaoDich(async tx => {
      await this.repo.xoaXacMinh(hoSoId, tx);
      await this.nhatKy.ghi(
        {
          hoSoId: nd.id,
          hanhDong: "HUY_XAC_MINH_SDT",
          doiTuong: "ho_so",
          doiTuongId: hoSoId,
          duLieu: {
            sdt_chuan: hs.sdt_chuan,
            xac_minh_luc: hs.sdt_xac_minh_luc?.toISOString() ?? null,
            xac_minh_boi_id: hs.sdt_xac_minh_boi_id,
            ly_do: dto.ly_do
          }
        },
        tx
      );
    });
  }
}
