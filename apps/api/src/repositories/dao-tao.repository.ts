// Truy van Prisma cua module dao-tao. Lop: DuLieuHocRepository, QuyenSkuRepository, XetDatRepository, HocVienRepository, KiemTraRepository, ThucHanhRepository, TienDoDoiRepository, QuanTriNoiDungRepository, LuyenAiRepository.
import { Injectable } from "@nestjs/common";
import type { LoaiKhoaHoc, Prisma, TrangThaiThucHanh, Vai } from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { CHON_KHOA, CHON_QUYEN_SKU, type ClientDb, type DuLieuHocVien, laUuid } from "../common/utils/dao-tao";

/** Nap du lieu hoc cua mot ho so (gioi han theo danh sach khoa neu co). db = PrismaService hoac tx trong $transaction. */
export async function napDuLieuHocVien(db: ClientDb, hoSoId: string, khoaIds?: string[]): Promise<DuLieuHocVien> {
  const locKhoa = khoaIds ? { in: khoaIds } : undefined;
  const [tienDo, luot, thucHanh, quyen] = await Promise.all([
    db.tien_do_bai_hoc.findMany({
      where: {
        ho_so_id: hoSoId,
        hoan_thanh_luc: { not: null },
        ...(locKhoa ? { bai_hoc: { khoa_hoc_id: locKhoa } } : {})
      },
      select: { bai_hoc_id: true }
    }),
    db.luot_lam.findMany({
      where: {
        ho_so_id: hoSoId,
        nop_luc: { not: null },
        ...(locKhoa ? { bai_kiem_tra: { khoa_hoc_id: locKhoa } } : {})
      },
      select: {
        id: true,
        bai_kiem_tra_id: true,
        diem: true,
        dat: true,
        phien_ban_tai_lieu: true,
        nop_luc: true
      }
    }),
    db.bai_thuc_hanh.findMany({
      where: { ho_so_id: hoSoId, ...(locKhoa ? { khoa_hoc_id: locKhoa } : {}) },
      select: {
        id: true,
        khoa_hoc_id: true,
        trang_thai: true,
        nop_luc: true,
        nguoi_cham_id: true,
        nhan_xet: true,
        cham_luc: true
      }
    }),
    db.quyen_sku.findMany({
      where: { ho_so_id: hoSoId },
      select: { mau_id: true, trang_thai: true, phien_ban_tai_lieu: true }
    })
  ]);
  return {
    baiXong: new Set(tienDo.map(t => t.bai_hoc_id)),
    luotLam: luot,
    thucHanh,
    quyenSku: quyen
  };
}
/** Du lieu hoc dung chung cac service dao-tao: tien do hoc vien, khoa bat buoc theo vai, ten ho so */
@Injectable()
export class DuLieuHocRepository {
  constructor(private readonly prisma: PrismaService) {}

  napDuLieuHocVien(hoSoId: string, khoaIds?: string[], db: ClientDb = this.prisma): Promise<DuLieuHocVien> {
    return napDuLieuHocVien(db, hoSoId, khoaIds);
  }

  /** Khoa NEN_TANG + NGHIEP_VU bat buoc dang bat ap dung cho mot trong cac vai */
  dsKhoaBatBuocCuaVai(vai: Vai[], db: ClientDb = this.prisma) {
    return db.khoa_hoc.findMany({
      where: {
        bat: true,
        bat_buoc: true,
        loai: { in: ["NEN_TANG", "NGHIEP_VU"] },
        vai_ap_dung: { hasSome: vai }
      },
      select: CHON_KHOA
    });
  }

  /** Map ho_so.id -> ho_ten (bo null, bo trung) */
  async tenHoSo(ids: (string | null)[]): Promise<Map<string, string>> {
    const ds = [...new Set(ids.filter((x): x is string => !!x))];
    if (!ds.length) return new Map();
    const hs = await this.prisma.ho_so.findMany({
      where: { id: { in: ds } },
      select: { id: true, ho_ten: true }
    });
    return new Map(hs.map(h => [h.id, h.ho_ten]));
  }
}

/** Tim quyen theo uuid public.mau hoac ma mau (vd "AL01", khong phan biet hoa thuong) */
function theoMau(hoSoId: string, mauIdHoacMa: string): Prisma.quyen_skuWhereInput {
  const khoa = mauIdHoacMa.trim();
  return laUuid(khoa) ? { ho_so_id: hoSoId, mau_id: khoa } : { ho_so_id: hoSoId, ma_mau: khoa.toUpperCase() };
}
/** Truy van thien_khue.quyen_sku (+ khoa_hoc khi tang phien ban tai lieu) */
@Injectable()
export class QuyenSkuRepository {
  constructor(private readonly prisma: PrismaService) {}

  chayTrongGiaoDich<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // ---------------------------------------------------------------- doc

  /** Trang thai quyen cua ho so voi mot mau (id hoac ma) */
  timTrangThai(hoSoId: string, mauIdHoacMa: string) {
    return this.prisma.quyen_sku.findFirst({
      where: theoMau(hoSoId, mauIdHoacMa),
      select: { trang_thai: true, mau_id: true, ma_mau: true }
    });
  }

  /** Quyen day du (CHON_QUYEN_SKU) cua ho so voi mot mau (id hoac ma) */
  timChiTiet(hoSoId: string, mauIdHoacMa: string) {
    return this.prisma.quyen_sku.findFirst({
      where: theoMau(hoSoId, mauIdHoacMa),
      select: CHON_QUYEN_SKU
    });
  }

