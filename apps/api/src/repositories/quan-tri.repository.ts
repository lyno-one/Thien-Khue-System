// Truy van Prisma cua module quan-tri. Lop: NguoiTomTatRepository, DeXuatRepository, ApDungDeXuatRepository, HoSoQuanTriRepository, TongQuanRepository.
import { Injectable } from "@nestjs/common";
import type { NguoiTomTatQt } from "@thien-khue/contracts";
import type { HangThanhVien, LoaiDeXuat, NguonDon, Prisma, TrangThaiDeXuat, TrangThaiGhiNhan, TrangThaiVai, Vai } from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { LOAI_DE_XUAT_BA_BUOC, locIdNguoi } from "../common/utils/quan-tri";

/** Ho ten / email theo nhieu ho_so.id (mot query) — cot nguoi_*_id khong co FK nen tu ghep */
@Injectable()
export class NguoiTomTatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async layNguoiTomTat(ids: (string | null | undefined)[]): Promise<Map<string, NguoiTomTatQt>> {
    const ds = locIdNguoi(ids);
    if (!ds.length) return new Map();
    const hs = await this.prisma.ho_so.findMany({ where: { id: { in: ds } }, select: { id: true, ho_ten: true, email: true } });
    return new Map(hs.map(h => [h.id, h]));
  }
}

const DANG_MO: TrangThaiDeXuat[] = ["CHO_KIEM", "CHO_DUYET"];
const LOAI_BA_BUOC = [...LOAI_DE_XUAT_BA_BUOC];
/** nguoi_kiem_id khac id (ke ca NULL — de xuat 2 buoc khong co nguoi kiem; `not` cua Prisma bo qua dong NULL) */
const khacNguoiKiem = (id: string): Prisma.de_xuat_duyetWhereInput => ({ OR: [{ nguoi_kiem_id: null }, { nguoi_kiem_id: { not: id } }] });
/** Bo loc danh sach de xuat (service tinh san luat vai: ai kiem duoc, loai nao duyet duoc) */
export interface LocDeXuat {
  trangThai?: TrangThaiDeXuat;
  loai?: LoaiDeXuat;
  /** CUA_TOI: chi de xuat cua nguoi nay */
  nguoiDeXuatId?: string;
  /**
   * CAN_TOI: cho kiem (loai 3 buoc, neu co vai kiem, khong phai cua toi) + cho duyet (loai duoc duyet, khong phai toi de xuat / kiem;
   * loai 2 buoc con CHO_KIEM cung tinh la cho duyet)
   */
  canToi?: { hoSoId: string; coKiem: boolean; loaiDuyet: LoaiDeXuat[] };
}
/**
 * Truy van thien_khue.de_xuat_duyet (maker-checker) + hang cho / chinh sach o ban phe duyet.
 * Doi trang thai bang updateMany co dieu kien trang_thai cu -> hai nguoi bam cung luc chi mot nguoi thang (tra so dong).
 * Transaction nhieu buoc: service goi chayTrongGiaoDich roi truyen tx cho cac ham (va NhatKy / ThongBao / ApDung).
 */
@Injectable()
export class DeXuatRepository {
  constructor(private readonly prisma: PrismaService) {}

  chayTrongGiaoDich<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // ================================================================ GHI (trong transaction)

  /** De xuat dang mo cung loai + doi tuong */
  timDangMoTrung(q: { loai: LoaiDeXuat; doiTuong: string; doiTuongId: string }, db: Db = this.prisma) {
    return db.de_xuat_duyet.findFirst({
      where: { loai: q.loai, doi_tuong: q.doiTuong, doi_tuong_id: q.doiTuongId, trang_thai: { in: [...DANG_MO] } },
      select: { id: true }
    });
  }

  tao(data: Prisma.de_xuat_duyetUncheckedCreateInput, db: Db = this.prisma) {
    return db.de_xuat_duyet.create({ data });
  }

  /** CHO_KIEM -> (nguoi kiem != nguoi de xuat) — tra so dong cap nhat */
  ghiKiem(id: string, q: { nguoiKiemId: string; bay: Date; yKien: string | null; dongY: boolean }, db: Db = this.prisma) {
    return db.de_xuat_duyet.updateMany({
      where: { id, trang_thai: "CHO_KIEM", nguoi_de_xuat_id: { not: q.nguoiKiemId } },
      data: { nguoi_kiem_id: q.nguoiKiemId, kiem_luc: q.bay, y_kien_kiem: q.yKien, trang_thai: q.dongY ? "CHO_DUYET" : "TU_CHOI" }
    });
  }

