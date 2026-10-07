// Sale / CSKH. Lop: CaTrucService, LeadService, KhachService, DonService, HoTroService, HopViecService.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import {
  type ca_truc, type giao_khach, type lead, LoaiThongBao, type NguonDon, NguonGiaoKhach, Prisma, type TrangThaiGhiNhan, type yeu_cau_ho_tro
} from "@prisma/client";
import type {
  CaTruc, ChiTietKhach, DonCuaKhach, HopViecHomNay, KetQuaTaoDon, KhachDuocGiao, Lead, LuotChamKhach, MauDuocPhep, NangLuc, NhanSuBanHang, TonKhoMau,
  VaiCaTruc, YeuCauHoTro
} from "@thien-khue/contracts";
import { NhatKyService, ThongBaoService } from "./core.service";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import type {
  CaTrucQueryDto, DoiTrangThaiLeadDto, KhachDuocGiaoQueryDto, LeadQueryDto, LuuNangLucDto, SuaCaTrucDto, TaoCaTrucDto, TaoDonDto, TaoYeuCauHoTroDto
} from "../dto/ban-hang/ban-hang.dto";
import { VAI_BAN_HANG } from "../constants/ban-hang.constants";
import { CaTrucRepository, DonRepository, HopViecRepository, HoTroRepository, KhachRepository, LeadRepository } from "../repositories/ban-hang.repository";
import { bayGioVn, chonNguoiPhuTrach, dauNgayVn, laNgayHopLe, ngayChuoi, ngayDb, trongCa } from "../common/utils/ban-hang";
import { coMeta } from "../common/interceptors/bao-response.interceptor";
import { phanTrang, taoMetaPhanTrang } from "../common/utils/phan-trang";
import { noiGhiChu, PhanBoService } from "./ban-hang-phan-bo.service";
import { CrmApiClient } from "../infrastructure/crm/crm-api.client";
import { CrmDocService } from "../infrastructure/crm/crm-doc.service";
import { chuanHoaSdt, laSdtHopLe } from "../infrastructure/crm/chuan-hoa-sdt";
import { coVai } from "../common/guards/vai.guard";
import { QuyenSkuService } from "./dao-tao-quyen-sku.service";
import { GhiNhanDonService } from "./mang-luoi-hoa-hong.service";

type CaKem = ca_truc & { ho_so?: { ho_ten: string } | null; _count?: { giao_khach: number } };
export function sangCaTruc(ca: CaKem, luc: Date = new Date()): CaTruc {
  const { ngay, gio } = bayGioVn(luc);
  const ngayCa = ngayChuoi(ca.ngay);
  return {
    id: ca.id,
    ho_so_id: ca.ho_so_id,
    ho_ten: ca.ho_so?.ho_ten ?? "—",
    ngay: ngayCa,
    tu_gio: ca.tu_gio,
    den_gio: ca.den_gio,
    vai: ca.vai as VaiCaTruc,
    so_khach_toi_da: ca.so_khach_toi_da,
    so_khach_da_giao: ca._count?.giao_khach ?? 0,
    ghi_chu: ca.ghi_chu,
    dang_dien_ra: ngayCa === ngay && trongCa(gio, ca.tu_gio, ca.den_gio)
  };
}
/** Ca truc Sale / CSKH (QUAN_LY xep), nhan su ban hang, nang luc tu van */
@Injectable()
export class CaTrucService {
  constructor(
    private readonly repo: CaTrucRepository,
    private readonly nhatKy: NhatKyService
  ) {}

  async danhSach(nd: ThongTinNguoiDung, q: CaTrucQueryDto): Promise<CaTruc[]> {
    const homNay = bayGioVn().ngay;
    const tu = q.tu_ngay ?? homNay;
    const den = q.den_ngay ?? tu;
    if (!laNgayHopLe(tu) || !laNgayHopLe(den)) throw new BadRequestException("Ngày không hợp lệ");
    if (den < tu) throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
    const hoSoId = !laQuanLy(nd) ? nd.id : q.ho_so_id || undefined;
    const ds = await this.repo.danhSach({ tu: ngayDb(tu), den: ngayDb(den), hoSoId });
    return ds.map(c => sangCaTruc(c));
  }

  private kiemGio(tuGio: string, denGio: string) {
    if (tuGio === denGio) throw new BadRequestException("Giờ bắt đầu và kết thúc ca không được trùng nhau");
  }

  private async kiemNhanSu(hoSoId: string, vai: VaiCaTruc) {
    const v = await this.repo.timVaiNhanSu(hoSoId, vai);
    if (!v) throw new BadRequestException(`Nhân sự chưa có vai ${vai}`);
    if (v.trang_thai === "KET_THUC" || v.trang_thai === "TAM_DUNG") throw new BadRequestException(`Vai ${vai} của nhân sự đang tạm dừng / kết thúc`);
  }