  /** Mau + ma dang HOAT_DONG cua ho so */
  dsMauVaMaHoatDong(hoSoId: string) {
    return this.prisma.quyen_sku.findMany({
      where: { ho_so_id: hoSoId, trang_thai: "HOAT_DONG" },
      select: { mau_id: true, ma_mau: true }
    });
  }

  dsMauHoatDong(hoSoId: string) {
    return this.prisma.quyen_sku.findMany({
      where: { ho_so_id: hoSoId, trang_thai: "HOAT_DONG" },
      select: { mau_id: true }
    });
  }

  dsMaMauHoatDong(hoSoId: string) {
    return this.prisma.quyen_sku.findMany({
      where: { ho_so_id: hoSoId, trang_thai: "HOAT_DONG" },
      select: { ma_mau: true },
      orderBy: { ma_mau: "asc" }
    });
  }

  dsHoSoHoatDongTheoMau(mauId: string) {
    return this.prisma.quyen_sku.findMany({
      where: { mau_id: mauId, trang_thai: "HOAT_DONG" },
      select: { ho_so_id: true }
    });
  }

  /** Moi quyen cua ho so (HOAT_DONG truoc theo thu tu enum, roi ma mau) */
  dsCuaHoSo(hoSoId: string) {
    return this.prisma.quyen_sku.findMany({
      where: { ho_so_id: hoSoId },
      select: CHON_QUYEN_SKU,
      orderBy: [{ trang_thai: "asc" }, { ma_mau: "asc" }]
    });
  }

  layChiTiet(id: string, db: ClientDb = this.prisma) {
    return db.quyen_sku.findUniqueOrThrow({
      where: { id },
      select: CHON_QUYEN_SKU
    });
  }

  /** Quyen con hieu luc (HOAT_DONG / CAN_HOC_LAI) cua mot mau — dung khi tang phien ban tai lieu */
  dsConHieuLucTheoMau(mauId: string, db: ClientDb = this.prisma) {
    return db.quyen_sku.findMany({
      where: {
        mau_id: mauId,
        trang_thai: { in: ["HOAT_DONG", "CAN_HOC_LAI"] }
      },
      select: { id: true, ho_so_id: true, bang_chung: true }
    });
  }

  // ---------------------------------------------------------------- ghi

  /** Doi ve HOAT_DONG chi khi van CAN_HOC_LAI (tranh ghi de khi vua bi thu hoi). Tra so dong da doi. */
  async kichHoatLaiNeuCanHocLai(id: string, data: Prisma.quyen_skuUpdateManyMutationInput, db: ClientDb = this.prisma): Promise<number> {
    const doi = await db.quyen_sku.updateMany({
      where: { id, trang_thai: "CAN_HOC_LAI" },
      data
    });
    return doi.count;
  }

  async sua(id: string, data: Prisma.quyen_skuUncheckedUpdateInput, db: ClientDb = this.prisma): Promise<void> {
    await db.quyen_sku.update({ where: { id }, data });
  }

  // ---------------------------------------------------------------- khoa hoc (phien ban tai lieu)

  timKhoa(khoaHocId: string) {
    return this.prisma.khoa_hoc.findUnique({
      where: { id: khoaHocId },
      select: { id: true, ten: true, loai: true, mau_id: true, ma_mau: true }
    });
  }

  /** Tang phien_ban_tai_lieu cua khoa, tra phien ban moi */
  tangPhienBanKhoa(khoaHocId: string, db: ClientDb = this.prisma) {
    return db.khoa_hoc.update({
      where: { id: khoaHocId },
      data: { phien_ban_tai_lieu: { increment: 1 } },
      select: { phien_ban_tai_lieu: true }
    });
  }
}

/** Du lieu ghi chung chi (dung cho ca tao moi lan cap lai) */
export type DuLieuChungChi = Omit<Prisma.chung_chiUncheckedCreateInput, "ho_so_id" | "khoa_hoc_id" | "ma_chung_chi">;
/** Du lieu ghi quyen SKU (dung cho ca tao moi lan cap lai) */
export type DuLieuQuyenSku = Omit<Prisma.quyen_skuUncheckedCreateInput, "ho_so_id" | "mau_id">;
/**
 * Truy van cho XetDatService. Moi ham nhan db (tx cua transaction nghiep vu dang chay) — xet dat luon chay
 * TRONG transaction cua hanh dong hoc (hoc xong bai / nop bai thi / cham thuc hanh).
 */
@Injectable()
export class XetDatRepository {
  constructor(private readonly prisma: PrismaService) {}

  layKhoa(khoaHocId: string, db: ClientDb = this.prisma) {
    return db.khoa_hoc.findUnique({
      where: { id: khoaHocId },
      select: CHON_KHOA
    });
  }

  // ---------------------------------------------------------------- chung chi

  layChungChi(hoSoId: string, khoaHocId: string, db: ClientDb = this.prisma) {
    return db.chung_chi.findUnique({
      where: {
        ho_so_id_khoa_hoc_id: { ho_so_id: hoSoId, khoa_hoc_id: khoaHocId }
      },
      select: { phien_ban_tai_lieu: true, thu_hoi_luc: true }
    });
  }

  /** Cap moi (kem ma chung chi) hoac cap lai chung chi cua ho so cho khoa */
  luuChungChi(hoSoId: string, khoaHocId: string, maChungChi: string, du: DuLieuChungChi, db: ClientDb = this.prisma) {
    return db.chung_chi.upsert({
      where: {
        ho_so_id_khoa_hoc_id: { ho_so_id: hoSoId, khoa_hoc_id: khoaHocId }
      },
      create: {
        ho_so_id: hoSoId,
        khoa_hoc_id: khoaHocId,
        ma_chung_chi: maChungChi,
        ...du
      },
      update: du,
      include: { khoa_hoc: { select: { ten: true, loai: true } } }
    });
  }

