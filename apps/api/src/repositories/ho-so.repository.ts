// Truy van Prisma cua module ho-so. Lop: HoSoRepository, VaiRepository, XacMinhSdtRepository, DieuKienHocRepository.
import { Injectable } from "@nestjs/common";
import type { Prisma, TrangThaiVai, Vai } from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { KhoaHocCanDat } from "../common/utils/ho-so";
import { CHON_KHOA, type DuLieuHocVien, type KhoaDaNap } from "../common/utils/dao-tao";
import { napDuLieuHocVien } from "./dao-tao.repository";

type Db = Prisma.TransactionClient;
/** Truy van ho so cua chinh minh (schema thien_khue) */
@Injectable()
export class HoSoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay nhieu buoc ghi trong mot transaction; truyen tx cho cac ham repository / NhatKy / ThongBao */
  chayTrongGiaoDich<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** Ho so kem moi vai (GET /toi) */
  layHoSoCuaToi(hoSoId: string) {
    return this.prisma.ho_so.findUnique({
      where: { id: hoSoId },
      select: {
        id: true,
        ho_ten: true,
        email: true,
        sdt: true,
        crm_user_id: true,
        kich_hoat_lam_viec: true,
        anh_dai_dien: true,
        kich_hoat_luc: true,
        sdt_xac_minh_luc: true,
        created_at: true,
        vai_tro: { select: { vai: true, trang_thai: true, tu_luc: true, den_luc: true }, orderBy: { tu_luc: "asc" } }
      }
    });
  }

  /** Quyen SKU cua ho so (theo ma mau) */
  dsQuyenSku(hoSoId: string) {
    return this.prisma.quyen_sku.findMany({
      where: { ho_so_id: hoSoId },
      orderBy: { ma_mau: "asc" },
      select: { mau_id: true, ma_mau: true, trang_thai: true, cap_luc: true }
    });
  }

  /** SDT chuan + moc xac minh hien tai */
  laySdtHienTai(hoSoId: string): Promise<{ sdt_chuan: string | null; sdt_xac_minh_luc: Date | null } | null> {
    return this.prisma.ho_so.findUnique({ where: { id: hoSoId }, select: { sdt_chuan: true, sdt_xac_minh_luc: true } });
  }

  /** Ho so (khac boQuaHoSoId) da XAC MINH so chuan nay */
  timHoSoDaXacMinhSdt(sdtChuan: string, boQuaHoSoId: string | null): Promise<{ id: string } | null> {
    return this.prisma.ho_so.findFirst({
      where: { sdt_chuan: sdtChuan, sdt_xac_minh_luc: { not: null }, ...(boQuaHoSoId ? { id: { not: boQuaHoSoId } } : {}) },
      select: { id: true }
    });
  }

  capNhat(hoSoId: string, data: Prisma.ho_soUpdateInput, db: Db = this.prisma) {
    return db.ho_so.update({ where: { id: hoSoId }, data });
  }
}

/*
 * Truy van vai / lich su vai (schema thien_khue).
 * lich_su_vai_tro CHI INSERT (trigger DB chan UPDATE / DELETE) — ghiDoiVai la cho duy nhat cua module ghi lich su, va chi dung `create`.
 * Ham nhan `db` (mac dinh this.prisma) de service chay nhieu buoc trong cung transaction (chayTrongGiaoDich).
 */

