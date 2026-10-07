import { ForbiddenException } from "@nestjs/common";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import { DuLieuHocRepository, ThucHanhRepository, XetDatRepository } from "../../src/repositories/dao-tao.repository";
import { ThucHanhService, XetDatService } from "../../src/services/dao-tao.service";

const HOC_VIEN = "33333333-3333-4333-8333-333333333333";
const MENTOR = "66666666-6666-4666-8666-666666666666";
const BAI = "77777777-7777-4777-8777-777777777777";

const nhatKy = () => ({ ghi: jest.fn(async () => undefined) }) as unknown as NhatKyService;
const thongBao = () => ({ gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 0) }) as unknown as ThongBaoService;
/** XetDatService voi repository that; moi truy van chay tren tx truyen vao xetSauThayDoi / xetKichHoatVai nen prisma goc khong dung */
const taoXetDat = () => new XetDatService(new XetDatRepository({} as PrismaService), new DuLieuHocRepository({} as PrismaService), nhatKy(), thongBao());

describe("ThucHanhService.cham — khong tu cham", () => {
  function taoMock() {
    const tx = { bai_thuc_hanh: { updateMany: jest.fn(async () => ({ count: 1 })) } };
    const prisma = {
      bai_thuc_hanh: {
        findUnique: jest.fn(async () => ({ id: BAI, ho_so_id: HOC_VIEN, khoa_hoc_id: "k1", trang_thai: "CHO_CHAM", khoa_hoc: { ten: "Sale" } })),
        findUniqueOrThrow: jest.fn(async () => ({
          id: BAI,
          khoa_hoc_id: "k1",
          ho_so_id: HOC_VIEN,
          vai: "SALE",
          tieu_de: null,
          mo_ta: null,
          link: "https://x.vn",
          tep_url: null,
          trang_thai: "DAT",
          diem: 95,
          nguoi_cham_id: MENTOR,
          nhan_xet: null,
          cham_luc: new Date(),
          nop_luc: new Date()
        }))
      },
      ho_so: { findMany: jest.fn(async () => [{ id: MENTOR, ho_ten: "Mentor A" }]) },
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
    } as unknown as PrismaService;
    const xetDat = { xetSauThayDoi: jest.fn(async () => ({ chung_chi_moi: null, quyen_sku_moi: null, vai_kich_hoat: ["SALE"] })) } as unknown as XetDatService;
    return { svc: new ThucHanhService(new ThucHanhRepository(prisma), new DuLieuHocRepository(prisma), xetDat, nhatKy(), thongBao()), tx, xetDat };
  }

  it("nguoi nop tu cham bai minh -> 403, khong ghi gi", async () => {
    const { svc, tx } = taoMock();
    await expect(svc.cham(HOC_VIEN, BAI, { ket_qua: "DAT" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.bai_thuc_hanh.updateMany).not.toHaveBeenCalled();
  });

  it("mentor cham DAT -> ghi nguoi cham + xet kich hoat vai cua hoc vien", async () => {
    const { svc, tx, xetDat } = taoMock();
    const kq = await svc.cham(MENTOR, BAI, { ket_qua: "DAT", diem: 95 });
    expect(tx.bai_thuc_hanh.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: BAI, trang_thai: "CHO_CHAM", ho_so_id: { not: MENTOR } }, data: expect.objectContaining({ nguoi_cham_id: MENTOR }) })
    );
    expect(xetDat.xetSauThayDoi).toHaveBeenCalledWith(tx, HOC_VIEN, "k1");
    expect(kq.thay_doi.vai_kich_hoat).toEqual(["SALE"]);
    expect(kq.bai_thuc_hanh.nguoi_cham_ten).toBe("Mentor A");
  });
});

