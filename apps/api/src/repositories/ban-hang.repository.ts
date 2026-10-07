// Truy van Prisma cua module ban-hang. Lop: CaTrucRepository, KhachRepository, LeadRepository, DonRepository, HoTroRepository, HopViecRepository, PhanBoRepository.
import { Injectable } from "@nestjs/common";
import {
  type lead, type NguonDon, type NguonGiaoKhach, Prisma, type TrangThaiGhiNhan, type TrangThaiLead, type Vai, type yeu_cau_ho_tro
} from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service";

/** Kem ten nhan su + so khach da giao trong ca (dung chung cho hop viec) */
export const KEM_CA = { ho_so: { select: { ho_ten: true } }, _count: { select: { giao_khach: true } } } satisfies Prisma.ca_trucInclude;
/** Truy van thien_khue.ca_truc, nang_luc va du lieu nhan su ban hang */
@Injectable()
export class CaTrucRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- ca truc

  danhSach(loc: { tu: Date; den: Date; hoSoId?: string }) {
    const where: Prisma.ca_trucWhereInput = { ngay: { gte: loc.tu, lte: loc.den } };
    if (loc.hoSoId) where.ho_so_id = loc.hoSoId;
    return this.prisma.ca_truc.findMany({ where, include: KEM_CA, orderBy: [{ ngay: "asc" }, { tu_gio: "asc" }], take: 500 });
  }

  timTheoId(id: string) {
    return this.prisma.ca_truc.findUnique({ where: { id } });
  }

  tao(data: Prisma.ca_trucUncheckedCreateInput) {
    return this.prisma.ca_truc.create({ data, include: KEM_CA });
  }

  sua(id: string, data: Prisma.ca_trucUncheckedUpdateInput) {
    return this.prisma.ca_truc.update({ where: { id }, data, include: KEM_CA });
  }

  async xoa(id: string): Promise<void> {
    await this.prisma.ca_truc.delete({ where: { id } });
  }

  // ---------------------------------------------------------------- nhan su

  /** Trang thai vai cua nhan su (null = chua co vai) */
  timVaiNhanSu(hoSoId: string, vai: Vai) {
    return this.prisma.vai_tro_ho_so.findFirst({ where: { ho_so_id: hoSoId, vai }, select: { trang_thai: true } });
  }

  /** Vai ban hang dang HOAT_DONG / DANG_HOC */
  vaiBanHangConLam(vai: Vai[]) {
    return this.prisma.vai_tro_ho_so.findMany({
      where: { vai: { in: vai }, trang_thai: { in: ["HOAT_DONG", "DANG_HOC"] } },
      select: { ho_so_id: true, vai: true, trang_thai: true }
    });
  }

  /** Ho so, tai (khach DANG_PHU_TRACH), so ma duoc quyen, ca trong ngay, nang luc cua nhom nhan su */
  async duLieuNhanSu(ids: string[], ngay: Date) {
    const [hoSo, tai, quyen, ca, nangLuc] = await Promise.all([
      this.prisma.ho_so.findMany({ where: { id: { in: ids } }, select: { id: true, ho_ten: true, email: true } }),
      this.prisma.giao_khach.groupBy({ by: ["ho_so_id"], where: { ho_so_id: { in: ids }, trang_thai: "DANG_PHU_TRACH" }, _count: { _all: true } }),
      this.prisma.quyen_sku.groupBy({ by: ["ho_so_id"], where: { ho_so_id: { in: ids }, trang_thai: "HOAT_DONG" }, _count: { _all: true } }),
      this.prisma.ca_truc.findMany({ where: { ho_so_id: { in: ids }, ngay }, select: { ho_so_id: true, tu_gio: true, den_gio: true } }),
      this.prisma.nang_luc.findMany({ where: { ho_so_id: { in: ids } }, orderBy: [{ ma_mau: "asc" }, { nhom: "asc" }] })
    ]);
    return { hoSo, tai, quyen, ca, nangLuc };
  }

  // ---------------------------------------------------------------- nang luc

  timNangLuc(hoSoId: string, maMau: string | null, nhom: string | null) {
    return this.prisma.nang_luc.findFirst({ where: { ho_so_id: hoSoId, ma_mau: maMau, nhom } });
  }

  timNangLucTheoId(id: string) {
    return this.prisma.nang_luc.findUnique({ where: { id } });
  }

  suaMucNangLuc(id: string, muc: number) {
    return this.prisma.nang_luc.update({ where: { id }, data: { muc } });
  }

  taoNangLuc(data: { ho_so_id: string; ma_mau: string | null; nhom: string | null; muc: number }) {
    return this.prisma.nang_luc.create({ data });
  }

  async xoaNangLuc(id: string): Promise<void> {
    await this.prisma.nang_luc.delete({ where: { id } });
  }
}