  /**
   * Cho duyet -> (nguoi duyet != ca hai) — tra so dong cap nhat. tuTrangThai: ["CHO_DUYET"] (3 buoc) hoac
   * ["CHO_DUYET", "CHO_KIEM"] (2 buoc — de xuat cu con CHO_KIEM). Loai 3 buoc khong bao gio duyet tu CHO_KIEM.
   */
  ghiDuyet(id: string, q: { nguoiDuyetId: string; bay: Date; yKien: string | null; dongY: boolean; tuTrangThai: TrangThaiDeXuat[] }, db: Db = this.prisma) {
    return db.de_xuat_duyet.updateMany({
      where: { id, trang_thai: { in: q.tuTrangThai }, nguoi_de_xuat_id: { not: q.nguoiDuyetId }, ...khacNguoiKiem(q.nguoiDuyetId) },
      data: { nguoi_duyet_id: q.nguoiDuyetId, duyet_luc: q.bay, y_kien_duyet: q.yKien, trang_thai: q.dongY ? "DA_DUYET" : "TU_CHOI" }
    });
  }

  /** Nguoi de xuat rut de xuat dang mo — tra so dong cap nhat */
  ghiHuy(id: string, nguoiDeXuatId: string, db: Db = this.prisma) {
    return db.de_xuat_duyet.updateMany({ where: { id, trang_thai: { in: [...DANG_MO] }, nguoi_de_xuat_id: nguoiDeXuatId }, data: { trang_thai: "HUY" } });
  }

  layHoacLoi(id: string, db: Db = this.prisma) {
    return db.de_xuat_duyet.findUniqueOrThrow({ where: { id } });
  }

  /** ho_so co mot trong cac vai HOAT_DONG (tru danh sach loai) — nguoi nhan thong bao */
  hoSoHoatDongCoVai(vai: Vai[], loaiTru: string[], db: Db = this.prisma) {
    return db.vai_tro_ho_so.findMany({
      where: { vai: { in: vai }, trang_thai: "HOAT_DONG", ho_so_id: { notIn: loaiTru } },
      select: { ho_so_id: true },
      take: 200
    });
  }

  // ================================================================ DOC

  lay(id: string) {
    return this.prisma.de_xuat_duyet.findUnique({ where: { id } });
  }

  async danhSach(loc: LocDeXuat, skip: number, take: number) {
    const where: Prisma.de_xuat_duyetWhereInput = { ...(loc.loai ? { loai: loc.loai } : {}) };
    const dk: Prisma.de_xuat_duyetWhereInput[] = [];
    // Loai 2 buoc con CHO_KIEM (du lieu cu) hien o "Chờ duyệt", khong o "Chờ kiểm"
    if (loc.trangThai === "CHO_KIEM") dk.push({ trang_thai: "CHO_KIEM", loai: { in: LOAI_BA_BUOC } });
    else if (loc.trangThai === "CHO_DUYET") dk.push({ OR: [{ trang_thai: "CHO_DUYET" }, { trang_thai: "CHO_KIEM", loai: { notIn: LOAI_BA_BUOC } }] });
    else if (loc.trangThai) dk.push({ trang_thai: loc.trangThai });
    if (loc.nguoiDeXuatId) where.nguoi_de_xuat_id = loc.nguoiDeXuatId;
    if (loc.canToi) {
      const { hoSoId, coKiem, loaiDuyet } = loc.canToi;
      const loaiDuyetHaiBuoc = loaiDuyet.filter(l => !LOAI_BA_BUOC.includes(l));
      dk.push({
        OR: [
          ...(coKiem ? [{ trang_thai: "CHO_KIEM" as const, loai: { in: LOAI_BA_BUOC }, nguoi_de_xuat_id: { not: hoSoId } }] : []),
          { trang_thai: "CHO_DUYET", loai: { in: loaiDuyet }, nguoi_de_xuat_id: { not: hoSoId }, ...khacNguoiKiem(hoSoId) },
          ...(loaiDuyetHaiBuoc.length ? [{ trang_thai: "CHO_KIEM" as const, loai: { in: loaiDuyetHaiBuoc }, nguoi_de_xuat_id: { not: hoSoId } }] : [])
        ]
      });
    }
    if (dk.length) where.AND = dk;
    const [ds, tong] = await Promise.all([
      this.prisma.de_xuat_duyet.findMany({ where, orderBy: [{ created_at: "desc" }], skip, take }),
      this.prisma.de_xuat_duyet.count({ where })
    ]);
    return { ds, tong };
  }

  nhatKyCuaDeXuat(id: string) {
    return this.prisma.nhat_ky.findMany({ where: { doi_tuong: "de_xuat_duyet", doi_tuong_id: id }, orderBy: { created_at: "asc" }, take: 100 });
  }

  /** doi_tuong_id cua de xuat dang mo cho qua / voucher / don (hang cho khong lap lai) */
  doiTuongDaCoDeXuatMo() {
    return this.prisma.de_xuat_duyet.findMany({
      where: { trang_thai: { in: [...DANG_MO] }, loai: { in: ["DUYET_QUA_TANG", "DUYET_VOUCHER", "XAC_MINH_DON"] }, doi_tuong_id: { not: null } },
      select: { doi_tuong_id: true }
    });
  }

