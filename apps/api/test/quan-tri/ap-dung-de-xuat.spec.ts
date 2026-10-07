import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma, type de_xuat_duyet } from "@prisma/client";
import type { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import { ApDungDeXuatService } from "../../src/services/quan-tri-ap-dung.service";
import { ApDungDeXuatRepository } from "../../src/repositories/quan-tri.repository";

// Handler ap dung quyet dinh — repository that boc tx mock, khong can DB

const GN_ID = "bbbbbbbb-0000-4000-8000-000000000001";
const SALE_CHOT = "44444444-4444-4444-8444-444444444444";
const KOC_GIOI_THIEU = "66666666-6666-4666-8666-666666666666";
const CEO = "33333333-3333-4333-8333-333333333333";
const MAU = "cccccccc-0000-4000-8000-000000000001";
const HO_SO = "77777777-7777-4777-8777-777777777777";

function dx(x: Partial<de_xuat_duyet>): de_xuat_duyet {
  return {
    id: "aaaaaaaa-0000-4000-8000-000000000009",
    loai: "KHAC",
    doi_tuong: "khac",
    doi_tuong_id: null,
    du_lieu: {},
    ly_do: null,
    nguoi_de_xuat_id: "11111111-1111-4111-8111-111111111111",
    nguoi_kiem_id: "22222222-2222-4222-8222-222222222222",
    kiem_luc: new Date(),
    y_kien_kiem: null,
    nguoi_duyet_id: CEO,
    duyet_luc: new Date(),
    y_kien_duyet: null,
    trang_thai: "DA_DUYET",
    created_at: new Date(),
    updated_at: new Date(),
    ...x
  };
}

function taoSv(tx: Record<string, unknown>, crm: Partial<CrmDocService> = {}) {
  const nhatKy = { ghi: jest.fn(async () => undefined) };
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 0) };
  const sv = new ApDungDeXuatService(new ApDungDeXuatRepository(tx as unknown as PrismaService), crm as CrmDocService, nhatKy as unknown as NhatKyService, thongBao as unknown as ThongBaoService);
  return { sv, nhatKy, thongBao, tx: tx as unknown as Prisma.TransactionClient };
}

