// Quan tri: ap dung de xuat da duyet (chay trong transaction duyet). Lop: ApDungDeXuatService.
import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { LoaiDeXuat, NguonDon, Prisma, TrangThaiVai, Vai, type de_xuat_duyet } from "@prisma/client";
import { CrmDocService } from "../infrastructure/crm/crm-doc.service";
import { NhatKyService, ThongBaoService } from "./core.service";
import { DieuKienHocService } from "./ho-so-vai.service";
import { kiemChuyenVai, kiemVaiKhongTuCrm, VAI_PHAI_HOC } from "../common/utils/quan-tri";
import { tachNguoiNhapMa } from "../common/utils/mang-luoi";
import { ApDungDeXuatRepository, type Db } from "../repositories/quan-tri.repository";

/*
 * Handler AP DUNG quyet dinh cho tung loai de xuat (2 hoac 3 buoc — nguoi_kiem_id co the null) — chay TRONG transaction duyet (loi -> rollback ca quyet dinh).
 * Ghi thang bang cua module khac qua ApDungDeXuatRepository (quan-tri la noi duy nhat ap quyet dinh da duyet):
 *   CHUYEN_VAI     -> vai_tro_ho_so + lich_su_vai_tro            (bang cua ho-so)
 *   CAP_QUYEN_SKU  -> quyen_sku (kem bang chung hoc dat)          (bang cua dao-tao)
 *   DUYET_QUA_TANG -> qua_tang;  DUYET_VOUCHER -> voucher        (bang cua khach-doi-tac)
 *   XAC_MINH_DON   -> ghi_nhan_don + hoa_hong (ty le hien hanh)   (bang cua mang-luoi)
 *   DOI_CHINH_SACH -> ty_le_hoa_hong / hang_thanh_vien_cau_hinh
 *   CHI_TRA_HOA_HONG -> hoa_hong DU_DIEU_KIEN -> DA_TRA (dung danh sach da duyet; thieu khoan nao -> rollback)
 * Loai khac (DIEU_CHINH_HOA_HONG, KICH_HOAT_LAM_VIEC...): chi ghi quyet dinh, module so huu doc trang thai.
 */

type Tx = Prisma.TransactionClient;

const VAI_HOP_LE = Object.values(Vai) as string[];
const TRANG_THAI_VAI_HOP_LE = Object.values(TrangThaiVai) as string[];
const NGUON_HOP_LE = Object.values(NguonDon) as string[];
const VAI_CO_HOA_HONG: Vai[] = ["SALE", "CSKH", "CTV", "THUC_TAP", "KOL", "KOC"];

export interface DeXuatChuanBi {
  doi_tuong: string;
  doi_tuong_id: string | null;
  du_lieu: Prisma.InputJsonObject;
}

export interface BoiCanhApDung {
  tx: Tx;
  dx: de_xuat_duyet;
  nguoiDuyetId: string;
  yKien: string | null;
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const chuoi = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KY_HOP_LE = /^\d{4}-(0[1-9]|1[0-2])$/;
const mangChuoi = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x) : []);

function canUuid(v: unknown, ten: string): string {
  const s = chuoi(v);
  if (!s || !UUID.test(s)) throw new BadRequestException(`Thiếu hoặc sai ${ten}`);
  return s.toLowerCase();
}

/** Ky doi soat "YYYY-MM" theo gio Viet Nam */
export function kyHienTai(luc = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(luc);
  return `${p.find(x => x.type === "year")?.value}-${p.find(x => x.type === "month")?.value}`;
}

/** Nguon don theo vai cua nguoi ban (KOL/KOC rieng, CTV + thuc tap = CTV, con lai SALE) */
export function suyNguon(vai: Vai[]): NguonDon {
  if (vai.includes("KOL")) return "KOL";
  if (vai.includes("KOC")) return "KOC";
  if (vai.includes("CTV") || vai.includes("THUC_TAP")) return "CTV";
  return "SALE";
}

/** Tien hoa hong = lam tron(tong_tien * ty_le%) — dong nguyen */
export function tinhHoaHong(tongTien: number, tyLe: number): number {
  return Math.max(0, Math.round((tongTien * tyLe) / 100));
}

@Injectable()
export class ApDungDeXuatService {
  constructor(
    private readonly repo: ApDungDeXuatRepository,
    private readonly crmDoc: CrmDocService,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService,
    // Thieu (vd test cu) -> fail-closed: khong kich hoat vai phai hoc
    @Optional() private readonly dieuKienHoc?: DieuKienHocService
  ) {}

  /**
   * Vai phai hoc chi duoc HOAT_DONG khi CON dat dieu kien hoc (cung luat XetDatService: hoc xong, thi bat buoc >= nguong,
   * thuc hanh duoc duyet) — ke ca tu TAM_DUNG (DANG_HOC -> TAM_DUNG -> HOAT_DONG khong con la loi tat).
   */
  private async kiemHocDat(hoSoId: string, vai: Vai, moi: TrangThaiVai): Promise<void> {
    if (moi !== "HOAT_DONG" || !VAI_PHAI_HOC.includes(vai)) return;
    if (!this.dieuKienHoc) throw new BadRequestException("Chưa kiểm được điều kiện học — không kích hoạt vai này");
    const kq = await this.dieuKienHoc.kiem(hoSoId, vai);
    if (!kq.dat) {
      throw new BadRequestException({ message: "Hồ sơ chưa đủ điều kiện học để hoạt động vai này (học xong, thi đạt ≥ 90%, bài thực hành được duyệt)", details: kq.con_thieu });
    }
  }

  // ================================================================ CHUAN BI (luc tao de xuat)

  /** Kiem + chuan hoa du_lieu khi lap de xuat. Luu kem gia tri "truoc" de nguoi kiem / duyet so sanh. */
  async chuanBi(loai: LoaiDeXuat, doiTuongId: string | null | undefined, duLieuVao: Record<string, unknown>, doiTuongVao?: string): Promise<DeXuatChuanBi> {
    switch (loai) {
      case "CHUYEN_VAI":
        return this.chuanBiChuyenVai(doiTuongId, duLieuVao);
      case "CAP_QUYEN_SKU":
        return this.chuanBiQuyenSku(doiTuongId, duLieuVao);
      case "DUYET_QUA_TANG":
        return this.chuanBiQua(doiTuongId, duLieuVao);
      case "DUYET_VOUCHER":
        return this.chuanBiVoucher(doiTuongId, duLieuVao);
      case "XAC_MINH_DON":
        return this.chuanBiXacMinhDon(doiTuongId, duLieuVao);
      case "DOI_CHINH_SACH":
        return this.chuanBiChinhSach(duLieuVao);
      case "CHI_TRA_HOA_HONG":
        return this.chuanBiChiTra(duLieuVao);
      default:
        return {
          doi_tuong: chuoi(doiTuongVao) ?? "khac",
          doi_tuong_id: chuoi(doiTuongId),
          du_lieu: duLieuVao as Prisma.InputJsonObject
        };
    }
  }

