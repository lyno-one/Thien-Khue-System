// Truy van Prisma cua module khach-doi-tac. Lop: HoSoKhachRepository, HangThanhVienRepository, KhHanhPhucRepository, DoiTacRepository, UuDaiRepository.
import { Injectable } from "@nestjs/common";
import type { HangThanhVien, LoaiDoiTac, Prisma, TrangThaiCapPhat, TrangThaiDuyetQua, TrangThaiMoiKh } from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service";

/**
 * Doc ho_so (schema thien_khue) phuc vu danh tinh khach CRM cua module khach-doi-tac:
 * SDT + co xac minh cua chu ho so, va ho so da xac minh theo SDT (de gui thong bao).
 * Chi doc — ghi ho_so thuoc module ho-so.
 */
@Injectable()
export class HoSoKhachRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** SDT + thoi diem xac minh cua ho so — doc moi nhat tu DB (khong tin nd.hoSo) */
  laySdtHoSo(hoSoId: string) {
    return this.prisma.ho_so.findUnique({
      where: { id: hoSoId },
      select: { sdt: true, sdt_chuan: true, sdt_xac_minh_luc: true }
    });
  }

  /** id ho so DA XAC MINH SDT khop sdt_chuan (mot SDT hoac danh sach) */
  layIdHoSoDaXacMinhTheoSdt(sdtChuan: string | string[]) {
    return this.prisma.ho_so.findMany({
      where: { sdt_chuan: typeof sdtChuan === "string" ? sdtChuan : { in: sdtChuan }, sdt_xac_minh_luc: { not: null } },
      select: { id: true }
    });
  }
}

/** Truy van hang_thanh_vien_cau_hinh + pham vi khach duoc giao (giao_khach) */
@Injectable()
export class HangThanhVienRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay nhieu buoc trong mot transaction; truyen tx cho cac ham ghi (repository / NhatKy) */
  chayTrongGiaoDich<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  layCauHinh() {
    return this.prisma.hang_thanh_vien_cau_hinh.findMany({ orderBy: [{ thu_tu: "asc" }, { nguong_tich_luy: "asc" }] });
  }

  capNhatCauHinh(hang: HangThanhVien, data: Prisma.hang_thanh_vien_cau_hinhUpdateInput, db: Prisma.TransactionClient = this.prisma) {
    return db.hang_thanh_vien_cau_hinh.update({ where: { hang }, data });
  }

  /** sdt_chuan cac khach nhan vien dang phu trach (co the trung) */
  laySdtKhachDangPhuTrach(hoSoId: string) {
    return this.prisma.giao_khach.findMany({
      where: { ho_so_id: hoSoId, trang_thai: "DANG_PHU_TRACH" },
      select: { sdt_chuan: true }
    });
  }
}