  async tao(nd: ThongTinNguoiDung, dto: TaoCaTrucDto): Promise<CaTruc> {
    if (!laNgayHopLe(dto.ngay)) throw new BadRequestException("Ngày không hợp lệ");
    this.kiemGio(dto.tu_gio, dto.den_gio);
    await this.kiemNhanSu(dto.ho_so_id, dto.vai);
    try {
      const ca = await this.repo.tao({
        ho_so_id: dto.ho_so_id,
        ngay: ngayDb(dto.ngay),
        tu_gio: dto.tu_gio,
        den_gio: dto.den_gio,
        vai: dto.vai,
        so_khach_toi_da: dto.so_khach_toi_da ?? null,
        ghi_chu: dto.ghi_chu?.trim() || null
      });
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "TAO_CA_TRUC", doiTuong: "ca_truc", doiTuongId: ca.id, duLieu: { ...dto } });
      return sangCaTruc(ca);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ConflictException("Nhân sự đã có ca bắt đầu cùng giờ trong ngày này");
      throw e;
    }
  }

  async sua(nd: ThongTinNguoiDung, id: string, dto: SuaCaTrucDto): Promise<CaTruc> {
    const cu = await this.repo.timTheoId(id);
    if (!cu) throw new NotFoundException("Không tìm thấy ca trực");
    const tuGio = dto.tu_gio ?? cu.tu_gio;
    const denGio = dto.den_gio ?? cu.den_gio;
    this.kiemGio(tuGio, denGio);
    if (dto.ngay && !laNgayHopLe(dto.ngay)) throw new BadRequestException("Ngày không hợp lệ");
    if (dto.vai && dto.vai !== cu.vai) await this.kiemNhanSu(cu.ho_so_id, dto.vai);
    try {
      const ca = await this.repo.sua(id, {
        ...(dto.ngay ? { ngay: ngayDb(dto.ngay) } : {}),
        tu_gio: tuGio,
        den_gio: denGio,
        ...(dto.vai ? { vai: dto.vai } : {}),
        ...(dto.so_khach_toi_da !== undefined ? { so_khach_toi_da: dto.so_khach_toi_da } : {}),
        ...(dto.ghi_chu !== undefined ? { ghi_chu: dto.ghi_chu?.trim() || null } : {})
      });
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "SUA_CA_TRUC", doiTuong: "ca_truc", doiTuongId: id, duLieu: { ...dto } });
      return sangCaTruc(ca);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ConflictException("Nhân sự đã có ca bắt đầu cùng giờ trong ngày này");
      throw e;
    }
  }

  async xoa(nd: ThongTinNguoiDung, id: string): Promise<{ ok: true }> {
    const cu = await this.repo.timTheoId(id);
    if (!cu) throw new NotFoundException("Không tìm thấy ca trực");
    // giao_khach.ca_truc_id SetNull — khach van giu nguoi phu trach
    await this.repo.xoa(id);
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "XOA_CA_TRUC", doiTuong: "ca_truc", doiTuongId: id, duLieu: { ngay: ngayChuoi(cu.ngay), tu_gio: cu.tu_gio, den_gio: cu.den_gio, ho_so_id: cu.ho_so_id } });
    return { ok: true };
  }

  // ---------------------------------------------------------------- nhan su

  async nhanSu(): Promise<NhanSuBanHang[]> {
    const vai = await this.repo.vaiBanHangConLam(VAI_BAN_HANG);
    const ids = [...new Set(vai.map(v => v.ho_so_id))];
    if (!ids.length) return [];
    const { ngay, gio } = bayGioVn();
    const { hoSo, tai, quyen, ca, nangLuc } = await this.repo.duLieuNhanSu(ids, ngayDb(ngay));
    const mTai = new Map(tai.map(t => [t.ho_so_id, t._count._all]));
    const mQuyen = new Map(quyen.map(t => [t.ho_so_id, t._count._all]));
    return hoSo
      .map(h => ({
        ho_so_id: h.id,
        ho_ten: h.ho_ten,
        email: h.email,
        // Chi liet ke vai HOAT_DONG (dang hoc thi chua duoc phan bo)
        vai: vai.filter(v => v.ho_so_id === h.id && v.trang_thai === "HOAT_DONG").map(v => v.vai as VaiCaTruc),
        tai_hien_tai: mTai.get(h.id) ?? 0,
        so_ma_duoc_quyen: mQuyen.get(h.id) ?? 0,
        dang_trong_ca: ca.some(c => c.ho_so_id === h.id && trongCa(gio, c.tu_gio, c.den_gio)),
        nang_luc: nangLuc.filter(n => n.ho_so_id === h.id).map(sangNangLuc)
      }))
      .sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, "vi"));
  }

  // ---------------------------------------------------------------- nang luc

  async luuNangLuc(nd: ThongTinNguoiDung, dto: LuuNangLucDto): Promise<NangLuc> {
    const maMau = dto.ma_mau?.trim().toUpperCase() || null;
    const nhom = dto.nhom?.trim().toUpperCase() || null;
    if (!maMau && !nhom) throw new BadRequestException("Cần mã mẫu hoặc nhóm năng lực");
    const daCo = await this.repo.timNangLuc(dto.ho_so_id, maMau, nhom);
    const nl = daCo
      ? await this.repo.suaMucNangLuc(daCo.id, dto.muc)
      : await this.repo.taoNangLuc({ ho_so_id: dto.ho_so_id, ma_mau: maMau, nhom, muc: dto.muc });
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "LUU_NANG_LUC", doiTuong: "nang_luc", doiTuongId: nl.id, duLieu: { ho_so_id: dto.ho_so_id, ma_mau: maMau, nhom, muc: dto.muc } });
    return sangNangLuc(nl);
  }

  async xoaNangLuc(nd: ThongTinNguoiDung, id: string): Promise<{ ok: true }> {
    const nl = await this.repo.timNangLucTheoId(id);
    if (!nl) throw new NotFoundException("Không tìm thấy năng lực");
    await this.repo.xoaNangLuc(id);
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "XOA_NANG_LUC", doiTuong: "nang_luc", doiTuongId: id, duLieu: { ho_so_id: nl.ho_so_id, ma_mau: nl.ma_mau, nhom: nl.nhom } });
    return { ok: true };
  }
}
function sangNangLuc(n: { id: string; ho_so_id: string; ma_mau: string | null; nhom: string | null; muc: number }): NangLuc {
  return { id: n.id, ho_so_id: n.ho_so_id, ma_mau: n.ma_mau, nhom: n.nhom, muc: n.muc };
}

export function sangLead(l: lead, tenPhuTrach: Map<string, string>): Lead {
  return {
    id: l.id,
    ten: l.ten,
    sdt: l.sdt,
    sdt_chuan: l.sdt_chuan,
    email: l.email,
    loai: l.loai,
    nhu_cau: l.nhu_cau,
    ma_mau_quan_tam: l.ma_mau_quan_tam,
    nguon: l.nguon,
    ma_gioi_thieu: l.ma_gioi_thieu,
    trang_thai: l.trang_thai,
    phan_bo_cho: l.phan_bo_cho,
    phan_bo_cho_ten: l.phan_bo_cho ? (tenPhuTrach.get(l.phan_bo_cho) ?? null) : null,
    phan_bo_luc: l.phan_bo_luc?.toISOString() ?? null,
    ghi_chu: l.ghi_chu,
    created_at: l.created_at.toISOString()
  };
}
/** Lead (khach dang ky tu trang cong khai): Sale / CSKH chi thay lead phan bo cho minh; QUAN_LY thay het */
@Injectable()
export class LeadService {
  constructor(
    private readonly repo: LeadRepository,
    private readonly nhatKy: NhatKyService
  ) {}

