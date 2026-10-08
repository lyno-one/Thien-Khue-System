// Truy van Prisma cua module mang-luoi. Lop: HoSoMangLuoiRepository, MaGioiThieuRepository, ChienDichRepository, ThucTapRepository, GhiNhanDonRepository, HoaHongRepository.
import { Injectable } from "@nestjs/common";
import type {
  bai_thuc_hanh, chien_dich, de_xuat_duyet, dieu_chinh_hoa_hong, ghi_nhan_don, hoa_hong, LoaiDeXuat, ma_gioi_thieu, noi_dung_koc, Prisma,
  tham_gia_chien_dich, TrangThaiGhiNhan, TrangThaiHoaHong, TrangThaiNoiDung, TrangThaiThamGia, TrangThaiThucHanh, TrangThaiVai, Vai
} from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { VAI_PHU_TRACH } from "../constants/mang-luoi.constants";
import { tachNguoiNhapMa } from "../common/utils/mang-luoi";

/** Truy van ho_so / vai_tro_ho_so / nhat_ky dung chung cho cac service mang luoi (chi schema thien_khue) */
@Injectable()
export class HoSoMangLuoiRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Vai dang HOAT_DONG cua mot ho so */
  async layVaiHoatDong(hoSoId: string): Promise<Vai[]> {
    const ds = await this.prisma.vai_tro_ho_so.findMany({ where: { ho_so_id: hoSoId, trang_thai: "HOAT_DONG" }, select: { vai: true } });
    return ds.map(d => d.vai);
  }

  /** id -> { id, ho_ten } cho nhieu ho so (bang khong co FK nguoi_* sang ho_so) */
  async layTenHoSo(ids: (string | null | undefined)[]): Promise<Map<string, { id: string; ho_ten: string }>> {
    const duy = [...new Set(ids.filter((x): x is string => !!x))];
    if (!duy.length) return new Map();
    const ds = await this.prisma.ho_so.findMany({ where: { id: { in: duy } }, select: { id: true, ho_ten: true } });
    return new Map(ds.map(d => [d.id, d]));
  }

  /** ho_so.id cua QUAN_LY / THIEN_KHUE dang HOAT_DONG (nhan thong bao xac minh) */
  async layNguoiPhuTrach(): Promise<string[]> {
    const ds = await this.prisma.vai_tro_ho_so.findMany({
      where: { vai: { in: VAI_PHU_TRACH }, trang_thai: "HOAT_DONG" },
      select: { ho_so_id: true }
    });
    return [...new Set(ds.map(d => d.ho_so_id))];
  }

  /** ho_so.id co mot trong cac vai dang HOAT_DONG (giu trung lap nhu truy van goc), tru cac id loaiTru neu co */
  async layHoSoIdCoVai(vai: Vai[], loaiTru?: string[]): Promise<string[]> {
    const ds = await this.prisma.vai_tro_ho_so.findMany({
      where: { vai: { in: vai }, trang_thai: "HOAT_DONG", ...(loaiTru ? { ho_so_id: { notIn: loaiTru } } : {}) },
      select: { ho_so_id: true }
    });
    return ds.map(d => d.ho_so_id);
  }

  /**
   * Ho so da NHAP TAY ma gioi thieu cho mot ghi nhan (nhat_ky GHI_NHAN_DON.du_lieu.nguoi_nhap_ma).
   * Nguoi nhap la nguoi lien quan: khong duoc de xuat / kiem / duyet xac minh don do (KIEN-TRUC muc 7).
   */
  async layNguoiNhapMa(ghiNhanId: string): Promise<string[]> {
    const ds = await this.prisma.nhat_ky.findMany({
      where: { doi_tuong: "ghi_nhan_don", doi_tuong_id: ghiNhanId, hanh_dong: "GHI_NHAN_DON" },
      select: { du_lieu: true }
    });
    return tachNguoiNhapMa(ds);
  }

  /** Ho so gan voi tai khoan CRM (nguoi tao don) kem vai */
  timTheoCrmUser(crmUserId: string): Promise<{ id: string; vai_tro: { vai: Vai; trang_thai: TrangThaiVai }[] } | null> {
    return this.prisma.ho_so.findUnique({
      where: { crm_user_id: crmUserId },
      select: { id: true, vai_tro: { select: { vai: true, trang_thai: true } } }
    });
  }

  timCoBan(id: string): Promise<{ id: string; ho_ten: string } | null> {
    return this.prisma.ho_so.findUnique({ where: { id }, select: { id: true, ho_ten: true } });
  }

  timKemVai(id: string): Promise<{ id: string; ho_ten: string; email: string | null; vai_tro: { vai: Vai; trang_thai: TrangThaiVai }[] } | null> {
    return this.prisma.ho_so.findUnique({
      where: { id },
      select: { id: true, ho_ten: true, email: true, vai_tro: { select: { vai: true, trang_thai: true } } }
    });
  }
}

