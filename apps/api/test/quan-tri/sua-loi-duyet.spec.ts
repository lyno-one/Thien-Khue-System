import { BadRequestException, ConflictException } from "@nestjs/common";
import type { de_xuat_duyet } from "@prisma/client";
import type { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import type { DieuKienHocService } from "../../src/services/ho-so-vai.service";
import { ApDungDeXuatService, nguoiLienQuanNhanh } from "../../src/services/quan-tri-ap-dung.service";
import { ApDungDeXuatRepository } from "../../src/repositories/quan-tri.repository";

/*
 * Sua loi ra soat 07/10 (docs/LOI-CAN-SUA.md):
 *  - muc 2: CHUYEN_VAI sang HOAT_DONG cho vai phai hoc LUON kiem dieu kien hoc (ke ca tu TAM_DUNG)
 *  - muc 13: CHI_TRA_HOA_HONG — lap (chot danh sach) -> duyet -> ap dung DU_DIEU_KIEN -> DA_TRA, khong tra hai lan
 */

const HO_SO = "77777777-7777-4777-8777-777777777777";
const CEO = "33333333-3333-4333-8333-333333333333";
const A = "aaaaaaaa-1111-4111-8111-111111111111";
const B = "bbbbbbbb-1111-4111-8111-111111111111";

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

function taoSv(db: Record<string, unknown>, dieuKien?: Partial<DieuKienHocService>) {
  const nhatKy = { ghi: jest.fn(async () => undefined) };
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 0) };
  const sv = new ApDungDeXuatService(
    new ApDungDeXuatRepository(db as unknown as PrismaService),
    {} as CrmDocService,
    nhatKy as unknown as NhatKyService,
    thongBao as unknown as ThongBaoService,
    dieuKien as DieuKienHocService | undefined
  );
  return { sv, nhatKy, thongBao };
}

describe("Muc 2 — CHUYEN_VAI khong lach viec hoc", () => {
  function dbVai(trangThai: string, vai = "CTV") {
    return {
      ho_so: { findUnique: jest.fn(async () => ({ id: HO_SO, ho_ten: "CTV A", vai_tro: [{ vai, trang_thai: trangThai }] })) },
      vai_tro_ho_so: { findUnique: jest.fn(async () => ({ id: "v1", trang_thai: trangThai })), upsert: jest.fn(async () => ({})), update: jest.fn() },
      lich_su_vai_tro: { create: jest.fn(async () => ({})) }
    };
  }
  const chuaDat = { kiem: jest.fn(async () => ({ dat: false, dieu_kien: [], con_thieu: ["Nhập môn — Bài kiểm tra: cần đạt ≥ 90%"] })) };
  const daDat = { kiem: jest.fn(async () => ({ dat: true, dieu_kien: [], con_thieu: [] })) };

  it("lap de xuat TAM_DUNG -> HOAT_DONG cho CTV chua hoc dat -> 400 (loi tat DANG_HOC -> TAM_DUNG -> HOAT_DONG)", async () => {
    const db = dbVai("TAM_DUNG");
    const { sv } = taoSv(db, chuaDat);
    await expect(sv.chuanBi("CHUYEN_VAI", HO_SO, { vai: "CTV", trang_thai_moi: "HOAT_DONG" })).rejects.toBeInstanceOf(BadRequestException);
    expect(chuaDat.kiem).toHaveBeenCalledWith(HO_SO, "CTV");
  });

  it("de xuat da lap truoc do van bi chan LUC DUYET neu chua dat (khong upsert vai)", async () => {
    const db = dbVai("TAM_DUNG", "CTV");
    const { sv } = taoSv(db, chuaDat);
    await expect(
      sv.apDung({ tx: db as never, dx: dx({ loai: "CHUYEN_VAI", doi_tuong: "ho_so", doi_tuong_id: HO_SO, du_lieu: { vai: "CTV", trang_thai_moi: "HOAT_DONG" } }), nguoiDuyetId: CEO, yKien: null })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.vai_tro_ho_so.upsert).not.toHaveBeenCalled();
    expect(db.lich_su_vai_tro.create).not.toHaveBeenCalled();
  });

  it("khong co DieuKienHocService -> fail-closed (khong kich hoat)", async () => {
    const db = dbVai("TAM_DUNG", "KOC");
    const { sv } = taoSv(db);
    await expect(
      sv.apDung({ tx: db as never, dx: dx({ loai: "CHUYEN_VAI", doi_tuong: "ho_so", doi_tuong_id: HO_SO, du_lieu: { vai: "KOC", trang_thai_moi: "HOAT_DONG" } }), nguoiDuyetId: CEO, yKien: null })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.vai_tro_ho_so.upsert).not.toHaveBeenCalled();
  });

  it("da hoc dat -> khoi phuc TAM_DUNG -> HOAT_DONG duoc", async () => {
    const db = dbVai("TAM_DUNG");
    const { sv } = taoSv(db, daDat);
    await sv.apDung({ tx: db as never, dx: dx({ loai: "CHUYEN_VAI", doi_tuong: "ho_so", doi_tuong_id: HO_SO, du_lieu: { vai: "CTV", trang_thai_moi: "HOAT_DONG" } }), nguoiDuyetId: CEO, yKien: null });
    expect(db.vai_tro_ho_so.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ trang_thai: "HOAT_DONG" }) }));
  });

  it("vai khong phai hoc (MENTOR) khong goi kiem dieu kien hoc", async () => {
    const db = dbVai("TAM_DUNG", "MENTOR");
    const kiem = { kiem: jest.fn() };
    const { sv } = taoSv(db, kiem);
    await sv.chuanBi("CHUYEN_VAI", HO_SO, { vai: "MENTOR", trang_thai_moi: "HOAT_DONG" });
    expect(kiem.kiem).not.toHaveBeenCalled();
  });
});