export type TxVai = Pick<Prisma.TransactionClient, "vai_tro_ho_so" | "lich_su_vai_tro">;
export interface DoiVai {
  hoSoId: string;
  vai: Vai;
  /** null = vai chua tung co */
  cu: TrangThaiVai | null;
  moi: TrangThaiVai;
  /** ho_so.id nguoi doi; null = he thong */
  nguoiDoiId: string | null;
  lyDo: string;
  deXuatId?: string | null;
  /** CRM | DANG_KY | QUAN_TRI | HE_THONG */
  nguon?: string;
}
/** Tao / cap nhat dong vai_tro_ho_so roi them mot dong lich_su_vai_tro */
export async function ghiDoiVai(tx: TxVai, d: DoiVai): Promise<void> {
  const nay = new Date();
  if (d.cu === null) {
    await tx.vai_tro_ho_so.create({ data: { ho_so_id: d.hoSoId, vai: d.vai, trang_thai: d.moi, nguon: d.nguon ?? null, tu_luc: nay } });
  } else {
    const capLai = d.cu === "KET_THUC";
    await tx.vai_tro_ho_so.update({
      where: { ho_so_id_vai: { ho_so_id: d.hoSoId, vai: d.vai } },
      data: {
        trang_thai: d.moi,
        den_luc: d.moi === "KET_THUC" ? nay : null,
        ...(capLai ? { tu_luc: nay } : {}),
        ...(d.nguon ? { nguon: d.nguon } : {})
      }
    });
  }
  await tx.lich_su_vai_tro.create({
    data: {
      ho_so_id: d.hoSoId,
      vai: d.vai,
      trang_thai_cu: d.cu,
      trang_thai_moi: d.moi,
      nguoi_doi_id: d.nguoiDoiId,
      ly_do: d.lyDo,
      de_xuat_duyet_id: d.deXuatId ?? null
    }
  });
}
const CHON_VAI = { vai: true, trang_thai: true, tu_luc: true, den_luc: true, nguon: true } satisfies Prisma.vai_tro_ho_soSelect;
const CHON_TOM_TAT = {
  id: true,
  ho_ten: true,
  email: true,
  sdt: true,
  crm_user_id: true,
  kich_hoat_lam_viec: true,
  created_at: true,
  vai_tro: { select: CHON_VAI, orderBy: { tu_luc: "asc" } }
} satisfies Prisma.ho_soSelect;
export type HoSoTomTatDb = Prisma.ho_soGetPayload<{ select: typeof CHON_TOM_TAT }>;
@Injectable()
export class VaiRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay nhieu buoc ghi trong mot transaction; truyen tx cho cac ham repository / NhatKy / ThongBao */
  chayTrongGiaoDich<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  ghiDoiVai(d: DoiVai, db: TxVai = this.prisma): Promise<void> {
    return ghiDoiVai(db, d);
  }

  // ---------------------------------------------------------------- ho so (quan tri)

  /** Danh sach ho so (tim theo ten / email / SDT, loc vai chua ket thuc) + tong */
  async danhSachHoSo(loc: { tuKhoa?: string; vai?: Vai; skip: number; take: number }): Promise<[HoSoTomTatDb[], number]> {
    const tk = loc.tuKhoa;
    const where: Prisma.ho_soWhereInput = {
      ...(tk
        ? {
            OR: [
              { ho_ten: { contains: tk, mode: "insensitive" } },
              { email: { contains: tk, mode: "insensitive" } },
              { sdt: { contains: tk } },
              { sdt_chuan: { contains: tk.replace(/\D/g, "") || tk } }
            ]
          }
        : {}),
      ...(loc.vai ? { vai_tro: { some: { vai: loc.vai, trang_thai: { not: "KET_THUC" } } } } : {})
    };
    return Promise.all([
      this.prisma.ho_so.findMany({ where, orderBy: { created_at: "desc" }, skip: loc.skip, take: loc.take, select: CHON_TOM_TAT }),
      this.prisma.ho_so.count({ where })
    ]);
  }

  layChiTietHoSo(hoSoId: string) {
    return this.prisma.ho_so.findUnique({
      where: { id: hoSoId },
      select: { ...CHON_TOM_TAT, anh_dai_dien: true, kich_hoat_luc: true, ghi_chu: true }
    });
  }

  /** Lich su chuyen vai moi nhat truoc (toi da 200 dong) */
  dsLichSuVai(hoSoId: string) {
    return this.prisma.lich_su_vai_tro.findMany({ where: { ho_so_id: hoSoId }, orderBy: { created_at: "desc" }, take: 200 });
  }

  dsTenHoSo(ids: string[]): Promise<{ id: string; ho_ten: string }[]> {
    return this.prisma.ho_so.findMany({ where: { id: { in: ids } }, select: { id: true, ho_ten: true } });
  }

  /** Ho so kem trang thai mot vai; null = khong co ho so */
  layHoSoKemMotVai(hoSoId: string, vai: Vai): Promise<{ vai_tro: { trang_thai: TrangThaiVai }[] } | null> {
    return this.prisma.ho_so.findUnique({
      where: { id: hoSoId },
      select: { vai_tro: { where: { vai }, select: { trang_thai: true } } }
    });
  }

  /** Vai (trong ds) cua ho so chua KET_THUC, theo tu_luc */
  dsVaiChuaKetThuc(hoSoId: string, vais: Vai[]): Promise<{ vai: Vai; trang_thai: TrangThaiVai }[]> {
    return this.prisma.vai_tro_ho_so.findMany({
      where: { ho_so_id: hoSoId, vai: { in: vais }, trang_thai: { not: "KET_THUC" } },
      select: { vai: true, trang_thai: true },
      orderBy: { tu_luc: "asc" }
    });
  }

  /** Bat ho_so.kich_hoat_lam_viec (kem moc) neu chua bat */
  async batKichHoatLamViecNeuChua(hoSoId: string, db: Db = this.prisma): Promise<void> {
    const hs = await db.ho_so.findUnique({ where: { id: hoSoId }, select: { kich_hoat_lam_viec: true } });
    if (!hs?.kich_hoat_lam_viec) await db.ho_so.update({ where: { id: hoSoId }, data: { kich_hoat_lam_viec: true, kich_hoat_luc: new Date() } });
  }

}

