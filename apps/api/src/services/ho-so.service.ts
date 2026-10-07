// Ho so cua toi, dang ky, xac minh SDT. Lop: HoSoService, XacMinhSdtService.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { Prisma, type Vai } from "@prisma/client";
import type { DangKyKetQua, HoSoCuaToi, HoSoTheoSdt } from "@thien-khue/contracts";
import { chuanHoaSdt, laSdtHopLe } from "../infrastructure/crm/chuan-hoa-sdt";
import { NhatKyService, ThongBaoService } from "./core.service";
import { SupabaseAdminService } from "../infrastructure/supabase/supabase-admin.service";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import type { CapNhatHoSoDto, DangKyDto, DangKyThemVaiDto, HuyXacMinhSdtDto, XacMinhSdtDto } from "../dto/ho-so/ho-so.dto";
import { anEmail, GioiHanTanSuat, laVaiPhaiHoc, trangThaiKhoiTao, VAI_DANG_KY } from "../common/utils/ho-so";
import { NHAN_VAI_VN } from "../constants/ho-so.constants";
import { HoSoRepository, VaiRepository, XacMinhSdtRepository } from "../repositories/ho-so.repository";
import { canXetTtsLenCtv, VaiService } from "./ho-so-vai.service";

const MOT_GIO = 60 * 60 * 1000;
/** Ghep hinh thuc + ghi chu dang ky thanh mot dong ghi chu ho so */
function ghiChuDangKy(vai: Vai, hinhThuc?: string, ghiChu?: string): string | null {
  const phan = [hinhThuc ? `Hình thức: ${hinhThuc}` : null, ghiChu ? `Ghi chú: ${ghiChu}` : null].filter(Boolean);
  return phan.length ? `[Đăng ký ${NHAN_VAI_VN[vai]}] ${phan.join(" · ")}` : null;
}
/**
 * Ho so cua chinh minh + dang ky (KIEN-TRUC muc 4). Danh tinh luon tu token (@NguoiDung()).
 */
@Injectable()
export class HoSoService {
  private readonly logger = new Logger("HoSo");
  /** 5 lan dang ky / IP / 15 phut; 3 lan / email / gio */
  private readonly gioiHanIp = new GioiHanTanSuat(5, 15 * 60 * 1000);
  private readonly gioiHanEmail = new GioiHanTanSuat(3, MOT_GIO);

  constructor(
    private readonly repo: HoSoRepository,
    private readonly vaiRepo: VaiRepository,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService,
    // TTS hoc dat khoa CTV -> tu them vai CTV ngay khi tai ho so (thieu, vd test cu: bo qua)
    @Optional() private readonly vaiSv?: VaiService
  ) {}

  // ---------------------------------------------------------------- GET /toi

