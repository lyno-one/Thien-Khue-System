// Phan bo khach / lead theo ca truc + nang luc + tai. Lop: PhanBoService.
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { LoaiThongBao, NguonGiaoKhach, type Prisma } from "@prisma/client";
import type { KetQuaPhanBo, KetQuaPhanBoLoat } from "@thien-khue/contracts";
import { CrmApiClient } from "../infrastructure/crm/crm-api.client";
import { CrmDocService } from "../infrastructure/crm/crm-doc.service";
import { NhatKyService, ThongBaoService } from "./core.service";
import { chuanHoaSdt, laSdtHopLe } from "../infrastructure/crm/chuan-hoa-sdt";
import { bayGioVn, chonNguoiPhuTrach, ngayDb, trongCa, type UngVienPhanBo } from "../common/utils/ban-hang";
import { VAI_BAN_HANG, type VaiBan } from "../constants/ban-hang.constants";
import { PhanBoRepository } from "../repositories/ban-hang.repository";

type Tx = Prisma.TransactionClient;

export interface YeuCauGiaoKhach {
  sdt: string;
  tenKhach?: string | null;
  /** Chi dinh nguoi (thu cong); bo trong = tu dong theo ca + nang luc + tai */
  hoSoId?: string | null;
  nguon: NguonGiaoKhach;
  lyDo?: string | null;
  leadId?: string | null;
  /** ho_so.id nguoi giao (null = he thong) */
  nguoiGiaoId: string | null;
  /** Ma mau khach quan tam -> chi giao cho nguoi co quyen SKU ma do */
  maMau?: string | null;
  vaiUuTien: VaiBan[];
}

/**
 * Phan bo khach (lead tu trang cong khai + khach CRM can cham) cho Sale / CSKH theo
 * ca truc, nang luc (quyen SKU + muc nang luc) va tai viec — round-robin co trong so (common/utils/ban-hang.ts).
 * Moi sdt_chuan chi mot giao_khach DANG_PHU_TRACH: kiem trong transaction + khoa advisory theo SDT.
 * Export cho module cong-khai: sau khi tao lead goi phanBoLead(lead.id).
 */
@Injectable()
export class PhanBoService {
  private readonly logger = new Logger("PhanBoService");

