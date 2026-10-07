import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";
import type { NhatKyService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import { datNguong, type DuLieuHocVien, type KhoaDeTinh, tinhTienDo } from "../../src/common/utils/dao-tao";
import { SuaBaiKiemTraDto, TaoBaiKiemTraDto } from "../../src/dto/dao-tao/dao-tao.dto";
import { QuanTriNoiDungRepository } from "../../src/repositories/dao-tao.repository";
import { type NguoiThaoTac, QuanTriNoiDungService, thayDoiNoiDe, thayDoiNoiKhoa } from "../../src/services/dao-tao-quan-tri.service";

// LOI-CAN-SUA muc 9 / 11: nguong 90% khoa cung + QUAN_LY khong tu noi duoc cong "hoc truoc khi ban"

const KHOA = "11111111-1111-4111-8111-111111111111";
const DE = "22222222-2222-4222-8222-222222222222";
const CAU = "33333333-3333-4333-8333-333333333333";

const nguoi = (vai: NguoiThaoTac["vai"], dangHoc: NguoiThaoTac["vai"] = []): NguoiThaoTac => ({
  id: "44444444-4444-4444-8444-444444444444",
  vai,
  vaiChiTiet: [
    ...vai.map(v => ({ vai: v, trang_thai: "HOAT_DONG" as const, tu_luc: new Date(), den_luc: null })),
    ...dangHoc.map(v => ({ vai: v, trang_thai: "DANG_HOC" as const, tu_luc: new Date(), den_luc: null }))
  ]
});
const QUAN_LY = nguoi(["QUAN_LY"]);
const ADMIN = nguoi(["ADMIN"]);
const THIEN_KHUE = nguoi(["THIEN_KHUE"]);
/** Nhu manager.sales: QUAN_LY + SALE dang hoc */
const QUAN_LY_DANG_HOC = nguoi(["QUAN_LY"], ["SALE"]);

describe("DTO nguong_dat >= 90", () => {
  it.each([0, 50, 89])("nguong %i bi tu choi (tao + sua)", async n => {
    expect(await validate(plainToInstance(TaoBaiKiemTraDto, { ma: "kt-a", tieu_de: "Kiểm tra", nguong_dat: n }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(SuaBaiKiemTraDto, { nguong_dat: n }))).not.toHaveLength(0);
  });
  it.each([90, 95, 100])("nguong %i hop le", async n => {
    expect(await validate(plainToInstance(SuaBaiKiemTraDto, { nguong_dat: n }))).toHaveLength(0);
  });
});

describe("cham diem + tien do fail-safe", () => {
  it("datNguong kep toi thieu 90 du du lieu cu nguong thap", () => {
    expect(datNguong(80, 50)).toBe(false);
    expect(datNguong(90, 50)).toBe(true);
    expect(datNguong(94, 95)).toBe(false);
  });

  const dl: DuLieuHocVien = { baiXong: new Set(["b1"]), luotLam: [], thucHanh: [], quyenSku: [] };
  const khoa = (p: Partial<KhoaDeTinh>): KhoaDeTinh => ({ id: "k", loai: "NEN_TANG", phien_ban_tai_lieu: 1, can_thuc_hanh: false, mau_id: null, bai_hoc: [{ id: "b1" }], bai_kiem_tra: [], ...p });

  it.each(["NEN_TANG", "NGHIEP_VU", "SAN_PHAM"] as const)("khoa %s khong co bai kiem tra bat buoc dang bat -> KHONG hoan thanh", loai => {
    expect(tinhTienDo(khoa({ loai }), dl).hoan_thanh).toBe(false);
    expect(tinhTienDo(khoa({ loai, bai_kiem_tra: [{ id: "d", bat_buoc: false }] }), dl).hoan_thanh).toBe(false);
  });

  it("co bai bat buoc va thi dat -> hoan thanh", () => {
    const luot = { id: "l", bai_kiem_tra_id: "d", diem: 95, dat: true, phien_ban_tai_lieu: 1, nop_luc: new Date() };
    expect(tinhTienDo(khoa({ bai_kiem_tra: [{ id: "d", bat_buoc: true }] }), { ...dl, luotLam: [luot] }).hoan_thanh).toBe(true);
  });
});

describe("phat hien thao tac noi cong", () => {
  const khoaCu = { bat: true, bat_buoc: true, can_thuc_hanh: true, vai_ap_dung: ["SALE", "CSKH"] as ("SALE" | "CSKH")[] };
  it("khoa", () => {
    expect(thayDoiNoiKhoa(khoaCu, { bat_buoc: false })).toHaveLength(1);
    expect(thayDoiNoiKhoa(khoaCu, { can_thuc_hanh: false })).toHaveLength(1);
    expect(thayDoiNoiKhoa(khoaCu, { bat: false })).toHaveLength(1);
    expect(thayDoiNoiKhoa(khoaCu, { vai_ap_dung: ["CSKH"] })).toHaveLength(1);
    expect(thayDoiNoiKhoa(khoaCu, { vai_ap_dung: ["SALE", "CSKH", "CTV"], can_thuc_hanh: true, bat: true })).toEqual([]);
  });
  it("bai kiem tra", () => {
    expect(thayDoiNoiDe({ bat: true, bat_buoc: true }, { bat: false })).toHaveLength(1);
    expect(thayDoiNoiDe({ bat: true, bat_buoc: true }, { bat_buoc: false })).toHaveLength(1);
    expect(thayDoiNoiDe({ bat: true, bat_buoc: false }, { bat: false })).toEqual([]);
  });
});

function taoMock() {
  const prisma = {
    khoa_hoc: {
      findUnique: jest.fn(async () => ({ id: KHOA, bat: true, bat_buoc: true, can_thuc_hanh: true, vai_ap_dung: ["SALE"] })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: KHOA,
        ma: "nv-sale",
        ten: "Nghiệp vụ Sale",
        loai: "NGHIEP_VU",
        bat: true,
        bat_buoc: true,
        can_thuc_hanh: true,
        vai_ap_dung: ["SALE"],
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
        _count: { bai_hoc: 0, bai_kiem_tra: 1 }
      }))
    },
    bai_kiem_tra: {
      findUnique: jest.fn(async (q: { include?: unknown }) => ({
        id: DE,
        khoa_hoc_id: KHOA,
        ma: "kt",
        tieu_de: "Kiểm tra",
        nguong_dat: 90,
        bat_buoc: true,
        so_cau_hien: null,
        thoi_gian_phut: null,
        so_lan_toi_da: null,
        bat: true,
        khoa_hoc: { vai_ap_dung: ["SALE"] },
        ...(q.include ? { cau_hoi: [{ id: CAU, bai_kiem_tra_id: DE, ma: "c1", noi_dung: "?", lua_chon: ["a", "b"], dap_an: [1], giai_thich: "vì b", diem: 1, thu_tu: 0 }] } : {})
      })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: DE,
        khoa_hoc_id: KHOA,
        ma: "kt",
        tieu_de: "Kiểm tra",
        nguong_dat: 90,
        bat_buoc: true,
        so_cau_hien: null,
        thoi_gian_phut: null,
        so_lan_toi_da: null,
        bat: true,
        ...data,
        cau_hoi: []
      }))
    },
    cau_hoi: { findUnique: jest.fn(async () => ({ id: CAU, bai_kiem_tra_id: DE, ma: "c1", noi_dung: "?", lua_chon: ["a", "b"], dap_an: [1], giai_thich: null, diem: 1, thu_tu: 0, bai_kiem_tra: { khoa_hoc: { vai_ap_dung: ["SALE"] } } })), update: jest.fn() },
    $queryRaw: jest.fn(async () => [])
  };
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const svc = new QuanTriNoiDungService(new QuanTriNoiDungRepository(prisma as unknown as PrismaService), {} as CrmDocService, nhatKy);
  return { svc, prisma };
}