export interface LocMoiKh {
  trang_thai?: TrangThaiMoiKh;
  /** null = moi khach; mang = chi khach trong danh sach sdt_chuan */
  phamVi: string[] | null;
}
export interface LocPhanHoi {
  ma_mau?: string;
  /** Chi phan hoi khach cho phep dung hinh (ca loi moi lan phan hoi) */
  chiDuocDungHinh: boolean;
  phamVi: string[] | null;
}
/** Truy van moi_kh_hanh_phuc + phan_hoi_mau_thu (chuong trinh Khach hang hanh phuc) */
@Injectable()
export class KhHanhPhucRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay nhieu buoc trong mot transaction; truyen tx cho cac ham ghi (repository / NhatKy) */
  chayTrongGiaoDich<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // ---------------------------------------------------------------- loi moi

  layLoiMoiMoiNhat(sdtChuan: string) {
    return this.prisma.moi_kh_hanh_phuc.findFirst({ where: { sdt_chuan: sdtChuan }, orderBy: { moi_luc: "desc" } });
  }

  layLoiMoi(id: string) {
    return this.prisma.moi_kh_hanh_phuc.findUnique({ where: { id } });
  }

  /** sdt_chuan moi khach da tung duoc moi / tu dang ky */
  laySdtDaMoi() {
    return this.prisma.moi_kh_hanh_phuc.findMany({ select: { sdt_chuan: true } });
  }

  taoLoiMoi(data: Prisma.moi_kh_hanh_phucCreateArgs["data"], db: Prisma.TransactionClient = this.prisma) {
    return db.moi_kh_hanh_phuc.create({ data });
  }

  capNhatLoiMoi(id: string, data: Prisma.moi_kh_hanh_phucUpdateArgs["data"], db: Prisma.TransactionClient = this.prisma) {
    return db.moi_kh_hanh_phuc.update({ where: { id }, data });
  }

  /** [trang loi moi kem so phan hoi, tong so dong] */
  danhSachLoiMoi(loc: LocMoiKh, skip: number, take: number) {
    const where: Prisma.moi_kh_hanh_phucWhereInput = {
      ...(loc.trang_thai ? { trang_thai: loc.trang_thai } : {}),
      ...(loc.phamVi ? { sdt_chuan: { in: loc.phamVi } } : {})
    };
    return Promise.all([
      this.prisma.moi_kh_hanh_phuc.findMany({ where, include: { _count: { select: { phan_hoi: true } } }, orderBy: { moi_luc: "desc" }, skip, take }),
      this.prisma.moi_kh_hanh_phuc.count({ where })
    ]);
  }

  // ---------------------------------------------------------------- phan hoi mau thu

  layPhanHoiCuaLoiMoi(moiKhHanhPhucId: string) {
    return this.prisma.phan_hoi_mau_thu.findMany({ where: { moi_kh_hanh_phuc_id: moiKhHanhPhucId }, orderBy: { created_at: "desc" } });
  }

  taoPhanHoi(data: Prisma.phan_hoi_mau_thuCreateArgs["data"], db: Prisma.TransactionClient = this.prisma) {
    return db.phan_hoi_mau_thu.create({ data });
  }

  /** [trang phan hoi kem thong tin loi moi, tong so dong] */
  danhSachPhanHoi(loc: LocPhanHoi, skip: number, take: number) {
    const where: Prisma.phan_hoi_mau_thuWhereInput = {
      ...(loc.ma_mau ? { ma_mau: loc.ma_mau.toUpperCase() } : {}),
      ...(loc.chiDuocDungHinh ? { cho_phep_dung_hinh: true, moi: { dong_y_dung_hinh: true } } : {}),
      ...(loc.phamVi ? { moi: { sdt_chuan: { in: loc.phamVi }, ...(loc.chiDuocDungHinh ? { dong_y_dung_hinh: true } : {}) } } : {})
    };
    return Promise.all([
      this.prisma.phan_hoi_mau_thu.findMany({
        where,
        include: { moi: { select: { sdt_chuan: true, ten_khach: true, dong_y_dung_hinh: true } } },
        orderBy: { created_at: "desc" },
        skip,
        take
      }),
      this.prisma.phan_hoi_mau_thu.count({ where })
    ]);
  }
}