describe("XAC_MINH_DON — giai quyet trung nguon", () => {
  const gn = {
    id: GN_ID,
    ma_don: "DH001",
    trang_thai: "CHO_XAC_MINH",
    tong_tien: new Prisma.Decimal(500000),
    nguoi_chot_ho_so_id: SALE_CHOT,
    nguoi_ban_ho_so_id: KOC_GIOI_THIEU,
    ma_gioi_thieu_id: "dddddddd-0000-4000-8000-000000000001",
    ma_gioi_thieu: "KOC01",
    hoa_hong: null as null | { id: string; trang_thai: string }
  };

  function txMock(hoaHong: null | { id: string; trang_thai: string } = null) {
    return {
      ghi_nhan_don: { findUnique: jest.fn(async () => ({ ...gn, hoa_hong: hoaHong })), updateMany: jest.fn(async () => ({ count: 1 })) },
      ma_gioi_thieu: { findFirst: jest.fn(async () => ({ ho_so_id: KOC_GIOI_THIEU })) },
      vai_tro_ho_so: { findMany: jest.fn(async () => [{ vai: "KOC" }]) },
      ty_le_hoa_hong: { findFirst: jest.fn(async () => ({ ty_le: new Prisma.Decimal(8) })) },
      hoa_hong: { create: jest.fn(async () => ({})), update: jest.fn(async () => ({})) },
      nhat_ky: { findMany: jest.fn(async () => [] as { du_lieu: unknown }[]) }
    };
  }

  it("ghi nhan cho KOC: don HOP_LE, tao MOT dong hoa hong theo ty le hien hanh", async () => {
    const t = txMock();
    const { sv, nhatKy } = taoSv(t);
    const kq = await sv.apDung({ tx: t as never, dx: dx({ loai: "XAC_MINH_DON", doi_tuong: "ghi_nhan_don", doi_tuong_id: GN_ID, du_lieu: { ket_qua: "GHI_NHAN", nguoi_ban_ho_so_id: KOC_GIOI_THIEU } }), nguoiDuyetId: CEO, yKien: null });
    expect(t.ghi_nhan_don.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: GN_ID, trang_thai: "CHO_XAC_MINH" }, data: expect.objectContaining({ trang_thai: "HOP_LE", nguoi_ban_ho_so_id: KOC_GIOI_THIEU, nguon: "KOC", nguoi_xac_minh_id: CEO }) }));
    // Hoa hong do mang-luoi tinh sau khi commit (theo SKU duoc quyen) — khong tao trong transaction duyet
    expect(t.hoa_hong.create).not.toHaveBeenCalled();
    expect(kq).toMatchObject({ trang_thai: "HOP_LE", nguoi_ban_ho_so_id: KOC_GIOI_THIEU, hoa_hong: "TINH_SAU_KHI_DUYET" });
    expect(nhatKy.ghi).toHaveBeenCalledWith(expect.objectContaining({ hanhDong: "AP_DUNG_XAC_MINH_DON" }), t);
  });

  it("da co hoa hong da tra -> khong tu sua tien (khong chi tra hai lan)", async () => {
    const t = txMock({ id: "hh1", trang_thai: "DA_TRA" });
    const { sv } = taoSv(t);
    const kq = await sv.apDung({ tx: t as never, dx: dx({ loai: "XAC_MINH_DON", doi_tuong: "ghi_nhan_don", doi_tuong_id: GN_ID, du_lieu: { ket_qua: "GHI_NHAN", nguoi_ban_ho_so_id: SALE_CHOT, nguon: "SALE" } }), nguoiDuyetId: CEO, yKien: null });
    expect(t.hoa_hong.create).not.toHaveBeenCalled();
    expect(t.hoa_hong.update).not.toHaveBeenCalled();
    expect(kq).toMatchObject({ hoa_hong: "GIU_NGUYEN_DA_TRA" });
  });

  it("nguoi ban phai la nguoi chot hoac chu ma gioi thieu", async () => {
    const t = txMock();
    const { sv } = taoSv(t);
    await expect(
      sv.apDung({ tx: t as never, dx: dx({ loai: "XAC_MINH_DON", doi_tuong: "ghi_nhan_don", doi_tuong_id: GN_ID, du_lieu: { ket_qua: "GHI_NHAN", nguoi_ban_ho_so_id: HO_SO } }), nguoiDuyetId: CEO, yKien: null })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("nguoi chot + chu ma gioi thieu la nguoi lien quan (khong duoc kiem / duyet)", async () => {
    const t = txMock();
    const { sv } = taoSv(t);
    const lq = await sv.nguoiLienQuan({ loai: "XAC_MINH_DON", doi_tuong: "ghi_nhan_don", doi_tuong_id: GN_ID, du_lieu: {} }, t as never);
    expect(lq.sort()).toEqual([SALE_CHOT, KOC_GIOI_THIEU].sort());
  });

  it("nguoi nhap tay ma gioi thieu (nhat_ky GHI_NHAN_DON.nguoi_nhap_ma) cung la nguoi lien quan", async () => {
    const t = txMock();
    const NGUOI_NHAP = "88888888-8888-4888-8888-888888888888";
    t.nhat_ky.findMany.mockResolvedValueOnce([{ du_lieu: { nguoi_nhap_ma: NGUOI_NHAP } }]);
    const { sv } = taoSv(t);
    const lq = await sv.nguoiLienQuan({ loai: "XAC_MINH_DON", doi_tuong: "ghi_nhan_don", doi_tuong_id: GN_ID, du_lieu: {} }, t as never);
    expect(lq).toContain(NGUOI_NHAP);
  });
});

describe("DOI_CHINH_SACH — ty le hoa hong", () => {
  it("dong ty le cu (giu lich su) roi mo dong moi, ghi nhat ky", async () => {
    const t = {
      ty_le_hoa_hong: { updateMany: jest.fn(async () => ({ count: 1 })), create: jest.fn(async () => ({ id: "tl-moi" })) }
    };
    const { sv, nhatKy } = taoSv(t);
    await sv.apDung({ tx: t as never, dx: dx({ loai: "DOI_CHINH_SACH", doi_tuong: "ty_le_hoa_hong", doi_tuong_id: "SALE:*", du_lieu: { chinh_sach: "TY_LE_HOA_HONG", vai: "SALE", mau_id: null, ty_le: 3, ty_le_truoc: 2 } }), nguoiDuyetId: CEO, yKien: null });
    expect(t.ty_le_hoa_hong.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ vai: "SALE", mau_id: null, bat: true }), data: expect.objectContaining({ bat: false }) }));
    expect(t.ty_le_hoa_hong.create).toHaveBeenCalledWith({ data: expect.objectContaining({ vai: "SALE", ty_le: 3, bat: true }) });
    expect(nhatKy.ghi).toHaveBeenCalledWith(expect.objectContaining({ hanhDong: "AP_DUNG_DOI_TY_LE_HOA_HONG" }), t);
  });
});