/** Kem ten nguoi phu trach + thong tin lead (dung chung cho hop viec) */
export const KEM_GIAO = {
  ho_so: { select: { ho_ten: true } },
  lead: { select: { loai: true, nhu_cau: true, ma_mau_quan_tam: true } }
} satisfies Prisma.giao_khachInclude;
export interface LocKhachDuocGiao {
  /** undefined = moi nguoi phu trach (QUAN_LY) */
  hoSoId?: string;
  tuKhoa?: string;
  /** SDT (da chuan hoa) de tim theo sdt_chuan; bo trong = chi tim theo ten */
  sdt?: string;
}
/** Truy van thien_khue.giao_khach / lead cho khach duoc giao */
@Injectable()
export class KhachRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Khach DANG_PHU_TRACH (phan trang) + tong so dong */
  async danhSach(loc: LocKhachDuocGiao, skip: number, take: number) {
    const where: Prisma.giao_khachWhereInput = { trang_thai: "DANG_PHU_TRACH" };
    if (loc.hoSoId) where.ho_so_id = loc.hoSoId;
    if (loc.tuKhoa) {
      where.OR = [{ ten_khach: { contains: loc.tuKhoa, mode: "insensitive" } }, ...(loc.sdt ? [{ sdt_chuan: { contains: loc.sdt } }] : [])];
    }
    const [ds, tong] = await Promise.all([
      this.prisma.giao_khach.findMany({ where, include: KEM_GIAO, orderBy: { giao_luc: "desc" }, skip, take }),
      this.prisma.giao_khach.count({ where })
    ]);
    return { ds, tong };
  }

  /** Dong DANG_PHU_TRACH theo SDT (hoSoId: chi khi giao cho nguoi nay) */
  timDangPhuTrach(sdtChuan: string, hoSoId?: string) {
    return this.prisma.giao_khach.findFirst({
      where: { sdt_chuan: sdtChuan, trang_thai: "DANG_PHU_TRACH", ...(hoSoId ? { ho_so_id: hoSoId } : {}) },
      include: KEM_GIAO
    });
  }

  /** Dong DANG_PHU_TRACH bat ky theo SDT, kem ma gioi thieu cua lead */
  timDangPhuTrachKemMaGioiThieu(sdtChuan: string) {
    return this.prisma.giao_khach.findFirst({
      where: { sdt_chuan: sdtChuan, trang_thai: "DANG_PHU_TRACH" },
      include: { lead: { select: { ma_gioi_thieu: true } } }
    });
  }

  /** SDT tung co giao_khach (moi trang thai) hoac lead */
  async daCoTrongThienKhue(sdtChuan: string): Promise<{ giaoCu: boolean; lead: boolean }> {
    const [giaoCu, lead] = await Promise.all([
      this.prisma.giao_khach.findFirst({ where: { sdt_chuan: sdtChuan }, select: { id: true } }),
      this.prisma.lead.findFirst({ where: { sdt_chuan: sdtChuan }, select: { id: true } })
    ]);
    return { giaoCu: Boolean(giaoCu), lead: Boolean(lead) };
  }

  ketThuc(id: string, lyDo: string) {
    return this.prisma.giao_khach.update({
      where: { id },
      data: { trang_thai: "KET_THUC", ket_thuc_luc: new Date(), ly_do: lyDo },
      include: KEM_GIAO
    });
  }
}