export interface LocDoiTac {
  loai?: LoaiDoiTac;
  tu_khoa?: string;
}
/** Truy van doi_tac, hop_dong_doi_tac va so lieu tong hop cho bao cao / cong doi tac */
@Injectable()
export class DoiTacRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay nhieu buoc trong mot transaction; truyen tx cho cac ham ghi (repository / NhatKy) */
  chayTrongGiaoDich<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // ---------------------------------------------------------------- doi tac

  /** [trang hien tai, tong so dong] */
  danhSach(loc: LocDoiTac, skip: number, take: number) {
    const where: Prisma.doi_tacWhereInput = {
      ...(loc.loai ? { loai: loc.loai } : {}),
      ...(loc.tu_khoa?.trim() ? { ten: { contains: loc.tu_khoa.trim(), mode: "insensitive" } } : {})
    };
    return Promise.all([
      this.prisma.doi_tac.findMany({ where, orderBy: [{ bat: "desc" }, { ten: "asc" }], skip, take }),
      this.prisma.doi_tac.count({ where })
    ]);
  }

  layTheoId(id: string) {
    return this.prisma.doi_tac.findUnique({ where: { id } });
  }

  /** Chi kiem ton tai (tra { id } hoac null) */
  layIdTheoId(id: string) {
    return this.prisma.doi_tac.findUnique({ where: { id }, select: { id: true } });
  }

  /** Doi tac gan voi ho so (cong doi tac) */
  layCuaHoSo(hoSoId: string) {
    return this.prisma.doi_tac.findFirst({ where: { ho_so_id: hoSoId } });
  }

  /** Doi tac DANG BAT gan voi ho so — chi id */
  layIdDangBatCuaHoSo(hoSoId: string) {
    return this.prisma.doi_tac.findFirst({ where: { ho_so_id: hoSoId, bat: true }, select: { id: true } });
  }

  tao(data: Prisma.doi_tacCreateArgs["data"], db: Prisma.TransactionClient = this.prisma) {
    return db.doi_tac.create({ data });
  }

  capNhat(id: string, data: Prisma.doi_tacUpdateArgs["data"], db: Prisma.TransactionClient = this.prisma) {
    return db.doi_tac.update({ where: { id }, data });
  }

  // ---------------------------------------------------------------- hop dong

  danhSachHopDong(doiTacId: string) {
    return this.prisma.hop_dong_doi_tac.findMany({ where: { doi_tac_id: doiTacId }, orderBy: { created_at: "desc" } });
  }

  layHopDong(id: string) {
    return this.prisma.hop_dong_doi_tac.findUnique({ where: { id } });
  }

  taoHopDong(data: Prisma.hop_dong_doi_tacCreateArgs["data"], db: Prisma.TransactionClient = this.prisma) {
    return db.hop_dong_doi_tac.create({ data });
  }

  capNhatHopDong(id: string, data: Prisma.hop_dong_doi_tacUpdateArgs["data"], db: Prisma.TransactionClient = this.prisma) {
    return db.hop_dong_doi_tac.update({ where: { id }, data });
  }

  // ---------------------------------------------------------------- bao cao / cong doi tac

  /** Doi tac (mot hoac tat ca) kem hop dong chua huy + so qua / voucher da duyet */
  layDoiTacKemSoLieuBaoCao(doiTacId?: string) {
    return this.prisma.doi_tac.findMany({
      where: doiTacId ? { id: doiTacId } : {},
      include: {
        hop_dong: { where: { trang_thai: { not: "HUY" } }, select: { doanh_thu_qua: true, chi_phi_tai_tro: true, ket_qua_chien_dich: true } },
        _count: { select: { qua_tang: { where: { trang_thai: "DA_DUYET" } }, voucher: { where: { trang_thai: "DA_DUYET" } } } }
      },
      orderBy: { ten: "asc" }
    });
  }

  /** [luot cap (chua huy), luot da dung] cua uu dai thuoc doi tac — chi so dem */
  demLuotCapVaDung(doiTacId: string) {
    const cuaDoiTac: Prisma.cap_phat_uu_daiWhereInput = { OR: [{ voucher: { doi_tac_id: doiTacId } }, { qua_tang: { doi_tac_id: doiTacId } }] };
    return Promise.all([
      this.prisma.cap_phat_uu_dai.count({ where: { ...cuaDoiTac, trang_thai: { not: "HUY" } } }),
      this.prisma.cap_phat_uu_dai.count({ where: { ...cuaDoiTac, trang_thai: "DA_DUNG" } })
    ]);
  }

  layQuaCuaDoiTac(doiTacId: string) {
    return this.prisma.qua_tang.findMany({ where: { doi_tac_id: doiTacId }, orderBy: { created_at: "desc" } });
  }

  layVoucherCuaDoiTac(doiTacId: string) {
    return this.prisma.voucher.findMany({ where: { doi_tac_id: doiTacId }, orderBy: { created_at: "desc" } });
  }
}

