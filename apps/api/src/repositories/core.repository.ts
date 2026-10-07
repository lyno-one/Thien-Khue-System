import { Injectable } from "@nestjs/common";
import type { Prisma, TrangThaiVai, Vai } from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service";

type Db = Prisma.TransactionClient;
/** Client ghi nhat_ky / thong_bao: PrismaService hoac tx cua giao dich nghiep vu dang chay */
export type ClientNhatKy = Pick<Prisma.TransactionClient, "nhat_ky">;
export type ClientThongBao = Pick<Prisma.TransactionClient, "thong_bao">;

/** Ho so + vai can de dung ThongTinNguoiDung moi request */
export const CHON_HO_SO = {
  id: true,
  ho_ten: true,
  email: true,
  sdt: true,
  sdt_chuan: true,
  crm_user_id: true,
  kich_hoat_lam_viec: true,
  vai_tro: { select: { vai: true, trang_thai: true, tu_luc: true, den_luc: true, nguon: true }, orderBy: { tu_luc: "asc" } }
} satisfies Prisma.ho_soSelect;
export type HoSoDaChon = Prisma.ho_soGetPayload<{ select: typeof CHON_HO_SO }>;

/** Truy van nen tang (schema thien_khue): nhat_ky, thong_bao, ho so + vai cua nguoi dang dang nhap */
@Injectable()
export class CoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay nhieu buoc ghi trong mot transaction; truyen tx cho cac ham repository / NhatKyService */
  chayTrongGiaoDich<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // ---- nhat_ky (chi INSERT) ----

  taoNhatKy(data: Prisma.nhat_kyUncheckedCreateInput, db: ClientNhatKy = this.prisma) {
    return db.nhat_ky.create({ data });
  }

  // ---- thong_bao ----

  taoThongBao(data: Prisma.thong_baoUncheckedCreateInput, db: ClientThongBao = this.prisma) {
    return db.thong_bao.create({ data });
  }

  async taoNhieuThongBao(data: Prisma.thong_baoCreateManyInput[], db: ClientThongBao = this.prisma): Promise<number> {
    const kq = await db.thong_bao.createMany({ data });
    return kq.count;
  }

  dsThongBao(where: Prisma.thong_baoWhereInput, take: number) {
    return this.prisma.thong_bao.findMany({ where, orderBy: { created_at: "desc" }, take });
  }

  demThongBaoChuaDoc(hoSoId: string) {
    return this.prisma.thong_bao.count({ where: { ho_so_id: hoSoId, da_doc: false } });
  }

  /** Chi thong bao cua chinh minh (where ho_so_id); tra so dong da doi */
  async danhDauThongBaoDaDoc(hoSoId: string, ids?: string[]): Promise<number> {
    const kq = await this.prisma.thong_bao.updateMany({
      where: { ho_so_id: hoSoId, da_doc: false, ...(ids?.length ? { id: { in: ids } } : {}) },
      data: { da_doc: true, doc_luc: new Date() }
    });
    return kq.count;
  }

  // ---- ho so + vai cua nguoi dung ----

  layHoSo(id: string) {
    return this.prisma.ho_so.findUnique({ where: { id }, select: CHON_HO_SO });
  }

  taoHoSo(data: Prisma.ho_soCreateInput, db: Db) {
    return db.ho_so.create({ data, select: CHON_HO_SO });
  }

  /** Them vai neu chua co (skipDuplicates — request song song khong tao trung); tra so dong da tao */
  async themVaiNeuChuaCo(data: Prisma.vai_tro_ho_soCreateManyInput, db: Db): Promise<number> {
    const kq = await db.vai_tro_ho_so.createMany({ data: [data], skipDuplicates: true });
    return kq.count;
  }

  /** Doi trang thai vai chi khi van o trang thai cu (cap nhat co dieu kien); tra so dong da doi */
  async doiVaiNeu(hoSoId: string, vai: Vai, trangThaiCu: TrangThaiVai, data: Prisma.vai_tro_ho_soUncheckedUpdateManyInput, db: Db): Promise<number> {
    const kq = await db.vai_tro_ho_so.updateMany({ where: { ho_so_id: hoSoId, vai, trang_thai: trangThaiCu }, data });
    return kq.count;
  }

  ghiLichSuVai(data: Prisma.lich_su_vai_troUncheckedCreateInput, db: Db) {
    return db.lich_su_vai_tro.create({ data });
  }

  /** Gan crm_user_id cho ho so chua lien ket */
  lienKetCrmNeuChua(hoSoId: string, db: Db) {
    return db.ho_so.updateMany({ where: { id: hoSoId, crm_user_id: null }, data: { crm_user_id: hoSoId } });
  }
}