describe("QuanTriNoiDungService — noi cong chi THIEN_KHUE", () => {
  it.each([
    ["tat bai thi bat buoc", (s: QuanTriNoiDungService, nd: NguoiThaoTac) => s.tatDe(nd, DE)],
    ["bo bat_buoc bai thi", (s: QuanTriNoiDungService, nd: NguoiThaoTac) => s.suaDe(nd, DE, { bat_buoc: false })],
    ["bo yeu cau thuc hanh", (s: QuanTriNoiDungService, nd: NguoiThaoTac) => s.suaKhoa(nd, KHOA, { can_thuc_hanh: false })],
    ["tat khoa bat buoc", (s: QuanTriNoiDungService, nd: NguoiThaoTac) => s.tatKhoa(nd, KHOA)],
    ["bo bat_buoc khoa", (s: QuanTriNoiDungService, nd: NguoiThaoTac) => s.suaKhoa(nd, KHOA, { bat_buoc: false })]
  ])("%s: QUAN_LY / ADMIN bi 403, khong ghi DB; THIEN_KHUE duoc", async (_ten, lam) => {
    for (const nd of [QUAN_LY, ADMIN]) {
      const { svc, prisma } = taoMock();
      await expect(lam(svc, nd)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.bai_kiem_tra.update).not.toHaveBeenCalled();
      expect(prisma.khoa_hoc.update).not.toHaveBeenCalled();
    }
    const { svc } = taoMock();
    await expect(lam(svc, THIEN_KHUE)).resolves.toBeDefined();
  });

  it("nguong < 90 bi chan o service ke ca khi bo qua DTO", async () => {
    const { svc, prisma } = taoMock();
    await expect(svc.suaDe(THIEN_KHUE, DE, { nguong_dat: 50 })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.bai_kiem_tra.update).not.toHaveBeenCalled();
  });

  it("QUAN_LY van sua duoc thao tac khong noi cong (vd nang nguong, doi tieu de)", async () => {
    const { svc, prisma } = taoMock();
    await svc.suaDe(QUAN_LY, DE, { nguong_dat: 95, tieu_de: "Mới" });
    expect(prisma.bai_kiem_tra.update).toHaveBeenCalled();
  });
});

describe("QuanTriNoiDungService — nguoi dang hoc khoa khong xem dap an / sua de", () => {
  it("QUAN_LY dang hoc SALE: xem de bi an dap an + giai thich", async () => {
    const { svc } = taoMock();
    const d = await svc.chiTietDe(QUAN_LY_DANG_HOC, DE);
    expect(d.cau_hoi?.[0]).toEqual(expect.objectContaining({ dap_an: [], giai_thich: null }));
    const k = await svc.chiTietDe(QUAN_LY, DE);
    expect(k.cau_hoi?.[0].dap_an).toEqual([1]);
  });

  it("QUAN_LY dang hoc SALE: sua de / sua cau cua khoa SALE -> 403", async () => {
    const { svc, prisma } = taoMock();
    await expect(svc.suaDe(QUAN_LY_DANG_HOC, DE, { tieu_de: "x" })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.suaCau(QUAN_LY_DANG_HOC, CAU, { dap_an: [0] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.cau_hoi.update).not.toHaveBeenCalled();
  });
});