  /** Qua / voucher cho tham dinh, don cho xac minh chua co de xuat mo */
  hangCho(daCo: string[]) {
    return Promise.all([
      this.prisma.qua_tang.findMany({ where: { trang_thai: "CHO_THAM_DINH", id: { notIn: daCo } }, include: { doi_tac: { select: { ten: true } } }, orderBy: { created_at: "asc" }, take: 100 }),
      this.prisma.voucher.findMany({ where: { trang_thai: "CHO_THAM_DINH", id: { notIn: daCo } }, include: { doi_tac: { select: { ten: true } } }, orderBy: { created_at: "asc" }, take: 100 }),
      this.prisma.ghi_nhan_don.findMany({ where: { trang_thai: "CHO_XAC_MINH", id: { notIn: daCo } }, orderBy: { created_at: "asc" }, take: 100 })
    ]);
  }

  chuMaGioiThieuTheoIds(ids: string[]) {
    return this.prisma.ma_gioi_thieu.findMany({ where: { id: { in: ids } }, select: { id: true, ho_so_id: true } });
  }

  /** Ty le hoa hong dang hieu luc tai `bay` */
  tyLeHoaHongHieuLuc(bay: Date) {
    return this.prisma.ty_le_hoa_hong.findMany({
      where: { bat: true, hieu_luc_tu: { lte: bay }, OR: [{ hieu_luc_den: null }, { hieu_luc_den: { gt: bay } }] },
      orderBy: [{ vai: "asc" }, { hieu_luc_tu: "desc" }]
    });
  }

  hangThanhVienTheoThuTu() {
    return this.prisma.hang_thanh_vien_cau_hinh.findMany({ orderBy: { thu_tu: "asc" } });
  }
}

/** Client Prisma: mac dinh la PrismaService, trong transaction duyet la tx (giu nguyen tu) */
export type Db = PrismaService | Prisma.TransactionClient;
/**
 * Truy van thien_khue cho handler AP DUNG de xuat (quan-tri la noi duy nhat ap quyet dinh da duyet,
 * nen ghi thang bang cua module khac: vai_tro_ho_so, quyen_sku, qua_tang, voucher, ghi_nhan_don, hoa_hong, ty_le_hoa_hong...).
 * Moi ham nhan `db` cuoi cung: truyen tx khi chay trong transaction duyet, bo trong de doc ngoai transaction.
 */