  private async chuanBiChuyenVai(doiTuongId: string | null | undefined, d: Record<string, unknown>): Promise<DeXuatChuanBi> {
    const hoSoId = canUuid(doiTuongId ?? d.ho_so_id, "hồ sơ");
    const vai = chuoi(d.vai ?? d.vai_moi);
    if (!vai || !VAI_HOP_LE.includes(vai)) throw new BadRequestException("Vai trò không hợp lệ");
    const trangThaiVao = chuoi(d.trang_thai_moi ?? d.trang_thai_vai_moi);
    const moi = (trangThaiVao ?? (VAI_PHAI_HOC.includes(vai as Vai) ? "DANG_HOC" : "HOAT_DONG")) as TrangThaiVai;
    if (!TRANG_THAI_VAI_HOP_LE.includes(moi)) throw new BadRequestException("Trạng thái vai không hợp lệ");
    const tuVai = chuoi(d.tu_vai);
    if (tuVai && !VAI_HOP_LE.includes(tuVai)) throw new BadRequestException("Vai cũ không hợp lệ");
    // Vai lay tu CRM: cap / ket thuc o CRM (Quan tri nhan su), khong qua de xuat
    kiemVaiKhongTuCrm(vai as Vai);
    kiemVaiKhongTuCrm(tuVai as Vai | null);

    const hoSo = await this.repo.hoSoKemVai(hoSoId);
    if (!hoSo) throw new NotFoundException("Không tìm thấy hồ sơ");
    const cu = hoSo.vai_tro.find(v => v.vai === vai)?.trang_thai ?? null;
    kiemChuyenVai(vai as Vai, cu, moi);
    await this.kiemHocDat(hoSoId, vai as Vai, moi);
    return {
      doi_tuong: "ho_so",
      doi_tuong_id: hoSoId,
      du_lieu: { ho_so_id: hoSoId, ho_ten: hoSo.ho_ten, vai, trang_thai_cu: cu, trang_thai_moi: moi, ...(tuVai && tuVai !== vai ? { tu_vai: tuVai } : {}) }
    };
  }

  private async chuanBiQuyenSku(doiTuongId: string | null | undefined, d: Record<string, unknown>): Promise<DeXuatChuanBi> {
    const hoSoId = canUuid(doiTuongId ?? d.ho_so_id, "hồ sơ");
    const mauId = canUuid(d.mau_id, "sản phẩm (mau_id)");
    const moi = chuoi(d.trang_thai_moi) ?? "HOAT_DONG";
    if (moi !== "HOAT_DONG" && moi !== "THU_HOI") throw new BadRequestException("Chỉ đề xuất cấp (HOAT_DONG) hoặc thu hồi (THU_HOI) quyền SKU");
    const [hoSo, mau, hienTai] = await Promise.all([
      this.repo.hoSoTen(hoSoId),
      this.crmDoc.layMau(mauId),
      this.repo.quyenSkuHienTai(hoSoId, mauId)
    ]);
    if (!hoSo) throw new NotFoundException("Không tìm thấy hồ sơ");
    if (!mau) throw new NotFoundException("Không tìm thấy sản phẩm trong CRM");
    let bangChung: Prisma.InputJsonObject | null = null;
    if (moi === "HOAT_DONG") {
      if (mau.trang_thai === "ngung") throw new BadRequestException(`Mã ${mau.ma} đã ngừng bán`);
      if (hienTai?.trang_thai === "HOAT_DONG") throw new ConflictException(`Hồ sơ đã có quyền bán mã ${mau.ma}`);
      bangChung = await this.timBangChungSku(hoSoId, mauId, mau.ma);
    } else if (!hienTai || hienTai.trang_thai === "THU_HOI") {
      throw new ConflictException(`Hồ sơ chưa có quyền mã ${mau.ma} để thu hồi`);
    }
    return {
      doi_tuong: "ho_so",
      doi_tuong_id: hoSoId,
      du_lieu: { ho_so_id: hoSoId, ho_ten: hoSo.ho_ten, mau_id: mauId, ma_mau: mau.ma, ten_mau: mau.ten, trang_thai_cu: hienTai?.trang_thai ?? null, trang_thai_moi: moi, bang_chung: bangChung }
    };
  }

  /**
   * Bang chung hoc dat khoa SAN_PHAM cua mau: luot lam dat (≥ nguong, dung phien ban tai lieu hien hanh)
   * + bai thuc hanh DAT neu khoa yeu cau. Thieu -> 400 (hoc truoc khi ban, khong cap tay vuot).
   */
  async timBangChungSku(hoSoId: string, mauId: string, maMau: string, db?: Db): Promise<Prisma.InputJsonObject> {
    const khoa = await this.repo.khoaSanPhamCuaMau(mauId, db);
    if (!khoa) throw new BadRequestException(`Mã ${maMau} chưa có khoá học sản phẩm — chưa thể cấp quyền bán`);
    const dsBai = khoa.bai_kiem_tra.map(b => b.id);
    const luot = dsBai.length
      ? await this.repo.luotDatTotNhat({ hoSoId, baiKiemTraIds: dsBai, phienBanTaiLieu: khoa.phien_ban_tai_lieu }, db)
      : null;
    if (dsBai.length && !luot) throw new BadRequestException(`Hồ sơ chưa thi đạt bài kiểm tra mã ${maMau} (phiên bản tài liệu ${khoa.phien_ban_tai_lieu})`);
    let thucHanh: { id: string; nguoi_cham_id: string | null; nhan_xet: string | null; cham_luc: Date | null; diem: number | null } | null = null;
    if (khoa.can_thuc_hanh) {
      thucHanh = await this.repo.thucHanhDatGanNhat(hoSoId, khoa.id, db);
      if (!thucHanh) throw new BadRequestException(`Bài thực hành mã ${maMau} chưa được duyệt đạt`);
    }
    return {
      khoa_hoc_id: khoa.id,
      khoa_hoc: khoa.ten,
      phien_ban_tai_lieu: khoa.phien_ban_tai_lieu,
      luot_lam_id: luot?.id ?? null,
      diem: luot?.diem ?? null,
      nop_luc: luot?.nop_luc?.toISOString() ?? null,
      bai_thuc_hanh_id: thucHanh?.id ?? null,
      nguoi_cham_id: thucHanh?.nguoi_cham_id ?? null,
      nhan_xet: thucHanh?.nhan_xet ?? null,
      duyet_thuc_hanh_luc: thucHanh?.cham_luc?.toISOString() ?? null
    };
  }

