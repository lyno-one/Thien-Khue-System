import { ForbiddenException } from "@nestjs/common";
import type { CrmDocService, DonCrm } from "../../src/infrastructure/crm/crm-doc.service";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import { QuyenSkuService } from "../../src/services/dao-tao-quyen-sku.service";
import { type DonCoGhiChu, GhiNhanDonService, HoaHongService } from "../../src/services/mang-luoi-hoa-hong.service";
import { BoNho, taoRepoMangLuoi } from "./prisma-bo-nho";

/*
 * Sua loi ra soat 07/10 (docs/LOI-CAN-SUA.md):
 *  - muc 6 + 16: xac minh don trung nguon chi LAP de xuat, khong tu ghi nhan / tao hoa hong
 *  - muc 7: ma gioi thieu nhap tay -> luon CHO_XAC_MINH ke ca QUAN_LY / ADMIN; khong tu gan ma cua minh; nguoi nhap khong xac minh
 *  - muc 15: hoan / huy -> ghi_nhan BI_HUY + hoa_hong BI_TRU trong CUNG transaction (loi giua chung -> rollback ca hai, lan sau lam lai)
 *  - muc 13: vi — dieu chinh da dua vao ky chi tra khong cong lai vao tam tinh
 */

const MAU_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const CRM_SALE = "cccccccc-0000-4000-8000-000000000001";

function taoDon(ghiDe: Partial<DonCoGhiChu> = {}): DonCoGhiChu {
  return {
    id: "d0000000-0000-4000-8000-000000000001",
    ma_don: "DH-00001",
    kenh: "website",
    loai_don: "BAN_HANG",
    khach_ten: "Chị Lan",
    khach_sdt: "0900000001",
    sdt_chuan: "0900000001",
    trang_thai: "moi",
    tong_tien: 1_000_000,
    giam_gia: 0,
    nguoi_tao: null,
    created_at: new Date("2026-10-05T03:00:00Z"),
    giao_thanh_cong_luc: null,
    hoan_luc: null,
    ghi_chu: null,
    ...ghiDe
  };
}

function nd(id: string, vai: string[]): ThongTinNguoiDung {
  return { id, vai, vaiChiTiet: [], hoSo: { id, ho_ten: id } } as unknown as ThongTinNguoiDung;
}

/** Prisma bo nho + nhat_ky luu that + $transaction CO rollback (giong DB) */
function dung(bn: BoNho, don: DonCoGhiChu) {
  const prisma = bn.prisma();
  const nhatKyDs: { ho_so_id: string | null; hanh_dong: string; doi_tuong: string; doi_tuong_id: string | null; du_lieu: unknown }[] = [];
  prisma.nhat_ky = {
    findMany: jest.fn(async ({ where }: { where: { doi_tuong: string; doi_tuong_id: string; hanh_dong: string } }) =>
      nhatKyDs.filter(n => n.doi_tuong === where.doi_tuong && n.doi_tuong_id === where.doi_tuong_id && n.hanh_dong === where.hanh_dong)
    )
  };
  prisma.$transaction = async (fn: (tx: unknown) => unknown) => {
    const du = bn.du as unknown as Record<string, Record<string, unknown>[]>;
    const chup = Object.fromEntries(Object.entries(du).map(([k, rows]) => [k, rows.map(r => ({ ...r }))]));
    const nkTruoc = nhatKyDs.length;
    try {
      return await fn(prisma);
    } catch (e) {
      for (const [k, rows] of Object.entries(chup)) du[k]!.splice(0, du[k]!.length, ...rows);
      nhatKyDs.length = nkTruoc;
      throw e;
    }
  };
  const cacDon = new Map<string, DonCrm>([[don.id, don]]);
  const crmDoc = {
    layDongDon: jest.fn(async () => [{ id: "l1", don_id: don.id, mau_id: MAU_A, ma_mau: "AL01", size: "M", mau_sac: "Trắng", so_luong: 2, don_gia: 500_000 }]),
    layDon: jest.fn(async (id: string) => cacDon.get(id) ?? null),
    layDonTheoMa: jest.fn(async (ma: string) => [...cacDon.values()].find(d => d.ma_don === ma) ?? null)
  } as unknown as CrmDocService;
  const nhatKy = {
    ghi: jest.fn(async (m: { hoSoId: string | null; hanhDong: string; doiTuong: string; doiTuongId?: string | null; duLieu?: unknown }) => {
      nhatKyDs.push({ ho_so_id: m.hoSoId, hanh_dong: m.hanhDong, doi_tuong: m.doiTuong, doi_tuong_id: m.doiTuongId ?? null, du_lieu: m.duLieu ?? null });
    }),
    ghiAnToan: jest.fn(async () => undefined)
  } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 0) } as unknown as ThongBaoService;
  const repo = taoRepoMangLuoi(prisma);
  const quyenSku = new QuyenSkuService(repo.quyenSku, nhatKy, thongBao);
  const sv = new GhiNhanDonService(repo.ghiNhan, repo.ma, repo.hoSo, crmDoc, quyenSku, nhatKy, thongBao);
  return { sv, prisma, cacDon, nhatKyDs };
}