describe("CAP_QUYEN_SKU — hoc truoc khi ban", () => {
  const khoa = { id: "khoa1", ten: "SP AL01", phien_ban_tai_lieu: 2, can_thuc_hanh: false, bai_kiem_tra: [{ id: "bkt1", nguong_dat: 90 }] };

  it("chua thi dat dung phien ban tai lieu -> 400, khong cap", async () => {
    const t = {
      khoa_hoc: { findFirst: jest.fn(async () => khoa) },
      luot_lam: { findFirst: jest.fn(async () => null) },
      quyen_sku: { upsert: jest.fn() }
    };
    const { sv } = taoSv(t);
    await expect(
      sv.apDung({ tx: t as never, dx: dx({ loai: "CAP_QUYEN_SKU", doi_tuong: "ho_so", doi_tuong_id: HO_SO, du_lieu: { mau_id: MAU, ma_mau: "AL01", trang_thai_moi: "HOAT_DONG" } }), nguoiDuyetId: CEO, yKien: null })
    ).rejects.toThrow("chưa thi đạt");
    expect(t.luot_lam.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ dat: true, phien_ban_tai_lieu: 2 }) }));
    expect(t.quyen_sku.upsert).not.toHaveBeenCalled();
  });

  it("thi dat -> cap quyen kem bang chung + nguoi de xuat / kiem / duyet", async () => {
    const t = {
      khoa_hoc: { findFirst: jest.fn(async () => khoa) },
      luot_lam: { findFirst: jest.fn(async () => ({ id: "luot1", diem: 95, nop_luc: new Date(), bai_kiem_tra_id: "bkt1" })) },
      quyen_sku: { upsert: jest.fn(async () => ({})) }
    };
    const { sv, thongBao } = taoSv(t);
    await sv.apDung({ tx: t as never, dx: dx({ loai: "CAP_QUYEN_SKU", doi_tuong: "ho_so", doi_tuong_id: HO_SO, du_lieu: { mau_id: MAU, ma_mau: "AL01", trang_thai_moi: "HOAT_DONG" } }), nguoiDuyetId: CEO, yKien: null });
    const arg = (t.quyen_sku.upsert.mock.calls[0] as unknown[])[0] as { create: { bang_chung: Record<string, unknown>; nguoi_cap_id: string; phien_ban_tai_lieu: number } };
    expect(arg.create.nguoi_cap_id).toBe(CEO);
    expect(arg.create.phien_ban_tai_lieu).toBe(2);
    expect(arg.create.bang_chung).toMatchObject({ diem: 95, luot_lam_id: "luot1", nguoi_duyet_id: CEO });
    expect(thongBao.gui).toHaveBeenCalledWith(expect.objectContaining({ hoSoId: HO_SO, loai: "QUYEN_SKU" }), t);
  });
});

describe("DUYET_QUA_TANG", () => {
  it("qua da duoc xu ly noi khac -> 409 khi duyet", async () => {
    const t = { qua_tang: { updateMany: jest.fn(async () => ({ count: 0 })) } };
    const { sv } = taoSv(t);
    await expect(
      sv.apDung({ tx: t as never, dx: dx({ loai: "DUYET_QUA_TANG", doi_tuong: "qua_tang", doi_tuong_id: "eeeeeeee-0000-4000-8000-000000000001" }), nguoiDuyetId: CEO, yKien: null })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("duyet: nguoi tham dinh = nguoi kiem, nguoi duyet = CEO", async () => {
    const t = { qua_tang: { updateMany: jest.fn(async () => ({ count: 1 })) } };
    const { sv } = taoSv(t);
    const d = dx({ loai: "DUYET_QUA_TANG", doi_tuong: "qua_tang", doi_tuong_id: "eeeeeeee-0000-4000-8000-000000000001", y_kien_kiem: "Chất lượng tốt" });
    await sv.apDung({ tx: t as never, dx: d, nguoiDuyetId: CEO, yKien: null });
    expect(t.qua_tang.updateMany).toHaveBeenCalledWith({
      where: { id: d.doi_tuong_id, trang_thai: "CHO_THAM_DINH" },
      data: expect.objectContaining({ trang_thai: "DA_DUYET", nguoi_duyet_id: CEO, nguoi_tham_dinh_id: d.nguoi_kiem_id, ket_qua_tham_dinh: "Chất lượng tốt" })
    });
  });

  it("2 buoc (khong co nguoi kiem): nguoi tham dinh de trong, y kien CEO lam ket qua tham dinh", async () => {
    const t = { qua_tang: { updateMany: jest.fn(async () => ({ count: 1 })) } };
    const { sv } = taoSv(t);
    const d = dx({ loai: "DUYET_QUA_TANG", doi_tuong: "qua_tang", doi_tuong_id: "eeeeeeee-0000-4000-8000-000000000001", nguoi_kiem_id: null, kiem_luc: null, y_kien_kiem: null });
    await sv.apDung({ tx: t as never, dx: d, nguoiDuyetId: CEO, yKien: "Quà đạt chuẩn" });
    expect(t.qua_tang.updateMany).toHaveBeenCalledWith({
      where: { id: d.doi_tuong_id, trang_thai: "CHO_THAM_DINH" },
      data: expect.objectContaining({ trang_thai: "DA_DUYET", nguoi_duyet_id: CEO, nguoi_tham_dinh_id: null, ket_qua_tham_dinh: "Quà đạt chuẩn" })
    });
  });
});