export interface LocLead {
  /** undefined = moi lead (QUAN_LY) */
  phanBoCho?: string;
  trangThai?: TrangThaiLead;
  tuKhoa?: string;
  /** Chuoi tim trong sdt_chuan */
  sdt?: string;
}
/** Truy van thien_khue.lead (man hinh lead cua Sale / CSKH) */
@Injectable()
export class LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Ten ho so theo id */
  tenHoSo(ids: string[]) {
    return this.prisma.ho_so.findMany({ where: { id: { in: ids } }, select: { id: true, ho_ten: true } });
  }

  async danhSach(loc: LocLead, skip: number, take: number): Promise<{ ds: lead[]; tong: number }> {
    const where: Prisma.leadWhereInput = {};
    if (loc.phanBoCho) where.phan_bo_cho = loc.phanBoCho;
    if (loc.trangThai) where.trang_thai = loc.trangThai;
    if (loc.tuKhoa) where.OR = [{ ten: { contains: loc.tuKhoa, mode: "insensitive" } }, { sdt_chuan: { contains: loc.sdt ?? loc.tuKhoa } }];
    const [ds, tong] = await Promise.all([
      this.prisma.lead.findMany({ where, orderBy: { created_at: "desc" }, skip, take }),
      this.prisma.lead.count({ where })
    ]);
    return { ds, tong };
  }

  timTheoId(id: string) {
    return this.prisma.lead.findUnique({ where: { id } });
  }

  doiTrangThai(id: string, trangThai: TrangThaiLead, ghiChu?: string) {
    return this.prisma.lead.update({
      where: { id },
      data: { trang_thai: trangThai, ...(ghiChu !== undefined ? { ghi_chu: ghiChu } : {}) }
    });
  }
}

type Db = Prisma.TransactionClient;
export interface GhiNhanDonMoi {
  crmDonId: string;
  maDon: string;
  sdtChuan: string;
  tongTien: number;
  nguoiBanHoSoId: string | null;
  nguon: NguonDon;
  maGioiThieu: string | null;
  maGioiThieuId: string | null;
  nguoiChotHoSoId: string;
  trangThai: TrangThaiGhiNhan;
  lyDo: string | null;
}
/** Truy van thien_khue.ghi_nhan_don / ma_gioi_thieu khi Sale chot don */
@Injectable()
export class DonRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay fn trong mot transaction; fn nhan tx de truyen cho cac ham repository / service khac */
  chayTrongGiaoDich<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** Ma gioi thieu dang bat (khong phan biet hoa thuong) */
  timMaGioiThieuDangBat(ma: string): Promise<{ id: string; ma: string; ho_so_id: string } | null> {
    return this.prisma.ma_gioi_thieu.findFirst({
      where: { ma: { equals: ma, mode: "insensitive" }, bat: true },
      select: { id: true, ma: true, ho_so_id: true }
    });
  }

  taoGhiNhanDon(g: GhiNhanDonMoi, db: Db = this.prisma) {
    return db.ghi_nhan_don.create({
      data: {
        crm_don_id: g.crmDonId,
        ma_don: g.maDon,
        sdt_chuan: g.sdtChuan,
        tong_tien: new Prisma.Decimal(g.tongTien),
        nguoi_ban_ho_so_id: g.nguoiBanHoSoId,
        nguon: g.nguon,
        ma_gioi_thieu: g.maGioiThieu,
        ma_gioi_thieu_id: g.maGioiThieuId,
        nguoi_chot_ho_so_id: g.nguoiChotHoSoId,
        trang_thai: g.trangThai,
        ly_do: g.lyDo
      }
    });
  }

  /** ho_so_id cua QUAN_LY dang HOAT_DONG */
  async quanLyHoatDong(): Promise<string[]> {
    const ql = await this.prisma.vai_tro_ho_so.findMany({ where: { vai: "QUAN_LY", trang_thai: "HOAT_DONG" }, select: { ho_so_id: true } });
    return ql.map(q => q.ho_so_id);
  }

  /** Don nguoi nay da chot (moi nhat truoc) */
  donDaChot(hoSoId: string, soDong: number) {
    return this.prisma.ghi_nhan_don.findMany({
      where: { nguoi_chot_ho_so_id: hoSoId },
      orderBy: { created_at: "desc" },
      take: soDong,
      select: { id: true, crm_don_id: true, ma_don: true, sdt_chuan: true, tong_tien: true, trang_thai: true, ma_gioi_thieu: true, ly_do: true, created_at: true }
    });
  }
}