/** Truy van xac minh SDT ho so (schema thien_khue) */
@Injectable()
export class XacMinhSdtRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay nhieu buoc ghi trong mot transaction; truyen tx cho cac ham repository / NhatKy / ThongBao */
  chayTrongGiaoDich<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** Ho so dang khai SDT chuan nay (moi nhat truoc, toi da 20) */
  dsHoSoTheoSdt(sdtChuan: string) {
    return this.prisma.ho_so.findMany({
      where: { sdt_chuan: sdtChuan },
      orderBy: { created_at: "desc" },
      take: 20,
      select: {
        id: true,
        ho_ten: true,
        email: true,
        sdt: true,
        sdt_chuan: true,
        sdt_xac_minh_luc: true,
        created_at: true,
        vai_tro: { select: { vai: true, trang_thai: true } }
      }
    });
  }

  layTrangThaiSdt(hoSoId: string) {
    return this.prisma.ho_so.findUnique({ where: { id: hoSoId }, select: { id: true, sdt_chuan: true, sdt_xac_minh_luc: true } });
  }

  layThongTinXacMinh(hoSoId: string) {
    return this.prisma.ho_so.findUnique({ where: { id: hoSoId }, select: { sdt_chuan: true, sdt_xac_minh_luc: true, sdt_xac_minh_boi_id: true } });
  }

  /** Ho so KHAC da xac minh so chuan nay */
  timChuDaXacMinh(sdtChuan: string, boQuaHoSoId: string): Promise<{ id: string } | null> {
    return this.prisma.ho_so.findFirst({
      where: { sdt_chuan: sdtChuan, sdt_xac_minh_luc: { not: null }, id: { not: boQuaHoSoId } },
      select: { id: true }
    });
  }

  /**
   * Ghi moc xac minh co dieu kien trong WHERE (chong doi SDT / xac minh dong thoi giua luc doc va luc ghi).
   * Tra so dong cap nhat (1 = thanh cong).
   */
  async ghiXacMinhCoDieuKien(hoSoId: string, sdtChuan: string, luc: Date, nguoiXacMinhId: string | null, db: Db = this.prisma): Promise<number> {
    const kq = await db.ho_so.updateMany({
      where: { id: hoSoId, sdt_chuan: sdtChuan, sdt_xac_minh_luc: null },
      data: { sdt_xac_minh_luc: luc, sdt_xac_minh_boi_id: nguoiXacMinhId }
    });
    return kq.count;
  }

  xoaXacMinh(hoSoId: string, db: Db = this.prisma) {
    return db.ho_so.update({ where: { id: hoSoId }, data: { sdt_xac_minh_luc: null, sdt_xac_minh_boi_id: null } });
  }
}

