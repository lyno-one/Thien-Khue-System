import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import { canXetTtsLenCtv, type DieuKienHocService, VaiService } from "../../src/services/ho-so-vai.service";
import { VaiRepository } from "../../src/repositories/ho-so.repository";

const QL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const nd = (id: string, vai: ThongTinNguoiDung["vai"]) => ({ id, vai, vaiChiTiet: [], email: null, hoSo: {} }) as unknown as ThongTinNguoiDung;

type DongVai = { vai: string; trang_thai: string };
type GoiData = [{ data: Record<string, unknown> }];
const duLieuGoi = (m: jest.Mock, i = 0) => (m.mock.calls[i] as unknown as GoiData)[0].data;

function taoMock(vaiHienCo: DongVai[] = [], dat = true, coKhoaCtv = true) {
  const tx = {
    ho_so: { findUnique: jest.fn(async () => ({ kich_hoat_lam_viec: false })), update: jest.fn() },
    vai_tro_ho_so: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(async (): Promise<unknown[]> => [{ ho_so_id: QL }]) },
    lich_su_vai_tro: { create: jest.fn(), findFirst: jest.fn(async () => null) },
    de_xuat_duyet: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "dx1", trang_thai: "CHO_KIEM", created_at: new Date(), ly_do: null, ...data })),
      findUnique: jest.fn()
    }
  };
  const prisma = {
    ho_so: {
      findUnique: jest.fn(async ({ select }: { select: { vai_tro?: { where?: { vai: string } } } }) => ({
        id: HS,
        ho_ten: "Thực Tập A",
        vai_tro: (select.vai_tro?.where ? vaiHienCo.filter(v => v.vai === select.vai_tro?.where?.vai) : vaiHienCo).map(v => ({ ...v, tu_luc: new Date(), den_luc: null, nguon: null })),
        email: null,
        sdt: null,
        crm_user_id: null,
        kich_hoat_lam_viec: false,
        created_at: new Date(),
        anh_dai_dien: null,
        kich_hoat_luc: null,
        ghi_chu: null
      })),
      findMany: jest.fn(async () => [])
    },
    lich_su_vai_tro: { findMany: jest.fn(async () => []) },
    de_xuat_duyet: { findFirst: jest.fn(async () => null) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;
  const dieuKien = {
    kiem: jest.fn(async () => ({ dat, dieu_kien: [], con_thieu: dat ? [] : ["KT nhập môn: cần đạt ≥ 90%"] })),
    coKhoaNghiepVu: jest.fn(async () => coKhoaCtv)
  } as unknown as DieuKienHocService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 1) } as unknown as ThongBaoService;
  return { sv: new VaiService(new VaiRepository(prisma), dieuKien, nhatKy, thongBao), prisma, tx, dieuKien, nhatKy, thongBao };
}