/** Truy van thien_khue.yeu_cau_ho_tro (ho tro KOL / KOC) */
@Injectable()
export class HoTroRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay fn trong mot transaction; fn nhan tx de truyen cho cac ham repository / service khac */
  chayTrongGiaoDich<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  tenHoSo(ids: string[]) {
    return this.prisma.ho_so.findMany({ where: { id: { in: ids } }, select: { id: true, ho_ten: true } });
  }

  /** So yeu cau dang MO theo nguoi ho tro */
  demMoTheoNguoi(ids: string[], db: Db = this.prisma) {
    return db.yeu_cau_ho_tro.groupBy({ by: ["nguoi_ho_tro_id"], where: { nguoi_ho_tro_id: { in: ids }, trang_thai: "MO" }, _count: { _all: true } });
  }

  /** ho_so_id co vai (trong danh sach) dang HOAT_DONG */
  hoSoCoVaiHoatDong(vai: Vai[], db: Db = this.prisma) {
    return db.vai_tro_ho_so.findMany({ where: { vai: { in: vai }, trang_thai: "HOAT_DONG" }, select: { ho_so_id: true } });
  }

  tao(data: { nguoi_gui_id: string; nguoi_ho_tro_id: string; ma_mau: string | null; noi_dung: string; lien_ket: string | null }, db: Db = this.prisma): Promise<yeu_cau_ho_tro> {
    return db.yeu_cau_ho_tro.create({ data });
  }

  /** nguoiHoTroId: chi lay khi giao cho nguoi nay; bo trong = moi yeu cau (QUAN_LY) */
  danhSachDuocGiao(loc: { nguoiHoTroId?: string; chiChuaXuLy: boolean }) {
    const where: Prisma.yeu_cau_ho_troWhereInput = {
      ...(loc.nguoiHoTroId ? { nguoi_ho_tro_id: loc.nguoiHoTroId } : {}),
      ...(loc.chiChuaXuLy ? { trang_thai: "MO" as const } : {})
    };
    return this.prisma.yeu_cau_ho_tro.findMany({ where, orderBy: { created_at: "desc" }, take: 200 });
  }

  danhSachDaGui(nguoiGuiId: string) {
    return this.prisma.yeu_cau_ho_tro.findMany({ where: { nguoi_gui_id: nguoiGuiId }, orderBy: { created_at: "desc" }, take: 100 });
  }

  demChuaXuLy(nguoiHoTroId: string): Promise<number> {
    return this.prisma.yeu_cau_ho_tro.count({ where: { nguoi_ho_tro_id: nguoiHoTroId, trang_thai: "MO" } });
  }

  /** nguoiHoTroId: chi khi giao cho nguoi nay; bo trong = bat ky (QUAN_LY) */
  timTheoId(id: string, nguoiHoTroId?: string) {
    return this.prisma.yeu_cau_ho_tro.findFirst({ where: { id, ...(nguoiHoTroId ? { nguoi_ho_tro_id: nguoiHoTroId } : {}) } });
  }

  danhDauDaXuLy(id: string, traLoi: string) {
    return this.prisma.yeu_cau_ho_tro.update({
      where: { id },
      data: { trang_thai: "DA_XU_LY", tra_loi: traLoi, xu_ly_luc: new Date() }
    });
  }
}