  private async chuanBiQua(doiTuongId: string | null | undefined, d: Record<string, unknown>): Promise<DeXuatChuanBi> {
    const id = canUuid(doiTuongId, "quà tặng");
    const qua = await this.repo.quaTangKemDoiTac(id);
    if (!qua) throw new NotFoundException("Không tìm thấy quà tặng");
    if (qua.trang_thai !== "CHO_THAM_DINH") throw new ConflictException("Quà tặng không ở trạng thái chờ thẩm định");
    return {
      doi_tuong: "qua_tang",
      doi_tuong_id: id,
      du_lieu: { ten: qua.ten, doi_tac: qua.doi_tac?.ten ?? null, gia_tri: qua.gia_tri ? Number(qua.gia_tri) : null, so_luong: qua.so_luong, ghi_chu: chuoi(d.ghi_chu) }
    };
  }

  private async chuanBiVoucher(doiTuongId: string | null | undefined, d: Record<string, unknown>): Promise<DeXuatChuanBi> {
    const id = canUuid(doiTuongId, "voucher");
    const v = await this.repo.voucherKemDoiTac(id);
    if (!v) throw new NotFoundException("Không tìm thấy voucher");
    if (v.trang_thai !== "CHO_THAM_DINH") throw new ConflictException("Voucher không ở trạng thái chờ thẩm định");
    return {
      doi_tuong: "voucher",
      doi_tuong_id: id,
      du_lieu: { ma: v.ma, ten: v.ten, doi_tac: v.doi_tac?.ten ?? null, loai_giam: v.loai_giam, gia_tri: Number(v.gia_tri), ghi_chu: chuoi(d.ghi_chu) }
    };
  }

  private async chuanBiXacMinhDon(doiTuongId: string | null | undefined, d: Record<string, unknown>): Promise<DeXuatChuanBi> {
    const id = canUuid(doiTuongId, "ghi nhận đơn");
    const gn = await this.repo.ghiNhanDon(id);
    if (!gn) throw new NotFoundException("Không tìm thấy ghi nhận đơn");
    if (gn.trang_thai !== "CHO_XAC_MINH") throw new ConflictException("Đơn không ở trạng thái chờ xác minh");
    const ketQua = chuoi(d.ket_qua) ?? "GHI_NHAN";
    if (ketQua !== "GHI_NHAN" && ketQua !== "HUY") throw new BadRequestException("Kết quả xác minh phải là GHI_NHAN hoặc HUY");
    const ungVien = await this.ungVienNguoiBan(gn);
    let nguoiBan: string | null = null;
    let nguon: NguonDon | null = null;
    if (ketQua === "GHI_NHAN") {
      nguoiBan = canUuid(d.nguoi_ban_ho_so_id, "người bán được ghi nhận");
      if (!ungVien.includes(nguoiBan)) throw new BadRequestException("Người bán phải là người chốt đơn hoặc chủ mã giới thiệu của đơn");
      nguon = await this.layNguon(nguoiBan, d.nguon);
    }
    return {
      doi_tuong: "ghi_nhan_don",
      doi_tuong_id: id,
      du_lieu: {
        ma_don: gn.ma_don,
        tong_tien: Number(gn.tong_tien),
        ket_qua: ketQua,
        nguoi_ban_ho_so_id: nguoiBan,
        nguon,
        nguoi_ban_cu_id: gn.nguoi_ban_ho_so_id,
        nguon_cu: gn.nguon,
        nguoi_chot_ho_so_id: gn.nguoi_chot_ho_so_id,
        ma_gioi_thieu: gn.ma_gioi_thieu
      }
    };
  }

  /** Nguoi chot + chu ma gioi thieu + nguoi ban hien tai cua mot ghi nhan don */
  async ungVienNguoiBan(gn: { nguoi_chot_ho_so_id: string | null; nguoi_ban_ho_so_id: string | null; ma_gioi_thieu_id: string | null; ma_gioi_thieu: string | null }, db?: Db): Promise<string[]> {
    const ds = new Set<string>();
    if (gn.nguoi_chot_ho_so_id) ds.add(gn.nguoi_chot_ho_so_id);
    if (gn.nguoi_ban_ho_so_id) ds.add(gn.nguoi_ban_ho_so_id);
    if (gn.ma_gioi_thieu_id || gn.ma_gioi_thieu) {
      const ma = await this.repo.chuMaGioiThieu({ id: gn.ma_gioi_thieu_id, ma: gn.ma_gioi_thieu }, db);
      if (ma) ds.add(ma.ho_so_id);
    }
    return [...ds];
  }

  private async layNguon(hoSoId: string, nguonVao: unknown, db?: Db): Promise<NguonDon> {
    const n = chuoi(nguonVao);
    if (n) {
      if (!NGUON_HOP_LE.includes(n)) throw new BadRequestException("Nguồn đơn không hợp lệ");
      return n as NguonDon;
    }
    const vai = await this.repo.vaiConHieuLuc(hoSoId, db);
    return suyNguon(vai.map(v => v.vai));
  }