export interface LocUuDai {
  trang_thai?: TrangThaiDuyetQua;
  doi_tac_id?: string;
}
export interface LocCapPhat {
  /** sdt_chuan cu the (uu tien hon phamVi) */
  sdt: string | null;
  /** null = moi khach; mang = chi khach trong danh sach sdt_chuan */
  phamVi: string[] | null;
  trang_thai?: TrangThaiCapPhat;
}
/** Uu dai dang cap: voucher hoac qua tang (dung de loc cap_phat_uu_dai) */
export interface UuDaiCap {
  loai: "voucher" | "qua";
  id: string;
}
function theoUuDai(uuDai: UuDaiCap): Prisma.cap_phat_uu_daiWhereInput {
  return uuDai.loai === "voucher" ? { voucher_id: uuDai.id } : { qua_tang_id: uuDai.id };
}
/** Truy van qua_tang, voucher, cap_phat_uu_dai (+ doc nhat_ky tim nguoi tao voucher cu) */
@Injectable()
export class UuDaiRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Chay nhieu buoc trong mot transaction; truyen tx cho cac ham ghi (repository / NhatKy / ThongBao) */
  chayTrongGiaoDich<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // ---------------------------------------------------------------- cho khach

  /** Voucher DA_DUYET chua het han (kem ten doi tac) */
  layVoucherDaDuyetConHan(bayGio: Date) {
    return this.prisma.voucher.findMany({
      where: { trang_thai: "DA_DUYET", OR: [{ het_han: null }, { het_han: { gt: bayGio } }] },
      include: { doi_tac: { select: { ten: true } } },
      orderBy: { created_at: "desc" }
    });
  }

  /** Qua DA_DUYET (kem ten doi tac) */
  layQuaDaDuyet() {
    return this.prisma.qua_tang.findMany({
      where: { trang_thai: "DA_DUYET" },
      include: { doi_tac: { select: { ten: true } } },
      orderBy: { created_at: "desc" }
    });
  }

  /** 100 luot cap moi nhat cua mot khach (kem ten / ma uu dai) */
  layCapPhatTheoSdt(sdtChuan: string) {
    return this.prisma.cap_phat_uu_dai.findMany({
      where: { sdt_chuan: sdtChuan },
      include: { voucher: { select: { ma: true, ten: true } }, qua_tang: { select: { ten: true } } },
      orderBy: { cap_luc: "desc" },
      take: 100
    });
  }

  // ---------------------------------------------------------------- qua tang

  /** [trang qua kem ten doi tac, tong so dong] */
  danhSachQua(loc: LocUuDai, skip: number, take: number) {
    const where: Prisma.qua_tangWhereInput = {
      ...(loc.trang_thai ? { trang_thai: loc.trang_thai } : {}),
      ...(loc.doi_tac_id ? { doi_tac_id: loc.doi_tac_id } : {})
    };
    return Promise.all([
      this.prisma.qua_tang.findMany({ where, include: { doi_tac: { select: { ten: true } } }, orderBy: { created_at: "desc" }, skip, take }),
      this.prisma.qua_tang.count({ where })
    ]);
  }

  layQua(id: string) {
    return this.prisma.qua_tang.findUnique({ where: { id } });
  }

  layQuaHoacLoi(id: string, db: Prisma.TransactionClient = this.prisma) {
    return db.qua_tang.findUniqueOrThrow({ where: { id } });
  }

  taoQua(data: Prisma.qua_tangCreateArgs["data"], db: Prisma.TransactionClient = this.prisma) {
    return db.qua_tang.create({ data });
  }

  /** Ghi tham dinh — chi khi qua con CHO_THAM_DINH va chua ai tham dinh. Tra so dong da doi */
  async ghiThamDinhQua(id: string, data: Prisma.qua_tangUpdateManyArgs["data"], db: Prisma.TransactionClient = this.prisma): Promise<number> {
    const kq = await db.qua_tang.updateMany({ where: { id, trang_thai: "CHO_THAM_DINH", nguoi_tham_dinh_id: null }, data });
    return kq.count;
  }

  /** Ghi duyet / tu choi — chi khi qua con CHO_THAM_DINH. Tra so dong da doi */
  async ghiDuyetQua(id: string, data: Prisma.qua_tangUpdateManyArgs["data"], db: Prisma.TransactionClient = this.prisma): Promise<number> {
    const kq = await db.qua_tang.updateMany({ where: { id, trang_thai: "CHO_THAM_DINH" }, data });
    return kq.count;
  }

  // ---------------------------------------------------------------- voucher

  /** [trang voucher kem ten doi tac, tong so dong] */
  danhSachVoucher(loc: LocUuDai, skip: number, take: number) {
    const where: Prisma.voucherWhereInput = {
      ...(loc.trang_thai ? { trang_thai: loc.trang_thai } : {}),
      ...(loc.doi_tac_id ? { doi_tac_id: loc.doi_tac_id } : {})
    };
    return Promise.all([
      this.prisma.voucher.findMany({ where, include: { doi_tac: { select: { ten: true } } }, orderBy: { created_at: "desc" }, skip, take }),
      this.prisma.voucher.count({ where })
    ]);
  }

  layVoucher(id: string) {
    return this.prisma.voucher.findUnique({ where: { id } });
  }

  layVoucherHoacLoi(id: string, db: Prisma.TransactionClient = this.prisma) {
    return db.voucher.findUniqueOrThrow({ where: { id } });
  }

  layNguoiDeXuatVoucher(id: string) {
    return this.prisma.voucher.findUnique({ where: { id }, select: { nguoi_de_xuat_id: true } });
  }

  /** Nguoi ghi nhat_ky hanh dong tao voucher dau tien (voucher cu chua co cot nguoi_de_xuat_id) */
  layNguoiTaoVoucherTuNhatKy(voucherId: string, hanhDong: string) {
    return this.prisma.nhat_ky.findFirst({
      where: { doi_tuong: "voucher", doi_tuong_id: voucherId, hanh_dong: hanhDong },
      orderBy: { created_at: "asc" },
      select: { ho_so_id: true }
    });
  }

  taoVoucher(data: Prisma.voucherCreateArgs["data"], db: Prisma.TransactionClient = this.prisma) {
    return db.voucher.create({ data });
  }

  /** Ghi duyet / tu choi — chi khi voucher con CHO_THAM_DINH. Tra so dong da doi */
  async ghiDuyetVoucher(id: string, data: Prisma.voucherUpdateManyArgs["data"], db: Prisma.TransactionClient = this.prisma): Promise<number> {
    const kq = await db.voucher.updateMany({ where: { id, trang_thai: "CHO_THAM_DINH" }, data });
    return kq.count;
  }

  // ---------------------------------------------------------------- giu suat

  /** Voucher khong gioi han so luong: tang da_cap thang */
  tangDaCapVoucher(id: string, soSuat: number, db: Prisma.TransactionClient = this.prisma) {
    return db.voucher.update({ where: { id }, data: { da_cap: { increment: soSuat } } });
  }

  layDaCapVoucher(id: string, db: Prisma.TransactionClient = this.prisma) {
    return db.voucher.findUniqueOrThrow({ where: { id }, select: { da_cap: true } });
  }

  /** Tang da_cap co dieu kien (khoa lac quan theo da_cap vua doc). Tra so dong da doi */
  async tangDaCapVoucherNeuChuaDoi(id: string, daCapDaDoc: number, soSuat: number, db: Prisma.TransactionClient = this.prisma): Promise<number> {
    const kq = await db.voucher.updateMany({ where: { id, da_cap: daCapDaDoc }, data: { da_cap: { increment: soSuat } } });
    return kq.count;
  }

  /** Huy luot cap voucher: tra lai mot suat (khong xuong duoi 0) */
  traSuatVoucher(id: string, db: Prisma.TransactionClient = this.prisma) {
    return db.voucher.updateMany({ where: { id, da_cap: { gt: 0 } }, data: { da_cap: { decrement: 1 } } });
  }

  /** So luot cap qua chua huy */
  demCapPhatQuaChuaHuy(quaTangId: string, db: Prisma.TransactionClient = this.prisma) {
    return db.cap_phat_uu_dai.count({ where: { qua_tang_id: quaTangId, trang_thai: { not: "HUY" } } });
  }

  // ---------------------------------------------------------------- cap phat

  /** Luot cap DA_CAP (chua dung) cua uu dai cho khach — chi id */
  timCapPhatChuaDung(sdtChuan: string, uuDai: UuDaiCap, db: Prisma.TransactionClient = this.prisma) {
    return db.cap_phat_uu_dai.findFirst({
      where: { sdt_chuan: sdtChuan, trang_thai: "DA_CAP", ...theoUuDai(uuDai) },
      select: { id: true }
    });
  }

  /** sdt_chuan trong danh sach da co luot DA_CAP cua uu dai */
  laySdtDaCoCapPhatChuaDung(dsSdt: string[], uuDai: UuDaiCap, db: Prisma.TransactionClient = this.prisma) {
    return db.cap_phat_uu_dai.findMany({
      where: { sdt_chuan: { in: dsSdt }, trang_thai: "DA_CAP", ...theoUuDai(uuDai) },
      select: { sdt_chuan: true }
    });
  }

  taoCapPhat(data: Prisma.cap_phat_uu_daiCreateArgs["data"], db: Prisma.TransactionClient = this.prisma) {
    return db.cap_phat_uu_dai.create({ data });
  }

  taoNhieuCapPhat(data: Prisma.cap_phat_uu_daiCreateManyInput[], db: Prisma.TransactionClient = this.prisma) {
    return db.cap_phat_uu_dai.createMany({ data });
  }

  /** [trang luot cap kem ten / ma uu dai, tong so dong] */
  danhSachCapPhat(loc: LocCapPhat, skip: number, take: number) {
    const where: Prisma.cap_phat_uu_daiWhereInput = {
      ...(loc.sdt ? { sdt_chuan: loc.sdt } : loc.phamVi ? { sdt_chuan: { in: loc.phamVi } } : {}),
      ...(loc.trang_thai ? { trang_thai: loc.trang_thai } : {})
    };
    return Promise.all([
      this.prisma.cap_phat_uu_dai.findMany({
        where,
        include: { voucher: { select: { ma: true, ten: true } }, qua_tang: { select: { ten: true } } },
        orderBy: { cap_luc: "desc" },
        skip,
        take
      }),
      this.prisma.cap_phat_uu_dai.count({ where })
    ]);
  }

  layCapPhat(id: string) {
    return this.prisma.cap_phat_uu_dai.findUnique({ where: { id } });
  }

  layCapPhatHoacLoi(id: string, db: Prisma.TransactionClient = this.prisma) {
    return db.cap_phat_uu_dai.findUniqueOrThrow({ where: { id } });
  }

  /** Doi trang thai luot cap — chi khi con DA_CAP. Tra so dong da doi */
  async ghiTrangThaiCapPhat(id: string, data: Prisma.cap_phat_uu_daiUpdateManyArgs["data"], db: Prisma.TransactionClient = this.prisma): Promise<number> {
    const kq = await db.cap_phat_uu_dai.updateMany({ where: { id, trang_thai: "DA_CAP" }, data });
    return kq.count;
  }
}