/** Truy van cho hop viec hom nay cua mot Sale / CSKH (chi du lieu cua chinh nguoi do) */
@Injectable()
export class HopViecRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ngay: cot @db.Date cua hom nay; dauNgay: dau ngay hom nay (gio VN) cho cot timestamptz.
   * Tra ca hom nay, tong khach dang phu trach, khach moi hom nay, lead can lien he, don hom nay (dem + tong tien), don cho xac minh.
   */
  async duLieuHomNay(hoSoId: string, ngay: Date, dauNgay: Date) {
    const [ca, tongPhuTrach, khachMoi, lead, donNhom, choXacMinh] = await Promise.all([
      this.prisma.ca_truc.findMany({ where: { ho_so_id: hoSoId, ngay }, include: KEM_CA, orderBy: { tu_gio: "asc" } }),
      this.prisma.giao_khach.count({ where: { ho_so_id: hoSoId, trang_thai: "DANG_PHU_TRACH" } }),
      this.prisma.giao_khach.findMany({
        where: { ho_so_id: hoSoId, trang_thai: "DANG_PHU_TRACH", giao_luc: { gte: dauNgay } },
        include: KEM_GIAO,
        orderBy: { giao_luc: "desc" },
        take: 50
      }),
      this.prisma.lead.findMany({ where: { phan_bo_cho: hoSoId, trang_thai: "DA_PHAN_BO" }, orderBy: { phan_bo_luc: "asc" }, take: 50 }),
      this.prisma.ghi_nhan_don.aggregate({
        where: { nguoi_chot_ho_so_id: hoSoId, created_at: { gte: dauNgay } },
        _count: { _all: true },
        _sum: { tong_tien: true }
      }),
      this.prisma.ghi_nhan_don.count({ where: { nguoi_chot_ho_so_id: hoSoId, trang_thai: "CHO_XAC_MINH", created_at: { gte: dauNgay } } })
    ]);
    return { ca, tongPhuTrach, khachMoi, lead, donNhom, choXacMinh };
  }
}

export interface GiaoKhachMoi {
  sdt_chuan: string;
  ten_khach: string | null;
  ho_so_id: string;
  nguon: NguonGiaoKhach;
  ly_do: string;
  nguoi_giao_id: string | null;
  ca_truc_id: string | null;
  lead_id: string | null;
}
/**
 * Truy van phan bo khach (giao_khach, ca_truc, quyen_sku, nang_luc, lead) cho Sale / CSKH.
 * Cac ham nhan `db` de chay trong transaction cua chayTrongGiaoDich (khoa advisory theo SDT + kiem mot DANG_PHU_TRACH / sdt).
 */