  async tenPhuTrach(ds: lead[]): Promise<Map<string, string>> {
    const ids = [...new Set(ds.map(l => l.phan_bo_cho).filter((x): x is string => !!x))];
    if (!ids.length) return new Map();
    const hs = await this.repo.tenHoSo(ids);
    return new Map(hs.map(h => [h.id, h.ho_ten]));
  }

  async danhSach(nd: ThongTinNguoiDung, q: LeadQueryDto) {
    const { skip, take, trang, so_dong } = phanTrang(q);
    const tk = q.q?.trim() || undefined;
    const { ds, tong } = await this.repo.danhSach(
      {
        phanBoCho: laQuanLy(nd) ? undefined : nd.id,
        trangThai: q.trang_thai || undefined,
        tuKhoa: tk,
        sdt: tk ? tk.replace(/\D/g, "") || tk : undefined
      },
      skip,
      take
    );
    const ten = await this.tenPhuTrach(ds);
    return coMeta(
      ds.map(l => sangLead(l, ten)),
      taoMetaPhanTrang(trang, so_dong, tong)
    );
  }

  async doiTrangThai(nd: ThongTinNguoiDung, id: string, dto: DoiTrangThaiLeadDto): Promise<Lead> {
    const l = await this.repo.timTheoId(id);
    // Khong phai lead cua minh -> 404 nhu khong ton tai (khong lo du lieu khach)
    if (!l || (!laQuanLy(nd) && l.phan_bo_cho !== nd.id)) throw new NotFoundException("Không tìm thấy lead");
    if (l.trang_thai === "MOI") throw new ForbiddenException("Lead chưa được phân bổ");
    const sau = await this.repo.doiTrangThai(id, dto.trang_thai, dto.ghi_chu?.trim() ? noiGhiChu(l.ghi_chu, dto.ghi_chu.trim()) : undefined);
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "DOI_TRANG_THAI_LEAD", doiTuong: "lead", doiTuongId: id, duLieu: { tu: l.trang_thai, sang: dto.trang_thai } });
    return sangLead(sau, await this.tenPhuTrach([sau]));
  }
}

/** Thong bao chung khi Sale / CSKH tao don cho khach khong duoc giao — khong lo khach thuoc ai */
export const LOI_KHACH_CHUA_GIAO = "Khách chưa được giao cho bạn — báo quản lý phân bổ khách trước khi tạo đơn";
export interface KetQuaKiemBan {
  /** giao_khach dang phu trach (null = khach moi, chua ghi) */
  giaoKhachId: string | null;
  leadMaGioiThieu: string | null;
  /** true: khach chua ai phu trach — ghi giao_khach cho nguoi chot SAU khi CRM tao don thanh cong */
  canTiepNhan: boolean;
}
type GiaoKemQuanHe = giao_khach & {
  ho_so?: { ho_ten: string } | null;
  lead?: { loai: KhachDuocGiao["lead_loai"] & string; nhu_cau: string | null; ma_mau_quan_tam: string | null } | null;
};
/** QUAN_LY (ADMIN / THIEN_KHUE luon qua) xem duoc moi khach; Sale / CSKH chi khach duoc giao */
export function laQuanLy(nd: Pick<ThongTinNguoiDung, "vai">): boolean {
  return coVai(nd, ["QUAN_LY"]);
}
export function sangKhachDuocGiao(g: GiaoKemQuanHe): KhachDuocGiao {
  return {
    giao_khach_id: g.id,
    sdt_chuan: g.sdt_chuan,
    ten_khach: g.ten_khach,
    ho_so_id: g.ho_so_id,
    ho_ten_phu_trach: g.ho_so?.ho_ten ?? null,
    nguon: g.nguon,
    trang_thai: g.trang_thai,
    giao_luc: g.giao_luc.toISOString(),
    ly_do: g.ly_do,
    lead_id: g.lead_id,
    lead_loai: g.lead?.loai ?? null,
    lead_nhu_cau: g.lead?.nhu_cau ?? null,
    ma_mau_quan_tam: g.lead?.ma_mau_quan_tam ?? null
  };
}
/**
 * Khach duoc giao: Sale / CSKH CHI thay khach dang phu trach (giao_khach DANG_PHU_TRACH cua chinh minh).
 * Du lieu khach doc tu CRM (CrmDocService); ghi cham soc qua CRM API bang Bearer nguoi dung.
 */
@Injectable()
export class KhachService {
  constructor(
    private readonly repo: KhachRepository,
    private readonly crmDoc: CrmDocService,
    private readonly crmApi: CrmApiClient,
    private readonly nhatKy: NhatKyService,
    private readonly phanBo: PhanBoService
  ) {}

  async danhSach(nd: ThongTinNguoiDung, q: KhachDuocGiaoQueryDto) {
    const { skip, take, trang, so_dong } = phanTrang(q);
    // Danh tinh tu token: nguoi thuong luon bi ep ho_so_id = chinh minh (bo qua ho_so_id tren query)
    const hoSoId = !laQuanLy(nd) ? nd.id : q.ho_so_id || undefined;
    const tk = q.q?.trim() || undefined;
    const so = tk?.replace(/\D/g, "") ?? "";
    const sdt = so.length >= 3 ? chuanHoaSdt(so) || so : undefined;
    const { ds, tong } = await this.repo.danhSach({ hoSoId, tuKhoa: tk, sdt }, skip, take);
    return coMeta(ds.map(sangKhachDuocGiao), taoMetaPhanTrang(trang, so_dong, tong));
  }

