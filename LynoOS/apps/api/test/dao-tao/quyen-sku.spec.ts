import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import { KHOA_QUYEN_SKU, layTheoDuongDan, QuyenSkuGuard } from "../../src/common/guards/quyen-sku.guard";
import { QuyenSkuRepository } from "../../src/repositories/dao-tao.repository";
import { QuyenSkuService } from "../../src/services/dao-tao-quyen-sku.service";

const HS = "33333333-3333-4333-8333-333333333333";
const MAU = "44444444-4444-4444-8444-444444444444";
const KHOA = "55555555-5555-4555-8555-555555555555";

function taoMock(quyen: { trang_thai: string; mau_id: string; ma_mau: string } | null) {
  const tx = {
    khoa_hoc: { update: jest.fn(async () => ({ phien_ban_tai_lieu: 3 })) },
    quyen_sku: {
      findMany: jest.fn(async () => [
        { id: "q1", ho_so_id: "hs-1", bang_chung: { diem: 100 } },
        { id: "q2", ho_so_id: "hs-2", bang_chung: null }
      ]),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
      findUniqueOrThrow: jest.fn(async () => ({
        id: "q1",
        mau_id: MAU,
        ma_mau: "AL01",
        trang_thai: "HOAT_DONG",
        phien_ban_tai_lieu: 3,
        khoa_hoc_id: KHOA,
        cap_luc: new Date(),
        thu_hoi_luc: null,
        ly_do: null,
        bang_chung: null,
        khoa_hoc: { ten: "AL01", phien_ban_tai_lieu: 3 }
      }))
    }
  };
  const prisma = {
    quyen_sku: { findFirst: jest.fn(async () => quyen) },
    khoa_hoc: { findUnique: jest.fn(async () => ({ id: KHOA, ten: "AL01", loai: "SAN_PHAM", mau_id: MAU, ma_mau: "AL01" })) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async (ids: string[]) => ids.length) } as unknown as ThongBaoService;
  return { svc: new QuyenSkuService(new QuyenSkuRepository(prisma), nhatKy, thongBao), prisma, tx, thongBao };
}