@Injectable()
export class ApDungDeXuatRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ================================================================ HO SO / VAI

  hoSoKemVai(hoSoId: string, db: Db = this.prisma) {
    return db.ho_so.findUnique({ where: { id: hoSoId }, select: { id: true, ho_ten: true, vai_tro: { select: { vai: true, trang_thai: true } } } });
  }

  hoSoTen(hoSoId: string, db: Db = this.prisma) {
    return db.ho_so.findUnique({ where: { id: hoSoId }, select: { id: true, ho_ten: true } });
  }

  tenHoSoTheoIds(ids: string[], db: Db = this.prisma) {
    return db.ho_so.findMany({ where: { id: { in: ids } }, select: { id: true, ho_ten: true } });
  }

  /** Vai chua KET_THUC cua mot ho so */
  vaiConHieuLuc(hoSoId: string, db: Db = this.prisma) {
    return db.vai_tro_ho_so.findMany({ where: { ho_so_id: hoSoId, trang_thai: { not: "KET_THUC" } }, select: { vai: true } });
  }

  vaiTroTheoHoSoVai(hoSoId: string, vai: Vai, db: Db = this.prisma) {
    return db.vai_tro_ho_so.findUnique({ where: { ho_so_id_vai: { ho_so_id: hoSoId, vai } } });
  }

  ghiVaiTro(
    q: { hoSoId: string; vai: Vai; trangThai: TrangThaiVai; bay: Date; ketThuc: boolean; moLaiTuLuc: boolean },
    db: Db = this.prisma
  ) {
    return db.vai_tro_ho_so.upsert({
      where: { ho_so_id_vai: { ho_so_id: q.hoSoId, vai: q.vai } },
      create: { ho_so_id: q.hoSoId, vai: q.vai, trang_thai: q.trangThai, nguon: "QUAN_TRI", tu_luc: q.bay, den_luc: q.ketThuc ? q.bay : null },
      update: { trang_thai: q.trangThai, nguon: "QUAN_TRI", den_luc: q.ketThuc ? q.bay : null, ...(q.moLaiTuLuc ? { tu_luc: q.bay } : {}) }
    });
  }

  ketThucVaiTro(id: string, bay: Date, db: Db = this.prisma) {
    return db.vai_tro_ho_so.update({ where: { id }, data: { trang_thai: "KET_THUC", den_luc: bay } });
  }

  taoLichSuVai(data: Prisma.lich_su_vai_troUncheckedCreateInput, db: Db = this.prisma) {
    return db.lich_su_vai_tro.create({ data });
  }

  // ================================================================ QUYEN SKU / BANG CHUNG HOC

  quyenSkuHienTai(hoSoId: string, mauId: string, db: Db = this.prisma) {
    return db.quyen_sku.findUnique({ where: { ho_so_id_mau_id: { ho_so_id: hoSoId, mau_id: mauId } }, select: { trang_thai: true } });
  }

  /** Khoa SAN_PHAM dang bat cua mau, kem bai kiem tra bat buoc */
  khoaSanPhamCuaMau(mauId: string, db: Db = this.prisma) {
    return db.khoa_hoc.findFirst({
      where: { mau_id: mauId, loai: "SAN_PHAM", bat: true },
      select: { id: true, ten: true, phien_ban_tai_lieu: true, can_thuc_hanh: true, bai_kiem_tra: { where: { bat: true, bat_buoc: true }, select: { id: true, nguong_dat: true } } }
    });
  }

  /** Luot lam dat diem cao nhat, dung phien ban tai lieu */
  luotDatTotNhat(q: { hoSoId: string; baiKiemTraIds: string[]; phienBanTaiLieu: number }, db: Db = this.prisma) {
    return db.luot_lam.findFirst({
      where: { ho_so_id: q.hoSoId, bai_kiem_tra_id: { in: q.baiKiemTraIds }, dat: true, phien_ban_tai_lieu: q.phienBanTaiLieu },
      orderBy: { diem: "desc" },
      select: { id: true, diem: true, nop_luc: true, bai_kiem_tra_id: true }
    });
  }

  /** Bai thuc hanh DAT gan nhat cua khoa */
  thucHanhDatGanNhat(hoSoId: string, khoaHocId: string, db: Db = this.prisma) {
    return db.bai_thuc_hanh.findFirst({
      where: { ho_so_id: hoSoId, khoa_hoc_id: khoaHocId, trang_thai: "DAT" },
      orderBy: { cham_luc: "desc" },
      select: { id: true, nguoi_cham_id: true, nhan_xet: true, cham_luc: true, diem: true }
    });
  }

  capQuyenSku(
    q: { hoSoId: string; mauId: string; maMau: string; phienBanTaiLieu: number; khoaHocId: string; bay: Date; nguoiCapId: string; lyDo: string | null; bangChung: Prisma.InputJsonObject },
    db: Db = this.prisma
  ) {
    return db.quyen_sku.upsert({
      where: { ho_so_id_mau_id: { ho_so_id: q.hoSoId, mau_id: q.mauId } },
      create: { ho_so_id: q.hoSoId, mau_id: q.mauId, ma_mau: q.maMau, trang_thai: "HOAT_DONG", phien_ban_tai_lieu: q.phienBanTaiLieu, khoa_hoc_id: q.khoaHocId, cap_luc: q.bay, nguoi_cap_id: q.nguoiCapId, ly_do: q.lyDo, bang_chung: q.bangChung },
      update: { trang_thai: "HOAT_DONG", phien_ban_tai_lieu: q.phienBanTaiLieu, khoa_hoc_id: q.khoaHocId, cap_luc: q.bay, nguoi_cap_id: q.nguoiCapId, thu_hoi_luc: null, ly_do: q.lyDo, bang_chung: q.bangChung }
    });
  }

  /** Thu hoi quyen con hieu luc — tra so dong cap nhat */
  thuHoiQuyenSku(q: { hoSoId: string; mauId: string; bay: Date; lyDo: string }, db: Db = this.prisma) {
    return db.quyen_sku.updateMany({
      where: { ho_so_id: q.hoSoId, mau_id: q.mauId, trang_thai: { not: "THU_HOI" } },
      data: { trang_thai: "THU_HOI", thu_hoi_luc: q.bay, ly_do: q.lyDo }
    });
  }

  // ================================================================ QUA TANG / VOUCHER

  quaTangKemDoiTac(id: string, db: Db = this.prisma) {
    return db.qua_tang.findUnique({ where: { id }, include: { doi_tac: { select: { ten: true } } } });
  }

  voucherKemDoiTac(id: string, db: Db = this.prisma) {
    return db.voucher.findUnique({ where: { id }, include: { doi_tac: { select: { ten: true } } } });
  }

  nguoiDeXuatQua(id: string, db: Db = this.prisma) {
    return db.qua_tang.findUnique({ where: { id }, select: { nguoi_de_xuat_id: true } });
  }

  nguoiDeXuatVoucher(id: string, db: Db = this.prisma) {
    return db.voucher.findUnique({ where: { id }, select: { nguoi_de_xuat_id: true } });
  }

  /** Chi doi qua dang CHO_THAM_DINH (khoa lac quan) — tra so dong cap nhat */
  capNhatQuaChoThamDinh(id: string, data: Prisma.qua_tangUncheckedUpdateManyInput, db: Db = this.prisma) {
    return db.qua_tang.updateMany({ where: { id, trang_thai: "CHO_THAM_DINH" }, data });
  }

  capNhatVoucherChoThamDinh(id: string, data: Prisma.voucherUncheckedUpdateManyInput, db: Db = this.prisma) {
    return db.voucher.updateMany({ where: { id, trang_thai: "CHO_THAM_DINH" }, data });
  }

  // ================================================================ GHI NHAN DON / HOA HONG

  ghiNhanDon(id: string, db: Db = this.prisma) {
    return db.ghi_nhan_don.findUnique({ where: { id } });
  }

  ghiNhanDonKemHoaHong(id: string, db: Db = this.prisma) {
    return db.ghi_nhan_don.findUnique({ where: { id }, include: { hoa_hong: true } });
  }

  /** Chu ma gioi thieu theo id (uu tien) hoac theo ma */
  chuMaGioiThieu(q: { id: string | null; ma: string | null }, db: Db = this.prisma) {
    return db.ma_gioi_thieu.findFirst({
      where: q.id ? { id: q.id } : { ma: q.ma as string },
      select: { ho_so_id: true }
    });
  }

  /** Nhat ky GHI_NHAN_DON cua mot don (du_lieu.nguoi_nhap_ma = nguoi nhap tay ma gioi thieu) */
  nhatKyGhiNhanDon(ghiNhanId: string, db: Db = this.prisma) {
    return db.nhat_ky.findMany({
      where: { doi_tuong: "ghi_nhan_don", doi_tuong_id: ghiNhanId, hanh_dong: "GHI_NHAN_DON" },
      select: { du_lieu: true }
    });
  }

  /** Chi doi don dang CHO_XAC_MINH — tra so dong cap nhat */
  capNhatDonChoXacMinh(id: string, data: Prisma.ghi_nhan_donUncheckedUpdateManyInput, db: Db = this.prisma) {
    return db.ghi_nhan_don.updateMany({ where: { id, trang_thai: "CHO_XAC_MINH" }, data });
  }

  capNhatHoaHong(id: string, data: Prisma.hoa_hongUncheckedUpdateInput, db: Db = this.prisma) {
    return db.hoa_hong.update({ where: { id }, data });
  }

  /** Ty le dang hieu luc cho (vai, mau) — mau_id null = ty le chung */
  tyLeHienHanh(vai: Vai, mauId: string | null, luc: Date, db: Db = this.prisma) {
    return db.ty_le_hoa_hong.findFirst({
      where: { vai, mau_id: mauId, bat: true, hieu_luc_tu: { lte: luc }, OR: [{ hieu_luc_den: null }, { hieu_luc_den: { gt: luc } }] },
      orderBy: { hieu_luc_tu: "desc" }
    });
  }

  // ================================================================ CHI TRA HOA HONG

  /** du_lieu cua de xuat CHI_TRA_HOA_HONG dang mo / da duyet (tru de xuat dang xet) */
  deXuatChiTraConHieuLuc(truDeXuatId: string | undefined, db: Db = this.prisma) {
    return db.de_xuat_duyet.findMany({
      where: { loai: "CHI_TRA_HOA_HONG", trang_thai: { in: ["CHO_KIEM", "CHO_DUYET", "DA_DUYET"] }, ...(truDeXuatId ? { id: { not: truDeXuatId } } : {}) },
      select: { du_lieu: true }
    });
  }

  hoaHongDuDieuKien(q: { ky: string; hoSoId: string | null; ids: string[] | null }, db: Db = this.prisma) {
    return db.hoa_hong.findMany({
      where: { trang_thai: "DU_DIEU_KIEN", ky: { lte: q.ky }, ...(q.hoSoId ? { ho_so_id: q.hoSoId } : {}), ...(q.ids ? { id: { in: q.ids } } : {}) },
      select: { id: true, ho_so_id: true, so_tien: true },
      orderBy: { created_at: "asc" },
      take: 5000
    });
  }

  dieuChinhChuaTra(q: { ky: string; hoSoId: string | null }, db: Db = this.prisma) {
    return db.dieu_chinh_hoa_hong.findMany({
      where: { ky: { lte: q.ky }, de_xuat_chi_tra_id: null, ...(q.hoSoId ? { ho_so_id: q.hoSoId } : {}) },
      select: { id: true, ho_so_id: true, so_tien: true },
      take: 5000
    });
  }

  /** Chi danh dau dieu chinh CHUA tra — tra so dong cap nhat */
  danhDauDieuChinhDaTra(ids: string[], deXuatId: string, db: Db = this.prisma) {
    return db.dieu_chinh_hoa_hong.updateMany({ where: { id: { in: ids }, de_xuat_chi_tra_id: null }, data: { de_xuat_chi_tra_id: deXuatId } });
  }

  /** DU_DIEU_KIEN -> DA_TRA — tra so dong cap nhat */
  traHoaHong(ids: string[], bay: Date, deXuatId: string, db: Db = this.prisma) {
    return db.hoa_hong.updateMany({
      where: { id: { in: ids }, trang_thai: "DU_DIEU_KIEN" },
      data: { trang_thai: "DA_TRA", tra_luc: bay, de_xuat_duyet_id: deXuatId }
    });
  }

  // ================================================================ CHINH SACH

  /** Dong cac ty le dang mo cua (vai, mau) — giu lich su */
  dongTyLeDangMo(vai: Vai, mauId: string | null, bay: Date, db: Db = this.prisma) {
    return db.ty_le_hoa_hong.updateMany({
      where: { vai, mau_id: mauId, bat: true, OR: [{ hieu_luc_den: null }, { hieu_luc_den: { gt: bay } }] },
      data: { hieu_luc_den: bay, bat: false }
    });
  }

  taoTyLe(data: Prisma.ty_le_hoa_hongUncheckedCreateInput, db: Db = this.prisma) {
    return db.ty_le_hoa_hong.create({ data });
  }

  dsHangCauHinh(db: Db = this.prisma) {
    return db.hang_thanh_vien_cau_hinh.findMany();
  }

  capNhatHangCauHinh(hang: HangThanhVien, data: { nguong_tich_luy?: number; giam_gia_phan_tram?: number }, db: Db = this.prisma) {
    return db.hang_thanh_vien_cau_hinh.update({ where: { hang }, data });
  }
}