/** Truy van ma_gioi_thieu / luot_click (+ thong ke don theo ma, quyen SKU + khoa san pham cho tai lieu) */
@Injectable()
export class MaGioiThieuRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Tim theo chuoi ma (da chuan hoa trim + upper o service) */
  timTheoMa(ma: string): Promise<ma_gioi_thieu | null> {
    return this.prisma.ma_gioi_thieu.findUnique({ where: { ma } });
  }

  timTheoId(id: string): Promise<ma_gioi_thieu | null> {
    return this.prisma.ma_gioi_thieu.findUnique({ where: { id } });
  }

  /** id cac ma cua mot ho so (moi nhat truoc) */
  async layIdsCuaHoSo(hoSoId: string): Promise<string[]> {
    const ds = await this.prisma.ma_gioi_thieu.findMany({ where: { ho_so_id: hoSoId }, select: { id: true }, orderBy: { created_at: "desc" } });
    return ds.map(m => m.id);
  }

  /** ma id -> chu ma (ho_so_id) */
  layChuMaTheoIds(ids: string[]): Promise<{ id: string; ho_so_id: string }[]> {
    return this.prisma.ma_gioi_thieu.findMany({ where: { id: { in: ids } }, select: { id: true, ho_so_id: true } });
  }

  /** Ma dang bat cua (nguoi, SKU, chien dich) — moi nhat */
  timMaDangBat(hoSoId: string, mauId: string, chienDichId: string | null): Promise<ma_gioi_thieu | null> {
    return this.prisma.ma_gioi_thieu.findFirst({
      where: { ho_so_id: hoSoId, mau_id: mauId, chien_dich_id: chienDichId, bat: true },
      orderBy: { created_at: "desc" }
    });
  }

  /** Tao ma — trung chuoi ma nem P2002 (service sinh lai) */
  tao(data: { ho_so_id: string; mau_id: string; ma_mau: string; ma: string; chien_dich_id: string | null }): Promise<ma_gioi_thieu> {
    return this.prisma.ma_gioi_thieu.create({ data });
  }

  async datBat(id: string, bat: boolean): Promise<void> {
    await this.prisma.ma_gioi_thieu.update({ where: { id }, data: { bat } });
  }

  /** Ma kem ten chien dich + so click */
  layKemThongKe(ids: string[]) {
    return this.prisma.ma_gioi_thieu.findMany({
      where: { id: { in: ids } },
      include: { chien_dich: { select: { ten: true } }, _count: { select: { luot_click: true } } },
      orderBy: { created_at: "desc" }
    });
  }

  /** So don + doanh so da ghi nhan (HOP_LE / DA_DOI_SOAT) theo tung ma */
  demDonTheoMa(ids: string[]) {
    return this.prisma.ghi_nhan_don.groupBy({
      by: ["ma_gioi_thieu_id"],
      where: { ma_gioi_thieu_id: { in: ids }, trang_thai: { in: ["HOP_LE", "DA_DOI_SOAT"] } },
      _count: { _all: true },
      _sum: { tong_tien: true }
    });
  }

  /** Quyen SKU con hieu luc hoac can hoc lai (de lay tai lieu san pham) */
  layQuyenSkuCoTaiLieu(hoSoId: string) {
    return this.prisma.quyen_sku.findMany({
      where: { ho_so_id: hoSoId, trang_thai: { in: ["HOAT_DONG", "CAN_HOC_LAI"] } },
      select: { mau_id: true, trang_thai: true, phien_ban_tai_lieu: true }
    });
  }

  /** Khoa hoc san pham dang bat cua cac SKU */
  layKhoaSanPham(mauIds: string[]) {
    return this.prisma.khoa_hoc.findMany({ where: { loai: "SAN_PHAM", mau_id: { in: mauIds }, bat: true }, select: { id: true, ma: true, ten: true, mau_id: true } });
  }

  /** Click cung IP bam cua ma tu moc tuLuc */
  timClickGanDay(maId: string, ipBam: string, tuLuc: Date): Promise<{ id: string } | null> {
    return this.prisma.luot_click.findFirst({
      where: { ma_gioi_thieu_id: maId, ip_bam: ipBam, created_at: { gte: tuLuc } },
      select: { id: true }
    });
  }

  async taoClick(data: Prisma.luot_clickUncheckedCreateInput): Promise<void> {
    await this.prisma.luot_click.create({ data });
  }
}