  // ---------------------------------------------------------------- quyen SKU

  layQuyenSku(hoSoId: string, mauId: string, db: ClientDb = this.prisma) {
    return db.quyen_sku.findUnique({
      where: { ho_so_id_mau_id: { ho_so_id: hoSoId, mau_id: mauId } },
      select: { id: true, trang_thai: true, phien_ban_tai_lieu: true }
    });
  }

  luuQuyenSku(hoSoId: string, mauId: string, du: DuLieuQuyenSku, db: ClientDb = this.prisma) {
    return db.quyen_sku.upsert({
      where: { ho_so_id_mau_id: { ho_so_id: hoSoId, mau_id: mauId } },
      create: { ho_so_id: hoSoId, mau_id: mauId, ...du },
      update: du,
      select: { id: true }
    });
  }

  // ---------------------------------------------------------------- kich hoat vai

  dsVaiDangHoc(hoSoId: string, vai: readonly Vai[], db: ClientDb = this.prisma) {
    return db.vai_tro_ho_so.findMany({
      where: {
        ho_so_id: hoSoId,
        trang_thai: "DANG_HOC",
        vai: { in: [...vai] }
      },
      select: { id: true, vai: true }
    });
  }

  /** DANG_HOC -> HOAT_DONG co dieu kien (hai request song song khong kich hoat hai lan). Tra so dong da doi. */
  async kichHoatVaiDangHoc(vaiTroId: string, db: ClientDb = this.prisma): Promise<number> {
    const doi = await db.vai_tro_ho_so.updateMany({
      where: { id: vaiTroId, trang_thai: "DANG_HOC" },
      data: { trang_thai: "HOAT_DONG" }
    });
    return doi.count;
  }

  async ghiLichSuVai(data: Prisma.lich_su_vai_troUncheckedCreateInput, db: ClientDb = this.prisma): Promise<void> {
    await db.lich_su_vai_tro.create({ data });
  }

  /** Bat kich_hoat_lam_viec lan dau (da bat thi giu nguyen moc kich_hoat_luc) */
  async batKichHoatLamViec(hoSoId: string, luc: Date, db: ClientDb = this.prisma): Promise<void> {
    await db.ho_so.updateMany({
      where: { id: hoSoId, kich_hoat_lam_viec: false },
      data: { kich_hoat_lam_viec: true, kich_hoat_luc: luc }
    });
  }
}

const THU_TU_BAI: Prisma.bai_hocOrderByWithRelationInput[] = [{ thu_tu: "asc" }, { ma: "asc" }];
const KEM_TEN_KHOA = {
  khoa_hoc: { select: { ten: true, loai: true } }
} satisfies Prisma.chung_chiInclude;
/** Truy van phan nguoi hoc (lo trinh, khoa, bai, tien do bai, chung chi, thuc hanh cua toi) */
@Injectable()
export class HocVienRepository {
  constructor(private readonly prisma: PrismaService) {}

  chayTrongGiaoDich<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // ---------------------------------------------------------------- khoa hoc

  /** Khoa dang bat; vai != null -> chi khoa ap dung cho mot trong cac vai */
  dsKhoaDangBat(vai: Vai[] | null) {
    const where: Prisma.khoa_hocWhereInput = vai ? { bat: true, vai_ap_dung: { hasSome: vai } } : { bat: true };
    return this.prisma.khoa_hoc.findMany({ where, select: CHON_KHOA });
  }

  dsKhoaDangBatTheoLoai(loai?: LoaiKhoaHoc) {
    return this.prisma.khoa_hoc.findMany({
      where: { bat: true, ...(loai ? { loai } : {}) },
      select: CHON_KHOA
    });
  }

  /** Tim khoa theo uuid hoac ma khoa */
  timKhoaTheoIdHoacMa(idHoacMa: string) {
    return this.prisma.khoa_hoc.findUnique({
      where: laUuid(idHoacMa) ? { id: idHoacMa } : { ma: idHoacMa },
      select: CHON_KHOA
    });
  }

  layKhoa(khoaHocId: string) {
    return this.prisma.khoa_hoc.findUniqueOrThrow({
      where: { id: khoaHocId },
      select: CHON_KHOA
    });
  }

  // ---------------------------------------------------------------- bai hoc

  layTieuDeBai(baiHocId: string) {
    return this.prisma.bai_hoc.findUnique({
      where: { id: baiHocId },
      select: { tieu_de: true }
    });
  }

  dsBaiDangBatCuaKhoa(khoaHocId: string) {
    return this.prisma.bai_hoc.findMany({
      where: { khoa_hoc_id: khoaHocId, bat: true },
      orderBy: THU_TU_BAI,
      select: {
        id: true,
        ma: true,
        tieu_de: true,
        chuong: true,
        loai_noi_dung: true,
        tom_tat: true,
        thoi_luong_phut: true,
        thu_tu: true
      }
    });
  }

  /** Id bai dang bat cung khoa (theo thu tu hoc) — tim bai truoc / sau */
  dsIdBaiDangBatCuaKhoa(khoaHocId: string) {
    return this.prisma.bai_hoc.findMany({
      where: { khoa_hoc_id: khoaHocId, bat: true },
      orderBy: THU_TU_BAI,
      select: { id: true }
    });
  }

  layBaiKemKhoa(baiHocId: string) {
    return this.prisma.bai_hoc.findUnique({
      where: { id: baiHocId },
      include: { khoa_hoc: { select: { id: true, ten: true, bat: true } } }
    });
  }