/**
 * Truy van thien_khue cho 6 nhom ho so quan tri (CHI DOC). Du lieu CRM (schema public) khong o day — CrmDocService.
 */
@Injectable()
export class HoSoQuanTriRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ================================================================ NGUOI DUNG

  /** tuKhoa: ho ten / email / sdt chua; sdtChuan (neu chuan hoa duoc): khop sdt_chuan */
  async dsHoSo(loc: { tuKhoa?: string; sdtChuan?: string | null; vai?: Vai; trangThaiVai?: TrangThaiVai }, skip: number, take: number) {
    const where: Prisma.ho_soWhereInput = {};
    if (loc.tuKhoa) {
      const tk = loc.tuKhoa;
      where.OR = [
        { ho_ten: { contains: tk, mode: "insensitive" } },
        { email: { contains: tk, mode: "insensitive" } },
        { sdt: { contains: tk } },
        ...(loc.sdtChuan ? [{ sdt_chuan: loc.sdtChuan }] : [])
      ];
    }
    if (loc.vai || loc.trangThaiVai) where.vai_tro = { some: { ...(loc.vai ? { vai: loc.vai } : {}), ...(loc.trangThaiVai ? { trang_thai: loc.trangThaiVai } : {}) } };
    const [ds, tong] = await Promise.all([
      this.prisma.ho_so.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take,
        include: { vai_tro: { select: { vai: true, trang_thai: true }, orderBy: { vai: "asc" } }, _count: { select: { quyen_sku: { where: { trang_thai: "HOAT_DONG" } } } } }
      }),
      this.prisma.ho_so.count({ where })
    ]);
    return { ds, tong };
  }

  hoSoChiTiet(id: string) {
    return this.prisma.ho_so.findUnique({
      where: { id },
      include: {
        vai_tro: { orderBy: { vai: "asc" } },
        lich_su_vai_tro: { orderBy: { created_at: "desc" }, take: 50 },
        quyen_sku: { orderBy: { ma_mau: "asc" } },
        chung_chi: { include: { khoa_hoc: { select: { ten: true } } }, orderBy: { cap_luc: "desc" } },
        luot_lam: { where: { nop_luc: { not: null } }, include: { bai_kiem_tra: { select: { tieu_de: true } } }, orderBy: { nop_luc: "desc" }, take: 20 }
      }
    });
  }

  /** So don + doanh so hop le (HOP_LE / DA_DOI_SOAT) cua nguoi ban */
  tongDonHopLeCuaNguoiBan(hoSoId: string) {
    return this.prisma.ghi_nhan_don.aggregate({ where: { nguoi_ban_ho_so_id: hoSoId, trang_thai: { in: ["HOP_LE", "DA_DOI_SOAT"] } }, _count: true, _sum: { tong_tien: true } });
  }

  hoaHongTheoTrangThai(hoSoId: string) {
    return this.prisma.hoa_hong.groupBy({ by: ["trang_thai"], where: { ho_so_id: hoSoId }, _sum: { so_tien: true } });
  }

  /** Nhat ky do ho so lam hoac ve ho so */
  nhatKyLienQuanHoSo(hoSoId: string) {
    return this.prisma.nhat_ky.findMany({ where: { OR: [{ ho_so_id: hoSoId }, { doi_tuong: "ho_so", doi_tuong_id: hoSoId }] }, orderBy: { created_at: "desc" }, take: 30 });
  }

  // ================================================================ KHACH HANG (phan thien_khue)

  dsHangCauHinh() {
    return this.prisma.hang_thanh_vien_cau_hinh.findMany();
  }

  giaoKhachDangPhuTrach(sdtChuan: string) {
    return this.prisma.giao_khach.findFirst({ where: { sdt_chuan: sdtChuan, trang_thai: "DANG_PHU_TRACH" }, orderBy: { giao_luc: "desc" } });
  }

  uuDaiDaCap(sdtChuan: string) {
    return this.prisma.cap_phat_uu_dai.findMany({
      where: { sdt_chuan: sdtChuan },
      include: { voucher: { select: { ten: true } }, qua_tang: { select: { ten: true } } },
      orderBy: { cap_luc: "desc" },
      take: 30
    });
  }

  moiKhHanhPhucMoiNhat(sdtChuan: string) {
    return this.prisma.moi_kh_hanh_phuc.findFirst({ where: { sdt_chuan: sdtChuan }, orderBy: { moi_luc: "desc" } });
  }

  // ================================================================ SAN PHAM (khoa hoc / quyen SKU)

  khoaSanPhamTheoMau(mauIds: string[]) {
    return this.prisma.khoa_hoc.findMany({ where: { mau_id: { in: mauIds }, loai: "SAN_PHAM" }, select: { id: true, ma: true, ten: true, phien_ban_tai_lieu: true, mau_id: true } });
  }

  demQuyenSkuTheoMau(mauIds: string[]) {
    return this.prisma.quyen_sku.groupBy({ by: ["mau_id", "trang_thai"], where: { mau_id: { in: mauIds } }, _count: true });
  }

  nguoiCoQuyenSku(mauId: string) {
    return this.prisma.quyen_sku.findMany({ where: { mau_id: mauId }, include: { ho_so: { select: { id: true, ho_ten: true, email: true } } }, orderBy: { cap_luc: "desc" }, take: 200 });
  }

  // ================================================================ HOAT DONG (nhat ky)

  /** tu / den: moc thoi gian da tinh san (den la moc loai tru) */
  async dsNhatKy(loc: { hoSoId?: string; doiTuong?: string; doiTuongId?: string; hanhDong?: string; tu?: Date; den?: Date }, skip: number, take: number) {
    const where: Prisma.nhat_kyWhereInput = {
      ...(loc.hoSoId ? { ho_so_id: loc.hoSoId } : {}),
      ...(loc.doiTuong ? { doi_tuong: loc.doiTuong } : {}),
      ...(loc.doiTuongId ? { doi_tuong_id: loc.doiTuongId } : {}),
      ...(loc.hanhDong ? { hanh_dong: { contains: loc.hanhDong } } : {}),
      ...(loc.tu || loc.den ? { created_at: { ...(loc.tu ? { gte: loc.tu } : {}), ...(loc.den ? { lt: loc.den } : {}) } } : {})
    };
    const [ds, tong] = await Promise.all([this.prisma.nhat_ky.findMany({ where, orderBy: { created_at: "desc" }, skip, take }), this.prisma.nhat_ky.count({ where })]);
    return { ds, tong };
  }

  // ================================================================ GIAO DICH

  /** tuKhoa: ma don / ma gioi thieu chua (khong phan biet hoa thuong) */
  async dsGhiNhanDon(loc: { trangThai?: TrangThaiGhiNhan; nguon?: NguonDon; tuKhoa?: string }, skip: number, take: number) {
    const where: Prisma.ghi_nhan_donWhereInput = {
      ...(loc.trangThai ? { trang_thai: loc.trangThai } : {}),
      ...(loc.nguon ? { nguon: loc.nguon } : {}),
      ...(loc.tuKhoa ? { OR: [{ ma_don: { contains: loc.tuKhoa, mode: "insensitive" } }, { ma_gioi_thieu: { contains: loc.tuKhoa, mode: "insensitive" } }] } : {})
    };
    const [ds, tong] = await Promise.all([
      this.prisma.ghi_nhan_don.findMany({ where, include: { hoa_hong: true }, orderBy: { created_at: "desc" }, skip, take }),
      this.prisma.ghi_nhan_don.count({ where })
    ]);
    return { ds, tong };
  }

  // ================================================================ DOI TAC

  /** tuKhoa: ten (khong phan biet hoa thuong) / ma so thue chua */
  async dsDoiTac(loc: { tuKhoa?: string }, skip: number, take: number) {
    const where: Prisma.doi_tacWhereInput = loc.tuKhoa ? { OR: [{ ten: { contains: loc.tuKhoa, mode: "insensitive" } }, { ma_so_thue: { contains: loc.tuKhoa } }] } : {};
    const [ds, tong] = await Promise.all([
      this.prisma.doi_tac.findMany({ where, orderBy: { created_at: "desc" }, skip, take, include: { _count: { select: { qua_tang: true, voucher: true, hop_dong: true } } } }),
      this.prisma.doi_tac.count({ where })
    ]);
    return { ds, tong };
  }

  /** Tong doanh thu qua / chi phi tai tro cua hop dong chua HUY, theo doi tac */
  tienHopDongTheoDoiTac(doiTacIds: string[]) {
    return this.prisma.hop_dong_doi_tac.groupBy({
      by: ["doi_tac_id"],
      where: { doi_tac_id: { in: doiTacIds }, trang_thai: { not: "HUY" } },
      _sum: { doanh_thu_qua: true, chi_phi_tai_tro: true }
    });
  }

  doiTacChiTiet(id: string) {
    return this.prisma.doi_tac.findUnique({
      where: { id },
      include: { qua_tang: { orderBy: { created_at: "desc" } }, voucher: { orderBy: { created_at: "desc" } }, hop_dong: { orderBy: { created_at: "desc" } } }
    });
  }
}

