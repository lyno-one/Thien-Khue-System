import type { NhatKyService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import { KiemTraRepository } from "../../src/repositories/dao-tao.repository";
import { KiemTraService, type XetDatService } from "../../src/services/dao-tao.service";

/* Chot de theo luot (luot_lam.cau_hoi_ids): quan tri them / doi cau hoi giua luc bat dau va luc nop khong lam lech de */

const DE_ID = "11111111-1111-4111-8111-111111111111";
const LUOT_ID = "22222222-2222-4222-8222-222222222222";
const HS = "33333333-3333-4333-8333-333333333333";

const cau = (i: number) => ({ id: `c${i}`, ma: `q${i}`, noi_dung: `Câu ${i}`, lua_chon: ["A", "B", "C", "D"], dap_an: [i % 4], giai_thich: null, diem: 1, thu_tu: i });

function taoMock(cauHoi: ReturnType<typeof cau>[], cauHoiIds: string[]) {
  const de = {
    id: DE_ID,
    khoa_hoc_id: "khoa-1",
    ma: "kt",
    tieu_de: "Kiểm tra",
    nguong_dat: 90,
    so_cau_hien: 3,
    thoi_gian_phut: null,
    so_lan_toi_da: null,
    bat: true,
    khoa_hoc: { bat: true, loai: "NEN_TANG", phien_ban_tai_lieu: 1 },
    cau_hoi: cauHoi
  };
  const tx = { luot_lam: { updateMany: jest.fn(async () => ({ count: 1 })) } };
  const prisma = {
    bai_kiem_tra: { findUnique: jest.fn(async () => de) },
    luot_lam: {
      count: jest.fn(async () => 0),
      findFirst: jest.fn(async (q: { where: { nop_luc?: null } }) =>
        "nop_luc" in q.where ? null : { id: LUOT_ID, bat_dau_luc: new Date(), nop_luc: null, phien_ban_tai_lieu: 1, cau_hoi_ids: cauHoiIds }
      ),
      create: jest.fn(async (q: { data: { id: string; cau_hoi_ids: string[] } }) => ({ id: q.data.id, bat_dau_luc: new Date(), cau_hoi_ids: q.data.cau_hoi_ids }))
    },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;
  const xetDat = { xetSauThayDoi: jest.fn(async () => ({ chung_chi_moi: null, quyen_sku_moi: null, vai_kich_hoat: [] })) } as unknown as XetDatService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  return { svc: new KiemTraService(new KiemTraRepository(prisma), xetDat, nhatKy), prisma };
}

describe("KiemTraService — chot de theo luot", () => {
  it("bat dau luot moi luu dung cac cau da phat vao cau_hoi_ids", async () => {
    const { svc, prisma } = taoMock([0, 1, 2, 3, 4, 5].map(cau), []);
    const de = await svc.batDau(HS, DE_ID);
    const tao = (prisma.luot_lam.create as jest.Mock).mock.calls[0][0];
    expect(de.cau_hoi).toHaveLength(3);
    expect(tao.data.cau_hoi_ids).toEqual(de.cau_hoi.map(c => c.id));
    expect(tao.data.id).toBe(de.luot_lam_id);
  });

  it("nop: cham theo de da chot du ngan hang cau hoi da them cau moi", async () => {
    // Luot da chot c0, c1, c2; quan tri vua them c6..c9 — chi can tra loi 3 cau da phat
    const { svc } = taoMock([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(cau), ["c0", "c1", "c2"]);
    const kq = await svc.nop(HS, DE_ID, LUOT_ID, { c0: [0], c1: [1], c2: [2] });
    expect(kq.tong_cau).toBe(3);
    expect(kq.diem).toBe(100);
    expect(kq.dat).toBe(true);
  });
});