function chuanBi() {
  const bn = new BoNho();
  bn.themNguoi("ctv-1", [{ vai: "CTV" }]);
  bn.themNguoi("sale-1", [{ vai: "SALE" }], CRM_SALE);
  bn.themNguoi("ql-1", [{ vai: "QUAN_LY" }]);
  bn.themNguoi("ql-2", [{ vai: "QUAN_LY" }]);
  // QUAN_LY dong thoi la CTV co ma rieng
  bn.themNguoi("ql-ctv", [{ vai: "QUAN_LY" }, { vai: "CTV" }]);
  bn.du.ma_gioi_thieu.push({ id: "ma-1", ho_so_id: "ctv-1", ma: "AL01-CTV111", mau_id: MAU_A, bat: true });
  bn.du.ma_gioi_thieu.push({ id: "ma-2", ho_so_id: "ql-ctv", ma: "AL01-QLC222", mau_id: MAU_A, bat: true });
  bn.du.quyen_sku.push({ ho_so_id: "ctv-1", mau_id: MAU_A, ma_mau: "AL01", trang_thai: "HOAT_DONG" });
  bn.du.quyen_sku.push({ ho_so_id: "ql-ctv", mau_id: MAU_A, ma_mau: "AL01", trang_thai: "HOAT_DONG" });
  bn.du.quyen_sku.push({ ho_so_id: "sale-1", mau_id: MAU_A, ma_mau: "AL01", trang_thai: "HOAT_DONG" });
  bn.du.ty_le_hoa_hong.push({ vai: "CTV", mau_id: null, ty_le: 10, bat: true, hieu_luc_tu: new Date("2026-01-01"), hieu_luc_den: null });
  bn.du.ty_le_hoa_hong.push({ vai: "SALE", mau_id: null, ty_le: 2, bat: true, hieu_luc_tu: new Date("2026-01-01"), hieu_luc_den: null });
  return bn;
}

describe("Muc 7 — ma gioi thieu nhap tay luon qua xac minh", () => {
  it.each([["QUAN_LY"], ["ADMIN"], ["THIEN_KHUE"]])("%s nhap ma cho don khong co nguoi chot -> CHO_XAC_MINH, KHONG co hoa hong", async vai => {
    const bn = chuanBi();
    const don = taoDon();
    const { sv } = dung(bn, don);
    const kq = await sv.ghiNhanTheoMaDon(nd("ql-1", [vai]), "DH-00001", "AL01-CTV111");
    expect(kq.trang_thai).toBe("CHO_XAC_MINH");
    expect(kq.nguoi_ban).toBeNull();
    expect(bn.hoa_hong).toHaveLength(0);
  });

  it("QUAN_LY khong tu gan ma gioi thieu cua chinh minh vao don", async () => {
    const bn = chuanBi();
    const don = taoDon();
    const { sv } = dung(bn, don);
    await expect(sv.ghiNhanTheoMaDon(nd("ql-ctv", ["QUAN_LY", "CTV"]), "DH-00001", "al01-qlc222")).rejects.toBeInstanceOf(ForbiddenException);
    expect(bn.du.ghi_nhan_don).toHaveLength(0);
    expect(bn.hoa_hong).toHaveLength(0);
  });

  it("nguoi nhap ma khong duoc de xuat xac minh don do; nguoi phu trach khac thi duoc", async () => {
    const bn = chuanBi();
    const don = taoDon();
    const { sv } = dung(bn, don);
    const gn = await sv.ghiNhanTheoMaDon(nd("ql-1", ["QUAN_LY"]), "DH-00001", "AL01-CTV111");
    await expect(sv.xacMinh(nd("ql-1", ["QUAN_LY"]), gn.id, "GIOI_THIEU", "Tôi đã kiểm tra")).rejects.toBeInstanceOf(ForbiddenException);
    const kq = await sv.xacMinh(nd("ql-2", ["QUAN_LY"]), gn.id, "GIOI_THIEU", "Khách vào từ link CTV");
    expect(kq.trang_thai).toBe("CHO_KIEM");
    expect(bn.hoa_hong).toHaveLength(0);
  });
});