/** Truy van so lieu cho bang dieu hanh quan tri (chi doc thien_khue) */
@Injectable()
export class TongQuanRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Vai phai hoc chua KET_THUC (dem nguoi hoc theo ho so) */
  vaiHocConHieuLuc(vaiPhaiHoc: Vai[]) {
    return this.prisma.vai_tro_ho_so.findMany({ where: { vai: { in: vaiPhaiHoc }, trang_thai: { not: "KET_THUC" } }, select: { ho_so_id: true, trang_thai: true } });
  }

  demLuotDaNop() {
    return this.prisma.luot_lam.count({ where: { nop_luc: { not: null } } });
  }

  demLuotDat() {
    return this.prisma.luot_lam.count({ where: { nop_luc: { not: null }, dat: true } });
  }

  /** Don hop le / da doi soat / cho xac minh theo nguon */
  donTheoNguon() {
    return this.prisma.ghi_nhan_don.groupBy({ by: ["nguon"], where: { trang_thai: { in: ["HOP_LE", "DA_DOI_SOAT", "CHO_XAC_MINH"] } }, _count: true, _sum: { tong_tien: true } });
  }

  demDonChoXacMinh() {
    return this.prisma.ghi_nhan_don.count({ where: { trang_thai: "CHO_XAC_MINH" } });
  }

  /** Hoa hong CHO_DOI_SOAT + DU_DIEU_KIEN */
  hoaHongCho() {
    return this.prisma.hoa_hong.aggregate({ where: { trang_thai: { in: ["CHO_DOI_SOAT", "DU_DIEU_KIEN"] } }, _sum: { so_tien: true }, _count: true });
  }

  /** De xuat dang mo theo (trang_thai, loai) — service quy loai 2 buoc con CHO_KIEM ve cho duyet */
  deXuatDangMoTheoTrangThai() {
    return this.prisma.de_xuat_duyet.groupBy({ by: ["trang_thai", "loai"], where: { trang_thai: { in: ["CHO_KIEM", "CHO_DUYET"] } }, _count: true });
  }

  demQuaChoThamDinh() {
    return this.prisma.qua_tang.count({ where: { trang_thai: "CHO_THAM_DINH" } });
  }

  demHoSo() {
    return this.prisma.ho_so.count();
  }

  /** Mot trang ho so co vai (trong vaiLoc) chua KET_THUC + tong so */
  async nguoiHocTheoTrang(vaiLoc: Vai[], skip: number, take: number) {
    const where = { vai_tro: { some: { vai: { in: vaiLoc }, trang_thai: { not: "KET_THUC" as const } } } };
    const [hoSo, tong] = await Promise.all([
      this.prisma.ho_so.findMany({ where, orderBy: { created_at: "desc" }, skip, take, select: { id: true, ho_ten: true, vai_tro: { select: { vai: true, trang_thai: true } } } }),
      this.prisma.ho_so.count({ where })
    ]);
    return { hoSo, tong };
  }

  /** Khoa bat buoc NEN_TANG / NGHIEP_VU dang bat, kem bai hoc + bai kiem tra bat buoc */
  khoaBatBuoc() {
    return this.prisma.khoa_hoc.findMany({
      where: { bat: true, bat_buoc: true, loai: { in: ["NEN_TANG", "NGHIEP_VU"] } },
      select: { id: true, vai_ap_dung: true, bai_hoc: { where: { bat: true }, select: { id: true } }, bai_kiem_tra: { where: { bat: true, bat_buoc: true }, select: { id: true } } }
    });
  }

  baiHocDaXong(hoSoIds: string[]) {
    return this.prisma.tien_do_bai_hoc.findMany({ where: { ho_so_id: { in: hoSoIds }, hoan_thanh_luc: { not: null } }, select: { ho_so_id: true, bai_hoc_id: true } });
  }

  luotDaNop(hoSoIds: string[]) {
    return this.prisma.luot_lam.findMany({ where: { ho_so_id: { in: hoSoIds }, nop_luc: { not: null } }, select: { ho_so_id: true, bai_kiem_tra_id: true, dat: true } });
  }
}