  /**
   * Khach co dang giao cho nguoi nay khong — 404 neu khong (khong lo khach co ton tai / ai phu trach).
   * QUAN_LY: lay dong DANG_PHU_TRACH bat ky.
   */
  async damBaoDuocGiao(nd: ThongTinNguoiDung, sdt: string): Promise<GiaoKemQuanHe> {
    const sdtChuan = chuanHoaSdt(sdt);
    if (!laSdtHopLe(sdtChuan)) throw new BadRequestException("Số điện thoại không hợp lệ");
    const g = await this.repo.timDangPhuTrach(sdtChuan, laQuanLy(nd) ? undefined : nd.id);
    if (!g) throw new NotFoundException("Không tìm thấy khách trong danh sách bạn được giao");
    return g;
  }

  async chiTiet(nd: ThongTinNguoiDung, sdt: string, token: string): Promise<ChiTietKhach> {
    const g = await this.damBaoDuocGiao(nd, sdt);
    const [crm, tongMua, dsDon] = await Promise.all([
      this.crmDoc.layKhachTheoSdt(g.sdt_chuan),
      this.crmDoc.tongMuaHopLe(g.sdt_chuan),
      this.crmDoc.layDonTheoSdt(g.sdt_chuan, 50)
    ]);
    const don: DonCuaKhach[] = dsDon.map(d => ({
      id: d.id,
      ma_don: d.ma_don,
      kenh: d.kenh,
      loai_don: d.loai_don,
      trang_thai: d.trang_thai,
      tong_tien: Number(d.tong_tien),
      giam_gia: Number(d.giam_gia),
      created_at: new Date(d.created_at).toISOString(),
      hop_le: d.loai_don === "BAN_HANG" && d.trang_thai !== "huy" && d.trang_thai !== "hoan"
    }));
    return {
      giao: sangKhachDuocGiao(g),
      crm: crm
        ? { id: crm.id, ten: crm.ten, sdt: crm.sdt, dia_chi: crm.dia_chi, ghi_chu: crm.ghi_chu, created_at: new Date(crm.created_at).toISOString() }
        : null,
      tong_mua: {
        tong_tien: tongMua.tong_tien,
        so_don: tongMua.so_don,
        lan_mua_cuoi: tongMua.lan_mua_cuoi ? new Date(tongMua.lan_mua_cuoi).toISOString() : null
      },
      don,
      lich_su_cham: crm ? await this.layLichSuCham(token, crm.id) : []
    };
  }

  /** Lich su cham: doc public.cham_soc_log qua CrmDocService; loi thi thu CRM API; van loi thi tra null, khong chan trang */
  private async layLichSuCham(token: string, khachId: string): Promise<LuotChamKhach[] | null> {
    try {
      const ds = await this.crmDoc.layChamTheoKhach(khachId);
      return ds.map(c => ({ id: c.id, noi_dung: c.noi_dung, nguoi_cham: c.nguoi_cham, created_at: new Date(c.created_at).toISOString() }));
    } catch {
      // thu qua CRM API ben duoi
    }
    try {
      const ct = await this.crmApi.goi<{ dsCham?: { id: string; noi_dung: string; created_at: string; users: { full_name: string } | null }[] }>(
        token,
        "GET",
        `/api/khach-hang/${encodeURIComponent(khachId)}`
      );
      return (ct?.dsCham ?? []).map(c => ({ id: c.id, noi_dung: c.noi_dung, nguoi_cham: c.users?.full_name ?? null, created_at: c.created_at }));
    } catch {
      return null;
    }
  }