  /** Bai + trang thai bat cua khoa (kiem truoc khi danh dau hoc xong) */
  layBaiDeDanhDau(baiHocId: string) {
    return this.prisma.bai_hoc.findUnique({
      where: { id: baiHocId },
      select: {
        id: true,
        bat: true,
        khoa_hoc_id: true,
        khoa_hoc: { select: { bat: true } }
      }
    });
  }

  // ---------------------------------------------------------------- bai kiem tra

  dsDeDangBatCuaKhoa(khoaHocId: string) {
    return this.prisma.bai_kiem_tra.findMany({
      where: { khoa_hoc_id: khoaHocId, bat: true },
      orderBy: { ma: "asc" },
      select: {
        id: true,
        ma: true,
        tieu_de: true,
        nguong_dat: true,
        bat_buoc: true,
        so_cau_hien: true,
        thoi_gian_phut: true,
        so_lan_toi_da: true,
        _count: { select: { cau_hoi: true } }
      }
    });
  }

  // ---------------------------------------------------------------- tien do bai

  dsTienDoBaiCuaKhoa(hoSoId: string, khoaHocId: string) {
    return this.prisma.tien_do_bai_hoc.findMany({
      where: { ho_so_id: hoSoId, bai_hoc: { khoa_hoc_id: khoaHocId } },
      select: { bai_hoc_id: true, hoan_thanh_luc: true }
    });
  }

  layTienDoBai(hoSoId: string, baiHocId: string, db: ClientDb = this.prisma) {
    return db.tien_do_bai_hoc.findUnique({
      where: {
        ho_so_id_bai_hoc_id: { ho_so_id: hoSoId, bai_hoc_id: baiHocId }
      },
      select: { hoan_thanh_luc: true }
    });
  }

  async danhDauXong(hoSoId: string, baiHocId: string, db: ClientDb = this.prisma): Promise<void> {
    await db.tien_do_bai_hoc.upsert({
      where: {
        ho_so_id_bai_hoc_id: { ho_so_id: hoSoId, bai_hoc_id: baiHocId }
      },
      create: {
        ho_so_id: hoSoId,
        bai_hoc_id: baiHocId,
        hoan_thanh_luc: new Date()
      },
      update: { hoan_thanh_luc: new Date() }
    });
  }

  async boDanhDau(hoSoId: string, baiHocId: string, db: ClientDb = this.prisma): Promise<void> {
    await db.tien_do_bai_hoc.updateMany({
      where: { ho_so_id: hoSoId, bai_hoc_id: baiHocId },
      data: { hoan_thanh_luc: null }
    });
  }

  // ---------------------------------------------------------------- chung chi / quyen / thuc hanh cua toi

  demChungChiConHieuLuc(hoSoId: string): Promise<number> {
    return this.prisma.chung_chi.count({
      where: { ho_so_id: hoSoId, thu_hoi_luc: null }
    });
  }

  demQuyenSkuHoatDong(hoSoId: string): Promise<number> {
    return this.prisma.quyen_sku.count({
      where: { ho_so_id: hoSoId, trang_thai: "HOAT_DONG" }
    });
  }

  layChungChi(hoSoId: string, khoaHocId: string) {
    return this.prisma.chung_chi.findUnique({
      where: {
        ho_so_id_khoa_hoc_id: { ho_so_id: hoSoId, khoa_hoc_id: khoaHocId }
      },
      include: KEM_TEN_KHOA
    });
  }

  dsChungChi(hoSoId: string) {
    return this.prisma.chung_chi.findMany({
      where: { ho_so_id: hoSoId },
      orderBy: { cap_luc: "desc" },
      include: KEM_TEN_KHOA
    });
  }

  layQuyenSku(hoSoId: string, mauId: string) {
    return this.prisma.quyen_sku.findUnique({
      where: { ho_so_id_mau_id: { ho_so_id: hoSoId, mau_id: mauId } },
      select: CHON_QUYEN_SKU
    });
  }

  dsThucHanhCuaKhoa(hoSoId: string, khoaHocId: string) {
    return this.prisma.bai_thuc_hanh.findMany({
      where: { ho_so_id: hoSoId, khoa_hoc_id: khoaHocId },
      orderBy: { nop_luc: "desc" }
    });
  }

  dsThucHanh(hoSoId: string) {
    return this.prisma.bai_thuc_hanh.findMany({
      where: { ho_so_id: hoSoId },
      orderBy: { nop_luc: "desc" }
    });
  }
}

/** Cot bai kiem tra can cho phat de + cham (kem ngan hang cau hoi CO dap an — chi dung o server) */
export const CHON_DE = {
  id: true,
  khoa_hoc_id: true,
  ma: true,
  tieu_de: true,
  nguong_dat: true,
  so_cau_hien: true,
  thoi_gian_phut: true,
  so_lan_toi_da: true,
  bat: true,
  khoa_hoc: { select: { bat: true, loai: true, phien_ban_tai_lieu: true } },
  cau_hoi: {
    select: {
      id: true,
      ma: true,
      noi_dung: true,
      lua_chon: true,
      dap_an: true,
      giai_thich: true,
      diem: true,
      thu_tu: true
    }
  }
} satisfies Prisma.bai_kiem_traSelect;
export type DeDaNap = Prisma.bai_kiem_traGetPayload<{ select: typeof CHON_DE }>;
const CHON_LUOT_MO = {
  id: true,
  bat_dau_luc: true,
  cau_hoi_ids: true
} as const;
/** Truy van thien_khue.bai_kiem_tra + luot_lam cho KiemTraService */
@Injectable()
export class KiemTraRepository {
  constructor(private readonly prisma: PrismaService) {}

  chayTrongGiaoDich<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  layDe(baiKiemTraId: string) {
    return this.prisma.bai_kiem_tra.findUnique({
      where: { id: baiKiemTraId },
      select: CHON_DE
    });
  }