describe("VaiService.themVai", () => {
  it("khong tu cap vai cho minh (ke ca ADMIN) — 403, khong ghi gi", async () => {
    const { sv, prisma } = taoMock();
    await expect(sv.themVai(nd(QL, ["ADMIN"]), QL, { vai: "SALE", ly_do: "tự cấp" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("QUAN_LY them CTV cho nguoi khac -> DANG_HOC + lich su ghi nguoi doi", async () => {
    const { sv, tx } = taoMock([{ vai: "KHACH", trang_thai: "HOAT_DONG" }]);
    await sv.themVai(nd(QL, ["QUAN_LY"]), HS, { vai: "CTV", ly_do: "Tuyển CTV" });
    expect(duLieuGoi(tx.vai_tro_ho_so.create)).toMatchObject({ ho_so_id: HS, vai: "CTV", trang_thai: "DANG_HOC", nguon: "QUAN_TRI" });
    expect(duLieuGoi(tx.lich_su_vai_tro.create)).toMatchObject({ nguoi_doi_id: QL, trang_thai_moi: "DANG_HOC" });
  });

  it.each(["SALE", "CSKH", "QUAN_LY", "ADMIN"] as const)("vai %s lay tu CRM -> 400, khong ghi gi", async vai => {
    const { sv, prisma } = taoMock([{ vai: "KHACH", trang_thai: "HOAT_DONG" }]);
    await expect(sv.themVai(nd(QL, ["ADMIN"]), HS, { vai, ly_do: "cấp tay" })).rejects.toThrow("Vai này lấy từ CRM");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("da co vai (chua ket thuc) -> 409", async () => {
    const { sv } = taoMock([{ vai: "CTV", trang_thai: "DANG_HOC" }]);
    await expect(sv.themVai(nd(QL, ["QUAN_LY"]), HS, { vai: "CTV", ly_do: "lặp" })).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("VaiService.kichHoat — chi khi hoc dat", () => {
  it("chua dat -> 400, khong doi vai", async () => {
    const { sv, prisma } = taoMock([{ vai: "CTV", trang_thai: "DANG_HOC" }], false);
    await expect(sv.kichHoat(HS, "CTV", null)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("dat -> HOAT_DONG + bat kich_hoat_lam_viec + lich su", async () => {
    const { sv, tx } = taoMock([{ vai: "CTV", trang_thai: "DANG_HOC" }], true);
    const kq = await sv.kichHoat(HS, "CTV", null);
    expect(kq.trang_thai).toBe("HOAT_DONG");
    expect(duLieuGoi(tx.vai_tro_ho_so.update)).toMatchObject({ trang_thai: "HOAT_DONG" });
    expect(duLieuGoi(tx.ho_so.update)).toMatchObject({ kich_hoat_lam_viec: true });
    expect(duLieuGoi(tx.lich_su_vai_tro.create)).toMatchObject({ trang_thai_cu: "DANG_HOC", trang_thai_moi: "HOAT_DONG", nguoi_doi_id: null });
  });

  it("vai TAM_DUNG khong tu kich hoat", async () => {
    const { sv } = taoMock([{ vai: "CTV", trang_thai: "TAM_DUNG" }], true);
    await expect(sv.kichHoat(HS, "CTV", null)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("vai khong phai hoc (MENTOR) -> 400", async () => {
    const { sv } = taoMock([{ vai: "MENTOR", trang_thai: "HOAT_DONG" }], true);
    await expect(sv.kichHoat(HS, "MENTOR", null)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("VaiService.doiTrangThai", () => {
  it("khong bat HOAT_DONG bang tay cho vai DANG_HOC", async () => {
    const { sv } = taoMock([{ vai: "SALE", trang_thai: "DANG_HOC" }]);
    await expect(sv.doiTrangThai(nd(QL, ["QUAN_LY"]), HS, "SALE", { trang_thai: "HOAT_DONG", ly_do: "bỏ qua học" })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("khoi phuc vai phai hoc tu TAM_DUNG ma khong con dat -> 400", async () => {
    const { sv } = taoMock([{ vai: "SALE", trang_thai: "TAM_DUNG" }], false);
    await expect(sv.doiTrangThai(nd(QL, ["QUAN_LY"]), HS, "SALE", { trang_thai: "HOAT_DONG", ly_do: "mở lại" })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});

describe("VaiService.deXuatChuyenVai — thuc tap sinh", () => {
  it("tao de_xuat_duyet CHUYEN_VAI 2 buoc (CHO_DUYET ngay), khong doi vai ngay", async () => {
    const { sv, tx } = taoMock([{ vai: "THUC_TAP", trang_thai: "HOAT_DONG" }]);
    const dx = await sv.deXuatChuyenVai(nd(QL, ["QUAN_LY"]), HS, { vai_moi: "KOC", ly_do: "Hoàn thành thực tập tốt" });
    expect(dx.trang_thai).toBe("CHO_DUYET");
    expect(duLieuGoi(tx.de_xuat_duyet.create)).toMatchObject({
      loai: "CHUYEN_VAI",
      doi_tuong: "ho_so",
      doi_tuong_id: HS,
      nguoi_de_xuat_id: QL,
      trang_thai: "CHO_DUYET",
      du_lieu: { tu_vai: "THUC_TAP", vai_moi: "KOC", trang_thai_vai_moi: "DANG_HOC" }
    });
    expect(tx.vai_tro_ho_so.update).not.toHaveBeenCalled();
    expect(tx.vai_tro_ho_so.create).not.toHaveBeenCalled();
  });

  it("TTS sang Sale / CSKH (vai lay tu CRM) -> 400 doi o CRM, khong tao de xuat", async () => {
    const { sv, tx } = taoMock([{ vai: "THUC_TAP", trang_thai: "HOAT_DONG" }]);
    await expect(sv.deXuatChuyenVai(nd(QL, ["QUAN_LY"]), HS, { vai_moi: "SALE", ly_do: "Tuyển Sale" })).rejects.toThrow("Vai này lấy từ CRM");
    await expect(sv.deXuatChuyenVai(nd(QL, ["QUAN_LY"]), HS, { vai_moi: "CSKH", ly_do: "Tuyển CSKH" })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.de_xuat_duyet.create).not.toHaveBeenCalled();
  });

  it("khong phai thuc tap sinh -> 400", async () => {
    const { sv } = taoMock([{ vai: "CTV", trang_thai: "HOAT_DONG" }]);
    await expect(sv.deXuatChuyenVai(nd(QL, ["QUAN_LY"]), HS, { vai_moi: "KOC", ly_do: "x x x" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("ap dung de xuat chua duyet -> 403", async () => {
    const { sv, tx } = taoMock();
    tx.de_xuat_duyet.findUnique.mockResolvedValue({ id: "dx1", loai: "CHUYEN_VAI", trang_thai: "CHO_DUYET", du_lieu: {} });
    await expect(sv.apDungDeXuatChuyenVai("dx1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("ap dung de xuat da duyet -> ket thuc THUC_TAP, cap vai moi DANG_HOC, gan de_xuat_duyet_id", async () => {
    const { sv, tx } = taoMock();
    tx.de_xuat_duyet.findUnique.mockResolvedValue({
      id: "dx1",
      loai: "CHUYEN_VAI",
      trang_thai: "DA_DUYET",
      nguoi_duyet_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      ly_do: "tốt",
      du_lieu: { ho_so_id: HS, tu_vai: "THUC_TAP", vai_moi: "SALE", trang_thai_vai_moi: "DANG_HOC" }
    });
    tx.vai_tro_ho_so.findMany.mockResolvedValue([{ vai: "THUC_TAP", trang_thai: "HOAT_DONG" }]);
    await sv.apDungDeXuatChuyenVai("dx1");
    const ls = tx.lich_su_vai_tro.create.mock.calls.map(c => (c as unknown as GoiData)[0].data);
    expect(ls).toEqual([
      expect.objectContaining({ vai: "THUC_TAP", trang_thai_moi: "KET_THUC", de_xuat_duyet_id: "dx1" }),
      expect.objectContaining({ vai: "SALE", trang_thai_moi: "DANG_HOC", de_xuat_duyet_id: "dx1" })
    ]);
  });
});

describe("Thuc tap sinh hoc dat khoa CTV -> tu them vai CTV (khong qua de xuat)", () => {
  it("dieu kien xet: TTS con hieu luc, chua tung co CTV", () => {
    expect(canXetTtsLenCtv([{ vai: "THUC_TAP", trang_thai: "HOAT_DONG" }])).toBe(true);
    expect(canXetTtsLenCtv([{ vai: "THUC_TAP", trang_thai: "DANG_HOC" }])).toBe(true);
    expect(canXetTtsLenCtv([{ vai: "THUC_TAP", trang_thai: "TAM_DUNG" }])).toBe(false);
    expect(canXetTtsLenCtv([{ vai: "THUC_TAP", trang_thai: "HOAT_DONG" }, { vai: "CTV", trang_thai: "KET_THUC" }])).toBe(false);
    expect(canXetTtsLenCtv([{ vai: "CTV", trang_thai: "DANG_HOC" }])).toBe(false);
  });

  it("dat khoa CTV -> them CTV HOAT_DONG (he thong), giu THUC_TAP, bat kich hoat, ghi lich su + nhat ky + thong bao", async () => {
    const { sv, tx, dieuKien, nhatKy, thongBao } = taoMock([{ vai: "THUC_TAP", trang_thai: "HOAT_DONG" }], true);
    tx.vai_tro_ho_so.findMany.mockResolvedValueOnce([]); // chua co CTV trong transaction
    expect(await sv.xetTtsLenCtv(HS)).toBe(true);
    expect(dieuKien.kiem).toHaveBeenCalledWith(HS, "CTV");
    expect(duLieuGoi(tx.vai_tro_ho_so.create)).toMatchObject({ ho_so_id: HS, vai: "CTV", trang_thai: "HOAT_DONG", nguon: "HE_THONG" });
    expect(duLieuGoi(tx.lich_su_vai_tro.create)).toMatchObject({ vai: "CTV", trang_thai_cu: null, trang_thai_moi: "HOAT_DONG", nguoi_doi_id: null });
    expect(tx.vai_tro_ho_so.update).not.toHaveBeenCalled(); // THUC_TAP giu nguyen
    expect(duLieuGoi(tx.ho_so.update)).toMatchObject({ kich_hoat_lam_viec: true });
    expect(nhatKy.ghi).toHaveBeenCalledWith(expect.objectContaining({ hoSoId: null, hanhDong: "TU_DONG_THEM_VAI_CTV", doiTuongId: HS }), tx);
    expect(thongBao.gui).toHaveBeenCalledWith(expect.objectContaining({ hoSoId: HS }), tx);
  });

  it("chua dat -> khong them, khong mo transaction", async () => {
    const { sv, prisma } = taoMock([{ vai: "THUC_TAP", trang_thai: "HOAT_DONG" }], false);
    expect(await sv.xetTtsLenCtv(HS)).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("chua co khoa NGHIEP_VU cho CTV -> khong tu nang (chi hoc nen tang khong du)", async () => {
    const { sv, prisma, dieuKien } = taoMock([{ vai: "THUC_TAP", trang_thai: "HOAT_DONG" }], true, false);
    expect(await sv.xetTtsLenCtv(HS)).toBe(false);
    expect(dieuKien.kiem).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("CTV da bi ket thuc (quyet dinh cua nguoi) -> khong tu mo lai", async () => {
    const { sv, prisma } = taoMock([{ vai: "THUC_TAP", trang_thai: "HOAT_DONG" }, { vai: "CTV", trang_thai: "KET_THUC" }], true);
    expect(await sv.xetTtsLenCtv(HS)).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("request song song da them CTV (trong transaction thay da co) -> khong them lan hai", async () => {
    const { sv, tx } = taoMock([{ vai: "THUC_TAP", trang_thai: "HOAT_DONG" }], true);
    tx.vai_tro_ho_so.findMany.mockResolvedValueOnce([{ vai: "CTV", trang_thai: "HOAT_DONG" }]);
    expect(await sv.xetTtsLenCtv(HS)).toBe(false);
    expect(tx.vai_tro_ho_so.create).not.toHaveBeenCalled();
  });
});