const KEM_TEN_CHIEN_DICH = { chien_dich: { select: { ten: true } } } as const;
/** Truy van chien_dich / tham_gia_chien_dich / noi_dung_koc */
@Injectable()
export class ChienDichRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- chien dich

  tao(data: Prisma.chien_dichUncheckedCreateInput): Promise<chien_dich> {
    return this.prisma.chien_dich.create({ data });
  }

  timTheoId(id: string): Promise<chien_dich | null> {
    return this.prisma.chien_dich.findUnique({ where: { id } });
  }

  capNhat(id: string, data: Prisma.chien_dichUpdateInput): Promise<chien_dich> {
    return this.prisma.chien_dich.update({ where: { id }, data });
  }

  danhSachMoiNhat(): Promise<chien_dich[]> {
    return this.prisma.chien_dich.findMany({ orderBy: { created_at: "desc" }, take: 200 });
  }

  /** Dang chay (hoac minh da tham gia) + hop vai (bo loc vai khi khong phai quan ly), kem dong tham gia cua minh */
  choNguoi(hoSoId: string, vai: Vai[], laQuanLy: boolean) {
    return this.prisma.chien_dich.findMany({
      where: {
        AND: [
          { OR: [{ trang_thai: "DANG_CHAY" }, { tham_gia: { some: { ho_so_id: hoSoId } } }] },
          laQuanLy ? {} : { OR: [{ vai_ap_dung: { isEmpty: true } }, { vai_ap_dung: { hasSome: vai } }] }
        ]
      },
      include: { tham_gia: { where: { ho_so_id: hoSoId } } },
      orderBy: [{ trang_thai: "asc" }, { han: "asc" }],
      take: 100
    });
  }

  // ---------------------------------------------------------------- tham gia

  demThamGiaTheoTrangThai(chienDichIds: string[]) {
    return this.prisma.tham_gia_chien_dich.groupBy({ by: ["chien_dich_id", "trang_thai"], where: { chien_dich_id: { in: chienDichIds } }, _count: { _all: true } });
  }

  /** So nguoi da duoc nhan (DA_DUYET / HOAN_THANH) */
  demThamGiaDaNhan(chienDichId: string): Promise<number> {
    return this.prisma.tham_gia_chien_dich.count({ where: { chien_dich_id: chienDichId, trang_thai: { in: ["DA_DUYET", "HOAN_THANH"] } } });
  }

  /** Tao dang ky — trung (chien dich, ho so) nem P2002 */
  taoThamGia(data: { chien_dich_id: string; ho_so_id: string; ghi_chu: string | null }): Promise<tham_gia_chien_dich> {
    return this.prisma.tham_gia_chien_dich.create({ data });
  }

  timThamGia(chienDichId: string, hoSoId: string): Promise<{ trang_thai: TrangThaiThamGia } | null> {
    return this.prisma.tham_gia_chien_dich.findUnique({
      where: { chien_dich_id_ho_so_id: { chien_dich_id: chienDichId, ho_so_id: hoSoId } },
      select: { trang_thai: true }
    });
  }

  timThamGiaKemChienDich(id: string): Promise<(tham_gia_chien_dich & { chien_dich: chien_dich }) | null> {
    return this.prisma.tham_gia_chien_dich.findUnique({ where: { id }, include: { chien_dich: true } });
  }

  /** Theo chien dich, hoac (khong truyen) moi dang ky CHO_DUYET / DA_DUYET */
  danhSachThamGia(chienDichId?: string) {
    return this.prisma.tham_gia_chien_dich.findMany({
      where: chienDichId ? { chien_dich_id: chienDichId } : { trang_thai: { in: ["CHO_DUYET", "DA_DUYET"] } },
      include: { chien_dich: { select: { ten: true } }, ho_so: { select: { id: true, ho_ten: true } } },
      orderBy: { created_at: "desc" },
      take: 300
    });
  }

  /** Doi trang thai dang ky chi khi dang o trangThaiCu (chong hai luong) — tra so dong doi */
  async capNhatThamGiaNeu(id: string, trangThaiCu: TrangThaiThamGia, data: Prisma.tham_gia_chien_dichUncheckedUpdateManyInput): Promise<number> {
    const n = await this.prisma.tham_gia_chien_dich.updateMany({ where: { id, trang_thai: trangThaiCu }, data });
    return n.count;
  }

  // ---------------------------------------------------------------- noi dung KOL / KOC

  demNoiDungTheoChienDich(chienDichIds: string[]) {
    return this.prisma.noi_dung_koc.groupBy({ by: ["chien_dich_id"], where: { chien_dich_id: { in: chienDichIds } }, _count: { _all: true }, _sum: { luot_xem: true } });
  }

  demNoiDungTheoNguoi(chienDichIds: string[], hoSoIds: string[]) {
    return this.prisma.noi_dung_koc.groupBy({
      by: ["chien_dich_id", "ho_so_id"],
      where: { chien_dich_id: { in: chienDichIds }, ho_so_id: { in: hoSoIds } },
      _count: { _all: true }
    });
  }

  /** Noi dung DA_DUYET / DA_DANG cua mot nguoi trong chien dich (can cu nghiem thu) */
  layNoiDungDat(hoSoId: string, chienDichId: string) {
    return this.prisma.noi_dung_koc.findMany({
      where: { ho_so_id: hoSoId, chien_dich_id: chienDichId, trang_thai: { in: ["DA_DUYET", "DA_DANG"] } },
      select: { id: true, luot_xem: true, luot_tuong_tac: true }
    });
  }

  taoNoiDung(data: Prisma.noi_dung_kocUncheckedCreateInput) {
    return this.prisma.noi_dung_koc.create({ data, include: KEM_TEN_CHIEN_DICH });
  }

  timNoiDung(id: string): Promise<noi_dung_koc | null> {
    return this.prisma.noi_dung_koc.findUnique({ where: { id } });
  }

  timNoiDungKemChienDich(id: string): Promise<(noi_dung_koc & { chien_dich: chien_dich | null }) | null> {
    return this.prisma.noi_dung_koc.findUnique({ where: { id }, include: { chien_dich: true } });
  }

  layNoiDungKemTen(id: string) {
    return this.prisma.noi_dung_koc.findUniqueOrThrow({ where: { id }, include: KEM_TEN_CHIEN_DICH });
  }

  capNhatNoiDung(id: string, data: Prisma.noi_dung_kocUncheckedUpdateInput) {
    return this.prisma.noi_dung_koc.update({ where: { id }, data, include: KEM_TEN_CHIEN_DICH });
  }

  /** Doi trang thai noi dung chi khi dang o trangThaiCu — tra so dong doi */
  async capNhatNoiDungNeu(id: string, trangThaiCu: TrangThaiNoiDung, data: Prisma.noi_dung_kocUncheckedUpdateManyInput): Promise<number> {
    const n = await this.prisma.noi_dung_koc.updateMany({ where: { id, trang_thai: trangThaiCu }, data });
    return n.count;
  }

  noiDungCuaHoSo(hoSoId: string) {
    return this.prisma.noi_dung_koc.findMany({ where: { ho_so_id: hoSoId }, include: KEM_TEN_CHIEN_DICH, orderBy: { created_at: "desc" }, take: 200 });
  }

  noiDungLoc(loc: { trang_thai?: TrangThaiNoiDung; chien_dich_id?: string }) {
    return this.prisma.noi_dung_koc.findMany({
      where: { ...(loc.trang_thai ? { trang_thai: loc.trang_thai } : {}), ...(loc.chien_dich_id ? { chien_dich_id: loc.chien_dich_id } : {}) },
      include: KEM_TEN_CHIEN_DICH,
      orderBy: { created_at: "desc" },
      take: 300
    });
  }
}