  /** So luot da nop; phienBanToiThieu != null -> chi dem luot o phien ban tai lieu >= muc nay */
  demLuotDaNop(hoSoId: string, baiKiemTraId: string, phienBanToiThieu: number | null): Promise<number> {
    return this.prisma.luot_lam.count({
      where: {
        ho_so_id: hoSoId,
        bai_kiem_tra_id: baiKiemTraId,
        nop_luc: { not: null },
        ...(phienBanToiThieu != null ? { phien_ban_tai_lieu: { gte: phienBanToiThieu } } : {})
      }
    });
  }

  /** Luot dang do (chua nop) moi nhat o phien ban tai lieu hien hanh */
  timLuotDangDo(hoSoId: string, baiKiemTraId: string, phienBan: number) {
    return this.prisma.luot_lam.findFirst({
      where: {
        ho_so_id: hoSoId,
        bai_kiem_tra_id: baiKiemTraId,
        nop_luc: null,
        phien_ban_tai_lieu: phienBan
      },
      orderBy: { bat_dau_luc: "desc" },
      select: CHON_LUOT_MO
    });
  }

  taoLuot(data: { id: string; bai_kiem_tra_id: string; ho_so_id: string; phien_ban_tai_lieu: number; cau_hoi_ids: string[] }) {
    return this.prisma.luot_lam.create({ data, select: CHON_LUOT_MO });
  }

  /** Luot cua chinh nguoi nop (danh tinh tu token) */
  timLuotCuaHoSo(luotLamId: string, hoSoId: string, baiKiemTraId: string) {
    return this.prisma.luot_lam.findFirst({
      where: { id: luotLamId, ho_so_id: hoSoId, bai_kiem_tra_id: baiKiemTraId },
      select: {
        id: true,
        bat_dau_luc: true,
        nop_luc: true,
        phien_ban_tai_lieu: true,
        cau_hoi_ids: true
      }
    });
  }

  /** Ghi ket qua chi khi luot chua nop (hai lan nop song song chi mot lan duoc ghi). Tra so dong da ghi. */
  async ghiKetQuaNeuChuaNop(luotLamId: string, data: Prisma.luot_lamUpdateManyMutationInput, db: ClientDb = this.prisma): Promise<number> {
    const ghi = await db.luot_lam.updateMany({
      where: { id: luotLamId, nop_luc: null },
      data
    });
    return ghi.count;
  }

  lichSu(hoSoId: string, baiKiemTraId: string) {
    return this.prisma.luot_lam.findMany({
      where: {
        ho_so_id: hoSoId,
        bai_kiem_tra_id: baiKiemTraId,
        nop_luc: { not: null }
      },
      orderBy: { nop_luc: "desc" },
      select: {
        id: true,
        diem: true,
        so_cau_dung: true,
        tong_cau: true,
        dat: true,
        phien_ban_tai_lieu: true,
        bat_dau_luc: true,
        nop_luc: true
      }
    });
  }
}

export interface LocThucHanh {
  trangThai: TrangThaiThucHanh;
  khoaHocId?: string;
}
function whereLoc(loc: LocThucHanh): Prisma.bai_thuc_hanhWhereInput {
  return {
    trang_thai: loc.trangThai,
    ...(loc.khoaHocId ? { khoa_hoc_id: loc.khoaHocId } : {})
  };
}
/** Truy van thien_khue.bai_thuc_hanh cho ThucHanhService */
@Injectable()
export class ThucHanhRepository {
  constructor(private readonly prisma: PrismaService) {}

  chayTrongGiaoDich<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** Khoa hoc can cho viec nop thuc hanh */
  layKhoa(khoaHocId: string) {
    return this.prisma.khoa_hoc.findUnique({
      where: { id: khoaHocId },
      select: {
        id: true,
        ten: true,
        bat: true,
        can_thuc_hanh: true,
        yeu_cau_luyen_ai: true,
        vai_ap_dung: true
      }
    });
  }

  /** Bai dang CHO_CHAM hoac da DAT cua ho so o khoa (chan nop trung) */
  timBaiChoChamHoacDat(hoSoId: string, khoaHocId: string) {
    return this.prisma.bai_thuc_hanh.findFirst({
      where: {
        ho_so_id: hoSoId,
        khoa_hoc_id: khoaHocId,
        trang_thai: { in: ["CHO_CHAM", "DAT"] }
      },
      select: { trang_thai: true }
    });
  }

  tao(data: Prisma.bai_thuc_hanhUncheckedCreateInput) {
    return this.prisma.bai_thuc_hanh.create({ data });
  }

  /** Hang doi cham: CHO_CHAM cu nhat truoc, trang thai khac moi nhat truoc */
  danhSach(loc: LocThucHanh, skip: number, take: number) {
    return this.prisma.bai_thuc_hanh.findMany({
      where: whereLoc(loc),
      orderBy: { nop_luc: loc.trangThai === "CHO_CHAM" ? "asc" : "desc" },
      skip,
      take,
      include: {
        ho_so: { select: { ho_ten: true, email: true } },
        khoa_hoc: { select: { ten: true, ma: true, yeu_cau_thuc_hanh: true } }
      }
    });
  }

  dem(loc: LocThucHanh): Promise<number> {
    return this.prisma.bai_thuc_hanh.count({ where: whereLoc(loc) });
  }

  layKemTenKhoa(baiId: string) {
    return this.prisma.bai_thuc_hanh.findUnique({
      where: { id: baiId },
      include: { khoa_hoc: { select: { ten: true } } }
    });
  }

