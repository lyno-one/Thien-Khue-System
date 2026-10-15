// Trang cong khai: san pham + form lien he. Lop: SanPhamCongKhaiService, LienHeService.
import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import type { ChiTietSanPhamCongKhai, GuiLienHeBody, KetQuaLienHe, SanPhamCongKhai, SapXepSanPham } from "@thien-khue/contracts";
import { CrmDocService } from "../infrastructure/crm/crm-doc.service";
import { chuanHoaBangSize, GioiHanTheoKhoa, loaiLeadTheoTrang, sangCongKhai, taoNhuCau, tomTatTonKho } from "../common/utils/cong-khai";
import { GIOI_HAN_LIEN_HE, GOP_TRUNG_LEAD_MS, MA_MAU_HOP_LE, TTL_CACHE_SAN_PHAM_MS } from "../constants/cong-khai.constants";
import { chuanHoaSdt } from "../infrastructure/crm/chuan-hoa-sdt";
import { NhatKyService } from "./core.service";
import { PhanBoService } from "./ban-hang-phan-bo.service";
import { LienHeRepository } from "../repositories/cong-khai.repository";
import { laSdtVietNam } from "../dto/cong-khai/cong-khai.dto";

/*
 * San pham cho trang cong khai — doc public.mau qua CrmDocService (khong tu viet SQL vao public).
 * CHI tra truong cong khai (whitelist tung truong): khong id noi bo, khong so luong ton, khong cau tu van / tu khoa noi bo.
 * Mau 'ngung' khong bao gio lo ra.
 */

@Injectable()
export class SanPhamCongKhaiService {
  // Cache ngan cho danh sach — route cong khai, giam tai DB khi nhieu khach / bot vao trang chu
  private readonly cache = new Map<string, { het: number; ds: SanPhamCongKhai[] }>();

  constructor(private readonly crmDoc: CrmDocService) {}