describe("Vai lay tu CRM — khong chuyen bang de xuat (lap va duyet)", () => {
  function dbVai(vai: string) {
    return {
      ho_so: { findUnique: jest.fn(async () => ({ id: HO_SO, ho_ten: "A", vai_tro: [{ vai, trang_thai: "TAM_DUNG" }] })) },
      vai_tro_ho_so: { findUnique: jest.fn(async () => ({ id: "v1", trang_thai: "TAM_DUNG" })), upsert: jest.fn(async () => ({})), update: jest.fn() },
      lich_su_vai_tro: { create: jest.fn(async () => ({})) }
    };
  }
  const daDat = { kiem: jest.fn(async () => ({ dat: true, dieu_kien: [], con_thieu: [] })) };

  it.each(["SALE", "CSKH", "QUAN_LY", "ADMIN", "THIEN_KHUE"])("lap CHUYEN_VAI %s -> 400 doi o CRM", async vai => {
    const db = dbVai(vai);
    const { sv } = taoSv(db, daDat);
    await expect(sv.chuanBi("CHUYEN_VAI", HO_SO, { vai, trang_thai_moi: "HOAT_DONG" })).rejects.toThrow("Vai này lấy từ CRM");
  });

  it("ket thuc vai CRM kem theo (tu_vai SALE) cung bi chan", async () => {
    const db = dbVai("KOC");
    const { sv } = taoSv(db, daDat);
    await expect(sv.chuanBi("CHUYEN_VAI", HO_SO, { vai: "KOC", trang_thai_moi: "DANG_HOC", tu_vai: "SALE" })).rejects.toThrow("Vai này lấy từ CRM");
  });

  it("de xuat cu (lap truoc khi chuyen ve CRM) bi chan LUC DUYET, khong ghi vai", async () => {
    const db = dbVai("SALE");
    const { sv } = taoSv(db, daDat);
    await expect(
      sv.apDung({ tx: db as never, dx: dx({ loai: "CHUYEN_VAI", doi_tuong: "ho_so", doi_tuong_id: HO_SO, du_lieu: { vai: "SALE", trang_thai_moi: "HOAT_DONG" } }), nguoiDuyetId: CEO, yKien: null })
    ).rejects.toThrow("Vai này lấy từ CRM");
    expect(db.vai_tro_ho_so.upsert).not.toHaveBeenCalled();
    expect(db.lich_su_vai_tro.create).not.toHaveBeenCalled();
  });
});