  layTheoId(baiId: string) {
    return this.prisma.bai_thuc_hanh.findUniqueOrThrow({
      where: { id: baiId }
    });
  }

  /**
   * Ghi ket qua cham chi khi bai van CHO_CHAM va nguoi cham khac nguoi nop (hai nguoi cham cung luc chi mot nguoi
   * duoc ghi). Tra so dong da ghi.
   */
  async ghiKetQuaCham(baiId: string, nguoiChamId: string, data: Prisma.bai_thuc_hanhUncheckedUpdateManyInput, db: ClientDb = this.prisma): Promise<number> {
    const ghi = await db.bai_thuc_hanh.updateMany({
      where: {
        id: baiId,
        trang_thai: "CHO_CHAM",
        ho_so_id: { not: nguoiChamId }
      },
      data
    });
    return ghi.count;
  }
}

/** Truy van cho TienDoDoiService: ho so hoc vien + du lieu hoc cua nhieu ho so mot lan */
@Injectable()
export class TienDoDoiRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Ho so co vai (chua KET_THUC) thuoc vaiLoc, loc tu khoa ten / email / sdt */
  dsHoSoHocVien(vaiLoc: Vai[], tuKhoa?: string) {
    const where: Prisma.ho_soWhereInput = {
      vai_tro: {
        some: { vai: { in: vaiLoc }, trang_thai: { not: "KET_THUC" } }
      },
      ...(tuKhoa
        ? {
            OR: [{ ho_ten: { contains: tuKhoa, mode: "insensitive" } }, { email: { contains: tuKhoa, mode: "insensitive" } }, { sdt: { contains: tuKhoa } }]
          }
        : {})
    };
    return this.prisma.ho_so.findMany({
      where,
      select: {
        id: true,
        ho_ten: true,
        email: true,
        vai_tro: {
          where: { trang_thai: { not: "KET_THUC" } },
          select: { vai: true, trang_thai: true }
        }
      },
      orderBy: { ho_ten: "asc" }
    });
  }

  /** Moi khoa NEN_TANG + NGHIEP_VU bat buoc dang bat */
  dsKhoaBatBuoc() {
    return this.prisma.khoa_hoc.findMany({
      where: {
        bat: true,
        bat_buoc: true,
        loai: { in: ["NEN_TANG", "NGHIEP_VU"] }
      },
      select: CHON_KHOA
    });
  }

  /** Tien do bai (cua cac khoa), luot thi da nop, bai thuc hanh, quyen SKU cua nhieu ho so */
  napDuLieuNhieuHoSo(hoSoIds: string[], khoaIds: string[]) {
    return Promise.all([
      this.prisma.tien_do_bai_hoc.findMany({
        where: {
          ho_so_id: { in: hoSoIds },
          hoan_thanh_luc: { not: null },
          bai_hoc: { khoa_hoc_id: { in: khoaIds } }
        },
        select: { ho_so_id: true, bai_hoc_id: true, hoan_thanh_luc: true }
      }),
      this.prisma.luot_lam.findMany({
        where: { ho_so_id: { in: hoSoIds }, nop_luc: { not: null } },
        select: {
          id: true,
          ho_so_id: true,
          bai_kiem_tra_id: true,
          diem: true,
          dat: true,
          phien_ban_tai_lieu: true,
          nop_luc: true
        }
      }),
      this.prisma.bai_thuc_hanh.findMany({
        where: { ho_so_id: { in: hoSoIds } },
        select: {
          id: true,
          ho_so_id: true,
          khoa_hoc_id: true,
          trang_thai: true,
          nop_luc: true,
          nguoi_cham_id: true,
          nhan_xet: true,
          cham_luc: true
        }
      }),
      this.prisma.quyen_sku.findMany({
        where: { ho_so_id: { in: hoSoIds } },
        select: {
          ho_so_id: true,
          mau_id: true,
          trang_thai: true,
          phien_ban_tai_lieu: true
        }
      })
    ]);
  }
}

/** Dem bai hoc + bai kiem tra cua khoa */
export const DEM_KHOA = {
  _count: { select: { bai_hoc: true, bai_kiem_tra: true } }
} as const;
export type KhoaCoDem = Prisma.khoa_hocGetPayload<{ include: typeof DEM_KHOA }>;
/** Cau hoi kem vai ap dung cua khoa (kiem nguoi dang hoc khoa) */
export const CAU_KEM_KHOA = {
  bai_kiem_tra: { select: { khoa_hoc: { select: { vai_ap_dung: true } } } }
} satisfies Prisma.cau_hoiInclude;
export interface LocKhoaQuanTri {
  loai?: LoaiKhoaHoc;
  bat?: boolean;
  tuKhoa?: string;
}
function whereKhoa(loc: LocKhoaQuanTri): Prisma.khoa_hocWhereInput {
  const tk = loc.tuKhoa;
  return {
    ...(loc.loai ? { loai: loc.loai } : {}),
    ...(loc.bat !== undefined ? { bat: loc.bat } : {}),
    ...(tk
      ? {
          OR: [{ ten: { contains: tk, mode: "insensitive" } }, { ma: { contains: tk, mode: "insensitive" } }, { ma_mau: { contains: tk, mode: "insensitive" } }]
        }
      : {})
  };
}
/**
 * Truy van quan tri noi dung LMS: khoa_hoc, bai_hoc, bai_kiem_tra, cau_hoi.
 * Loi Prisma (P2002 trung ma, P2025 khong thay) de nguyen cho service doi sang thong diep tieng Viet.
 */