  private async chuanBiChinhSach(d: Record<string, unknown>): Promise<DeXuatChuanBi> {
    const loai = chuoi(d.chinh_sach);
    if (loai === "TY_LE_HOA_HONG") {
      const vai = chuoi(d.vai);
      if (!vai || !VAI_CO_HOA_HONG.includes(vai as Vai)) throw new BadRequestException("Vai không áp dụng hoa hồng");
      const tyLe = Number(d.ty_le);
      if (!Number.isFinite(tyLe) || tyLe < 0 || tyLe > 100) throw new BadRequestException("Tỷ lệ hoa hồng phải từ 0 đến 100");
      const tyLeLam = Math.round(tyLe * 100) / 100;
      let mauId: string | null = null;
      let maMau: string | null = null;
      if (d.mau_id) {
        mauId = canUuid(d.mau_id, "sản phẩm (mau_id)");
        const mau = await this.crmDoc.layMau(mauId);
        if (!mau) throw new NotFoundException("Không tìm thấy sản phẩm trong CRM");
        maMau = mau.ma;
      }
      const truoc = await this.tyLeHienHanh(vai as Vai, mauId);
      if (truoc && Number(truoc.ty_le) === tyLeLam) throw new ConflictException("Tỷ lệ mới trùng tỷ lệ hiện hành");
      return {
        doi_tuong: "ty_le_hoa_hong",
        doi_tuong_id: `${vai}:${mauId ?? "*"}`,
        du_lieu: { chinh_sach: "TY_LE_HOA_HONG", vai, mau_id: mauId, ma_mau: maMau, ty_le: tyLeLam, ty_le_truoc: truoc ? Number(truoc.ty_le) : null }
      };
    }
    if (loai === "NGUONG_HANG") {
      const hang = chuoi(d.hang);
      if (hang !== "THAN_THIET" && hang !== "VIP") throw new BadRequestException("Hạng thành viên không hợp lệ");
      const nguong = d.nguong_tich_luy === undefined || d.nguong_tich_luy === null ? null : Number(d.nguong_tich_luy);
      const giam = d.giam_gia_phan_tram === undefined || d.giam_gia_phan_tram === null ? null : Number(d.giam_gia_phan_tram);
      if (nguong === null && giam === null) throw new BadRequestException("Cần ít nhất ngưỡng tích luỹ hoặc mức giảm giá mới");
      if (nguong !== null && (!Number.isInteger(nguong) || nguong < 0)) throw new BadRequestException("Ngưỡng tích luỹ phải là số đồng nguyên ≥ 0");
      if (giam !== null && (!Number.isFinite(giam) || giam < 0 || giam > 100)) throw new BadRequestException("Mức giảm giá phải từ 0 đến 100%");
      const dsHang = await this.repo.dsHangCauHinh();
      const hienTai = dsHang.find(h => h.hang === hang);
      if (!hienTai) throw new NotFoundException("Chưa có cấu hình hạng này");
      kiemThuTuHang(dsHang.map(h => ({ hang: h.hang, nguong: h.hang === hang && nguong !== null ? nguong : Number(h.nguong_tich_luy) })));
      return {
        doi_tuong: "hang_thanh_vien_cau_hinh",
        doi_tuong_id: hang,
        du_lieu: {
          chinh_sach: "NGUONG_HANG",
          hang,
          nguong_tich_luy: nguong,
          giam_gia_phan_tram: giam,
          nguong_truoc: Number(hienTai.nguong_tich_luy),
          giam_gia_truoc: Number(hienTai.giam_gia_phan_tram)
        }
      };
    }
    throw new BadRequestException("chinh_sach phải là TY_LE_HOA_HONG hoặc NGUONG_HANG");
  }

  /** Ty le dang hieu luc cho (vai, mau) — mau_id null = ty le chung */
  async tyLeHienHanh(vai: Vai, mauId: string | null, luc = new Date(), db?: Db) {
    return this.repo.tyLeHienHanh(vai, mauId, luc, db);
  }

  /**
   * CHI_TRA_HOA_HONG: chot danh sach khoan tra trong ky — hoa_hong DU_DIEU_KIEN (ky <= ky chi tra) + dieu_chinh chua tra.
   * Khoan da nam trong de xuat chi tra dang mo / da duyet khong duoc dua vao lan nua (khong tra hai lan).
   * Nguoi co tong am (bi tru nhieu hon duoc nhan) -> de lai ky sau.
   */
  private async chuanBiChiTra(d: Record<string, unknown>): Promise<DeXuatChuanBi> {
    const ky = chuoi(d.ky);
    if (!ky || !KY_HOP_LE.test(ky)) throw new BadRequestException("Kỳ chi trả dạng YYYY-MM");
    const hoSoId = d.ho_so_id ? canUuid(d.ho_so_id, "hồ sơ") : null;
    const idsVao = Array.isArray(d.hoa_hong_ids) ? [...new Set(d.hoa_hong_ids.map(x => canUuid(x, "khoản hoa hồng")))] : null;

    const { hoaHong: hhDaDung, dieuChinh: dcDaDung } = await this.khoanDaVaoChiTra();
    if (idsVao) {
      const trung = idsVao.filter(id => hhDaDung.has(id));
      if (trung.length) throw new ConflictException(`${trung.length} khoản đã nằm trong đề xuất chi trả khác`);
    }
    const hh = await this.repo.hoaHongDuDieuKien({ ky, hoSoId, ids: idsVao });
    if (idsVao && hh.length !== idsVao.length) {
      const co = new Set(hh.map(h => h.id));
      throw new BadRequestException({ message: "Có khoản không đủ điều kiện chi trả (đã trả, bị trừ, chưa đủ điều kiện hoặc khác kỳ)", details: idsVao.filter(id => !co.has(id)) });
    }
    const hhChon = hh.filter(h => !hhDaDung.has(h.id));
    const dc = idsVao
      ? []
      : (await this.repo.dieuChinhChuaTra({ ky, hoSoId })).filter(x => !dcDaDung.has(x.id));

    type Gom = { hh: string[]; dc: string[]; hoa_hong: number; dieu_chinh: number };
    const theoNguoi = new Map<string, Gom>();
    const lay = (id: string): Gom => {
      let n = theoNguoi.get(id);
      if (!n) {
        n = { hh: [], dc: [], hoa_hong: 0, dieu_chinh: 0 };
        theoNguoi.set(id, n);
      }
      return n;
    };
    for (const h of hhChon) {
      const n = lay(h.ho_so_id);
      n.hh.push(h.id);
      n.hoa_hong += Number(h.so_tien);
    }
    for (const x of dc) {
      const n = lay(x.ho_so_id);
      n.dc.push(x.id);
      n.dieu_chinh += Number(x.so_tien);
    }
    const nhan = [...theoNguoi.entries()].filter(([, n]) => n.hoa_hong + n.dieu_chinh >= 0 && (n.hh.length > 0 || n.dc.length > 0));
    if (!nhan.length) throw new BadRequestException("Không có khoản hoa hồng nào đủ điều kiện chi trả trong kỳ này");
    const ten = new Map((await this.repo.tenHoSoTheoIds(nhan.map(([id]) => id))).map(h => [h.id, h.ho_ten]));
    const hoaHongIds = nhan.flatMap(([, n]) => n.hh);
    const dieuChinhIds = nhan.flatMap(([, n]) => n.dc);
    const tongHh = nhan.reduce((t, [, n]) => t + n.hoa_hong, 0);
    const tongDc = nhan.reduce((t, [, n]) => t + n.dieu_chinh, 0);
    return {
      doi_tuong: "hoa_hong",
      doi_tuong_id: `${ky}:${hoSoId ?? "*"}`,
      du_lieu: {
        ky,
        ho_so_id: hoSoId,
        hoa_hong_ids: hoaHongIds,
        dieu_chinh_ids: dieuChinhIds,
        nguoi_nhan_ids: nhan.map(([id]) => id),
        so_khoan: hoaHongIds.length,
        tong_hoa_hong: tongHh,
        tong_dieu_chinh: tongDc,
        tong_tien: tongHh + tongDc,
        theo_nguoi: nhan
          .slice(0, 500)
          .map(([id, n]) => ({ ho_so_id: id, ho_ten: ten.get(id) ?? null, so_khoan: n.hh.length, hoa_hong: n.hoa_hong, dieu_chinh: n.dieu_chinh, tong: n.hoa_hong + n.dieu_chinh }))
      }
    };
  }

