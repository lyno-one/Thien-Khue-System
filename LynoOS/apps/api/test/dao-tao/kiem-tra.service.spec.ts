import { BadRequestException } from "@nestjs/common";
import type { NhatKyService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import { KiemTraRepository } from "../../src/repositories/dao-tao.repository";
import { KiemTraService, type XetDatService } from "../../src/services/dao-tao.service";

const DE_ID = "11111111-1111-4111-8111-111111111111";
const LUOT_ID = "22222222-2222-4222-8222-222222222222";
const HS = "33333333-3333-4333-8333-333333333333";

// 10 cau, dap an cau i = i % 4
const CAU_HOI = Array.from({ length: 10 }, (_, i) => ({
  id: `c${i}`,
  ma: `q${i}`,
  noi_dung: `Câu ${i}`,
  lua_chon: ["A", "B", "C", "D"],
  dap_an: [i % 4],
  giai_thich: `Giải thích ${i}`,
  diem: 1,
  thu_tu: i
}));

function taoMock() {
  const de = {
    id: DE_ID,
    khoa_hoc_id: "khoa-1",
    ma: "kt",
    tieu_de: "Kiểm tra",
    nguong_dat: 90,
    so_cau_hien: null,
    thoi_gian_phut: null,
    so_lan_toi_da: null,
    bat: true,
    khoa_hoc: { bat: true, loai: "NEN_TANG", phien_ban_tai_lieu: 1 },
    cau_hoi: CAU_HOI
  };
  const tx = { luot_lam: { updateMany: jest.fn(async () => ({ count: 1 })) } };
  const prisma = {
    bai_kiem_tra: { findUnique: jest.fn(async () => de) },
    luot_lam: {
      count: jest.fn(async () => 0),
      findFirst: jest.fn(async () => ({ id: LUOT_ID, bat_dau_luc: new Date(), nop_luc: null, phien_ban_tai_lieu: 1 })),
      create: jest.fn(async () => ({ id: LUOT_ID, bat_dau_luc: new Date() }))
    },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;
  const xetDat = { xetSauThayDoi: jest.fn(async () => ({ chung_chi_moi: null, quyen_sku_moi: null, vai_kich_hoat: [] })) } as unknown as XetDatService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  return { svc: new KiemTraService(new KiemTraRepository(prisma), xetDat, nhatKy), prisma, tx, xetDat };
}

const traLoiDung = (soSai: number) => Object.fromEntries(CAU_HOI.map((c, i) => [c.id, [i < soSai ? (c.dap_an[0] + 1) % 4 : c.dap_an[0]]]));

describe("KiemTraService", () => {
  it("de thi tra cho client KHONG co dap an / giai thich", async () => {
    const { svc } = taoMock();
    const de = await svc.batDau(HS, DE_ID);
    const json = JSON.stringify(de);
    expect(de.cau_hoi).toHaveLength(10);
    expect(json).not.toContain('"dap_an"');
    expect(json).not.toContain('"giai_thich"');
    expect(json).not.toContain("Giải thích");
    for (const c of de.cau_hoi) expect(Object.keys(c).sort()).toEqual(["id", "lua_chon", "ma", "nhieu_dap_an", "noi_dung", "thu_tu"]);
  });

  it("sai 1/10 = 90% -> dat, tra giai thich, xet cap quyen", async () => {
    const { svc, xetDat } = taoMock();
    const kq = await svc.nop(HS, DE_ID, LUOT_ID, traLoiDung(1));
    expect(kq.diem).toBe(90);
    expect(kq.dat).toBe(true);
    expect(kq.giai_thich).toHaveLength(10);
    expect(xetDat.xetSauThayDoi).toHaveBeenCalledWith(expect.anything(), HS, "khoa-1");
  });

  it("sai 2/10 = 80% -> truot, KHONG lo cau dung / sai, khong xet cap quyen", async () => {
    const { svc, xetDat } = taoMock();
    const kq = await svc.nop(HS, DE_ID, LUOT_ID, traLoiDung(2));
    expect(kq.dat).toBe(false);
    expect(kq.giai_thich).toBeNull();
    const json = JSON.stringify(kq);
    expect(json).not.toContain('"dap_an"');
    expect(json).not.toContain('"dung":');
    expect(json).not.toContain("Giải thích");
    expect(xetDat.xetSauThayDoi).not.toHaveBeenCalled();
  });

  it("nguong 90 voi de trong so: 89% van truot", async () => {
    const { svc, prisma } = taoMock();
    const cauNang = { ...CAU_HOI[0], id: "nang", diem: 11 };
    const cauNhe = Array.from({ length: 89 }, (_, i) => ({ ...CAU_HOI[1], id: `n${i}`, dap_an: [1] }));
    (prisma.bai_kiem_tra.findUnique as jest.Mock).mockResolvedValueOnce({
      id: DE_ID,
      khoa_hoc_id: "khoa-1",
      ma: "kt",
      tieu_de: "KT",
      nguong_dat: 90,
      so_cau_hien: null,
      thoi_gian_phut: null,
      so_lan_toi_da: null,
      bat: true,
      khoa_hoc: { bat: true, loai: "NEN_TANG", phien_ban_tai_lieu: 1 },
      cau_hoi: [cauNang, ...cauNhe]
    });
    const traLoi = { nang: [3], ...Object.fromEntries(cauNhe.map(c => [c.id, [1]])) };
    const kq = await svc.nop(HS, DE_ID, LUOT_ID, traLoi);
    expect(kq.diem).toBe(89);
    expect(kq.dat).toBe(false);
  });

  it("bat buoc tra loi het cau", async () => {
    const { svc, tx } = taoMock();
    const thieu = traLoiDung(0);
    delete thieu.c3;
    await expect(svc.nop(HS, DE_ID, LUOT_ID, thieu)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.luot_lam.updateMany).not.toHaveBeenCalled();
  });
});