@Injectable()
export class QuanTriNoiDungRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- khoa hoc

  dsKhoa(loc: LocKhoaQuanTri, skip: number, take: number) {
    return this.prisma.khoa_hoc.findMany({
      where: whereKhoa(loc),
      include: DEM_KHOA,
      orderBy: [{ loai: "asc" }, { thu_tu: "asc" }, { ma: "asc" }],
      skip,
      take
    });
  }

  demKhoa(loc: LocKhoaQuanTri): Promise<number> {
    return this.prisma.khoa_hoc.count({ where: whereKhoa(loc) });
  }

  /** So hoc vien da bat dau (co tien do bai / luot thi / thuc hanh) moi khoa */
  demHocVienTheoKhoa(khoaIds: string[]) {
    return this.prisma.$queryRaw<{ khoa_hoc_id: string; so: number }[]>`
      select khoa_hoc_id, count(distinct ho_so_id)::int as so from (
        select b.khoa_hoc_id, t.ho_so_id from thien_khue.tien_do_bai_hoc t join thien_khue.bai_hoc b on b.id = t.bai_hoc_id
        union all
        select k.khoa_hoc_id, l.ho_so_id from thien_khue.luot_lam l join thien_khue.bai_kiem_tra k on k.id = l.bai_kiem_tra_id
        union all
        select th.khoa_hoc_id, th.ho_so_id from thien_khue.bai_thuc_hanh th
      ) x where khoa_hoc_id = any(${khoaIds}::uuid[]) group by khoa_hoc_id`;
  }

  /** Khoa kem bai hoc + bai kiem tra (co cau hoi, CO dap an) */
  chiTietKhoa(id: string) {
    return this.prisma.khoa_hoc.findUnique({
      where: { id },
      include: {
        ...DEM_KHOA,
        bai_hoc: { orderBy: [{ thu_tu: "asc" }, { ma: "asc" }] },
        bai_kiem_tra: { orderBy: { ma: "asc" }, include: { cau_hoi: true } }
      }
    });
  }

  /** Khoa SAN_PHAM dang bat da gan mau nay (moi mau chi mot khoa san pham) */
  timKhoaSanPhamDangBatTheoMau(mauId: string) {
    return this.prisma.khoa_hoc.findFirst({
      where: { mau_id: mauId, loai: "SAN_PHAM", bat: true },
      select: { ma: true }
    });
  }

  taoKhoa(data: Prisma.khoa_hocUncheckedCreateInput) {
    return this.prisma.khoa_hoc.create({ data, include: DEM_KHOA });
  }

  /** Cac co lien quan cong "hoc truoc khi ban" (so sanh noi cong) */
  layCoCongCuaKhoa(id: string) {
    return this.prisma.khoa_hoc.findUnique({
      where: { id },
      select: {
        bat: true,
        bat_buoc: true,
        can_thuc_hanh: true,
        vai_ap_dung: true
      }
    });
  }

  suaKhoa(id: string, data: Prisma.khoa_hocUpdateInput) {
    return this.prisma.khoa_hoc.update({
      where: { id },
      data,
      include: DEM_KHOA
    });
  }

  timIdKhoa(id: string) {
    return this.prisma.khoa_hoc.findUnique({
      where: { id },
      select: { id: true }
    });
  }

  layVaiApDungCuaKhoa(id: string) {
    return this.prisma.khoa_hoc.findUnique({
      where: { id },
      select: { id: true, vai_ap_dung: true }
    });
  }

  // ---------------------------------------------------------------- bai hoc

  taoBai(data: Prisma.bai_hocUncheckedCreateInput) {
    return this.prisma.bai_hoc.create({ data });
  }

  suaBai(id: string, data: Prisma.bai_hocUpdateInput) {
    return this.prisma.bai_hoc.update({ where: { id }, data });
  }

  // ---------------------------------------------------------------- bai kiem tra

  taoDe(data: Prisma.bai_kiem_traUncheckedCreateInput) {
    return this.prisma.bai_kiem_tra.create({
      data,
      include: { cau_hoi: true }
    });
  }

  /** De kem cau hoi (CO dap an) + vai ap dung cua khoa */
  chiTietDe(id: string) {
    return this.prisma.bai_kiem_tra.findUnique({
      where: { id },
      include: { cau_hoi: true, khoa_hoc: { select: { vai_ap_dung: true } } }
    });
  }

  layCoCongCuaDe(id: string) {
    return this.prisma.bai_kiem_tra.findUnique({
      where: { id },
      select: {
        bat: true,
        bat_buoc: true,
        khoa_hoc: { select: { vai_ap_dung: true } }
      }
    });
  }

  layVaiApDungCuaDe(id: string) {
    return this.prisma.bai_kiem_tra.findUnique({
      where: { id },
      select: { id: true, khoa_hoc: { select: { vai_ap_dung: true } } }
    });
  }

  suaDe(id: string, data: Prisma.bai_kiem_traUpdateInput) {
    return this.prisma.bai_kiem_tra.update({
      where: { id },
      data,
      include: { cau_hoi: true }
    });
  }

  // ---------------------------------------------------------------- cau hoi

  taoCau(data: Prisma.cau_hoiUncheckedCreateInput) {
    return this.prisma.cau_hoi.create({ data });
  }

  layCauKemKhoa(id: string) {
    return this.prisma.cau_hoi.findUnique({
      where: { id },
      include: CAU_KEM_KHOA
    });
  }

  suaCau(id: string, data: Prisma.cau_hoiUpdateInput) {
    return this.prisma.cau_hoi.update({ where: { id }, data });
  }

  async xoaCau(id: string): Promise<void> {
    await this.prisma.cau_hoi.delete({ where: { id } });
  }
}