  /** id hoa_hong / dieu_chinh da nam trong de xuat CHI_TRA_HOA_HONG dang mo hoac da duyet (tru de xuat dang xet) */
  async khoanDaVaoChiTra(truDeXuatId?: string, db?: Db): Promise<{ hoaHong: Set<string>; dieuChinh: Set<string> }> {
    const ds = await this.repo.deXuatChiTraConHieuLuc(truDeXuatId, db);
    const hoaHong = new Set<string>();
    const dieuChinh = new Set<string>();
    for (const x of ds) {
      const d = obj(x.du_lieu);
      for (const id of mangChuoi(d.hoa_hong_ids)) hoaHong.add(id);
      for (const id of mangChuoi(d.dieu_chinh_ids)) dieuChinh.add(id);
    }
    return { hoaHong, dieuChinh };
  }

  // ================================================================ NGUOI LIEN QUAN (khong duoc tham gia)

  /** Ho so bi anh huong truc tiep boi de xuat — khong duoc kiem / duyet (xung dot loi ich) */
  async nguoiLienQuan(dx: Pick<de_xuat_duyet, "loai" | "doi_tuong" | "doi_tuong_id" | "du_lieu">, db?: Db): Promise<string[]> {
    const ds = new Set(nguoiLienQuanNhanh(dx));
    if (dx.loai === "XAC_MINH_DON" && dx.doi_tuong_id && UUID.test(dx.doi_tuong_id)) {
      const gn = await this.repo.ghiNhanDon(dx.doi_tuong_id, db);
      if (gn) {
        for (const id of await this.ungVienNguoiBan(gn, db)) ds.add(id);
        // Nguoi nhap tay ma gioi thieu cho don cung khong duoc kiem / duyet
        for (const id of tachNguoiNhapMa(await this.repo.nhatKyGhiNhanDon(gn.id, db))) ds.add(id);
      }
    }
    if (dx.loai === "DUYET_QUA_TANG" && dx.doi_tuong_id && UUID.test(dx.doi_tuong_id)) {
      const q = await this.repo.nguoiDeXuatQua(dx.doi_tuong_id, db);
      if (q?.nguoi_de_xuat_id) ds.add(q.nguoi_de_xuat_id);
    }
    if (dx.loai === "DUYET_VOUCHER" && dx.doi_tuong_id && UUID.test(dx.doi_tuong_id)) {
      // Nguoi tao voucher khong kiem / duyet voucher cua minh (CHECK voucher_duyet_khac_de_xuat o DB)
      const v = await this.repo.nguoiDeXuatVoucher(dx.doi_tuong_id, db);
      if (v?.nguoi_de_xuat_id) ds.add(v.nguoi_de_xuat_id);
    }
    return [...ds];
  }

  // ================================================================ AP DUNG (trong transaction duyet)

  async apDung(bc: BoiCanhApDung): Promise<Prisma.InputJsonObject | null> {
    switch (bc.dx.loai) {
      case "CHUYEN_VAI":
        return this.apDungChuyenVai(bc);
      case "CAP_QUYEN_SKU":
        return this.apDungQuyenSku(bc);
      case "DUYET_QUA_TANG":
        return this.apDungQua(bc, true);
      case "DUYET_VOUCHER":
        return this.apDungVoucher(bc, true);
      case "XAC_MINH_DON":
        return this.apDungXacMinhDon(bc);
      case "DOI_CHINH_SACH":
        return this.apDungChinhSach(bc);
      case "CHI_TRA_HOA_HONG":
        return this.apDungChiTra(bc);
      default:
        return null; // chi ghi quyet dinh
    }
  }

  /** Khi de xuat bi tu choi (o buoc kiem hoac duyet): qua / voucher khong dat tham dinh -> TU_CHOI */
  async khiTuChoi(bc: BoiCanhApDung): Promise<Prisma.InputJsonObject | null> {
    if (bc.dx.loai === "DUYET_QUA_TANG") return this.apDungQua(bc, false);
    if (bc.dx.loai === "DUYET_VOUCHER") return this.apDungVoucher(bc, false);
    return null;
  }

  private async apDungChuyenVai({ tx, dx, nguoiDuyetId }: BoiCanhApDung) {
    const d = obj(dx.du_lieu);
    const hoSoId = canUuid(dx.doi_tuong_id ?? d.ho_so_id, "hồ sơ");
    const vai = chuoi(d.vai ?? d.vai_moi) as Vai | null;
    if (!vai || !VAI_HOP_LE.includes(vai)) throw new BadRequestException("Vai trò không hợp lệ");
    const moi = (chuoi(d.trang_thai_moi ?? d.trang_thai_vai_moi) ?? (VAI_PHAI_HOC.includes(vai) ? "DANG_HOC" : "HOAT_DONG")) as TrangThaiVai;
    // De xuat cu (lap truoc khi chuyen vai CRM ve CRM) van bi chan luc duyet
    kiemVaiKhongTuCrm(vai);
    kiemVaiKhongTuCrm(chuoi(d.tu_vai) as Vai | null);
    const hienTai = await this.repo.vaiTroTheoHoSoVai(hoSoId, vai, tx);
    kiemChuyenVai(vai, hienTai?.trang_thai ?? null, moi); // kiem lai: trang thai co the da doi tu luc lap
    await this.kiemHocDat(hoSoId, vai, moi); // kiem lai luc duyet: tai lieu / ket qua hoc co the da doi
    const bay = new Date();
    const ketThuc = moi === "KET_THUC";
    await this.repo.ghiVaiTro({ hoSoId, vai, trangThai: moi, bay, ketThuc, moLaiTuLuc: hienTai?.trang_thai === "KET_THUC" }, tx);
    await this.repo.taoLichSuVai(
      { ho_so_id: hoSoId, vai, trang_thai_cu: hienTai?.trang_thai ?? null, trang_thai_moi: moi, nguoi_doi_id: nguoiDuyetId, ly_do: dx.ly_do, de_xuat_duyet_id: dx.id },
      tx
    );
    // Chuyen vai (vd THUC_TAP -> KOC): vai cu ket thuc
    const tuVai = chuoi(d.tu_vai) as Vai | null;
    let ketThucVaiCu = false;
    if (tuVai && tuVai !== vai) {
      const cu = await this.repo.vaiTroTheoHoSoVai(hoSoId, tuVai, tx);
      if (cu && cu.trang_thai !== "KET_THUC") {
        await this.repo.ketThucVaiTro(cu.id, bay, tx);
        await this.repo.taoLichSuVai(
          { ho_so_id: hoSoId, vai: tuVai, trang_thai_cu: cu.trang_thai, trang_thai_moi: "KET_THUC", nguoi_doi_id: nguoiDuyetId, ly_do: `Chuyển sang vai ${vai}`, de_xuat_duyet_id: dx.id },
          tx
        );
        ketThucVaiCu = true;
      }
    }
    await this.thongBao.gui(
      { hoSoId, loai: "PHE_DUYET", tieuDe: `Vai trò ${vai} của bạn đã được cập nhật`, noiDung: `Trạng thái mới: ${moi}.`, lienKet: "/tai-khoan", duLieu: { de_xuat_duyet_id: dx.id } },
      tx
    );
    await this.nhatKy.ghi(
      { hoSoId: nguoiDuyetId, hanhDong: "AP_DUNG_CHUYEN_VAI", doiTuong: "ho_so", doiTuongId: hoSoId, duLieu: { de_xuat_duyet_id: dx.id, vai, trang_thai_cu: hienTai?.trang_thai ?? null, trang_thai_moi: moi, ket_thuc_vai_cu: ketThucVaiCu ? tuVai : null } },
      tx
    );
    return { ho_so_id: hoSoId, vai, trang_thai_moi: moi };
  }