  /** Doc lai tu DB (khong dung nd.hoSo / nd.vai) de phan anh ngay thay doi vua ghi trong cung request */
  async layCuaToi(nd: Pick<ThongTinNguoiDung, "id" | "email">): Promise<HoSoCuaToi> {
    let [hoSo, quyen] = await Promise.all([this.repo.layHoSoCuaToi(nd.id), this.repo.dsQuyenSku(nd.id)]);
    if (!hoSo) throw new NotFoundException("Không tìm thấy hồ sơ");
    // Thuc tap sinh vua hoc dat khoa CTV: he thong tu them vai CTV (khong qua de xuat) roi doc lai
    if (this.vaiSv && canXetTtsLenCtv(hoSo.vai_tro) && (await this.vaiSv.xetTtsLenCtvAnToan(nd.id))) {
      [hoSo, quyen] = await Promise.all([this.repo.layHoSoCuaToi(nd.id), this.repo.dsQuyenSku(nd.id)]);
      if (!hoSo) throw new NotFoundException("Không tìm thấy hồ sơ");
    }
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

  // ---------------------------------------------------------------- POST /dang-ky (cong khai)

  /**
   * Dang ky CTV / thuc tap sinh / KOL / KOC / khach: tao user Supabase Auth (service-role) + ho_so + vai.
   * Vai phai hoc -> DANG_HOC (chua kich hoat lam viec); KHACH -> HOAT_DONG. Chan trung email / SDT.
   */
  async dangKy(dto: DangKyDto, ip: string | null, daDangNhap: ThongTinNguoiDung | undefined): Promise<DangKyKetQua> {
    if (daDangNhap) throw new BadRequestException("Bạn đã có tài khoản — đăng ký thêm vai trò trong trang Tài khoản");
    if (!VAI_DANG_KY.includes(dto.vai)) throw new BadRequestException("Vai trò đăng ký không hợp lệ");
    const email = dto.email.trim().toLowerCase();
    this.gioiHanIp.kiem(`ip:${ip ?? "khong-ro"}`);
    this.gioiHanEmail.kiem(`email:${email}`);

    const sdtChuan = this.chuanHoaSdtHopLe(dto.sdt);
    const trungEmail = await this.repo.timTheoEmail(email);
    if (trungEmail) throw new ConflictException("Email đã được đăng ký — hãy đăng nhập");
    await this.kiemTrungSdt(sdtChuan, null);

    const user = await this.supabaseAdmin.taoNguoiDung({ email, matKhau: dto.mat_khau, hoTen: dto.ho_ten, sdt: sdtChuan });
    const trangThai = trangThaiKhoiTao(dto.vai);
    try {
      await this.repo.chayTrongGiaoDich(async tx => {
        await this.repo.taoHoSo(
          {
            id: user.id,
            ho_ten: dto.ho_ten,
            email,
            sdt: dto.sdt,
            sdt_chuan: sdtChuan,
            // SDT tu khai luc dang ky CHUA xac minh (sdt_xac_minh_luc mac dinh null) — chua noi voi du lieu khach CRM
            ghi_chu: ghiChuDangKy(dto.vai, dto.hinh_thuc, dto.ghi_chu)
          },
          tx
        );
        await this.vaiRepo.ghiDoiVai(
          {
            hoSoId: user.id,
            vai: dto.vai,
            cu: null,
            moi: trangThai,
            nguoiDoiId: null,
            lyDo: `Tự đăng ký ${NHAN_VAI_VN[dto.vai]}`,
            nguon: "DANG_KY"
          },
          tx
        );
        await this.nhatKy.ghi(
          {
            hoSoId: null,
            hanhDong: "DANG_KY",
            doiTuong: "ho_so",
            doiTuongId: user.id,
            duLieu: { vai: dto.vai, trang_thai: trangThai, hinh_thuc: dto.hinh_thuc ?? null },
            ip
          },
          tx
        );
        if (laVaiPhaiHoc(dto.vai)) {
          await this.thongBao.gui(
            {
              hoSoId: user.id,
              loai: "DAO_TAO",
              tieuDe: "Chào mừng bạn đến Học viện Thiên Khuê S",
              noiDung: `Hoàn thành khoá học và đạt bài kiểm tra (≥ 90%) để kích hoạt vai trò ${NHAN_VAI_VN[dto.vai]}.`,
              lienKet: "/hoc-vien"
            },
            tx
          );
        }
      });
    } catch (e) {
      // Hoan tac user Auth de nguoi dung dang ky lai duoc — tru khi ho so da duoc tao (vd JwtGuard tao khi dang nhap song song)
      const daCo = await this.repo.timTheoId(user.id).catch(() => null);
      if (!daCo) await this.supabaseAdmin.xoaNguoiDung(user.id);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Email hoặc số điện thoại đã được đăng ký");
      }
      this.logger.error(`Đăng ký ${email} lỗi: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }

    return {
      ho_so_id: user.id,
      email,
      vai: dto.vai,
      trang_thai_vai: trangThai,
      buoc_tiep: laVaiPhaiHoc(dto.vai)
        ? "Đăng nhập rồi vào Học viện: hoàn thành khoá học và đạt bài kiểm tra để kích hoạt vai trò."
        : "Đăng nhập để xem ưu đãi thành viên. Số điện thoại cần được CSKH gọi xác minh trước khi nối với lịch sử mua hàng."
    };
  }

  // ---------------------------------------------------------------- POST /toi/dang-ky-vai

  /** Nguoi da co tai khoan dang ky hoc them vai (CTV / TTS / KOL / KOC) — luon DANG_HOC, khong tu kich hoat */
  async dangKyThemVai(nd: ThongTinNguoiDung, dto: DangKyThemVaiDto): Promise<void> {
    if (!laVaiPhaiHoc(dto.vai) || !VAI_DANG_KY.includes(dto.vai)) throw new BadRequestException("Vai trò đăng ký không hợp lệ");
    const hienCo = nd.vaiChiTiet.find(v => v.vai === dto.vai);
    if (hienCo && hienCo.trang_thai !== "KET_THUC") throw new ConflictException("Bạn đã có vai trò này");
    const ghiChu = ghiChuDangKy(dto.vai, dto.hinh_thuc, dto.ghi_chu);
    await this.repo.chayTrongGiaoDich(async tx => {
      await this.vaiRepo.ghiDoiVai(
        {
          hoSoId: nd.id,
          vai: dto.vai,
          cu: hienCo?.trang_thai ?? null,
          moi: "DANG_HOC",
          nguoiDoiId: nd.id,
          lyDo: `Tự đăng ký học vai ${NHAN_VAI_VN[dto.vai]}`,
          nguon: "DANG_KY"
        },
        tx
      );
      if (ghiChu) {
        const cu = await this.repo.layGhiChu(nd.id, tx);
        await this.repo.capNhat(nd.id, { ghi_chu: [cu?.ghi_chu, ghiChu].filter(Boolean).join("\n") }, tx);
      }
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "DANG_KY_THEM_VAI", doiTuong: "ho_so", doiTuongId: nd.id, duLieu: { vai: dto.vai } }, tx);
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