@Injectable()
export class PhanBoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay fn trong mot transaction; fn nhan tx de truyen cho cac ham repository / service khac */
  chayTrongGiaoDich<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** Khoa theo SDT trong transaction — tranh hai luong cung giao mot khach (mot DANG_PHU_TRACH / sdt) */
  async khoaTheoSdt(sdtChuan: string, db: Db): Promise<void> {
    await db.$executeRaw`select pg_advisory_xact_lock(hashtext(${"tk_giao_khach:" + sdtChuan}))`;
  }

  // ---------------------------------------------------------------- ung vien

  /** Nhan su co vai (trong danh sach) dang HOAT_DONG, kem crm_user_id */
  vaiHoatDongKemCrm(vai: Vai[], db: Db = this.prisma) {
    return db.vai_tro_ho_so.findMany({
      where: { vai: { in: vai }, trang_thai: "HOAT_DONG" },
      select: { ho_so_id: true, ho_so: { select: { crm_user_id: true } } }
    });
  }

  /** Ca trong ngay cua nhom nhan su (theo vai), bat dau som truoc */
  caTrongNgay(ngay: Date, hoSoIds: string[], vai: Vai[], db: Db = this.prisma) {
    return db.ca_truc.findMany({
      where: { ngay, ho_so_id: { in: hoSoIds }, vai: { in: vai } },
      orderBy: { tu_gio: "asc" }
    });
  }

  /** Ai trong nhom co quyen_sku HOAT_DONG voi mau nay */
  async coQuyenMau(mauId: string, hoSoIds: string[], db: Db = this.prisma): Promise<string[]> {
    const ds = await db.quyen_sku.findMany({
      where: { mau_id: mauId, trang_thai: "HOAT_DONG", ho_so_id: { in: hoSoIds } },
      select: { ho_so_id: true }
    });
    return ds.map(q => q.ho_so_id);
  }

  /** Ten, tai (DANG_PHU_TRACH), so khach da giao theo ca, lan giao cuoi, muc nang luc voi ma (neu co) */
  async thongKeUngVien(hoSoIds: string[], caIds: string[], maMau: string | null, db: Db = this.prisma) {
    const [hoSo, taiNhom, daGiaoCa, giaoCuoi, nangLuc] = await Promise.all([
      db.ho_so.findMany({ where: { id: { in: hoSoIds } }, select: { id: true, ho_ten: true } }),
      db.giao_khach.groupBy({ by: ["ho_so_id"], where: { ho_so_id: { in: hoSoIds }, trang_thai: "DANG_PHU_TRACH" }, _count: { _all: true } }),
      db.giao_khach.groupBy({ by: ["ca_truc_id"], where: { ca_truc_id: { in: caIds } }, _count: { _all: true } }),
      db.giao_khach.groupBy({ by: ["ho_so_id"], where: { ho_so_id: { in: hoSoIds } }, _max: { giao_luc: true } }),
      maMau
        ? db.nang_luc.findMany({ where: { ho_so_id: { in: hoSoIds }, ma_mau: maMau }, select: { ho_so_id: true, muc: true } })
        : Promise.resolve([] as { ho_so_id: string; muc: number }[])
    ]);
    return { hoSo, taiNhom, daGiaoCa, giaoCuoi, nangLuc };
  }

  /** Ho so + vai (trong danh sach) dang HOAT_DONG cua nguoi duoc chon giao tay */
  timNguoiNhan(hoSoId: string, vai: Vai[], db: Db = this.prisma) {
    return db.ho_so.findUnique({
      where: { id: hoSoId },
      select: { id: true, ho_ten: true, vai_tro: { where: { vai: { in: vai }, trang_thai: "HOAT_DONG" }, select: { vai: true } } }
    });
  }

  // ---------------------------------------------------------------- giao_khach

  timDangPhuTrachKemTen(sdtChuan: string, db: Db = this.prisma) {
    return db.giao_khach.findFirst({
      where: { sdt_chuan: sdtChuan, trang_thai: "DANG_PHU_TRACH" },
      include: { ho_so: { select: { ho_ten: true } } }
    });
  }

  timDangPhuTrach(sdtChuan: string, db: Db = this.prisma) {
    return db.giao_khach.findFirst({ where: { sdt_chuan: sdtChuan, trang_thai: "DANG_PHU_TRACH" } });
  }

  taoGiaoKhach(data: GiaoKhachMoi, db: Db = this.prisma) {
    return db.giao_khach.create({ data });
  }

  /** Dong dong dang phu trach khi giao lai (DA_CHUYEN) */
  async chuyenDi(id: string, lyDo: string, db: Db = this.prisma): Promise<void> {
    await db.giao_khach.update({ where: { id }, data: { trang_thai: "DA_CHUYEN", ket_thuc_luc: new Date(), ly_do: lyDo } });
  }

  /** Tra khach ve dong cu (giao lai that bai) */
  async khoiPhucPhuTrach(id: string, lyDo: string | null, db: Db = this.prisma): Promise<void> {
    await db.giao_khach.update({ where: { id }, data: { trang_thai: "DANG_PHU_TRACH", ket_thuc_luc: null, ly_do: lyDo } });
  }

  // ---------------------------------------------------------------- lead

  timLead(id: string) {
    return this.prisma.lead.findUnique({ where: { id } });
  }

  async danhDauLeadDaPhanBo(leadId: string, hoSoId: string, db: Db = this.prisma): Promise<void> {
    await db.lead.update({
      where: { id: leadId },
      data: { trang_thai: "DA_PHAN_BO", phan_bo_cho: hoSoId, phan_bo_luc: new Date() }
    });
  }

  async danhDauLeadThatBai(leadId: string, ghiChu: string): Promise<void> {
    await this.prisma.lead.update({ where: { id: leadId }, data: { trang_thai: "THAT_BAI", ghi_chu: ghiChu } });
  }

  /** Lead MOI cu nhat truoc */
  leadMoi(gioiHan: number) {
    return this.prisma.lead.findMany({ where: { trang_thai: "MOI" }, orderBy: { created_at: "asc" }, take: gioiHan, select: { id: true } });
  }

  // ---------------------------------------------------------------- khac

  /** ho_so_id cua QUAN_LY dang HOAT_DONG */
  async quanLyHoatDong(): Promise<string[]> {
    const ql = await this.prisma.vai_tro_ho_so.findMany({ where: { vai: "QUAN_LY", trang_thai: "HOAT_DONG" }, select: { ho_so_id: true } });
    return ql.map(q => q.ho_so_id);
  }
}