  private async apDungQuyenSku({ tx, dx, nguoiDuyetId }: BoiCanhApDung) {
    const d = obj(dx.du_lieu);
    const hoSoId = canUuid(dx.doi_tuong_id ?? d.ho_so_id, "hồ sơ");
    const mauId = canUuid(d.mau_id, "sản phẩm");
    const maMau = chuoi(d.ma_mau) ?? "";
    const moi = chuoi(d.trang_thai_moi) === "THU_HOI" ? "THU_HOI" : "HOAT_DONG";
    const bay = new Date();
    if (moi === "HOAT_DONG") {
      // Kiem lai bang chung TRONG transaction (phien ban tai lieu co the da tang tu luc lap)
      const bc = await this.timBangChungSku(hoSoId, mauId, maMau, tx);
      const bangChung = { ...bc, de_xuat_duyet_id: dx.id, nguoi_de_xuat_id: dx.nguoi_de_xuat_id, nguoi_kiem_id: dx.nguoi_kiem_id, nguoi_duyet_id: nguoiDuyetId, duyet_luc: bay.toISOString() };
      await this.repo.capQuyenSku(
        { hoSoId, mauId, maMau, phienBanTaiLieu: Number(bc.phien_ban_tai_lieu), khoaHocId: String(bc.khoa_hoc_id), bay, nguoiCapId: nguoiDuyetId, lyDo: dx.ly_do, bangChung },
        tx
      );
    } else {
      const kq = await this.repo.thuHoiQuyenSku({ hoSoId, mauId, bay, lyDo: dx.ly_do ?? "Thu hồi theo đề xuất quản trị" }, tx);
      if (!kq.count) throw new ConflictException(`Hồ sơ không còn quyền mã ${maMau} để thu hồi`);
    }
    await this.thongBao.gui(
      {
        hoSoId,
        loai: "QUYEN_SKU",
        tieuDe: moi === "HOAT_DONG" ? `Bạn được cấp quyền bán mã ${maMau}` : `Quyền bán mã ${maMau} đã bị thu hồi`,
        noiDung: dx.ly_do ?? undefined,
        lienKet: "/hoc-vien",
        duLieu: { de_xuat_duyet_id: dx.id, mau_id: mauId }
      },
      tx
    );
    await this.nhatKy.ghi(
      { hoSoId: nguoiDuyetId, hanhDong: moi === "HOAT_DONG" ? "AP_DUNG_CAP_QUYEN_SKU" : "AP_DUNG_THU_HOI_QUYEN_SKU", doiTuong: "quyen_sku", doiTuongId: `${hoSoId}:${mauId}`, duLieu: { de_xuat_duyet_id: dx.id, ho_so_id: hoSoId, mau_id: mauId, ma_mau: maMau } },
      tx
    );
    return { ho_so_id: hoSoId, mau_id: mauId, trang_thai_moi: moi };
  }

  private async apDungQua({ tx, dx, nguoiDuyetId, yKien }: BoiCanhApDung, dongY: boolean) {
    const id = canUuid(dx.doi_tuong_id, "quà tặng");
    const d = obj(dx.du_lieu);
    const bay = new Date();
    const kq = await this.repo.capNhatQuaChoThamDinh(
      id,
      dongY
        ? // 2 buoc: khong co nguoi kiem -> nguoi_tham_dinh_id null, CEO duyet la tham dinh cuoi (y kien duyet lam ket qua)
          { trang_thai: "DA_DUYET", nguoi_duyet_id: nguoiDuyetId, duyet_luc: bay, nguoi_tham_dinh_id: dx.nguoi_kiem_id, ket_qua_tham_dinh: dx.y_kien_kiem ?? yKien ?? chuoi(d.ghi_chu), ly_do_tu_choi: null }
        : { trang_thai: "TU_CHOI", nguoi_duyet_id: nguoiDuyetId, duyet_luc: bay, nguoi_tham_dinh_id: dx.nguoi_kiem_id, ket_qua_tham_dinh: dx.y_kien_kiem ?? yKien, ly_do_tu_choi: yKien ?? "Không đạt thẩm định" },
      tx
    );
    if (!kq.count) {
      if (!dongY) return null; // qua da duoc xu ly noi khac — tu choi de xuat van hop le
      throw new ConflictException("Quà tặng không còn ở trạng thái chờ thẩm định");
    }
    await this.nhatKy.ghi({ hoSoId: nguoiDuyetId, hanhDong: dongY ? "AP_DUNG_DUYET_QUA_TANG" : "AP_DUNG_TU_CHOI_QUA_TANG", doiTuong: "qua_tang", doiTuongId: id, duLieu: { de_xuat_duyet_id: dx.id } }, tx);
    return { qua_tang_id: id, trang_thai: dongY ? "DA_DUYET" : "TU_CHOI" };
  }

  private async apDungVoucher({ tx, dx, nguoiDuyetId }: BoiCanhApDung, dongY: boolean) {
    const id = canUuid(dx.doi_tuong_id, "voucher");
    const kq = await this.repo.capNhatVoucherChoThamDinh(
      id,
      { trang_thai: dongY ? "DA_DUYET" : "TU_CHOI", nguoi_duyet_id: nguoiDuyetId, nguoi_tham_dinh_id: dx.nguoi_kiem_id, duyet_luc: new Date() },
      tx
    );
    if (!kq.count) {
      if (!dongY) return null;
      throw new ConflictException("Voucher không còn ở trạng thái chờ thẩm định");
    }
    await this.nhatKy.ghi({ hoSoId: nguoiDuyetId, hanhDong: dongY ? "AP_DUNG_DUYET_VOUCHER" : "AP_DUNG_TU_CHOI_VOUCHER", doiTuong: "voucher", doiTuongId: id, duLieu: { de_xuat_duyet_id: dx.id } }, tx);
    return { voucher_id: id, trang_thai: dongY ? "DA_DUYET" : "TU_CHOI" };
  }