describe("Muc 6 + 16 — xac minh trung nguon = de xuat maker-checker", () => {
  it("QUAN_LY chon nguoi ban -> chi tao de_xuat_duyet XAC_MINH_DON CHO_KIEM; ghi nhan giu CHO_XAC_MINH, chua co hoa hong", async () => {
    const bn = chuanBi();
    const don = taoDon({ nguoi_tao: CRM_SALE, ghi_chu: "[MGT:AL01-CTV111]" });
    const { sv } = dung(bn, don);
    const { id } = await sv.xuLyDon(don);
    const kq = await sv.xacMinh(nd("ql-1", ["QUAN_LY"]), id!, "NGUOI_CHOT", "Sale tư vấn trọn đơn");
    expect(kq.de_xuat_duyet_id).toBeTruthy();
    expect(bn.du.ghi_nhan_don[0]).toMatchObject({ trang_thai: "CHO_XAC_MINH", nguoi_ban_ho_so_id: null });
    expect(bn.du.ghi_nhan_don[0]!.nguoi_xac_minh_id ?? null).toBeNull();
    expect(bn.hoa_hong).toHaveLength(0);
    expect(bn.du.de_xuat_duyet[0]).toMatchObject({
      loai: "XAC_MINH_DON",
      doi_tuong: "ghi_nhan_don",
      trang_thai: "CHO_KIEM",
      nguoi_de_xuat_id: "ql-1",
      du_lieu: expect.objectContaining({ ket_qua: "GHI_NHAN", nguoi_ban_ho_so_id: "sale-1", nguon: "SALE", nguoi_chot_ho_so_id: "sale-1", chu_ma_ho_so_id: "ctv-1" })
    });
  });

  it("chon KHONG_AI -> de xuat ket_qua HUY, ghi nhan chua bi huy", async () => {
    const bn = chuanBi();
    const don = taoDon({ nguoi_tao: CRM_SALE, ghi_chu: "[MGT:AL01-CTV111]" });
    const { sv } = dung(bn, don);
    const { id } = await sv.xuLyDon(don);
    await sv.xacMinh(nd("ql-1", ["QUAN_LY"]), id!, "KHONG_AI", "Không đủ căn cứ cho ai");
    expect(bn.du.de_xuat_duyet[0]!.du_lieu).toMatchObject({ ket_qua: "HUY", nguoi_ban_ho_so_id: null });
    expect(bn.du.ghi_nhan_don[0]!.trang_thai).toBe("CHO_XAC_MINH");
  });
});