/** Truy van luyen tu van voi AI (Sales Training): phieu vao, phien da nhan, bai thuc hanh LUYEN_AI */
@Injectable()
export class LuyenAiRepository {
  constructor(private readonly prisma: PrismaService) {}

  chayTrongGiaoDich<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** Khoa theo uuid hoac ma — cot can cho luyen AI */
  timKhoa(idHoacMa: string) {
    return this.prisma.khoa_hoc.findUnique({
      where: laUuid(idHoacMa) ? { id: idHoacMa } : { ma: idHoacMa },
      select: { id: true, ma: true, ten: true, bat: true, can_thuc_hanh: true, yeu_cau_luyen_ai: true, vai_ap_dung: true }
    });
  }

  layYeuCauKhoa(khoaHocId: string, db: ClientDb = this.prisma) {
    return db.khoa_hoc.findUnique({ where: { id: khoaHocId }, select: { id: true, ten: true, bat: true, yeu_cau_luyen_ai: true } });
  }

  // ---------------------------------------------------------------- phieu

  taoPhieu(data: Prisma.phieu_luyen_aiUncheckedCreateInput) {
    return this.prisma.phieu_luyen_ai.create({ data });
  }

  /** Dung phieu MOT lan: chi ghi khi chua dung va con han. Tra so dong da ghi (0 = het han / da dung / khong co) */
  async dungPhieu(ma: string, bayGio: Date): Promise<number> {
    const r = await this.prisma.phieu_luyen_ai.updateMany({
      where: { ma, dung_luc: null, het_han: { gt: bayGio } },
      data: { dung_luc: bayGio }
    });
    return r.count;
  }

  timPhieu(ma: string, db: ClientDb = this.prisma) {
    return db.phieu_luyen_ai.findUnique({
      where: { ma },
      include: {
        ho_so: {
          select: {
            id: true,
            crm_user_id: true,
            // Vai ghi vao bai thuc hanh LUYEN_AI (SALE / CSKH con hieu luc)
            vai_tro: { where: { vai: { in: ["SALE", "CSKH"] }, trang_thai: { not: "KET_THUC" } }, select: { vai: true }, orderBy: { created_at: "asc" } }
          }
        },
        khoa_hoc: { select: { id: true, ma: true, ten: true, bat: true, yeu_cau_luyen_ai: true } }
      }
    });
  }

  /** SKU ho so da / dang hoc: quyen SKU (tru THU_HOI) + khoa SAN_PHAM da hoc it nhat mot bai */
  async dsMaMauDaHoc(hoSoId: string): Promise<string[]> {
    const [quyen, khoa] = await Promise.all([
      this.prisma.quyen_sku.findMany({ where: { ho_so_id: hoSoId, trang_thai: { not: "THU_HOI" } }, select: { ma_mau: true } }),
      this.prisma.khoa_hoc.findMany({
        where: { bat: true, loai: "SAN_PHAM", ma_mau: { not: null }, bai_hoc: { some: { tien_do_bai_hoc: { some: { ho_so_id: hoSoId } } } } },
        select: { ma_mau: true }
      })
    ]);
    return [...quyen.map(q => q.ma_mau), ...khoa.map(k => k.ma_mau!)];
  }

  /** SKU cua cac khoa san pham dang bat (du phong khi chua hoc khoa san pham nao) */
  async dsMaMauKhoaSanPham(gioiHan: number): Promise<string[]> {
    const ds = await this.prisma.khoa_hoc.findMany({
      where: { bat: true, loai: "SAN_PHAM", ma_mau: { not: null } },
      orderBy: [{ thu_tu: "asc" }, { ma: "asc" }],
      take: gioiHan,
      select: { ma_mau: true }
    });
    return ds.map(k => k.ma_mau!);
  }

  // ---------------------------------------------------------------- phien

  timPhien(phienIdSt: string, db: ClientDb = this.prisma) {
    return db.phien_luyen_ai.findUnique({ where: { phien_id_st: phienIdSt } });
  }

  taoPhien(data: Prisma.phien_luyen_aiUncheckedCreateInput, db: ClientDb = this.prisma) {
    return db.phien_luyen_ai.create({ data });
  }

  dsPhien(hoSoId: string, khoaHocId: string, db: ClientDb = this.prisma) {
    return db.phien_luyen_ai.findMany({ where: { ho_so_id: hoSoId, khoa_hoc_id: khoaHocId }, orderBy: { nhan_luc: "desc" } });
  }

  // ---------------------------------------------------------------- bai thuc hanh LUYEN_AI

  /** Bai thuc hanh cua ho so o khoa (moi nguon), moi nhat truoc */
  dsBaiThucHanh(hoSoId: string, khoaHocId: string, db: ClientDb = this.prisma) {
    return db.bai_thuc_hanh.findMany({
      where: { ho_so_id: hoSoId, khoa_hoc_id: khoaHocId },
      orderBy: { nop_luc: "desc" },
      select: { id: true, nguon: true, trang_thai: true, nhan_xet: true, cham_luc: true, nop_luc: true }
    });
  }

  taoBaiThucHanh(data: Prisma.bai_thuc_hanhUncheckedCreateInput, db: ClientDb = this.prisma) {
    return db.bai_thuc_hanh.create({ data, select: { id: true } });
  }

  /** Cap nhat bang chung chi khi bai van CHO_CHAM (mentor dang cham thi khong doi duoi tay) */
  async capNhatBangChung(baiId: string, data: { bang_chung: Prisma.InputJsonValue; mo_ta: string }, db: ClientDb = this.prisma): Promise<number> {
    const r = await db.bai_thuc_hanh.updateMany({ where: { id: baiId, trang_thai: "CHO_CHAM", nguon: "LUYEN_AI" }, data });
    return r.count;
  }
}