  async danhSach(q: { tu_khoa?: string; gioi_han?: number; sap_xep?: SapXepSanPham } = {}): Promise<SanPhamCongKhai[]> {
    const gioiHan = Math.min(Math.max(q.gioi_han ?? 24, 1), 48);
    const sapXep = q.sap_xep ?? "ma";
    const tuKhoa = q.tu_khoa?.trim() || undefined;
    const khoa = `${sapXep}|${gioiHan}|${tuKhoa ?? ""}`;
    const daCo = this.cache.get(khoa);
    if (daCo && daCo.het > Date.now()) return daCo.ds;

    // "moi": can xep theo updated_at nen lay rong roi cat; "ma": CRM da xep san theo ma
    const mau = await this.crmDoc.layDanhSachMau({ tuKhoa, gioiHan: sapXep === "moi" ? 200 : gioiHan });
    const conBan = mau.filter(m => m.trang_thai !== "ngung");
    if (sapXep === "moi") {
      conBan.sort((a, b) => {
        const conHang = Number(b.trang_thai === "dang_ban") - Number(a.trang_thai === "dang_ban");
        if (conHang) return conHang;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    }
    const ds = conBan.slice(0, gioiHan).map(sangCongKhai);
    if (this.cache.size > 200) this.cache.clear();
    this.cache.set(khoa, { het: Date.now() + TTL_CACHE_SAN_PHAM_MS, ds });
    return ds;
  }

  async chiTiet(ma: string): Promise<ChiTietSanPhamCongKhai> {
    if (!MA_MAU_HOP_LE.test(ma ?? "")) throw new BadRequestException("Mã sản phẩm không hợp lệ");
    const m = await this.crmDoc.layMauTheoMa(ma);
    if (!m || m.trang_thai === "ngung") throw new NotFoundException("Không tìm thấy sản phẩm");
    const ton = await this.crmDoc.layTonKho(m.id);
    return {
      ...sangCongKhai(m),
      chat_lieu: m.chat_lieu ?? null,
      form_dang: m.form_dang ?? null,
      bang_size: chuanHoaBangSize(m.size_chart),
      anh_bang_size: m.anh_size_chart ?? null,
      ...tomTatTonKho(ton)
    };
  }
}

/*
 * Form tren trang cong khai -> thien_khue.lead (agent ban-hang phan bo lead MOI cho Sale / CSKH).
 * Chong spam: honeypot `website` (bot dien -> tra thanh cong gia, khong ghi), gioi han theo IP trong bo nho,
 * gop trung cung SDT + loai + trang trong 24 gio (khong tao them dong).
 * Khong tao TAI KHOAN: tai khoan + vai do admin tao trong CRM sau khi nhan vien lien he lai.
 */

@Injectable()
export class LienHeService {
  private readonly logger = new Logger("LienHe");
  /** public de test thay dong ho / han muc */
  gioiHan = new GioiHanTheoKhoa(GIOI_HAN_LIEN_HE.toiDa, GIOI_HAN_LIEN_HE.cuaSoMs);

  constructor(
    private readonly repo: LienHeRepository,
    private readonly crmDoc: CrmDocService,
    private readonly nhatKy: NhatKyService,
    /** ban-hang: phan bo lead moi cho Sale / CSKH dang truc */
    @Optional() private readonly phanBo?: PhanBoService
  ) {}

  async gui(b: GuiLienHeBody, ip: string | null | undefined): Promise<KetQuaLienHe> {
    const khoaIp = ip || "khong-ro";
    if (!this.gioiHan.thu(khoaIp)) {
      const giay = this.gioiHan.conLaiGiay(khoaIp);
      throw new HttpException(
        { code: "QUA_NHIEU_YEU_CAU", message: `Bạn gửi quá nhiều lần. Vui lòng thử lại sau ${Math.max(1, Math.ceil(giay / 60))} phút.` },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Honeypot: tra loi y nhu thanh cong de bot khong biet bi chan
    if (b.website && b.website.trim() !== "") {
      this.logger.warn(`Chặn form spam (honeypot) từ IP ${khoaIp}`);
      return { da_nhan: true };
    }

    // Kiem lai o service (khong chi dua vao DTO) — luat nghiep vu chinh cua form
    const sdtChuan = chuanHoaSdt(b.sdt);
    if (!laSdtVietNam(sdtChuan)) throw new BadRequestException("Số điện thoại không hợp lệ (cần số Việt Nam 10 chữ số)");
    const hoTen = (b.ho_ten ?? "").trim().replace(/\s+/g, " ");
    if (hoTen.length < 2) throw new BadRequestException("Vui lòng nhập họ và tên");
    if (b.trang === "DAO_TAO" && !b.lo_trinh) throw new BadRequestException("Vui lòng chọn lộ trình");

    const loai = loaiLeadTheoTrang(b.trang);

    // Ma mau quan tam phai la mau dang hien thi; sai thi bo (khong chan khach)
    let maMau: string | null = null;
    if (b.ma_mau_quan_tam) {
      const m = await this.crmDoc.layMauTheoMa(b.ma_mau_quan_tam);
      maMau = m && m.trang_thai !== "ngung" ? m.ma : null;
    }

    const trung = await this.repo.timLeadTrung({ sdtChuan, loai, nguon: b.trang, tu: new Date(Date.now() - GOP_TRUNG_LEAD_MS) });
    if (trung) return { da_nhan: true };

    const lead = await this.repo.taoLead({
      ten: hoTen,
      sdt: b.sdt.trim(),
      sdt_chuan: sdtChuan,
      email: b.email?.trim().toLowerCase() || null,
      loai,
      nhu_cau: taoNhuCau({ ...b, ma_mau_quan_tam: maMau ?? undefined }),
      ma_mau_quan_tam: maMau,
      nguon: b.trang,
      ma_gioi_thieu: b.ma_gioi_thieu?.trim().toUpperCase() || null,
      dong_y_lien_he: b.dong_y_lien_he ?? true
    });

    await this.nhatKy.ghiAnToan({
      hoSoId: null,
      hanhDong: "TAO_LEAD_CONG_KHAI",
      doiTuong: "lead",
      doiTuongId: lead.id,
      duLieu: { nguon: b.trang, loai, lo_trinh: b.lo_trinh ?? null },
      ip: ip ?? null
    });

    // Phan bo ngay (khong chan phan hoi cho khach): khong ai phu hop -> lead o MOI, QUAN_LY duoc bao
    if (this.phanBo) {
      void this.phanBo.phanBoLead(lead.id, null).catch(e => this.logger.warn(`Chưa phân bổ được lead ${lead.id}: ${e instanceof Error ? e.message : String(e)}`));
    }

    return { da_nhan: true };
  }
}