type Db = Prisma.TransactionClient;
const KEM_KHOA_HOC = { khoa_hoc: { select: { id: true, ten: true } } } as const;
/** Truy van lo trinh thuc tap: khoa_hoc THUC_TAP, tien do, luot lam, bai_thuc_hanh (vai THUC_TAP) */
@Injectable()
export class ThucTapRepository {
  constructor(private readonly prisma: PrismaService) {}

  chayTrongGiaoDich<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // ---------------------------------------------------------------- lo trinh

  /** Khoa hoc dang bat ap dung THUC_TAP kem id bai hoc / bai kiem tra dang bat */
  layKhoaLoTrinh() {
    return this.prisma.khoa_hoc.findMany({
      where: { bat: true, vai_ap_dung: { has: "THUC_TAP" } },
      include: { bai_hoc: { where: { bat: true }, select: { id: true } }, bai_kiem_tra: { where: { bat: true }, select: { id: true } } },
      orderBy: [{ thu_tu: "asc" }, { ten: "asc" }]
    });
  }

  layBaiHocDaXong(hoSoId: string, baiHocIds: string[]): Promise<{ bai_hoc_id: string }[]> {
    return this.prisma.tien_do_bai_hoc.findMany({ where: { ho_so_id: hoSoId, bai_hoc_id: { in: baiHocIds }, hoan_thanh_luc: { not: null } }, select: { bai_hoc_id: true } });
  }

  /** Luot lam da nop cua ho so (gioi han trong baiKiemTraIds neu truyen) */
  layLuotLamDaNop(hoSoId: string, baiKiemTraIds?: string[]): Promise<{ bai_kiem_tra_id: string; diem: number; dat: boolean }[]> {
    return this.prisma.luot_lam.findMany({
      where: { ho_so_id: hoSoId, ...(baiKiemTraIds !== undefined ? { bai_kiem_tra_id: { in: baiKiemTraIds } } : {}), nop_luc: { not: null } },
      select: { bai_kiem_tra_id: true, diem: true, dat: true }
    });
  }