  /** Ghi cham soc: chi khach duoc giao; ghi vao CRM (cham_soc_log) bang Bearer nguoi dung */
  async ghiCham(nd: ThongTinNguoiDung, sdt: string, noiDung: string, token: string): Promise<{ ok: true }> {
    const g = await this.damBaoDuocGiao(nd, sdt);
    if (!nd.hoSo.crm_user_id) throw new ForbiddenException("Tài khoản chưa liên kết nhân sự CRM nên chưa ghi chăm sóc được");
    const khach = await this.crmDoc.layKhachTheoSdt(g.sdt_chuan);
    if (!khach) throw new BadRequestException("Khách chưa có hồ sơ trên CRM — tạo đơn đầu tiên để CRM tạo hồ sơ khách");
    await this.crmApi.goi(token, "POST", `/api/khach-hang/${encodeURIComponent(khach.id)}/cham`, { body: { noiDung: noiDung.trim() } });
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "GHI_CHAM_SOC", doiTuong: "giao_khach", doiTuongId: g.id, duLieu: { sdt_chuan: g.sdt_chuan } });
    return { ok: true };
  }

  /** Ket thuc phu trach (khach khong con nhu cau...) — chu phu trach hoac QUAN_LY */
  async ketThuc(nd: ThongTinNguoiDung, sdt: string, lyDo: string): Promise<KhachDuocGiao> {
    const g = await this.damBaoDuocGiao(nd, sdt);
    const sau = await this.repo.ketThuc(g.id, g.ly_do ? `${g.ly_do}\nKết thúc: ${lyDo}` : `Kết thúc: ${lyDo}`);
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "KET_THUC_GIAO_KHACH", doiTuong: "giao_khach", doiTuongId: g.id, duLieu: { ly_do: lyDo } });
    return sangKhachDuocGiao(sau);
  }

  /**
   * Truoc khi tao don (CHUA ghi gi): khach phai dang giao cho minh.
   * - Dang co nguoi phu trach: chi chinh nguoi do (hoac QUAN_LY) tao don duoc.
   * - Chua ai phu trach: Sale / CSKH chi duoc tu tiep nhan khach MOI hoan toan (SDT chua co tren CRM:
   *   khach_hang / don_hang, chua tung co giao_khach hay lead). Khach da co -> 403, QUAN_LY phai phan bo.
   * Viec ghi giao_khach (tu tiep nhan) chi lam SAU khi CRM tao don thanh cong — xem tiepNhanSauTaoDon.
   */
  async damBaoDuocBan(nd: ThongTinNguoiDung, sdt: string): Promise<KetQuaKiemBan> {
    const sdtChuan = chuanHoaSdt(sdt);
    if (!laSdtHopLe(sdtChuan)) throw new BadRequestException("Số điện thoại khách không hợp lệ");
    const dangCo = await this.repo.timDangPhuTrachKemMaGioiThieu(sdtChuan);
    if (dangCo) {
      if (dangCo.ho_so_id !== nd.id && !laQuanLy(nd)) throw new ForbiddenException(LOI_KHACH_CHUA_GIAO);
      return { giaoKhachId: dangCo.id, leadMaGioiThieu: dangCo.lead?.ma_gioi_thieu ?? null, canTiepNhan: false };
    }
    if (!laQuanLy(nd) && (await this.laKhachDaCo(sdtChuan))) throw new ForbiddenException(LOI_KHACH_CHUA_GIAO);
    return { giaoKhachId: null, leadMaGioiThieu: null, canTiepNhan: true };
  }

  /** SDT da ton tai o dau do (CRM khach_hang / don_hang, giao_khach cu, lead) -> khong phai khach moi */
  private async laKhachDaCo(sdtChuan: string): Promise<boolean> {
    const [thienKhue, crm, don] = await Promise.all([
      this.repo.daCoTrongThienKhue(sdtChuan),
      this.crmDoc.layKhachTheoSdt(sdtChuan),
      this.crmDoc.layDonTheoSdt(sdtChuan, 1)
    ]);
    return Boolean(thienKhue.giaoCu || thienKhue.lead || crm || don.length);
  }

  /**
   * Sau khi CRM da tao don cho khach chua ai phu trach: ghi giao_khach (THU_CONG) cho nguoi chot.
   * Khong nem loi (don CRM da tao) — tra canh bao de quan ly doi soat neu khong ghi duoc
   * hoac khach vua bi giao cho nguoi khac trong luc tao don.
   */
  async tiepNhanSauTaoDon(nd: ThongTinNguoiDung, sdt: string, tenKhach: string): Promise<{ giaoKhachId: string | null; canhBao: string | null }> {
    try {
      const kq = await this.phanBo.giaoKhach({
        sdt,
        tenKhach,
        hoSoId: nd.id,
        nguon: NguonGiaoKhach.THU_CONG,
        lyDo: "Tự tiếp nhận khi tạo đơn",
        nguoiGiaoId: nd.id,
        vaiUuTien: ["SALE"]
      });
      if (kq.ho_so_id === nd.id && kq.giao_khach_id) return { giaoKhachId: kq.giao_khach_id, canhBao: null };
      return { giaoKhachId: null, canhBao: "Khách vừa được giao cho người khác trong lúc tạo đơn — báo quản lý đối soát" };
    } catch (e) {
      return {
        giaoKhachId: null,
        canhBao: `Chưa ghi được khách vào danh sách phụ trách của bạn (${e instanceof Error ? e.message : String(e)}) — báo quản lý phân bổ`
      };
    }
  }
}

/** Ma gioi thieu tim thay (ma_gioi_thieu cua CTV / KOC / KOL) */
export interface MaGioiThieuTimThay {
  id: string;
  ma: string;
  ho_so_id: string;
}
/**
 * Luat "mot don mot nguoi ban" khi Sale chot don:
 * - khong co ma gioi thieu, hoac ma cua chinh nguoi chot -> HOP_LE, nguoi ban = nguoi chot;
 * - ma gioi thieu cua nguoi khac -> CHO_XAC_MINH, CHUA ghi nguoi ban (de nguoi phu trach tham dinh, khong tu chi tra hai lan).
 */
export function xacDinhGhiNhan(
  nguoiChotId: string,
  ma: MaGioiThieuTimThay | null
): { trang_thai: TrangThaiGhiNhan; nguon: NguonDon; nguoi_ban_ho_so_id: string | null; ly_do: string | null } {
  if (!ma || ma.ho_so_id === nguoiChotId) {
    return { trang_thai: "HOP_LE", nguon: "SALE", nguoi_ban_ho_so_id: nguoiChotId, ly_do: null };
  }
  return {
    trang_thai: "CHO_XAC_MINH",
    nguon: "SALE",
    nguoi_ban_ho_so_id: null,
    ly_do: `Mã giới thiệu ${ma.ma} thuộc người khác người chốt đơn — chờ xác minh, không tự chi trả`
  };
}
/**
 * Tao don qua CRM (Bearer nguoi dung): kiem khach duoc giao, kiem quyen SKU cho MOI ma trong don,
 * goi CRM POST /api/don-hang, (khach moi) ghi giao_khach sau khi CRM thanh cong, roi ghi ghi_nhan_don (nguon SALE) theo luat mot don mot nguoi ban.
 */
@Injectable()
export class DonService {
  private readonly logger = new Logger("DonService");

  constructor(
    private readonly repo: DonRepository,
    private readonly crmDoc: CrmDocService,
    private readonly crmApi: CrmApiClient,
    private readonly quyenSku: QuyenSkuService,
    private readonly khach: KhachService,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService,
    /** Mang-luoi: nguon luat duy nhat cho ma gioi thieu hop le + hoa hong (theo SKU duoc quyen, ty le rieng SKU) */
    @Optional() private readonly ghiNhanDon?: GhiNhanDonService
  ) {}

  /** Mau minh duoc quyen (HOAT_DONG) — form tao don chi hien cac ma nay */
  async mauDuocPhep(hoSoId: string): Promise<MauDuocPhep[]> {
    const ids = await this.quyenSku.layMauDuocPhep(hoSoId);
    const ds = await this.crmDoc.layMauTheoIds(ids);
    return ds
      .filter(m => m.trang_thai !== "ngung")
      .map(m => ({ id: m.id, ma: m.ma, ten: m.ten, gia_ban: m.gia_ban, anh_url: m.anh_url, trang_thai: m.trang_thai, cau_tu_van: m.cau_tu_van }));
  }

