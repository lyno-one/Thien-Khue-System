import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import { type DieuKienHocService, VaiService } from "../../src/services/ho-so-vai.service";
import { VaiRepository } from "../../src/repositories/ho-so.repository";
import type { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";

const QL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const nd = (id: string, vai: ThongTinNguoiDung["vai"]) => ({ id, vai, vaiChiTiet: [], email: null, hoSo: {} }) as unknown as ThongTinNguoiDung;

type DongVai = { vai: string; trang_thai: string };
type GoiData = [{ data: Record<string, unknown> }];
const duLieuGoi = (m: jest.Mock, i = 0) => (m.mock.calls[i] as unknown as GoiData)[0].data;

type NhanSuMock = { active: boolean; role: string; nhom_quyen: string } | null;
const NS_SALE: NhanSuMock = { active: true, role: "user", nhom_quyen: "SALE" };

function taoMock(vaiHienCo: DongVai[] = [], dat = true, nhanSu: NhanSuMock = NS_SALE) {
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
    kiem: jest.fn(async () => ({ dat, dieu_kien: [], con_thieu: dat ? [] : ["KT nhập môn: cần đạt ≥ 90%"] }))
  } as unknown as DieuKienHocService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 1) } as unknown as ThongBaoService;
  const crmDoc = { layNhanSuCrm: jest.fn(async () => nhanSu) } as unknown as CrmDocService;
  return { sv: new VaiService(new VaiRepository(prisma), dieuKien, nhatKy, thongBao, crmDoc), prisma, tx, dieuKien, nhatKy, thongBao, crmDoc };
}

describe("VaiService.themVai", () => {
  it("khong tu cap vai cho minh (ke ca ADMIN) — 403, khong ghi gi", async () => {
    const { sv, prisma } = taoMock();
    await expect(sv.themVai(nd(QL, ["ADMIN"]), QL, { vai: "SALE", ly_do: "tự cấp" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("QUAN_LY them KHACH (vai duy nhat khong lay tu CRM) cho nguoi khac -> HOAT_DONG + lich su ghi nguoi doi", async () => {
    const { sv, tx } = taoMock([]);
    await sv.themVai(nd(QL, ["QUAN_LY"]), HS, { vai: "KHACH", ly_do: "Khách cũ" });
    expect(duLieuGoi(tx.vai_tro_ho_so.create)).toMatchObject({ ho_so_id: HS, vai: "KHACH", trang_thai: "HOAT_DONG", nguon: "QUAN_TRI" });
    expect(duLieuGoi(tx.lich_su_vai_tro.create)).toMatchObject({ nguoi_doi_id: QL, trang_thai_moi: "HOAT_DONG" });
  });

  it.each(["SALE", "CSKH", "THUC_TAP", "CTV", "KOL", "KOC", "DOI_TAC", "MENTOR", "QUAN_LY", "ADMIN", "THIEN_KHUE"] as const)(
    "vai %s lay tu CRM -> 400, khong ghi gi",
    async vai => {
      const { sv, prisma } = taoMock([{ vai: "KHACH", trang_thai: "HOAT_DONG" }]);
      await expect(sv.themVai(nd(QL, ["THIEN_KHUE"]), HS, { vai, ly_do: "cấp tay" })).rejects.toThrow("Vai lấy từ CRM");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    }
  );

  it("da co vai (chua ket thuc) -> 409", async () => {
    const { sv } = taoMock([{ vai: "KHACH", trang_thai: "HOAT_DONG" }]);
    await expect(sv.themVai(nd(QL, ["QUAN_LY"]), HS, { vai: "KHACH", ly_do: "lặp" })).rejects.toBeInstanceOf(ConflictException);
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

  it("vai tu CRM: CRM khong con cap (nghi viec / doi phong) -> khong HOAT_DONG lai duoc, khong ghi gi", async () => {
    const { sv, prisma, dieuKien } = taoMock([{ vai: "SALE", trang_thai: "TAM_DUNG" }], true, { active: true, role: "user", nhom_quyen: "KHO" });
    await expect(sv.doiTrangThai(nd(QL, ["QUAN_LY"]), HS, "SALE", { trang_thai: "HOAT_DONG", ly_do: "mở lại" })).rejects.toThrow("Vai lấy từ CRM");
    expect(dieuKien.kiem).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("vai tu CRM: nhan su CRM khong ton tai -> chan HOAT_DONG (vd MENTOR cap tay cu)", async () => {
    const { sv, prisma } = taoMock([{ vai: "MENTOR", trang_thai: "TAM_DUNG" }], true, null);
    await expect(sv.doiTrangThai(nd(QL, ["THIEN_KHUE"]), HS, "MENTOR", { trang_thai: "HOAT_DONG", ly_do: "mở lại" })).rejects.toThrow("Vai lấy từ CRM");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("vai tu CRM: CRM con cap + hoc dat -> TAM_DUNG -> HOAT_DONG binh thuong", async () => {
    const { sv, tx, crmDoc } = taoMock([{ vai: "SALE", trang_thai: "TAM_DUNG" }], true, NS_SALE);
    await sv.doiTrangThai(nd(QL, ["QUAN_LY"]), HS, "SALE", { trang_thai: "HOAT_DONG", ly_do: "mở lại" });
    expect(crmDoc.layNhanSuCrm).toHaveBeenCalledWith(HS);
    expect(duLieuGoi(tx.lich_su_vai_tro.create)).toMatchObject({ trang_thai_cu: "TAM_DUNG", trang_thai_moi: "HOAT_DONG" });
  });

  it("vai tu CRM: TAM_DUNG / KET_THUC khong can CRM (khong goi CRM)", async () => {
    const { sv, tx, crmDoc } = taoMock([{ vai: "SALE", trang_thai: "HOAT_DONG" }], true, null);
    await sv.doiTrangThai(nd(QL, ["QUAN_LY"]), HS, "SALE", { trang_thai: "TAM_DUNG", ly_do: "nghỉ phép" });
    expect(crmDoc.layNhanSuCrm).not.toHaveBeenCalled();
    expect(duLieuGoi(tx.lich_su_vai_tro.create)).toMatchObject({ trang_thai_moi: "TAM_DUNG" });
  });

  it("vai KHACH (khong tu CRM) khoi phuc HOAT_DONG khong hoi CRM", async () => {
    const { sv, tx, crmDoc } = taoMock([{ vai: "KHACH", trang_thai: "TAM_DUNG" }], true, null);
    await sv.doiTrangThai(nd(QL, ["QUAN_LY"]), HS, "KHACH", { trang_thai: "HOAT_DONG", ly_do: "mở lại" });
    expect(crmDoc.layNhanSuCrm).not.toHaveBeenCalled();
    expect(duLieuGoi(tx.lich_su_vai_tro.create)).toMatchObject({ trang_thai_moi: "HOAT_DONG" });
  });
});