  /**
   * Giai quyet ca trung nguon: chon MOT nguoi ban (hoac huy ghi nhan). Hoa hong: toi da mot dong / don
   * (hoa_hong.ghi_nhan_don_id unique) — tao moi theo ty le hien hanh, hoac chuyen sang nguoi moi neu chua doi soat.
   */
  private async apDungXacMinhDon({ tx, dx, nguoiDuyetId, yKien }: BoiCanhApDung) {
    const id = canUuid(dx.doi_tuong_id, "ghi nhận đơn");
    const d = obj(dx.du_lieu);
    const ketQua = chuoi(d.ket_qua) === "HUY" ? "HUY" : "GHI_NHAN";
    const gn = await this.repo.ghiNhanDonKemHoaHong(id, tx);
    if (!gn || gn.trang_thai !== "CHO_XAC_MINH") throw new ConflictException("Đơn không còn ở trạng thái chờ xác minh");
    const bay = new Date();
    const lyDo = yKien ?? dx.ly_do ?? null;

    if (ketQua === "HUY") {
      await this.repo.capNhatDonChoXacMinh(id, { trang_thai: "BI_HUY", nguoi_xac_minh_id: nguoiDuyetId, xac_minh_luc: bay, ly_do: lyDo }, tx);
      if (gn.hoa_hong && (gn.hoa_hong.trang_thai === "CHO_DOI_SOAT" || gn.hoa_hong.trang_thai === "DU_DIEU_KIEN")) {
        await this.repo.capNhatHoaHong(gn.hoa_hong.id, { trang_thai: "BI_TRU", de_xuat_duyet_id: dx.id }, tx);
      }
      await this.nhatKy.ghi({ hoSoId: nguoiDuyetId, hanhDong: "AP_DUNG_HUY_GHI_NHAN_DON", doiTuong: "ghi_nhan_don", doiTuongId: id, duLieu: { de_xuat_duyet_id: dx.id, ma_don: gn.ma_don } }, tx);
      return { ghi_nhan_don_id: id, trang_thai: "BI_HUY" };
    }

    const nguoiBan = canUuid(d.nguoi_ban_ho_so_id, "người bán");
    const ungVien = await this.ungVienNguoiBan(gn, tx);
    if (!ungVien.includes(nguoiBan)) throw new BadRequestException("Người bán phải là người chốt đơn hoặc chủ mã giới thiệu của đơn");
    const nguon = await this.layNguon(nguoiBan, d.nguon, tx);
    await this.repo.capNhatDonChoXacMinh(id, { trang_thai: "HOP_LE", nguoi_ban_ho_so_id: nguoiBan, nguon, nguoi_xac_minh_id: nguoiDuyetId, xac_minh_luc: bay, ly_do: lyDo }, tx);

    const tl = await this.tyLeHienHanh(nguon as Vai, null, bay, tx);
    const tyLe = tl ? Number(tl.ty_le) : 0;
    const soTien = tinhHoaHong(Number(gn.tong_tien), tyLe);
    let hoaHong: string;
    if (!gn.hoa_hong) {
      // Mot nguon luat hoa hong: mang-luoi tinh theo tung dong SKU duoc quyen + ty le rieng SKU
      // (DeXuatService goi GhiNhanDonService.taoHoaHongNeuThieu SAU khi transaction duyet commit; job dong bo tao bu neu loi)
      hoaHong = "TINH_SAU_KHI_DUYET";
    } else if (gn.hoa_hong.trang_thai === "CHO_DOI_SOAT") {
      await this.repo.capNhatHoaHong(gn.hoa_hong.id, { ho_so_id: nguoiBan, so_tien: soTien, ty_le: tyLe, de_xuat_duyet_id: dx.id }, tx);
      hoaHong = "CHUYEN_NGUOI";
    } else {
      hoaHong = `GIU_NGUYEN_${gn.hoa_hong.trang_thai}`; // da doi soat / tra -> khong tu sua tien, xu ly bang dieu chinh hoa hong
    }
    await this.thongBao.gui(
      { hoSoId: nguoiBan, loai: "DON_HANG", tieuDe: `Đơn ${gn.ma_don} đã xác minh: ghi nhận cho bạn`, lienKet: "/lam-viec/mang-luoi", duLieu: { de_xuat_duyet_id: dx.id, ghi_nhan_don_id: id } },
      tx
    );
    await this.nhatKy.ghi(
      { hoSoId: nguoiDuyetId, hanhDong: "AP_DUNG_XAC_MINH_DON", doiTuong: "ghi_nhan_don", doiTuongId: id, duLieu: { de_xuat_duyet_id: dx.id, ma_don: gn.ma_don, nguoi_ban_ho_so_id: nguoiBan, nguon, ty_le: tyLe, so_tien: soTien, hoa_hong: hoaHong } },
      tx
    );
    return { ghi_nhan_don_id: id, trang_thai: "HOP_LE", nguoi_ban_ho_so_id: nguoiBan, nguon, hoa_hong: hoaHong, so_tien: soTien };
  }