  async tonKho(hoSoId: string, mauId: string): Promise<TonKhoMau[]> {
    await this.quyenSku.kiem(hoSoId, mauId, "TU_VAN");
    return this.crmDoc.layTonKho(mauId);
  }

  /** Nem 403 neu co ma nao chua duoc quyen — neu ro tung ma */
  async kiemQuyenMoiMa(hoSoId: string, mauIds: string[]): Promise<Map<string, { ma: string; gia_ban: number | null }>> {
    const duyNhat = [...new Set(mauIds)];
    const ds = await this.crmDoc.layMauTheoIds(duyNhat);
    const theoId = new Map(ds.map(m => [m.id, m]));
    const khongThay = duyNhat.filter(id => !theoId.has(id));
    if (khongThay.length) throw new BadRequestException("Có dòng hàng chọn mẫu không tồn tại trên CRM");
    const ngung = ds.filter(m => m.trang_thai === "ngung").map(m => m.ma);
    if (ngung.length) throw new BadRequestException(`Mẫu đã ngừng bán: ${ngung.join(", ")}`);

    const thieu: string[] = [];
    for (const id of duyNhat) if (!(await this.quyenSku.coQuyen(hoSoId, id))) thieu.push(theoId.get(id)!.ma);
    if (thieu.length) {
      throw new ForbiddenException(
        `Bạn chưa được cấp quyền bán mã: ${thieu.sort().join(", ")} — hãy học và đạt khoá sản phẩm (hoặc học lại nếu tài liệu vừa cập nhật) trước khi bán`
      );
    }
    return new Map(ds.map(m => [m.id, { ma: m.ma, gia_ban: m.gia_ban }]));
  }

  private async timMaGioiThieu(ma: string | null | undefined): Promise<MaGioiThieuTimThay | null> {
    const m = ma?.trim();
    if (!m) return null;
    if (this.ghiNhanDon) {
      const tim = await this.ghiNhanDon.timChuMa(m);
      return tim ? { id: tim.id, ma: tim.ma, ho_so_id: tim.chu.hoSoId } : null;
    }
    return this.repo.timMaGioiThieuDangBat(m);
  }

  async taoDon(nd: ThongTinNguoiDung, dto: TaoDonDto, token: string): Promise<KetQuaTaoDon> {
    if (!nd.hoSo.crm_user_id) throw new ForbiddenException("Tài khoản chưa liên kết nhân sự CRM nên chưa tạo đơn được");

    // 1. Quyen SKU cho MOI ma (truoc moi thao tac ghi)
    const mau = await this.kiemQuyenMoiMa(nd.id, dto.dong.map(d => d.mau_id));

    // 2. Ma gioi thieu (nhap tay) phai ton tai — kiem truoc khi tao don CRM
    const maNhap = await this.timMaGioiThieu(dto.ma_gioi_thieu);
    if (dto.ma_gioi_thieu?.trim() && !maNhap) throw new BadRequestException(`Mã giới thiệu ${dto.ma_gioi_thieu.trim()} không tồn tại hoặc đã tắt`);

    // 3. Khach phai duoc giao cho minh; khach MOI hoan toan duoc tu tiep nhan — CHUA ghi giao_khach o buoc nay
    const sdtChuan = chuanHoaSdt(dto.khach_sdt);
    const giao = await this.khach.damBaoDuocBan(nd, sdtChuan);
    const ma = maNhap ?? (await this.timMaGioiThieu(giao.leadMaGioiThieu));

    // 4. Tao don tren CRM bang token nguoi dung (CRM ap luat / quyen / trigger)
    const dong = dto.dong.map(d => {
      const donGia = d.don_gia ?? mau.get(d.mau_id)?.gia_ban ?? null;
      if (donGia === null) throw new BadRequestException(`Mã ${mau.get(d.mau_id)?.ma ?? ""} chưa có giá bán — nhập đơn giá`);
      return { mau_id: d.mau_id, size: d.size?.trim() || undefined, mau_sac: d.mau_sac?.trim() || undefined, so_luong: d.so_luong, don_gia: Math.round(donGia) };
    });
    const tongTien = dong.reduce((t, d) => t + d.so_luong * d.don_gia, 0);
    const don = await this.crmApi.taoDon(token, {
      kenh: dto.kenh,
      khach_ten: dto.khach_ten.trim(),
      khach_sdt: sdtChuan,
      khach_dia_chi: dto.khach_dia_chi?.trim() || undefined,
      ghi_chu: dto.ghi_chu?.trim() || undefined,
      dong
    });

    // 5. Khach moi: chi ghi giao_khach SAU khi CRM tao don thanh cong (CRM loi -> khong ai tu nhan khach)
    const dsCanhBao: string[] = [];
    let giaoKhachId = giao.giaoKhachId;
    if (giao.canTiepNhan) {
      const tn = await this.khach.tiepNhanSauTaoDon(nd, sdtChuan, dto.khach_ten.trim());
      giaoKhachId = tn.giaoKhachId;
      if (tn.canhBao) dsCanhBao.push(`Đơn ${don.ma_don}: ${tn.canhBao}`);
    }

    // 6. Ghi nhan nguoi ban — CRM da tao don nen loi o day KHONG nem (tra canh bao de doi soat tay)
    const luat = xacDinhGhiNhan(nd.id, ma);
    let ghiNhan: KetQuaTaoDon["ghi_nhan"] = { id: null, trang_thai: null, ly_do: null };
    try {
      const gn = await this.repo.chayTrongGiaoDich(async tx => {
        const tao = await this.repo.taoGhiNhanDon(
          {
            crmDonId: don.id,
            maDon: don.ma_don,
            sdtChuan,
            tongTien,
            nguoiBanHoSoId: luat.nguoi_ban_ho_so_id,
            nguon: luat.nguon,
            maGioiThieu: ma?.ma ?? null,
            maGioiThieuId: ma?.id ?? null,
            nguoiChotHoSoId: nd.id,
            trangThai: luat.trang_thai,
            lyDo: luat.ly_do
          },
          tx
        );
        await this.nhatKy.ghi(
          {
            hoSoId: nd.id,
            hanhDong: "TAO_DON_CRM",
            doiTuong: "ghi_nhan_don",
            doiTuongId: tao.id,
            duLieu: {
              crm_don_id: don.id,
              ma_don: don.ma_don,
              giao_khach_id: giaoKhachId,
              tong_tien: tongTien,
              ma_mau: [...new Set(dto.dong.map(d => mau.get(d.mau_id)?.ma ?? d.mau_id))],
              trang_thai: luat.trang_thai,
              ma_gioi_thieu: ma?.ma ?? null
            }
          },
          tx
        );
        return tao;
      });
      ghiNhan = { id: gn.id, trang_thai: luat.trang_thai as "HOP_LE" | "CHO_XAC_MINH", ly_do: luat.ly_do };
      if (luat.trang_thai === "CHO_XAC_MINH") await this.baoCanXacMinh(don.ma_don, luat.ly_do ?? "", ma);
      else if (this.ghiNhanDon) {
        // HOP_LE: tao hoa hong ngay theo luat mang-luoi (loi -> job dong bo tao bu, khong bao loi cho Sale)
        await this.ghiNhanDon.taoHoaHongNeuThieu(gn.id, nd.id).catch(e => this.logger.warn(`Chưa tạo được hoa hồng đơn ${don.ma_don}: ${e instanceof Error ? e.message : String(e)}`));
      }
    } catch (e) {
      this.logger.error(`Đơn ${don.ma_don} đã tạo trên CRM nhưng ghi nhận lỗi: ${e instanceof Error ? e.message : String(e)}`);
      dsCanhBao.push(`Đơn ${don.ma_don} đã tạo trên CRM nhưng chưa ghi nhận người bán — báo quản lý đối soát`);
    }

    const canhBao = dsCanhBao.length ? dsCanhBao.join(" · ") : null;
    return { crm_don_id: don.id, ma_don: don.ma_don, tong_tien: tongTien, ghi_nhan: ghiNhan, canh_bao: canhBao };
  }