describe("Muc 13 — CHI_TRA_HOA_HONG", () => {
  it("lap: lay khoan DU_DIEU_KIEN chua nam trong de xuat chi tra khac; nguoi co tong am de lai ky sau", async () => {
    const db = {
      de_xuat_duyet: { findMany: jest.fn(async () => [{ du_lieu: { hoa_hong_ids: ["hh-cu"], dieu_chinh_ids: ["dc-cu"] } }]) },
      hoa_hong: {
        findMany: jest.fn(async () => [
          { id: "hh-1", ho_so_id: A, so_tien: 100_000 },
          { id: "hh-cu", ho_so_id: A, so_tien: 999_000 },
          { id: "hh-2", ho_so_id: B, so_tien: 50_000 }
        ])
      },
      dieu_chinh_hoa_hong: {
        findMany: jest.fn(async () => [
          { id: "dc-cu", ho_so_id: A, so_tien: 7_000 },
          { id: "dc-1", ho_so_id: A, so_tien: -10_000 },
          { id: "dc-2", ho_so_id: B, so_tien: -80_000 }
        ])
      },
      ho_so: { findMany: jest.fn(async () => [{ id: A, ho_ten: "CTV A" }]) }
    };
    const { sv } = taoSv(db);
    const cb = await sv.chuanBi("CHI_TRA_HOA_HONG", null, { ky: "2026-10" });
    expect(db.hoa_hong.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ trang_thai: "DU_DIEU_KIEN", ky: { lte: "2026-10" } }) }));
    expect(cb.doi_tuong_id).toBe("2026-10:*");
    expect(cb.du_lieu).toMatchObject({ ky: "2026-10", hoa_hong_ids: ["hh-1"], dieu_chinh_ids: ["dc-1"], nguoi_nhan_ids: [A], tong_tien: 90_000 });
    // Nguoi nhan la nguoi lien quan -> khong duoc lap / kiem / duyet
    expect(nguoiLienQuanNhanh({ loai: "CHI_TRA_HOA_HONG", doi_tuong: cb.doi_tuong, doi_tuong_id: cb.doi_tuong_id, du_lieu: cb.du_lieu as never })).toContain(A);
  });

  it("lap voi danh sach id co khoan khong du dieu kien -> 400; co khoan da trong de xuat khac -> 409", async () => {
    const db = {
      de_xuat_duyet: { findMany: jest.fn(async () => [] as unknown[]) },
      hoa_hong: { findMany: jest.fn(async () => [{ id: "11111111-aaaa-4aaa-8aaa-000000000001", ho_so_id: A, so_tien: 1 }]) },
      dieu_chinh_hoa_hong: { findMany: jest.fn(async () => []) },
      ho_so: { findMany: jest.fn(async () => []) }
    };
    const { sv } = taoSv(db);
    const ids = ["11111111-aaaa-4aaa-8aaa-000000000001", "11111111-aaaa-4aaa-8aaa-000000000002"];
    await expect(sv.chuanBi("CHI_TRA_HOA_HONG", null, { ky: "2026-10", hoa_hong_ids: ids })).rejects.toBeInstanceOf(BadRequestException);
    db.de_xuat_duyet.findMany.mockResolvedValueOnce([{ du_lieu: { hoa_hong_ids: [ids[0]] } }]);
    await expect(sv.chuanBi("CHI_TRA_HOA_HONG", null, { ky: "2026-10", hoa_hong_ids: [ids[0]] })).rejects.toBeInstanceOf(ConflictException);
    await expect(sv.chuanBi("CHI_TRA_HOA_HONG", null, { ky: "10/2026" })).rejects.toBeInstanceOf(BadRequestException);
  });

  function txChiTra(soDongCapNhat: number, deXuatKhac: unknown[] = [], soDieuChinhCapNhat = 1) {
    return {
      de_xuat_duyet: { findMany: jest.fn(async () => deXuatKhac) },
      dieu_chinh_hoa_hong: { updateMany: jest.fn(async () => ({ count: soDieuChinhCapNhat })) },
      hoa_hong: { updateMany: jest.fn(async () => ({ count: soDongCapNhat })) }
    };
  }
  const dxChiTra = () =>
    dx({ loai: "CHI_TRA_HOA_HONG", doi_tuong: "hoa_hong", doi_tuong_id: "2026-10:*", du_lieu: { ky: "2026-10", hoa_hong_ids: ["hh-1", "hh-2"], dieu_chinh_ids: ["dc-1"], nguoi_nhan_ids: [A, B], tong_tien: 140_000 } });

  it("duyet: chuyen DUNG cac khoan DU_DIEU_KIEN -> DA_TRA (tra_luc, de_xuat_duyet_id), ghi nhat ky, bao nguoi nhan", async () => {
    const t = txChiTra(2);
    const { sv, nhatKy, thongBao } = taoSv(t);
    const d = dxChiTra();
    const kq = await sv.apDung({ tx: t as never, dx: d, nguoiDuyetId: CEO, yKien: null });
    expect(t.hoa_hong.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["hh-1", "hh-2"] }, trang_thai: "DU_DIEU_KIEN" },
      data: expect.objectContaining({ trang_thai: "DA_TRA", tra_luc: expect.any(Date), de_xuat_duyet_id: d.id })
    });
    expect(t.dieu_chinh_hoa_hong.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["dc-1"] }, de_xuat_chi_tra_id: null }, data: { de_xuat_chi_tra_id: d.id } });
    expect(kq).toMatchObject({ so_khoan: 2, so_dieu_chinh: 1 });
    expect(nhatKy.ghi).toHaveBeenCalledWith(expect.objectContaining({ hanhDong: "AP_DUNG_CHI_TRA_HOA_HONG" }), t);
    expect(thongBao.guiNhieu).toHaveBeenCalledWith([A, B], expect.objectContaining({ loai: "HOA_HONG" }), t);
  });

  it("co khoan da tra / bi tru tu luc lap (cap nhat thieu dong) -> 409 de rollback ca quyet dinh", async () => {
    const t = txChiTra(1);
    const { sv, nhatKy } = taoSv(t);
    await expect(sv.apDung({ tx: t as never, dx: dxChiTra(), nguoiDuyetId: CEO, yKien: null })).rejects.toBeInstanceOf(ConflictException);
    expect(nhatKy.ghi).not.toHaveBeenCalled();
  });

  it("dieu chinh da duoc chi tra (de_xuat_chi_tra_id da co) -> 409 de rollback", async () => {
    const t = txChiTra(2, [], 0);
    const { sv, nhatKy } = taoSv(t);
    await expect(sv.apDung({ tx: t as never, dx: dxChiTra(), nguoiDuyetId: CEO, yKien: null })).rejects.toBeInstanceOf(ConflictException);
    expect(nhatKy.ghi).not.toHaveBeenCalled();
  });

  it("khoan da nam trong de xuat chi tra khac da duyet -> 409, khong cap nhat", async () => {
    const t = txChiTra(2, [{ du_lieu: { hoa_hong_ids: ["hh-2"] } }]);
    const { sv } = taoSv(t);
    await expect(sv.apDung({ tx: t as never, dx: dxChiTra(), nguoiDuyetId: CEO, yKien: null })).rejects.toBeInstanceOf(ConflictException);
    expect(t.hoa_hong.updateMany).not.toHaveBeenCalled();
  });
});