  /**
   * Chi tra: chuyen DUNG cac khoan da duyet DU_DIEU_KIEN -> DA_TRA trong transaction duyet. Khoan nao da tra / bi tru /
   * doi trang thai tu luc lap -> so dong cap nhat lech -> 409, rollback ca quyet dinh (lap lai de xuat).
   */
  private async apDungChiTra({ tx, dx, nguoiDuyetId }: BoiCanhApDung) {
    const d = obj(dx.du_lieu);
    const hhIds = [...new Set(mangChuoi(d.hoa_hong_ids))];
    const dcIds = [...new Set(mangChuoi(d.dieu_chinh_ids))];
    if (!hhIds.length && !dcIds.length) throw new BadRequestException("Đề xuất chi trả không có khoản nào");
    const daDung = await this.khoanDaVaoChiTra(dx.id, tx);
    if (hhIds.some(id => daDung.hoaHong.has(id)) || dcIds.some(id => daDung.dieuChinh.has(id))) {
      throw new ConflictException("Có khoản đã nằm trong đề xuất chi trả khác — không chi trả hai lần");
    }
    const bay = new Date();
    if (dcIds.length) {
      // Khoa cung o DB: chi danh dau dieu chinh CHUA tra; lech so dong (da tra / bi xoa) -> 409, rollback ca quyet dinh
      const n = await this.repo.danhDauDieuChinhDaTra(dcIds, dx.id, tx);
      if (n.count !== dcIds.length) throw new ConflictException("Có khoản điều chỉnh đã được chi trả hoặc không còn tồn tại — lập lại đề xuất chi trả");
    }
    if (hhIds.length) {
      const n = await this.repo.traHoaHong(hhIds, bay, dx.id, tx);
      if (n.count !== hhIds.length) {
        throw new ConflictException(`Chỉ ${n.count}/${hhIds.length} khoản còn đủ điều kiện — có khoản đã trả, bị trừ hoặc đổi trạng thái; lập lại đề xuất chi trả`);
      }
    }
    const nhan = mangChuoi(d.nguoi_nhan_ids);
    const tong = typeof d.tong_tien === "number" ? d.tong_tien : null;
    await this.nhatKy.ghi(
      {
        hoSoId: nguoiDuyetId,
        hanhDong: "AP_DUNG_CHI_TRA_HOA_HONG",
        doiTuong: "de_xuat_duyet",
        doiTuongId: dx.id,
        duLieu: { ky: chuoi(d.ky), hoa_hong_ids: hhIds, dieu_chinh_ids: dcIds, nguoi_nhan_ids: nhan, tong_tien: tong }
      },
      tx
    );
    if (nhan.length) {
      await this.thongBao.guiNhieu(
        nhan,
        { loai: "HOA_HONG", tieuDe: `Hoa hồng kỳ ${chuoi(d.ky) ?? ""} đã được duyệt chi trả`, lienKet: "/lam-viec/mang-luoi/thu-nhap", duLieu: { de_xuat_duyet_id: dx.id } },
        tx
      );
    }
    return { ky: chuoi(d.ky), so_khoan: hhIds.length, so_dieu_chinh: dcIds.length, tong_tien: tong };
  }

  private async apDungChinhSach({ tx, dx, nguoiDuyetId }: BoiCanhApDung) {
    const d = obj(dx.du_lieu);
    const bay = new Date();
    if (d.chinh_sach === "TY_LE_HOA_HONG") {
      const vai = chuoi(d.vai) as Vai;
      const mauId = chuoi(d.mau_id);
      const tyLe = Number(d.ty_le);
      if (!VAI_CO_HOA_HONG.includes(vai) || !Number.isFinite(tyLe) || tyLe < 0 || tyLe > 100) throw new BadRequestException("Dữ liệu tỷ lệ hoa hồng không hợp lệ");
      // Dong ty le cu (giu lich su), mo dong moi
      const dong = await this.repo.dongTyLeDangMo(vai, mauId, bay, tx);
      const moi = await this.repo.taoTyLe({ vai, mau_id: mauId, ma_mau: chuoi(d.ma_mau), ty_le: tyLe, hieu_luc_tu: bay, bat: true, ghi_chu: `Theo đề xuất ${dx.id}` }, tx);
      await this.nhatKy.ghi(
        { hoSoId: nguoiDuyetId, hanhDong: "AP_DUNG_DOI_TY_LE_HOA_HONG", doiTuong: "ty_le_hoa_hong", doiTuongId: moi.id, duLieu: { de_xuat_duyet_id: dx.id, vai, mau_id: mauId, ty_le: tyLe, ty_le_truoc: (d.ty_le_truoc as number | null) ?? null, so_dong_cu_dong: dong.count } },
        tx
      );
      return { ty_le_hoa_hong_id: moi.id, vai, ty_le: tyLe };
    }
    if (d.chinh_sach === "NGUONG_HANG") {
      const hang = chuoi(d.hang) as "THAN_THIET" | "VIP";
      const nguong = d.nguong_tich_luy === null || d.nguong_tich_luy === undefined ? null : Number(d.nguong_tich_luy);
      const giam = d.giam_gia_phan_tram === null || d.giam_gia_phan_tram === undefined ? null : Number(d.giam_gia_phan_tram);
      const dsHang = await this.repo.dsHangCauHinh(tx);
      if (!dsHang.some(h => h.hang === hang)) throw new NotFoundException("Chưa có cấu hình hạng này");
      kiemThuTuHang(dsHang.map(h => ({ hang: h.hang, nguong: h.hang === hang && nguong !== null ? nguong : Number(h.nguong_tich_luy) })));
      await this.repo.capNhatHangCauHinh(hang, { ...(nguong !== null ? { nguong_tich_luy: nguong } : {}), ...(giam !== null ? { giam_gia_phan_tram: giam } : {}) }, tx);
      await this.nhatKy.ghi(
        { hoSoId: nguoiDuyetId, hanhDong: "AP_DUNG_DOI_NGUONG_HANG", doiTuong: "hang_thanh_vien_cau_hinh", doiTuongId: hang, duLieu: { de_xuat_duyet_id: dx.id, hang, nguong_tich_luy: nguong, giam_gia_phan_tram: giam, nguong_truoc: (d.nguong_truoc as number | null) ?? null, giam_gia_truoc: (d.giam_gia_truoc as number | null) ?? null } },
        tx
      );
      return { hang, nguong_tich_luy: nguong, giam_gia_phan_tram: giam };
    }
    throw new BadRequestException("Chính sách không hợp lệ");
  }
}

/** Ho so lien quan doc duoc tu du_lieu (khong can DB) — dung cho co hien nut tren danh sach */
export function nguoiLienQuanNhanh(dx: Pick<de_xuat_duyet, "loai" | "doi_tuong" | "doi_tuong_id" | "du_lieu">): string[] {
  const d = obj(dx.du_lieu);
  const ds = new Set<string>();
  if (dx.doi_tuong === "ho_so" && dx.doi_tuong_id) ds.add(dx.doi_tuong_id);
  for (const k of ["ho_so_id", "nguoi_ban_ho_so_id", "nguoi_ban_cu_id", "nguoi_chot_ho_so_id", "chu_ma_ho_so_id"]) {
    const v = chuoi(d[k]);
    if (v) ds.add(v);
  }
  // CHI_TRA_HOA_HONG: moi nguoi nhan tien deu la nguoi lien quan
  if (Array.isArray(d.nguoi_nhan_ids)) for (const v of d.nguoi_nhan_ids) if (typeof v === "string" && v) ds.add(v);
  return [...ds];
}

/** Than thiet phai co nguong thap hon VIP */
export function kiemThuTuHang(ds: { hang: string; nguong: number }[]): void {
  const tt = ds.find(h => h.hang === "THAN_THIET");
  const vip = ds.find(h => h.hang === "VIP");
  if (tt && vip && tt.nguong >= vip.nguong) throw new BadRequestException("Ngưỡng hạng Thân thiết phải thấp hơn ngưỡng VIP");
}