  layTrangThaiBaiTapTheoKhoa(hoSoId: string, khoaHocIds: string[]): Promise<{ khoa_hoc_id: string; trang_thai: TrangThaiThucHanh }[]> {
    return this.prisma.bai_thuc_hanh.findMany({ where: { ho_so_id: hoSoId, khoa_hoc_id: { in: khoaHocIds } }, select: { khoa_hoc_id: true, trang_thai: true } });
  }

  timKhoaHoc(id: string): Promise<{ id: string; bat: boolean; vai_ap_dung: Vai[] } | null> {
    return this.prisma.khoa_hoc.findUnique({ where: { id }, select: { id: true, bat: true, vai_ap_dung: true } });
  }

  // ---------------------------------------------------------------- bai tap

  taoBaiTap(data: { khoa_hoc_id: string; ho_so_id: string; tieu_de: string; mo_ta: string | null; link: string | null }) {
    return this.prisma.bai_thuc_hanh.create({ data: { ...data, vai: "THUC_TAP" }, include: KEM_KHOA_HOC });
  }

  baiTapCuaHoSo(hoSoId: string) {
    return this.prisma.bai_thuc_hanh.findMany({ where: { ho_so_id: hoSoId, vai: "THUC_TAP" }, include: KEM_KHOA_HOC, orderBy: { nop_luc: "desc" } });
  }

  baiTapLoc(trangThai?: TrangThaiThucHanh, hoSoId?: string) {
    return this.prisma.bai_thuc_hanh.findMany({
      where: { vai: "THUC_TAP", ...(trangThai ? { trang_thai: trangThai } : {}), ...(hoSoId ? { ho_so_id: hoSoId } : {}) },
      include: KEM_KHOA_HOC,
      orderBy: { nop_luc: "asc" },
      take: 300
    });
  }

  timBaiTap(id: string): Promise<bai_thuc_hanh | null> {
    return this.prisma.bai_thuc_hanh.findUnique({ where: { id } });
  }

  layBaiTapKemKhoa(id: string) {
    return this.prisma.bai_thuc_hanh.findUniqueOrThrow({ where: { id }, include: KEM_KHOA_HOC });
  }

  /** Cham chi khi bai con CHO_CHAM (chong cham trung) — tra so dong doi */
  async chamNeuChoCham(id: string, data: Prisma.bai_thuc_hanhUncheckedUpdateManyInput): Promise<number> {
    const n = await this.prisma.bai_thuc_hanh.updateMany({ where: { id, trang_thai: "CHO_CHAM" }, data });
    return n.count;
  }

  layDiemBaiTap(hoSoId: string): Promise<{ trang_thai: TrangThaiThucHanh; diem: number | null }[]> {
    return this.prisma.bai_thuc_hanh.findMany({ where: { ho_so_id: hoSoId, vai: "THUC_TAP" }, select: { trang_thai: true, diem: true } });
  }

  // ---------------------------------------------------------------- TTS + de xuat chuyen vai

  /** ho_so.id cac TTS DANG_HOC / HOAT_DONG (moi nhat truoc, toi da 100) */
  async layHoSoIdTts(): Promise<string[]> {
    const ds = await this.prisma.vai_tro_ho_so.findMany({
      where: { vai: "THUC_TAP", trang_thai: { in: ["DANG_HOC", "HOAT_DONG"] } },
      select: { ho_so_id: true },
      orderBy: { created_at: "desc" },
      take: 100
    });
    return ds.map(d => d.ho_so_id);
  }
}

export type GhiNhanKemHoaHong = ghi_nhan_don & { hoa_hong: hoa_hong | null };
/**
 * Truy van ghi_nhan_don + hoa_hong + dieu_chinh_hoa_hong (vong doi ghi nhan don) + ty_le_hoa_hong + de xuat XAC_MINH_DON.
 * Ham ghi nhan `db` (mac dinh this.prisma) de service ghep nhieu buoc trong mot chayTrongGiaoDich.
 */