describe("Muc 15 — hoan / huy: ghi nhan + hoa hong trong cung transaction", () => {
  it("loi giua chung khi tru hoa hong -> rollback ca ghi nhan; lan dong bo sau tru dung mot lan", async () => {
    const bn = chuanBi();
    const don = taoDon({ ghi_chu: "[MGT:AL01-CTV111]", trang_thai: "giao_thanh_cong" });
    const { sv, prisma, cacDon } = dung(bn, don);
    await sv.xuLyDon(don);
    expect(bn.hoa_hong[0]!.trang_thai).toBe("DU_DIEU_KIEN");

    cacDon.set(don.id, { ...don, trang_thai: "hoan" });
    const goc = prisma.hoa_hong.updateMany;
    prisma.hoa_hong.updateMany = jest.fn(async () => {
      throw new Error("DB timeout");
    });
    const lan1 = await sv.dongBo();
    expect(lan1.loi).toBe(1);
    // Rollback: ghi nhan KHONG bi doi sang BI_HUY mot minh
    expect(bn.du.ghi_nhan_don[0]!.trang_thai).toBe("HOP_LE");
    expect(bn.hoa_hong[0]!.trang_thai).toBe("DU_DIEU_KIEN");

    prisma.hoa_hong.updateMany = goc;
    const lan2 = await sv.dongBo();
    expect(lan2.bi_tru).toBe(1);
    expect(bn.du.ghi_nhan_don[0]!.trang_thai).toBe("BI_HUY");
    expect(bn.hoa_hong[0]!.trang_thai).toBe("BI_TRU");
    const lan3 = await sv.dongBo();
    expect(lan3.bi_tru).toBe(0);
  });

  it("du lieu cu: ghi nhan da BI_HUY nhung hoa hong da tra -> dong bo van tru + ghi dieu chinh am dung mot lan", async () => {
    const bn = chuanBi();
    const don = taoDon({ ghi_chu: "[MGT:AL01-CTV111]", trang_thai: "giao_thanh_cong" });
    const { sv, cacDon } = dung(bn, don);
    await sv.xuLyDon(don);
    bn.hoa_hong[0]!.trang_thai = "DA_TRA";
    bn.du.ghi_nhan_don[0]!.trang_thai = "BI_HUY";
    cacDon.set(don.id, { ...don, trang_thai: "hoan" });

    await sv.dongBo();
    await sv.dongBo();
    expect(bn.hoa_hong[0]!.trang_thai).toBe("BI_TRU");
    expect(bn.du.dieu_chinh_hoa_hong).toHaveLength(1);
    expect(Number(bn.du.dieu_chinh_hoa_hong[0]!.so_tien)).toBe(-100_000);
  });

  it("ghi nhan da huy (khong tinh cho ai) ma don giao thanh cong -> khong nang hoa hong len du dieu kien", async () => {
    const bn = chuanBi();
    const don = taoDon({ ghi_chu: "[MGT:AL01-CTV111]" });
    const { sv, cacDon } = dung(bn, don);
    await sv.xuLyDon(don);
    bn.du.ghi_nhan_don[0]!.trang_thai = "BI_HUY";
    cacDon.set(don.id, { ...don, trang_thai: "giao_thanh_cong" });
    await sv.dongBo();
    expect(bn.hoa_hong[0]!.trang_thai).toBe("CHO_DOI_SOAT");
  });
});

describe("Muc 13 — vi: dieu chinh da chi tra khong cong lai", () => {
  it("tam_tinh = du dieu kien + dieu chinh CHUA nam trong de xuat chi tra da duyet", async () => {
    const prisma = {
      ma_gioi_thieu: { findMany: jest.fn(async () => []) },
      hoa_hong: { groupBy: jest.fn(async () => [{ trang_thai: "DU_DIEU_KIEN", _sum: { so_tien: 100_000 }, _count: { _all: 2 } }]) },
      dieu_chinh_hoa_hong: {
        aggregate: jest.fn(async () => ({ _sum: { so_tien: -55_000 }, _count: { _all: 3 } })),
        findMany: jest.fn(async () => [
          { id: "dc-da-tra", so_tien: -20_000 },
          { id: "dc-moi", so_tien: 5_000 },
          { id: "dc-da-tra-cot", so_tien: -40_000, de_xuat_chi_tra_id: "dx-chi-tra" }
        ])
      },
      de_xuat_duyet: { findMany: jest.fn(async () => [{ du_lieu: { dieu_chinh_ids: ["dc-da-tra"] } }]) },
      ghi_nhan_don: { aggregate: jest.fn(async () => ({ _sum: { tong_tien: null }, _count: { _all: 0 } })) },
      vai_tro_ho_so: { findMany: jest.fn(async () => []) },
      ty_le_hoa_hong: { findMany: jest.fn(async () => []) }
    } as unknown as PrismaService;
    const repo = taoRepoMangLuoi(prisma);
    const sv = new HoaHongService(repo.hoaHong, repo.ma, repo.hoSo, {} as NhatKyService, {} as ThongBaoService);
    const vi = await sv.layVi("ctv-1");
    expect(vi.tam_tinh).toBe(105_000);
    expect(vi.dieu_chinh.so_tien).toBe(-55_000);
  });
});