  /** Bao QUAN_LY + nguoi so huu ma gioi thieu: don cho xac minh */
  private async baoCanXacMinh(maDon: string, lyDo: string, ma: MaGioiThieuTimThay | null) {
    try {
      const ql = await this.repo.quanLyHoatDong();
      const nguoiNhan = [...ql, ...(ma ? [ma.ho_so_id] : [])];
      await this.thongBao.guiNhieu(nguoiNhan, { loai: LoaiThongBao.DON_HANG, tieuDe: `Đơn ${maDon} chờ xác minh người bán`, noiDung: lyDo });
    } catch (e) {
      this.logger.warn(`Không gửi được thông báo xác minh đơn ${maDon}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Don minh da chot (ghi_nhan_don) — de hien "Đơn của tôi" */
  async donCuaToi(hoSoId: string, gioiHan = 50) {
    return this.repo.donDaChot(hoSoId, Math.min(Math.max(gioiHan, 1), 200));
  }
}

/*
 * Ho tro chuyen mon cho KOL / KOC: KOL/KOC gui yeu cau (gop y kich ban, kien thuc san pham...) -> giao cho
 * mot Sale / CSKH dang trong ca (uu tien nguoi co quyen ma SKU lien quan, it viec nhat).
 * Luu o bang thien_khue.yeu_cau_ho_tro (trang_thai MO | DA_XU_LY); nguoi ho tro duoc bao bang thong_bao.
 */

@Injectable()
export class HoTroService {
  constructor(
    private readonly repo: HoTroRepository,
    private readonly phanBo: PhanBoService,
    private readonly thongBao: ThongBaoService,
    private readonly nhatKy: NhatKyService
  ) {}

  private async sangYeuCau(ds: yeu_cau_ho_tro[]): Promise<YeuCauHoTro[]> {
    const ids = [...new Set(ds.flatMap(y => [y.nguoi_gui_id, y.nguoi_ho_tro_id]))];
    const hs = ids.length ? await this.repo.tenHoSo(ids) : [];
    const ten = new Map(hs.map(h => [h.id, h.ho_ten]));
    return ds.map(y => ({
      id: y.id,
      nguoi_gui_id: y.nguoi_gui_id,
      nguoi_gui_ten: ten.get(y.nguoi_gui_id) ?? "",
      nguoi_ho_tro_id: y.nguoi_ho_tro_id,
      nguoi_ho_tro_ten: ten.get(y.nguoi_ho_tro_id) ?? null,
      ma_mau: y.ma_mau,
      noi_dung: y.noi_dung,
      lien_ket: y.lien_ket,
      da_xu_ly: y.trang_thai === "DA_XU_LY",
      tra_loi: y.tra_loi,
      created_at: y.created_at.toISOString(),
      xu_ly_luc: y.xu_ly_luc?.toISOString() ?? null
    }));
  }

  /** So yeu cau dang MO cua tung nguoi (tai ho tro) */
  private async demMo(tx: Prisma.TransactionClient, ids: string[]): Promise<Map<string, number>> {
    if (!ids.length) return new Map();
    const nhom = await this.repo.demMoTheoNguoi(ids, tx);
    return new Map(nhom.map(n => [n.nguoi_ho_tro_id, n._count._all]));
  }

  /** KOL / KOC gui yeu cau ho tro */
  async tao(nd: ThongTinNguoiDung, dto: TaoYeuCauHoTroDto): Promise<YeuCauHoTro> {
    const maMau = dto.ma_mau?.trim().toUpperCase() || null;
    const yc = await this.repo.chayTrongGiaoDich(async tx => {
      let { ds, moTaNangLuc } = await this.phanBo.layUngVien(tx, { vai: VAI_BAN_HANG, maMau });
      if (!ds.length && maMau) ({ ds, moTaNangLuc } = await this.phanBo.layUngVien(tx, { vai: VAI_BAN_HANG }));
      ds = ds.filter(u => u.hoSoId !== nd.id);
      // Tai = so yeu cau ho tro dang mo (khong tinh khach) — bo qua gioi han khach cua ca
      const mo = await this.demMo(tx, ds.map(u => u.hoSoId));
      const chon = chonNguoiPhuTrach(
        ds.map(u => ({ ...u, tai: mo.get(u.hoSoId) ?? 0, toiDaTrongCa: null })),
        moTaNangLuc
      );
      let nguoiHoTro = chon?.ungVien.hoSoId ?? null;
      if (!nguoiHoTro) {
        // Ngoai ca: giao cho Sale / CSKH dang hoat dong bat ky (it yeu cau mo nhat)
        const hoatDong = await this.repo.hoSoCoVaiHoatDong(VAI_BAN_HANG, tx);
        const ids = [...new Set(hoatDong.map(h => h.ho_so_id))].filter(id => id !== nd.id);
        if (!ids.length) return null;
        const moTatCa = await this.demMo(tx, ids);
        nguoiHoTro = ids.sort((a, b) => (moTatCa.get(a) ?? 0) - (moTatCa.get(b) ?? 0) || a.localeCompare(b))[0]!;
      }
      return this.repo.tao(
        {
          nguoi_gui_id: nd.id,
          nguoi_ho_tro_id: nguoiHoTro,
          ma_mau: maMau,
          noi_dung: dto.noi_dung.trim(),
          lien_ket: dto.lien_ket?.trim() || null
        },
        tx
      );
    });
    if (!yc) throw new ConflictException("Hiện chưa có Sale / CSKH nào để hỗ trợ, thử lại sau");

    await this.thongBao.gui({
      hoSoId: yc.nguoi_ho_tro_id,
      loai: LoaiThongBao.HE_THONG,
      tieuDe: `Yêu cầu hỗ trợ từ ${nd.hoSo.ho_ten}${maMau ? ` · mã ${maMau}` : ""}`,
      noiDung: yc.noi_dung,
      lienKet: "/lam-viec/ban-hang/ho-tro",
      duLieu: { yeu_cau_ho_tro_id: yc.id }
    });
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "TAO_YEU_CAU_HO_TRO", doiTuong: "yeu_cau_ho_tro", doiTuongId: yc.id, duLieu: { nguoi_ho_tro_id: yc.nguoi_ho_tro_id, ma_mau: maMau } });
    return (await this.sangYeuCau([yc]))[0]!;
  }

  /** Sale / CSKH: yeu cau giao cho minh; QUAN_LY: tat ca */
  async danhSachDuocGiao(nd: ThongTinNguoiDung, chiChuaXuLy = false): Promise<YeuCauHoTro[]> {
    const ds = await this.repo.danhSachDuocGiao({ nguoiHoTroId: laQuanLy(nd) ? undefined : nd.id, chiChuaXuLy });
    return this.sangYeuCau(ds);
  }

  /** KOL / KOC: yeu cau minh da gui */
  async danhSachDaGui(nd: ThongTinNguoiDung): Promise<YeuCauHoTro[]> {
    const ds = await this.repo.danhSachDaGui(nd.id);
    return this.sangYeuCau(ds);
  }

  async demChuaXuLy(hoSoId: string): Promise<number> {
    return this.repo.demChuaXuLy(hoSoId);
  }

  /** Nguoi duoc giao (hoac QUAN_LY) tra loi -> danh dau da xu ly + bao lai KOL / KOC */
  async traLoi(nd: ThongTinNguoiDung, id: string, traLoi: string): Promise<YeuCauHoTro> {
    const yc = await this.repo.timTheoId(id, laQuanLy(nd) ? undefined : nd.id);
    if (!yc) throw new NotFoundException("Không tìm thấy yêu cầu hỗ trợ");
    const sau = await this.repo.danhDauDaXuLy(id, traLoi.trim());
    await this.thongBao.gui({
      hoSoId: yc.nguoi_gui_id,
      loai: LoaiThongBao.HE_THONG,
      tieuDe: `${nd.hoSo.ho_ten} đã trả lời yêu cầu hỗ trợ`,
      noiDung: sau.tra_loi ?? undefined,
      lienKet: "/lam-viec/mang-luoi/ho-tro",
      duLieu: { yeu_cau_ho_tro_id: id }
    });
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "TRA_LOI_HO_TRO", doiTuong: "yeu_cau_ho_tro", doiTuongId: id });
    return (await this.sangYeuCau([sau]))[0]!;
  }
}

/** Hop viec hom nay cua Sale / CSKH — chi du lieu cua chinh minh */
@Injectable()
export class HopViecService {
  constructor(
    private readonly repo: HopViecRepository,
    private readonly hoTro: HoTroService
  ) {}

  async layHopViec(nd: ThongTinNguoiDung): Promise<HopViecHomNay> {
    const bayGio = new Date();
    const { ngay } = bayGioVn(bayGio);
    const dauNgay = dauNgayVn(bayGio);
    const [{ ca, tongPhuTrach, khachMoi, lead, donNhom, choXacMinh }, hoTroMo] = await Promise.all([
      this.repo.duLieuHomNay(nd.id, ngayDb(ngay), dauNgay),
      this.hoTro.demChuaXuLy(nd.id)
    ]);
    const caHomNay = ca.map(c => sangCaTruc(c, bayGio));
    const ten = new Map([[nd.id, nd.hoSo.ho_ten]]);
    return {
      ngay,
      ca_hom_nay: caHomNay,
      ca_hien_tai: caHomNay.find(c => c.dang_dien_ra) ?? null,
      tong_dang_phu_trach: tongPhuTrach,
      khach_moi_hom_nay: khachMoi.map(sangKhachDuocGiao),
      lead_can_lien_he: lead.map(l => sangLead(l, ten)),
      yeu_cau_ho_tro_mo: hoTroMo,
      don_hom_nay: {
        so_don: donNhom._count._all,
        tong_tien: Number(donNhom._sum.tong_tien ?? 0),
        cho_xac_minh: choXacMinh
      }
    };
  }
}