@Injectable()
export class GhiNhanDonRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay fn trong mot transaction — truyen tx cho cac ham repository / NhatKyService.ghi */
  chayTrongGiaoDich<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // ---------------------------------------------------------------- doc

  timTheoCrmDonKemHoaHong(crmDonId: string): Promise<GhiNhanKemHoaHong | null> {
    return this.prisma.ghi_nhan_don.findUnique({ where: { crm_don_id: crmDonId }, include: { hoa_hong: true } });
  }

  timIdTheoCrmDon(crmDonId: string): Promise<{ id: string } | null> {
    return this.prisma.ghi_nhan_don.findUnique({ where: { crm_don_id: crmDonId }, select: { id: true } });
  }

  timTheoId(id: string): Promise<ghi_nhan_don | null> {
    return this.prisma.ghi_nhan_don.findUnique({ where: { id } });
  }

  timTheoIdKemHoaHong(id: string): Promise<GhiNhanKemHoaHong | null> {
    return this.prisma.ghi_nhan_don.findUnique({ where: { id }, include: { hoa_hong: true } });
  }

  /** Ty le dang bat cua vai, chua het hieu luc tai `luc`, ap cho moi mau hoac mot trong mauIds */
  layTyLeChoDon(vai: Vai, luc: Date, mauIds: string[]): Promise<{ mau_id: string | null; ty_le: Prisma.Decimal; hieu_luc_tu: Date }[]> {
    return this.prisma.ty_le_hoa_hong.findMany({
      where: {
        vai,
        bat: true,
        AND: [{ OR: [{ hieu_luc_den: null }, { hieu_luc_den: { gt: luc } }] }, { OR: [{ mau_id: null }, { mau_id: { in: mauIds } }] }]
      },
      select: { mau_id: true, ty_le: true, hieu_luc_tu: true }
    });
  }

  /**
   * Ghi nhan can dong bo lai (tao tu `tuLuc`): con mo (HOP_LE / CHO_XAC_MINH / DA_DOI_SOAT, hoa hong chua BI_TRU)
   * hoac da BI_HUY ma hoa hong chua bi tru (du lieu cu / loi giua chung -> tru bu). Moi nhat truoc, toi da 2000.
   */
  layCanDongBo(tuLuc: Date): Promise<GhiNhanKemHoaHong[]> {
    return this.prisma.ghi_nhan_don.findMany({
      where: {
        created_at: { gte: tuLuc },
        OR: [
          { trang_thai: { in: ["HOP_LE", "CHO_XAC_MINH", "DA_DOI_SOAT"] }, OR: [{ hoa_hong: { is: null } }, { hoa_hong: { is: { trang_thai: { not: "BI_TRU" } } } }] },
          { trang_thai: "BI_HUY", hoa_hong: { is: { trang_thai: { not: "BI_TRU" } } } }
        ]
      },
      include: { hoa_hong: true },
      orderBy: { created_at: "desc" },
      take: 2000
    });
  }

  private async phanTrang(where: Prisma.ghi_nhan_donWhereInput, skip: number, take: number): Promise<{ ds: GhiNhanKemHoaHong[]; tong: number }> {
    const [ds, tong] = await Promise.all([
      this.prisma.ghi_nhan_don.findMany({ where, include: { hoa_hong: true }, orderBy: { created_at: "desc" }, skip, take }),
      this.prisma.ghi_nhan_don.count({ where })
    ]);
    return { ds, tong };
  }

  /** Danh sach cho quan ly (loc trang thai) */
  danhSach(q: { trang_thai?: TrangThaiGhiNhan; skip: number; take: number }): Promise<{ ds: GhiNhanKemHoaHong[]; tong: number }> {
    return this.phanTrang(q.trang_thai ? { trang_thai: q.trang_thai } : {}, q.skip, q.take);
  }

  /** Don ho so la nguoi ban / nguoi chot / chu mot trong maIds */
  danhSachLienQuan(hoSoId: string, maIds: string[], q: { trang_thai?: TrangThaiGhiNhan; skip: number; take: number }): Promise<{ ds: GhiNhanKemHoaHong[]; tong: number }> {
    return this.phanTrang(
      {
        OR: [{ nguoi_ban_ho_so_id: hoSoId }, { nguoi_chot_ho_so_id: hoSoId }, ...(maIds.length ? [{ ma_gioi_thieu_id: { in: maIds } }] : [])],
        ...(q.trang_thai ? { trang_thai: q.trang_thai } : {})
      },
      q.skip,
      q.take
    );
  }

  // ---------------------------------------------------------------- ghi (nhan db de chay trong transaction)

  /** Tao ghi nhan — trung crm_don_id nem P2002 */
  taoGhiNhan(data: Prisma.ghi_nhan_donUncheckedCreateInput, db: Db = this.prisma): Promise<ghi_nhan_don> {
    return db.ghi_nhan_don.create({ data });
  }

  /** Tao hoa hong — trung ghi_nhan_don_id nem P2002 */
  taoHoaHong(data: Prisma.hoa_hongUncheckedCreateInput, db: Db = this.prisma): Promise<hoa_hong> {
    return db.hoa_hong.create({ data });
  }

  /** Doi ghi nhan chi khi con o trangThaiCu — tra so dong doi */
  async capNhatGhiNhanNeu(id: string, trangThaiCu: TrangThaiGhiNhan, data: Prisma.ghi_nhan_donUncheckedUpdateManyInput, db: Db = this.prisma): Promise<number> {
    const n = await db.ghi_nhan_don.updateMany({ where: { id, trang_thai: trangThaiCu }, data });
    return n.count;
  }

  /** Doi trang thai hoa hong chi khi con o trangThaiCu — tra so dong doi */
  async doiTrangThaiHoaHongNeu(id: string, trangThaiCu: TrangThaiHoaHong, trangThaiMoi: TrangThaiHoaHong, db: Db = this.prisma): Promise<number> {
    const n = await db.hoa_hong.updateMany({ where: { id, trang_thai: trangThaiCu }, data: { trang_thai: trangThaiMoi } });
    return n.count;
  }

  async taoDieuChinh(data: Prisma.dieu_chinh_hoa_hongUncheckedCreateInput, db: Db = this.prisma): Promise<void> {
    await db.dieu_chinh_hoa_hong.create({ data });
  }

  // ---------------------------------------------------------------- de xuat XAC_MINH_DON

  timDeXuatXacMinhDangMo(ghiNhanId: string, db: Db = this.prisma): Promise<{ id: string } | null> {
    return db.de_xuat_duyet.findFirst({
      where: { loai: "XAC_MINH_DON", doi_tuong: "ghi_nhan_don", doi_tuong_id: ghiNhanId, trang_thai: { in: ["CHO_KIEM", "CHO_DUYET"] } },
      select: { id: true }
    });
  }

  taoDeXuatXacMinh(ghiNhanId: string, duLieu: Prisma.InputJsonValue, lyDo: string, nguoiDeXuatId: string, db: Db = this.prisma): Promise<de_xuat_duyet> {
    return db.de_xuat_duyet.create({
      data: { loai: "XAC_MINH_DON", doi_tuong: "ghi_nhan_don", doi_tuong_id: ghiNhanId, du_lieu: duLieu, ly_do: lyDo, nguoi_de_xuat_id: nguoiDeXuatId, trang_thai: "CHO_KIEM" }
    });
  }
}