describe("XetDatService — tu cap quyen SKU + kich hoat vai", () => {
  const khoaSp = {
    id: "ksp",
    ma: "sp-al01",
    ten: "AL01 · Áo",
    mo_ta: null,
    loai: "SAN_PHAM",
    vai_ap_dung: ["SALE"],
    mau_id: "mau-1",
    ma_mau: "AL01",
    phien_ban_tai_lieu: 2,
    bat_buoc: false,
    can_thuc_hanh: false,
    yeu_cau_thuc_hanh: null,
    mau_sac: null,
    thu_tu: 10,
    bat: true,
    bai_hoc: [{ id: "b1", thoi_luong_phut: 5 }],
    bai_kiem_tra: [{ id: "d1", bat_buoc: true }]
  };

  function taoTx(opts: { phienBanLuot: number; quyenCu?: { id: string; trang_thai: string; phien_ban_tai_lieu: number } | null; vaiDangHoc?: { id: string; vai: string }[]; khoaVai?: unknown[] }) {
    return {
      khoa_hoc: {
        findUnique: jest.fn(async () => khoaSp),
        findMany: jest.fn(async () => opts.khoaVai ?? [])
      },
      tien_do_bai_hoc: { findMany: jest.fn(async () => [{ bai_hoc_id: "b1" }]) },
      luot_lam: {
        findMany: jest.fn(async () => [{ id: "l1", bai_kiem_tra_id: "d1", diem: 100, dat: true, phien_ban_tai_lieu: opts.phienBanLuot, nop_luc: new Date() }])
      },
      bai_thuc_hanh: { findMany: jest.fn(async () => []) },
      quyen_sku: {
        findMany: jest.fn(async () => (opts.quyenCu ? [{ mau_id: "mau-1", trang_thai: opts.quyenCu.trang_thai, phien_ban_tai_lieu: opts.quyenCu.phien_ban_tai_lieu }] : [])),
        findUnique: jest.fn(async () => opts.quyenCu ?? null),
        upsert: jest.fn(async () => ({ id: "q-moi" }))
      },
      chung_chi: {
        findUnique: jest.fn(async () => null),
        upsert: jest.fn(async (a: { create: { ma_chung_chi: string } }) => ({
          id: "cc1",
          khoa_hoc_id: "ksp",
          ma_chung_chi: a.create.ma_chung_chi,
          phien_ban_tai_lieu: 2,
          diem: 100,
          cap_luc: new Date(),
          het_han_luc: null,
          thu_hoi_luc: null,
          khoa_hoc: { ten: khoaSp.ten, loai: "SAN_PHAM" }
        }))
      },
      vai_tro_ho_so: {
        findMany: jest.fn(async () => opts.vaiDangHoc ?? []),
        updateMany: jest.fn(async () => ({ count: 1 }))
      },
      lich_su_vai_tro: { create: jest.fn(async () => ({})) },
      ho_so: { updateMany: jest.fn(async () => ({ count: 1 })) }
    };
  }

  it("thi dat o phien ban hien hanh -> cap quyen SKU kem bang chung + chung chi", async () => {
    const tx = taoTx({ phienBanLuot: 2 });
    const kq = await taoXetDat().xetSauThayDoi(tx as never, HOC_VIEN, "ksp");
    expect(kq.quyen_sku_moi).toEqual({ mau_id: "mau-1", ma_mau: "AL01" });
    expect(kq.chung_chi_moi?.ma_chung_chi).toMatch(/^TK-SPAL01-\d{8}-[A-Z0-9]{6}$/);
    const goi = (tx.quyen_sku.upsert as jest.Mock).mock.calls[0][0];
    expect(goi.create).toMatchObject({ ho_so_id: HOC_VIEN, mau_id: "mau-1", trang_thai: "HOAT_DONG", phien_ban_tai_lieu: 2 });
    expect(goi.create.bang_chung).toMatchObject({ diem: 100, luot_lam_id: "l1", phien_ban_tai_lieu: 2, khoa_hoc_ma: "sp-al01" });
    expect(goi.create.bang_chung.cap_luc).toBeTruthy();
  });

  it("dang CAN_HOC_LAI, thi lai o phien ban cu -> KHONG mo lai quyen", async () => {
    const tx = taoTx({ phienBanLuot: 1, quyenCu: { id: "q", trang_thai: "CAN_HOC_LAI", phien_ban_tai_lieu: 1 } });
    const kq = await taoXetDat().xetSauThayDoi(tx as never, HOC_VIEN, "ksp");
    expect(kq.quyen_sku_moi).toBeNull();
    expect(tx.quyen_sku.upsert).not.toHaveBeenCalled();
  });

  it("CAN_HOC_LAI, thi dat o phien ban moi -> HOAT_DONG lai", async () => {
    const tx = taoTx({ phienBanLuot: 2, quyenCu: { id: "q", trang_thai: "CAN_HOC_LAI", phien_ban_tai_lieu: 1 } });
    const kq = await taoXetDat().xetSauThayDoi(tx as never, HOC_VIEN, "ksp");
    expect(kq.quyen_sku_moi).not.toBeNull();
    expect((tx.quyen_sku.upsert as jest.Mock).mock.calls[0][0].update.trang_thai).toBe("HOAT_DONG");
  });

  it("THU_HOI khong tu mo lai", async () => {
    const tx = taoTx({ phienBanLuot: 2, quyenCu: { id: "q", trang_thai: "THU_HOI", phien_ban_tai_lieu: 2 } });
    const kq = await taoXetDat().xetSauThayDoi(tx as never, HOC_VIEN, "ksp");
    expect(kq.quyen_sku_moi).toBeNull();
  });

  it("vai SALE DANG_HOC -> HOAT_DONG khi moi khoa bat buoc cua vai hoan thanh", async () => {
    const khoaNen = { ...khoaSp, id: "knen", loai: "NEN_TANG", bat_buoc: true, mau_id: null, ma_mau: null, bai_kiem_tra: [{ id: "d1", bat_buoc: true }] };
    const tx = taoTx({ phienBanLuot: 2, vaiDangHoc: [{ id: "v1", vai: "SALE" }], khoaVai: [khoaNen] });
    const kq = await taoXetDat().xetKichHoatVai(tx as never, HOC_VIEN);
    expect(kq).toEqual(["SALE"]);
    expect(tx.vai_tro_ho_so.updateMany).toHaveBeenCalledWith({ where: { id: "v1", trang_thai: "DANG_HOC" }, data: { trang_thai: "HOAT_DONG" } });
    expect(tx.lich_su_vai_tro.create).toHaveBeenCalled();
    expect(tx.ho_so.updateMany).toHaveBeenCalled();
  });

  it("vai chua du (khoa can thuc hanh chua duyet) -> giu DANG_HOC", async () => {
    const khoaNv = { ...khoaSp, id: "knv", loai: "NGHIEP_VU", bat_buoc: true, can_thuc_hanh: true, mau_id: null, ma_mau: null };
    const tx = taoTx({ phienBanLuot: 2, vaiDangHoc: [{ id: "v1", vai: "SALE" }], khoaVai: [khoaNv] });
    const kq = await taoXetDat().xetKichHoatVai(tx as never, HOC_VIEN);
    expect(kq).toEqual([]);
    expect(tx.vai_tro_ho_so.updateMany).not.toHaveBeenCalled();
  });
});