  constructor(
    private readonly repo: PhanBoRepository,
    private readonly crmDoc: CrmDocService,
    private readonly crmApi: CrmApiClient,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  // ---------------------------------------------------------------- ung vien

  /**
   * Sale / CSKH dang trong ca luc nay (vai HOAT_DONG), kem tai + nang luc.
   * maMau: chi giu nguoi co quyen_sku HOAT_DONG voi ma do (ma khong ton tai tren CRM -> bo qua dieu kien).
   * tx: transaction dang chay (cac truy van doc cung transaction voi viec ghi giao_khach).
   */
  async layUngVien(
    tx: Tx,
    tuyChon: { vai: VaiBan[]; maMau?: string | null; luc?: Date }
  ): Promise<{ ds: UngVienPhanBo[]; trongCa: number; moTaNangLuc: string | null }> {
    const { ngay, gio } = bayGioVn(tuyChon.luc);
    const vaiHoatDong = await this.repo.vaiHoatDongKemCrm(tuyChon.vai, tx);
    let ids = [...new Set(vaiHoatDong.map(v => v.ho_so_id))];
    // Nhan su CRM da bi khoa / xoa nhung vai chua kip dong bo (chi dong bo khi ho dang nhap) -> khong nhan khach moi
    const crmTheoHoSo = new Map(vaiHoatDong.filter(v => v.ho_so?.crm_user_id).map(v => [v.ho_so_id, v.ho_so!.crm_user_id!]));
    if (crmTheoHoSo.size) {
      const khongConLam = new Set(await this.crmDoc.locNhanSuKhongConLam([...crmTheoHoSo.values()]));
      if (khongConLam.size) ids = ids.filter(id => !khongConLam.has(crmTheoHoSo.get(id) ?? ""));
    }
    if (!ids.length) return { ds: [], trongCa: 0, moTaNangLuc: null };

    const caHomNay = await this.repo.caTrongNgay(ngayDb(ngay), ids, tuyChon.vai, tx);
    // Moi nguoi lay ca dang dien ra (neu trung nhieu ca, lay ca bat dau som nhat)
    const caCuaNguoi = new Map<string, (typeof caHomNay)[number]>();
    for (const ca of caHomNay) {
      if (trongCa(gio, ca.tu_gio, ca.den_gio) && !caCuaNguoi.has(ca.ho_so_id)) caCuaNguoi.set(ca.ho_so_id, ca);
    }
    let ungVienIds = [...caCuaNguoi.keys()];
    const trongCaSo = ungVienIds.length;
    if (!ungVienIds.length) return { ds: [], trongCa: 0, moTaNangLuc: null };

    // Nang luc: quyen SKU (bat buoc neu khach quan tam mot ma) + muc nang luc (trong so)
    let moTaNangLuc: string | null = null;
    const maMau = tuyChon.maMau?.trim().toUpperCase() || null;
    if (maMau) {
      const mau = await this.crmDoc.layMauTheoMa(maMau);
      if (mau) {
        const tap = new Set(await this.repo.coQuyenMau(mau.id, ungVienIds, tx));
        ungVienIds = ungVienIds.filter(id => tap.has(id));
        moTaNangLuc = `mã ${mau.ma}`;
      }
    }
    if (!ungVienIds.length) return { ds: [], trongCa: trongCaSo, moTaNangLuc };

    const caIds = ungVienIds.map(id => caCuaNguoi.get(id)!.id);
    const { hoSo, taiNhom, daGiaoCa, giaoCuoi, nangLuc } = await this.repo.thongKeUngVien(ungVienIds, caIds, maMau, tx);
    const ten = new Map(hoSo.map(h => [h.id, h.ho_ten]));
    const tai = new Map(taiNhom.map(t => [t.ho_so_id, t._count._all]));
    const theoCa = new Map(daGiaoCa.map(t => [t.ca_truc_id, t._count._all]));
    const cuoi = new Map(giaoCuoi.map(t => [t.ho_so_id, t._max.giao_luc ?? null]));
    const muc = new Map<string, number>();
    for (const n of nangLuc) muc.set(n.ho_so_id, Math.max(muc.get(n.ho_so_id) ?? 0, n.muc));

    const ds: UngVienPhanBo[] = ungVienIds.map(id => {
      const ca = caCuaNguoi.get(id)!;
      return {
        hoSoId: id,
        hoTen: ten.get(id) ?? "—",
        tai: tai.get(id) ?? 0,
        mucNangLuc: muc.get(id) ?? null,
        lanGiaoCuoi: cuoi.get(id) ?? null,
        caTrucId: ca.id,
        caNhan: `${ca.tu_gio}–${ca.den_gio}`,
        daGiaoTrongCa: theoCa.get(ca.id) ?? 0,
        toiDaTrongCa: ca.so_khach_toi_da
      };
    });
    return { ds, trongCa: trongCaSo, moTaNangLuc };
  }

  // ---------------------------------------------------------------- giao khach (diem vao chung)

  /**
   * Giao mot khach (theo SDT) cho Sale / CSKH. Khach dang co nguoi phu trach -> giu nguoi cu (lien tuc cham soc).
   * Tra ho_so_id null khi khong ai phu hop (de QUAN_LY giao tay).
   */
  async giaoKhach(yc: YeuCauGiaoKhach): Promise<KetQuaPhanBo & { moi: boolean }> {
    const sdtChuan = chuanHoaSdt(yc.sdt);
    if (!laSdtHopLe(sdtChuan)) throw new BadRequestException("Số điện thoại khách không hợp lệ");

    const kq = await this.repo.chayTrongGiaoDich(async tx => {
      await this.repo.khoaTheoSdt(sdtChuan, tx);
      const dangCo = await this.repo.timDangPhuTrachKemTen(sdtChuan, tx);
      if (dangCo && (!yc.hoSoId || yc.hoSoId === dangCo.ho_so_id)) {
        if (yc.leadId) await this.repo.danhDauLeadDaPhanBo(yc.leadId, dangCo.ho_so_id, tx);
        return {
          ho_so_id: dangCo.ho_so_id,
          ho_ten: dangCo.ho_so.ho_ten,
          giao_khach_id: dangCo.id,
          ly_do: `Khách đang do ${dangCo.ho_so.ho_ten} phụ trách — giữ người cũ để chăm sóc liên tục`,
          moi: false
        };
      }
      if (dangCo) throw new ConflictException(`Khách đang do ${dangCo.ho_so.ho_ten} phụ trách — dùng chức năng giao lại`);

      let hoSoId: string;
      let hoTen: string;
      let caTrucId: string | null = null;
      let lyDo: string;
      if (yc.hoSoId) {
        const nguoi = await this.kiemNguoiNhan(tx, yc.hoSoId);
        hoSoId = nguoi.id;
        hoTen = nguoi.ho_ten;
        lyDo = yc.lyDo?.trim() || "Giao thủ công";
      } else {
        const chon = await this.chonTuDong(tx, yc.vaiUuTien, yc.maMau);
        if (!chon.ketQua) return { ho_so_id: null, ho_ten: null, giao_khach_id: null, ly_do: chon.lyDo, moi: false };
        hoSoId = chon.ketQua.ungVien.hoSoId;
        hoTen = chon.ketQua.ungVien.hoTen;
        caTrucId = chon.ketQua.ungVien.caTrucId;
        lyDo = [yc.lyDo?.trim(), chon.ketQua.lyDo].filter(Boolean).join(" — ");
      }

      const giao = await this.repo.taoGiaoKhach(
        {
          sdt_chuan: sdtChuan,
          ten_khach: yc.tenKhach?.trim() || null,
          ho_so_id: hoSoId,
          nguon: yc.nguon,
          ly_do: lyDo,
          nguoi_giao_id: yc.nguoiGiaoId,
          ca_truc_id: caTrucId,
          lead_id: yc.leadId ?? null
        },
        tx
      );
      if (yc.leadId) await this.repo.danhDauLeadDaPhanBo(yc.leadId, hoSoId, tx);
      await this.nhatKy.ghi(
        {
          hoSoId: yc.nguoiGiaoId,
          hanhDong: "GIAO_KHACH",
          doiTuong: "giao_khach",
          doiTuongId: giao.id,
          duLieu: { sdt_chuan: sdtChuan, ho_so_id: hoSoId, nguon: yc.nguon, ly_do: lyDo, lead_id: yc.leadId ?? null }
        },
        tx
      );
      await this.thongBao.gui(
        {
          hoSoId,
          loai: LoaiThongBao.KHACH_MOI,
          tieuDe: `Khách mới được giao: ${yc.tenKhach?.trim() || sdtChuan}`,
          noiDung: lyDo,
          lienKet: `/lam-viec/ban-hang/khach/${sdtChuan}`,
          duLieu: { giao_khach_id: giao.id, sdt_chuan: sdtChuan }
        },
        tx
      );
      return { ho_so_id: hoSoId, ho_ten: hoTen, giao_khach_id: giao.id, ly_do: lyDo, moi: true };
    });
    return kq;
  }

  /** Chon tu dong: vai uu tien truoc, khong co ai thi thu vai con lai */
  private async chonTuDong(tx: Tx, vaiUuTien: VaiBan[], maMau?: string | null) {
    const thuTu: VaiBan[][] = [vaiUuTien, VAI_BAN_HANG.filter(v => !vaiUuTien.includes(v))].filter(v => v.length);
    let lyDo = "Không có Sale / CSKH nào đang trong ca — chờ quản lý phân bổ";
    for (const vai of thuTu) {
      const { ds, trongCa: soTrongCa, moTaNangLuc } = await this.layUngVien(tx, { vai, maMau });
      const ketQua = chonNguoiPhuTrach(ds, moTaNangLuc);
      if (ketQua) return { ketQua, lyDo: ketQua.lyDo };
      if (soTrongCa > 0) {
        lyDo = ds.length
          ? "Mọi người trong ca đã đủ số khách tối đa — chờ quản lý phân bổ"
          : `Không ai trong ca có quyền ${moTaNangLuc ?? "sản phẩm khách quan tâm"} — chờ quản lý phân bổ`;
      }
    }
    return { ketQua: null, lyDo };
  }

  private async kiemNguoiNhan(tx: Tx, hoSoId: string) {
    const nguoi = await this.repo.timNguoiNhan(hoSoId, VAI_BAN_HANG, tx);
    if (!nguoi) throw new NotFoundException("Không tìm thấy nhân sự được chọn");
    if (!nguoi.vai_tro.length) throw new BadRequestException(`${nguoi.ho_ten} chưa có vai Sale / CSKH đang hoạt động`);
    return nguoi;
  }

  // ---------------------------------------------------------------- lead

  /** Phan bo mot lead (goi tu module cong-khai sau khi tao lead, hoac QUAN_LY bam tay) */
  async phanBoLead(leadId: string, nguoiThucHien: string | null = null, hoSoId?: string | null): Promise<KetQuaPhanBo> {
    const lead = await this.repo.timLead(leadId);
    if (!lead) throw new NotFoundException("Không tìm thấy lead");
    if (!["MOI", "DA_PHAN_BO"].includes(lead.trang_thai) && !hoSoId) {
      throw new BadRequestException("Lead đã được xử lý, không phân bổ lại tự động");
    }
    if (!laSdtHopLe(lead.sdt_chuan || lead.sdt)) {
      await this.repo.danhDauLeadThatBai(leadId, noiGhiChu(lead.ghi_chu, "SĐT không hợp lệ"));
      return { ho_so_id: null, ho_ten: null, giao_khach_id: null, ly_do: "SĐT không hợp lệ" };
    }
    const kq = await this.giaoKhach({
      sdt: lead.sdt_chuan || lead.sdt,
      tenKhach: lead.ten,
      hoSoId,
      nguon: hoSoId ? NguonGiaoKhach.THU_CONG : NguonGiaoKhach.LEAD,
      lyDo: hoSoId ? "Quản lý phân bổ lead" : `Lead ${lead.nguon ?? "trang công khai"}`,
      leadId: lead.id,
      nguoiGiaoId: nguoiThucHien,
      maMau: lead.ma_mau_quan_tam,
      vaiUuTien: lead.loai === "MUA_HANG" ? ["SALE"] : ["CSKH"]
    });
    if (!kq.ho_so_id) {
      await this.baoQuanLyChuaPhanBo(`Lead ${lead.ten} (${lead.sdt_chuan}) chưa phân bổ được`, kq.ly_do);
    }
    return { ho_so_id: kq.ho_so_id, ho_ten: kq.ho_ten, giao_khach_id: kq.giao_khach_id, ly_do: kq.ly_do };
  }

  /** Phan bo moi lead MOI (cu nhat truoc) */
  async phanBoLeadMoi(nguoiThucHien: string | null, gioiHan = 100): Promise<KetQuaPhanBoLoat> {
    const ds = await this.repo.leadMoi(gioiHan);
    const chiTiet: KetQuaPhanBoLoat["chi_tiet"] = [];
    for (const l of ds) {
      try {
        chiTiet.push({ lead_id: l.id, ...(await this.phanBoLead(l.id, nguoiThucHien)) });
      } catch (e) {
        chiTiet.push({ lead_id: l.id, ho_so_id: null, ho_ten: null, giao_khach_id: null, ly_do: e instanceof Error ? e.message : "Lỗi phân bổ" });
      }
    }
    return { da_phan_bo: chiTiet.filter(c => c.ho_so_id).length, chua_phan_bo: chiTiet.filter(c => !c.ho_so_id).length, chi_tiet: chiTiet };
  }

  // ---------------------------------------------------------------- khach CRM can cham

  /** Lay khach "can cham" tu CRM (khach am / nguoi chua cham 30 ngay, bang token QUAN_LY) roi giao cho CSKH dang trong ca */
  async phanBoKhachCanCham(token: string, nguoiThucHien: string, gioiHan = 50): Promise<KetQuaPhanBoLoat> {
    const ds = await this.crmApi.goi<{ id: string; ten: string; sdt: string }[]>(token, "GET", "/api/khach-hang", { query: { canCham: true } });
    const chiTiet: KetQuaPhanBoLoat["chi_tiet"] = [];
    for (const k of (ds ?? []).slice(0, Math.min(Math.max(gioiHan, 1), 200))) {
      const sdtChuan = chuanHoaSdt(k.sdt);
      if (!laSdtHopLe(sdtChuan)) continue;
      try {
        const kq = await this.giaoKhach({
          sdt: sdtChuan,
          tenKhach: k.ten,
          nguon: NguonGiaoKhach.TU_DONG,
          lyDo: "Khách CRM cần chăm",
          nguoiGiaoId: nguoiThucHien,
          vaiUuTien: ["CSKH"]
        });
        chiTiet.push({ sdt_chuan: sdtChuan, ho_so_id: kq.ho_so_id, ho_ten: kq.ho_ten, giao_khach_id: kq.giao_khach_id, ly_do: kq.ly_do });
      } catch (e) {
        chiTiet.push({ sdt_chuan: sdtChuan, ho_so_id: null, ho_ten: null, giao_khach_id: null, ly_do: e instanceof Error ? e.message : "Lỗi phân bổ" });
      }
    }
    return { da_phan_bo: chiTiet.filter(c => c.ho_so_id).length, chua_phan_bo: chiTiet.filter(c => !c.ho_so_id).length, chi_tiet: chiTiet };
  }

  // ---------------------------------------------------------------- giao lai

  /** QUAN_LY giao lai khach: dong dong cu (DA_CHUYEN), tao dong moi THU_CONG (hoac tu dong neu khong chi dinh) */
  async giaoLai(sdt: string, tuyChon: { hoSoId?: string | null; lyDo: string }, nguoiGiaoId: string): Promise<KetQuaPhanBo> {
    const sdtChuan = chuanHoaSdt(sdt);
    const cu = await this.repo.chayTrongGiaoDich(async tx => {
      await this.repo.khoaTheoSdt(sdtChuan, tx);
      const dangCo = await this.repo.timDangPhuTrach(sdtChuan, tx);
      if (!dangCo) throw new NotFoundException("Khách chưa được giao cho ai");
      if (tuyChon.hoSoId && tuyChon.hoSoId === dangCo.ho_so_id) throw new BadRequestException("Khách đang do chính người này phụ trách");
      await this.repo.chuyenDi(dangCo.id, noiGhiChu(dangCo.ly_do, `Giao lại: ${tuyChon.lyDo}`), tx);
      return dangCo;
    });
    try {
      const kq = await this.giaoKhach({
        sdt: sdtChuan,
        tenKhach: cu.ten_khach,
        hoSoId: tuyChon.hoSoId,
        nguon: NguonGiaoKhach.THU_CONG,
        lyDo: `Giao lại: ${tuyChon.lyDo}`,
        leadId: cu.lead_id,
        nguoiGiaoId,
        vaiUuTien: ["SALE", "CSKH"]
      });
      if (!kq.ho_so_id) throw new ConflictException(kq.ly_do);
      return { ho_so_id: kq.ho_so_id, ho_ten: kq.ho_ten, giao_khach_id: kq.giao_khach_id, ly_do: kq.ly_do };
    } catch (e) {
      // Khong giao duoc cho ai -> tra khach ve nguoi cu, khong de khach "mo coi"
      await this.repo.khoiPhucPhuTrach(cu.id, cu.ly_do);
      throw e;
    }
  }

  private async baoQuanLyChuaPhanBo(tieuDe: string, lyDo: string) {
    try {
      const ql = await this.repo.quanLyHoatDong();
      await this.thongBao.guiNhieu(ql, { loai: LoaiThongBao.KHACH_MOI, tieuDe, noiDung: lyDo, lienKet: "/lam-viec/ban-hang/lead" });
    } catch (e) {
      this.logger.warn(`Không báo được quản lý: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

export function noiGhiChu(cu: string | null | undefined, moi: string): string {
  return cu ? `${cu}\n${moi}` : moi;
}