/** Truy van vi hoa hong: hoa_hong, dieu_chinh_hoa_hong, ty le ap dung, de xuat DIEU_CHINH / CHI_TRA lien quan */
@Injectable()
export class HoaHongRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay fn trong mot transaction (tuy chon isolation) — truyen tx cho cac ham repository / NhatKyService.ghi */
  chayTrongGiaoDich<T>(fn: (tx: Db) => Promise<T>, tuyChon?: { isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<T> {
    return this.prisma.$transaction(fn, tuyChon);
  }

  // ---------------------------------------------------------------- vi

  tongTheoTrangThai(hoSoId: string) {
    return this.prisma.hoa_hong.groupBy({ by: ["trang_thai"], where: { ho_so_id: hoSoId }, _sum: { so_tien: true }, _count: { _all: true } });
  }

  tongDieuChinh(hoSoId: string) {
    return this.prisma.dieu_chinh_hoa_hong.aggregate({ where: { ho_so_id: hoSoId }, _sum: { so_tien: true }, _count: { _all: true } });
  }

  layDieuChinhGon(hoSoId: string): Promise<{ id: string; so_tien: Prisma.Decimal; de_xuat_chi_tra_id: string | null }[]> {
    return this.prisma.dieu_chinh_hoa_hong.findMany({ where: { ho_so_id: hoSoId }, select: { id: true, so_tien: true, de_xuat_chi_tra_id: true } });
  }

  /** du_lieu cac de xuat CHI_TRA_HOA_HONG da duyet (chua dieu_chinh_ids da dua vao ky chi tra) */
  layDeXuatChiTraDaDuyet(): Promise<{ du_lieu: Prisma.JsonValue }[]> {
    return this.prisma.de_xuat_duyet.findMany({ where: { loai: "CHI_TRA_HOA_HONG", trang_thai: "DA_DUYET" }, select: { du_lieu: true } });
  }

  /** Tong don CHO_XAC_MINH ma ho so la nguoi chot / chu mot trong maIds */
  tongChoXacMinh(hoSoId: string, maIds: string[]) {
    return this.prisma.ghi_nhan_don.aggregate({
      where: {
        trang_thai: "CHO_XAC_MINH",
        OR: [{ nguoi_chot_ho_so_id: hoSoId }, ...(maIds.length ? [{ ma_gioi_thieu_id: { in: maIds } }] : [])]
      },
      _sum: { tong_tien: true },
      _count: { _all: true }
    });
  }

  /** Ty le dang hieu luc tai `luc` cua cac vai — sap xep de lay dong moi nhat moi (vai, mau) */
  layTyLeHieuLuc(vai: Vai[], luc: Date) {
    return this.prisma.ty_le_hoa_hong.findMany({
      where: { vai: { in: vai }, bat: true, hieu_luc_tu: { lte: luc }, OR: [{ hieu_luc_den: null }, { hieu_luc_den: { gt: luc } }] },
      orderBy: [{ vai: "asc" }, { mau_id: "asc" }, { hieu_luc_tu: "desc" }],
      select: { vai: true, ty_le: true, ma_mau: true, mau_id: true }
    });
  }

  async danhSach(hoSoId: string, q: { trang_thai?: TrangThaiHoaHong; ky?: string; skip: number; take: number }) {
    const where: Prisma.hoa_hongWhereInput = { ho_so_id: hoSoId, ...(q.trang_thai ? { trang_thai: q.trang_thai } : {}), ...(q.ky ? { ky: q.ky } : {}) };
    const [ds, tong] = await Promise.all([
      this.prisma.hoa_hong.findMany({ where, include: { ghi_nhan_don: true }, orderBy: { created_at: "desc" }, skip: q.skip, take: q.take }),
      this.prisma.hoa_hong.count({ where })
    ]);
    return { ds, tong };
  }

  dieuChinhCuaHoSo(hoSoId: string) {
    return this.prisma.dieu_chinh_hoa_hong.findMany({
      where: { ho_so_id: hoSoId },
      include: { hoa_hong: { select: { ghi_nhan_don: { select: { ma_don: true } } } } },
      orderBy: { created_at: "desc" },
      take: 200
    });
  }

  // ---------------------------------------------------------------- lich su duyet

  /** Ghi nhan da xac minh ma ho so la nguoi ban / nguoi chot / chu mot trong maIds */
  ghiNhanDaXacMinh(hoSoId: string, maIds: string[]) {
    return this.prisma.ghi_nhan_don.findMany({
      where: {
        nguoi_xac_minh_id: { not: null },
        OR: [{ nguoi_ban_ho_so_id: hoSoId }, { nguoi_chot_ho_so_id: hoSoId }, ...(maIds.length ? [{ ma_gioi_thieu_id: { in: maIds } }] : [])]
      },
      orderBy: { xac_minh_luc: "desc" },
      take: 100
    });
  }

  deXuatVeHoSo(hoSoId: string, loai: LoaiDeXuat[]): Promise<de_xuat_duyet[]> {
    return this.prisma.de_xuat_duyet.findMany({
      where: { doi_tuong: "ho_so", doi_tuong_id: hoSoId, loai: { in: loai } },
      orderBy: { created_at: "desc" },
      take: 100
    });
  }

  // ---------------------------------------------------------------- dieu chinh (maker-checker)

  timChuHoaHong(id: string): Promise<{ ho_so_id: string } | null> {
    return this.prisma.hoa_hong.findUnique({ where: { id }, select: { ho_so_id: true } });
  }

  taoDeXuatDieuChinh(hoSoId: string, duLieu: Prisma.InputJsonValue, lyDo: string, nguoiDeXuatId: string, db: Db = this.prisma): Promise<de_xuat_duyet> {
    return db.de_xuat_duyet.create({
      data: { loai: "DIEU_CHINH_HOA_HONG", doi_tuong: "ho_so", doi_tuong_id: hoSoId, du_lieu: duLieu, ly_do: lyDo, nguoi_de_xuat_id: nguoiDeXuatId, trang_thai: "CHO_KIEM" }
    });
  }

  timDeXuat(id: string): Promise<de_xuat_duyet | null> {
    return this.prisma.de_xuat_duyet.findUnique({ where: { id } });
  }

  layDeXuatDieuChinhDaDuyet(): Promise<de_xuat_duyet[]> {
    return this.prisma.de_xuat_duyet.findMany({ where: { loai: "DIEU_CHINH_HOA_HONG", trang_thai: "DA_DUYET" }, orderBy: { duyet_luc: "desc" }, take: 200 });
  }

  /** Cac de xuat (trong deXuatIds) da co dong dieu_chinh_hoa_hong */
  async layDeXuatDaApDung(deXuatIds: string[]): Promise<Set<string | null>> {
    const ds = await this.prisma.dieu_chinh_hoa_hong.findMany({ where: { de_xuat_duyet_id: { in: deXuatIds } }, select: { de_xuat_duyet_id: true } });
    return new Set(ds.map(d => d.de_xuat_duyet_id));
  }

  timDieuChinhTheoDeXuat(deXuatId: string, db: Db = this.prisma): Promise<{ id: string } | null> {
    return db.dieu_chinh_hoa_hong.findFirst({ where: { de_xuat_duyet_id: deXuatId }, select: { id: true } });
  }

  /** Tao dieu chinh — unique de_xuat_duyet_id nem P2002 khi hai luong ap dung cung luc */
  taoDieuChinh(data: Prisma.dieu_chinh_hoa_hongUncheckedCreateInput, db: Db = this.prisma): Promise<dieu_chinh_hoa_hong> {
    return db.dieu_chinh_hoa_hong.create({ data });
  }
}