describe("QuyenSkuService.kiem — chan SKU chua cap", () => {
  it("chua co quyen -> duoc=false; truyen hanh dong -> 403", async () => {
    const { svc } = taoMock(null);
    const kq = await svc.kiem(HS, MAU);
    expect(kq.duoc).toBe(false);
    expect(kq.lyDo).toContain("chưa được cấp quyền");
    await expect(svc.kiem(HS, MAU, "BAN")).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.batBuoc(HS, "AL01", "TU_VAN")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("HOAT_DONG -> duoc; tim theo ma mau (chu hoa)", async () => {
    const { svc, prisma } = taoMock({ trang_thai: "HOAT_DONG", mau_id: MAU, ma_mau: "AL01" });
    await expect(svc.kiem(HS, "al01", "BAN")).resolves.toMatchObject({ duoc: true, lyDo: null, maMau: "AL01" });
    expect(prisma.quyen_sku.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { ho_so_id: HS, ma_mau: "AL01" } }));
  });

  it("CAN_HOC_LAI (doi phien ban) -> bi chan cho toi khi hoc lai", async () => {
    const { svc } = taoMock({ trang_thai: "CAN_HOC_LAI", mau_id: MAU, ma_mau: "AL01" });
    const kq = await svc.kiem(HS, MAU);
    expect(kq.duoc).toBe(false);
    expect(kq.lyDo).toContain("học lại");
    await expect(svc.kiem(HS, MAU, "LAY_MA_GIOI_THIEU")).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("QuyenSkuService.tangPhienBan — doi phien ban -> can hoc lai", () => {
  it("moi quyen cua mau chuyen CAN_HOC_LAI + thong bao tung nguoi", async () => {
    const { svc, tx, thongBao } = taoMock(null);
    const kq = await svc.tangPhienBan("quan-ly", KHOA, "Đổi chất liệu", "THI_LAI");
    expect(kq).toEqual({ khoa_hoc_id: KHOA, phien_ban_tai_lieu: 3, so_quyen_can_hoc_lai: 2 });
    expect(tx.quyen_sku.update).toHaveBeenCalledTimes(2);
    const goi = (tx.quyen_sku.update as jest.Mock).mock.calls[0][0];
    expect(goi.data.trang_thai).toBe("CAN_HOC_LAI");
    expect(goi.data.bang_chung.can_hoc_lai).toMatchObject({ phien_ban_moi: 3, yeu_cau: "THI_LAI" });
    expect(goi.data.bang_chung.diem).toBe(100); // giu bang chung cu
    expect(thongBao.guiNhieu).toHaveBeenCalledWith(["hs-1", "hs-2"], expect.objectContaining({ loai: "QUYEN_SKU" }), tx);
  });

  it("khoa khong phai SAN_PHAM -> 400", async () => {
    const { svc, prisma } = taoMock(null);
    (prisma.khoa_hoc.findUnique as jest.Mock).mockResolvedValueOnce({ id: KHOA, ten: "x", loai: "NEN_TANG", mau_id: null, ma_mau: null });
    await expect(svc.tangPhienBan("ql", KHOA, "x")).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("QuyenSkuService.xacNhanDocThayDoi", () => {
  const banGhi = (yeuCau: "XAC_NHAN" | "THI_LAI") => ({
    id: "q1",
    mau_id: MAU,
    ma_mau: "AL01",
    trang_thai: "CAN_HOC_LAI",
    phien_ban_tai_lieu: 2,
    khoa_hoc_id: KHOA,
    cap_luc: new Date(),
    thu_hoi_luc: null,
    ly_do: "đổi",
    bang_chung: { can_hoc_lai: { phien_ban_moi: 3, yeu_cau: yeuCau, ly_do: "đổi", luc: "" } },
    khoa_hoc: { ten: "AL01", phien_ban_tai_lieu: 3 }
  });

  it("yeu cau THI_LAI -> khong cho xac nhan suong", async () => {
    const { svc, prisma } = taoMock(null);
    (prisma.quyen_sku.findFirst as jest.Mock).mockResolvedValueOnce(banGhi("THI_LAI"));
    await expect(svc.xacNhanDocThayDoi(HS, MAU)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("yeu cau XAC_NHAN -> HOAT_DONG lai o phien ban moi", async () => {
    const { svc, prisma, tx } = taoMock(null);
    (prisma.quyen_sku.findFirst as jest.Mock).mockResolvedValueOnce(banGhi("XAC_NHAN"));
    const kq = await svc.xacNhanDocThayDoi(HS, MAU);
    expect(tx.quyen_sku.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "q1", trang_thai: "CAN_HOC_LAI" }, data: expect.objectContaining({ trang_thai: "HOAT_DONG", phien_ban_tai_lieu: 3 }) })
    );
    expect(kq.trang_thai).toBe("HOAT_DONG");
  });
});

describe("QuyenSkuGuard", () => {
  function ctx(nguoiDung: unknown, body: unknown): ExecutionContext {
    return {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({ nguoiDung, params: {}, query: {}, body }) })
    } as unknown as ExecutionContext;
  }
  const reflector = { getAllAndOverride: jest.fn(() => ({ hanhDong: "BAN", duongDan: "body.dong[].mau_id" })) } as unknown as Reflector;

  it("lay gia tri theo duong dan co mang", () => {
    expect(layTheoDuongDan({ body: { dong: [{ mau_id: "a" }, { mau_id: "b" }] } }, "body.dong[].mau_id")).toEqual(["a", "b"]);
    expect(KHOA_QUYEN_SKU).toBe("tk:quyen-sku");
  });

  it("chan khi mot dong chua co quyen", async () => {
    const { svc } = taoMock(null);
    const guard = new QuyenSkuGuard(reflector, svc);
    await expect(guard.canActivate(ctx({ id: HS, vai: ["SALE"] }, { dong: [{ mau_id: MAU }] }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("ADMIN / THIEN_KHUE bo qua", async () => {
    const { svc } = taoMock(null);
    const guard = new QuyenSkuGuard(reflector, svc);
    await expect(guard.canActivate(ctx({ id: HS, vai: ["THIEN_KHUE"] }, { dong: [{ mau_id: MAU }] }))).resolves.toBe(true);
  });
});