// Nap du lieu hoc dung chung voi dao-tao (ham cua repository dao-tao; khong import DaoTaoModule -> khong vong module)
/** Truy van LMS cho dieu kien "hoc truoc khi ban" — chi doc */
@Injectable()
export class DieuKienHocRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Khoa bat buoc (NEN_TANG + NGHIEP_VU) dang bat, ap cho vai */
  layKhoaCanDat(vai: Vai): Promise<KhoaHocCanDat[]> {
    return this.prisma.khoa_hoc.findMany({
      where: { bat: true, bat_buoc: true, loai: { in: ["NEN_TANG", "NGHIEP_VU"] }, vai_ap_dung: { has: vai } },
      orderBy: [{ thu_tu: "asc" }, { ma: "asc" }],
      select: {
        id: true,
        ma: true,
        ten: true,
        can_thuc_hanh: true,
        bai_hoc: { where: { bat: true }, select: { id: true } },
        bai_kiem_tra: { where: { bat: true, bat_buoc: true }, select: { id: true, tieu_de: true, nguong_dat: true } }
      }
    });
  }

  /** Bai hoc (trong ds) ho so da hoan thanh */
  dsBaiHocXong(hoSoId: string, baiHocIds: string[]): Promise<{ bai_hoc_id: string }[]> {
    return this.prisma.tien_do_bai_hoc.findMany({
      where: { ho_so_id: hoSoId, bai_hoc_id: { in: baiHocIds }, hoan_thanh_luc: { not: null } },
      select: { bai_hoc_id: true }
    });
  }

  /** Luot lam da nop va dat (trong ds bai kiem tra) */
  dsLuotDat(hoSoId: string, baiKiemTraIds: string[]): Promise<{ bai_kiem_tra_id: string; diem: number }[]> {
    return this.prisma.luot_lam.findMany({
      where: { ho_so_id: hoSoId, bai_kiem_tra_id: { in: baiKiemTraIds }, dat: true, nop_luc: { not: null } },
      select: { bai_kiem_tra_id: true, diem: true }
    });
  }

  /** Khoa (trong ds) co bai thuc hanh DAT */
  dsThucHanhDat(hoSoId: string, khoaHocIds: string[]): Promise<{ khoa_hoc_id: string }[]> {
    return this.prisma.bai_thuc_hanh.findMany({
      where: { ho_so_id: hoSoId, khoa_hoc_id: { in: khoaHocIds }, trang_thai: "DAT" },
      select: { khoa_hoc_id: true }
    });
  }

  /** Khoa hoc day du cot cho tinhTienDo cua dao-tao */
  layKhoaTheoIds(ids: string[]): Promise<KhoaDaNap[]> {
    return this.prisma.khoa_hoc.findMany({ where: { id: { in: ids } }, select: CHON_KHOA });
  }

  /** Du lieu hoc cua ho so theo dung cach dao-tao nap (mot nguon luat voi XetDatService) */
  napDuLieuHocVien(hoSoId: string, khoaIds: string[]): Promise<DuLieuHocVien> {
    return napDuLieuHocVien(this.prisma, hoSoId, khoaIds);
  }
}
