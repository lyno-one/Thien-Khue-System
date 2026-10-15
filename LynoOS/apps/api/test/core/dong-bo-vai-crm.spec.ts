import { NguoiDungService, type NhatKyService } from "../../src/services/core.service";
import { keHoachDongBoVaiCrm, type NhanSuDeMap, type VaiHienTai } from "../../src/common/utils/core";
import type { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";
import { CoreRepository } from "../../src/repositories/core.repository";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";

// LOI-CAN-SUA muc 4 / 28: vai lay tu CRM phai duoc dong bo lai (khoa / doi phong / doi role)

const ns = (p: Partial<NhanSuDeMap>): NhanSuDeMap => ({ role: "employee", active: true, nhom_quyen: null, ...p });
const tom = (ds: ReturnType<typeof keHoachDongBoVaiCrm>) => ds.map(d => `${d.vai}:${d.cu ?? "-"}->${d.moi}`);

describe("keHoachDongBoVaiCrm", () => {
  it("nhan su bi khoa (active=false) -> vai CRM dang hieu luc chuyen TAM_DUNG, vai Thien Khue cap giu nguyen", () => {
    const hienTai: VaiHienTai[] = [
      { vai: "QUAN_LY", trang_thai: "HOAT_DONG", nguon: "CRM" },
      { vai: "SALE", trang_thai: "HOAT_DONG", nguon: "CRM" },
      { vai: "CTV", trang_thai: "HOAT_DONG", nguon: "DANG_KY" },
      { vai: "KOC", trang_thai: "HOAT_DONG", nguon: "QUAN_TRI" }
    ];
    const kq = keHoachDongBoVaiCrm(hienTai, ns({ role: "manager", nhom_quyen: "SALE", active: false }), true);
    expect(tom(kq)).toEqual(["QUAN_LY:HOAT_DONG->TAM_DUNG", "SALE:HOAT_DONG->TAM_DUNG"]);
    expect(kq.every(d => d.nguon === "CRM_DONG_BO")).toBe(true);
  });

  it("nhan su bi xoa khoi CRM -> ADMIN tam dung", () => {
    const kq = keHoachDongBoVaiCrm([{ vai: "ADMIN", trang_thai: "HOAT_DONG", nguon: "CRM" }], null, true);
    expect(tom(kq)).toEqual(["ADMIN:HOAT_DONG->TAM_DUNG"]);
  });

  it("bi ha quyen manager -> employee: QUAN_LY KET_THUC; doi phong SALE -> CSKH: SALE KET_THUC + CSKH DANG_HOC", () => {
    const kq = keHoachDongBoVaiCrm(
      [
        { vai: "QUAN_LY", trang_thai: "HOAT_DONG", nguon: "CRM" },
        { vai: "SALE", trang_thai: "HOAT_DONG", nguon: "CRM" }
      ],
      ns({ role: "employee", nhom_quyen: "CSKH" }),
      true
    );
    expect(tom(kq)).toEqual(["QUAN_LY:HOAT_DONG->KET_THUC", "SALE:HOAT_DONG->KET_THUC", "CSKH:-->DANG_HOC"]);
  });

  it("duoc nang manager -> them QUAN_LY + MENTOR HOAT_DONG", () => {
    const kq = keHoachDongBoVaiCrm([{ vai: "SALE", trang_thai: "DANG_HOC", nguon: "CRM" }], ns({ role: "manager", nhom_quyen: "SALE" }), true);
    expect(tom(kq)).toEqual(["QUAN_LY:-->HOAT_DONG", "MENTOR:-->HOAT_DONG"]);
  });

  it("mo khoa CRM: vai do dong bo tam dung duoc khoi phuc (SALE ve DANG_HOC, phai xet lai hoc)", () => {
    const kq = keHoachDongBoVaiCrm(
      [
        { vai: "QUAN_LY", trang_thai: "TAM_DUNG", nguon: "CRM_DONG_BO" },
        { vai: "MENTOR", trang_thai: "TAM_DUNG", nguon: "CRM_DONG_BO" },
        { vai: "SALE", trang_thai: "TAM_DUNG", nguon: "CRM_DONG_BO" }
      ],
      ns({ role: "manager", nhom_quyen: "SALE" }),
      true
    );
    expect(tom(kq)).toEqual(["QUAN_LY:TAM_DUNG->HOAT_DONG", "MENTOR:TAM_DUNG->HOAT_DONG", "SALE:TAM_DUNG->DANG_HOC"]);
  });

  it("vai do con nguoi tam dung / ket thuc (nguon CRM / QUAN_TRI) khong bi dong bo mo lai", () => {
    const kq = keHoachDongBoVaiCrm(
      [
        { vai: "SALE", trang_thai: "TAM_DUNG", nguon: "CRM" },
        { vai: "CSKH", trang_thai: "KET_THUC", nguon: "QUAN_TRI" }
      ],
      ns({ nhom_quyen: "SALE" }),
      true
    );
    expect(kq).toEqual([]);
  });

  it("vai SALE do Thien Khue cap (QUAN_TRI) cho nguoi khong o phong Sale: khong ket thuc khi CRM khong map", () => {
    const kq = keHoachDongBoVaiCrm([{ vai: "SALE", trang_thai: "HOAT_DONG", nguon: "QUAN_TRI" }], ns({ nhom_quyen: "KHONG" }), true);
    expect(kq).toEqual([]);
  });

  it("nguoi dang ky qua Thien Khue (public.users active=false, chua lien ket) -> khong dong toi vai", () => {
    const kq = keHoachDongBoVaiCrm([{ vai: "CTV", trang_thai: "HOAT_DONG", nguon: "DANG_KY" }], ns({ active: false }), false);
    expect(kq).toEqual([]);
  });

  it("khong doi gi khi khop CRM", () => {
    const kq = keHoachDongBoVaiCrm(
      [
        { vai: "QUAN_LY", trang_thai: "HOAT_DONG", nguon: "CRM" },
        { vai: "MENTOR", trang_thai: "HOAT_DONG", nguon: "CRM" },
        { vai: "SALE", trang_thai: "HOAT_DONG", nguon: "CRM" }
      ],
      ns({ role: "manager", nhom_quyen: "SALE" }),
      true
    );
    expect(kq).toEqual([]);
  });
});

describe("keHoachDongBoVaiCrm — vai CRM mo rong (THIEN_KHUE, MENTOR, CTV, KOC)", () => {
  it("ho so admin cu (chi co ADMIN) -> bo sung THIEN_KHUE HOAT_DONG nguon CRM", () => {
    const kq = keHoachDongBoVaiCrm([{ vai: "ADMIN", trang_thai: "HOAT_DONG", nguon: "CRM" }], ns({ role: "admin", nhom_quyen: "KHONG" }), true);
    expect(tom(kq)).toEqual(["THIEN_KHUE:-->HOAT_DONG"]);
    expect(kq[0].nguon).toBe("CRM");
  });

  it("ho so nhom quyen KOC cu (KHACH, chua co vai CRM) -> them KOC DANG_HOC, KHACH giu nguyen", () => {
    const kq = keHoachDongBoVaiCrm([{ vai: "KHACH", trang_thai: "HOAT_DONG", nguon: "HE_THONG" }], ns({ nhom_quyen: "KOC" }), true);
    expect(tom(kq)).toEqual(["KOC:-->DANG_HOC"]);
  });

  it("doi nhom quyen CTV -> KOC: CTV do CRM cap KET_THUC, them KOC DANG_HOC", () => {
    const kq = keHoachDongBoVaiCrm([{ vai: "CTV", trang_thai: "HOAT_DONG", nguon: "CRM" }], ns({ nhom_quyen: "KOC" }), true);
    expect(tom(kq)).toEqual(["CTV:HOAT_DONG->KET_THUC", "KOC:-->DANG_HOC"]);
  });

  it("chuyen tu nhom CTV vao phong SALE: SALE DANG_HOC, CTV KET_THUC", () => {
    const kq = keHoachDongBoVaiCrm([{ vai: "CTV", trang_thai: "DANG_HOC", nguon: "CRM" }], ns({ nhom_quyen: "SALE" }), true);
    expect(tom(kq)).toEqual(["SALE:-->DANG_HOC", "CTV:DANG_HOC->KET_THUC"]);
  });

  it("KOC do CRM cap da HOAT_DONG (hoc dat), CRM van map KOC -> khong ha ve DANG_HOC", () => {
    const kq = keHoachDongBoVaiCrm([{ vai: "KOC", trang_thai: "HOAT_DONG", nguon: "CRM" }], ns({ nhom_quyen: "KOC" }), true);
    expect(kq).toEqual([]);
  });

  it("manager bi ha employee: QUAN_LY + MENTOR do CRM cap KET_THUC", () => {
    const kq = keHoachDongBoVaiCrm(
      [
        { vai: "QUAN_LY", trang_thai: "HOAT_DONG", nguon: "CRM" },
        { vai: "MENTOR", trang_thai: "HOAT_DONG", nguon: "CRM" }
      ],
      ns({ role: "employee", nhom_quyen: "KHONG" }),
      true
    );
    expect(tom(kq)).toEqual(["QUAN_LY:HOAT_DONG->KET_THUC", "MENTOR:HOAT_DONG->KET_THUC"]);
  });

  it("vai do con nguoi cap (QUAN_TRI / DANG_KY) khong bi ket thuc khi CRM khong map", () => {
    const kq = keHoachDongBoVaiCrm(
      [
        { vai: "THIEN_KHUE", trang_thai: "HOAT_DONG", nguon: "QUAN_TRI" },
        { vai: "MENTOR", trang_thai: "HOAT_DONG", nguon: "QUAN_TRI" },
        { vai: "CTV", trang_thai: "HOAT_DONG", nguon: "DANG_KY" },
        { vai: "KOC", trang_thai: "DANG_HOC", nguon: "QUAN_TRI" }
      ],
      ns({ role: "employee", nhom_quyen: "KHO" }),
      true
    );
    expect(kq).toEqual([]);
  });

  it("nhan su bi khoa: vai mo rong do CRM cap TAM_DUNG; do con nguoi cap (QUAN_TRI) giu nguyen", () => {
    const kq = keHoachDongBoVaiCrm(
      [
        { vai: "ADMIN", trang_thai: "HOAT_DONG", nguon: "CRM" },
        { vai: "THIEN_KHUE", trang_thai: "HOAT_DONG", nguon: "CRM" },
        { vai: "MENTOR", trang_thai: "HOAT_DONG", nguon: "QUAN_TRI" },
        { vai: "KOC", trang_thai: "DANG_HOC", nguon: "CRM" },
        { vai: "CTV", trang_thai: "HOAT_DONG", nguon: "QUAN_TRI" }
      ],
      ns({ role: "admin", active: false, nhom_quyen: "KOC" }),
      true
    );
    expect(tom(kq)).toEqual(["ADMIN:HOAT_DONG->TAM_DUNG", "THIEN_KHUE:HOAT_DONG->TAM_DUNG", "KOC:DANG_HOC->TAM_DUNG"]);
    expect(kq.every(d => d.nguon === "CRM_DONG_BO")).toBe(true);
  });

  it("mo khoa: KOC do dong bo tam dung ve DANG_HOC (khong nhay HOAT_DONG); THIEN_KHUE ve HOAT_DONG", () => {
    const kq = keHoachDongBoVaiCrm(
      [
        { vai: "THIEN_KHUE", trang_thai: "TAM_DUNG", nguon: "CRM_DONG_BO" },
        { vai: "KOC", trang_thai: "TAM_DUNG", nguon: "CRM_DONG_BO" }
      ],
      ns({ role: "admin", nhom_quyen: "KOC" }),
      true
    );
    expect(tom(kq)).toEqual(["ADMIN:-->HOAT_DONG", "THIEN_KHUE:TAM_DUNG->HOAT_DONG", "KOC:TAM_DUNG->DANG_HOC"]);
  });

  it("vai mo rong bi con nguoi ket thuc (QUAN_TRI) khong bi mo lai du CRM van map", () => {
    const kq = keHoachDongBoVaiCrm([{ vai: "CTV", trang_thai: "KET_THUC", nguon: "QUAN_TRI" }], ns({ nhom_quyen: "CTV" }), true);
    expect(kq).toEqual([]);
  });
});

const ID = "11111111-1111-4111-8111-111111111111";
const TOKEN = { sub: ID, email: "manager@lyno.test", sdt: null, hoTen: null, sessionId: null };

function taoMock(vaiBanDau: { vai: string; trang_thai: string; nguon: string }[], crmUserId: string | null = ID) {
  let vai = vaiBanDau.map(v => ({ ...v, tu_luc: new Date(), den_luc: null as Date | null }));
  const lichSu: unknown[] = [];
  const hoSo = () => ({ id: ID, ho_ten: "QL", email: TOKEN.email, sdt: null, sdt_chuan: null, crm_user_id: crmUserId, kich_hoat_lam_viec: true, vai_tro: vai.map(v => ({ ...v })) });
  const tx = {
    vai_tro_ho_so: {
      updateMany: jest.fn(async ({ where, data }: { where: { vai: string; trang_thai: string }; data: { trang_thai: string; nguon?: string } }) => {
        const r = vai.find(v => v.vai === where.vai && v.trang_thai === where.trang_thai);
        if (!r) return { count: 0 };
        r.trang_thai = data.trang_thai;
        if (data.nguon) r.nguon = data.nguon;
        return { count: 1 };
      }),
      createMany: jest.fn(async ({ data }: { data: { vai: string; trang_thai: string; nguon: string }[] }) => {
        vai = [...vai, ...data.map(d => ({ vai: d.vai, trang_thai: d.trang_thai, nguon: d.nguon, tu_luc: new Date(), den_luc: null }))];
        return { count: data.length };
      })
    },
    lich_su_vai_tro: { create: jest.fn(async ({ data }: { data: unknown }) => lichSu.push(data)) },
    ho_so: { updateMany: jest.fn(async () => ({ count: 1 })) },
    nhat_ky: { create: jest.fn() }
  };
  const prisma = {
    ho_so: { findUnique: jest.fn(async () => hoSo()) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  return { prisma, nhatKy, tx, lichSu };
}

describe("NguoiDungService.layTuToken — dong bo lai vai CRM moi lan xac thuc (cache 60 s)", () => {
  it("manager da nghi (active=false) -> mat QUAN_LY ngay o request tiep theo, ghi lich_su_vai_tro", async () => {
    const { prisma, nhatKy, lichSu } = taoMock([{ vai: "QUAN_LY", trang_thai: "HOAT_DONG", nguon: "CRM" }]);
    const crmDoc = { layNhanSuCrm: jest.fn(async () => ({ id: ID, role: "manager", active: false, nhom_quyen: "KHONG" })) } as unknown as CrmDocService;
    const nd = await new NguoiDungService(new CoreRepository(prisma), crmDoc, nhatKy).layTuToken(TOKEN);
    expect(nd.vai).toEqual([]);
    expect(nd.vaiChiTiet.map(v => `${v.vai}:${v.trang_thai}`)).toEqual(["QUAN_LY:TAM_DUNG"]);
    expect(lichSu).toEqual([expect.objectContaining({ vai: "QUAN_LY", trang_thai_cu: "HOAT_DONG", trang_thai_moi: "TAM_DUNG", nguoi_doi_id: null })]);
    expect(nhatKy.ghi).toHaveBeenCalledWith(expect.objectContaining({ hanhDong: "DONG_BO_VAI_CRM" }), expect.anything());
  });

  it("trong chu ky cache khong doc lai CRM; request dong thoi chi dong bo mot lan", async () => {
    const { prisma, nhatKy } = taoMock([{ vai: "ADMIN", trang_thai: "HOAT_DONG", nguon: "CRM" }]);
    const crmDoc = { layNhanSuCrm: jest.fn(async () => ({ id: ID, role: "admin", active: true, nhom_quyen: "KHONG" })) } as unknown as CrmDocService;
    const svc = new NguoiDungService(new CoreRepository(prisma), crmDoc, nhatKy);
    await Promise.all([svc.layTuToken(TOKEN), svc.layTuToken(TOKEN)]);
    await svc.layTuToken(TOKEN);
    expect(crmDoc.layNhanSuCrm).toHaveBeenCalledTimes(1);
    svc.boCacheDongBo(ID);
    await svc.layTuToken(TOKEN);
    expect(crmDoc.layNhanSuCrm).toHaveBeenCalledTimes(2);
  });

  it("loi doc CRM -> giu vai hien tai, khong chan dang nhap, lan sau thu lai", async () => {
    const { prisma, nhatKy } = taoMock([{ vai: "ADMIN", trang_thai: "HOAT_DONG", nguon: "CRM" }]);
    const crmDoc = { layNhanSuCrm: jest.fn(async () => Promise.reject(new Error("db"))) } as unknown as CrmDocService;
    const svc = new NguoiDungService(new CoreRepository(prisma), crmDoc, nhatKy);
    expect((await svc.layTuToken(TOKEN)).vai).toEqual(["ADMIN"]);
    await svc.layTuToken(TOKEN);
    expect(crmDoc.layNhanSuCrm).toHaveBeenCalledTimes(2);
  });

  it("ho so manager cu (chi QUAN_LY) -> bo sung MENTOR o lan xac thuc ke tiep, vai QUAN_TRI khong bi dung", async () => {
    const { prisma, nhatKy, tx, lichSu } = taoMock([
      { vai: "QUAN_LY", trang_thai: "HOAT_DONG", nguon: "CRM" },
      { vai: "KOL", trang_thai: "HOAT_DONG", nguon: "QUAN_TRI" }
    ]);
    const crmDoc = {
      layNhanSuCrm: jest.fn(async () => ({ id: ID, role: "manager", active: true, nhom_quyen: "KHONG" }))
    } as unknown as CrmDocService;
    const nd = await new NguoiDungService(new CoreRepository(prisma), crmDoc, nhatKy).layTuToken(TOKEN);
    expect(nd.vai).toEqual(["QUAN_LY", "KOL", "MENTOR"]);
    expect(tx.vai_tro_ho_so.updateMany).not.toHaveBeenCalled();
    expect(lichSu).toEqual([expect.objectContaining({ vai: "MENTOR", trang_thai_cu: null, trang_thai_moi: "HOAT_DONG" })]);
  });

  it("ho so nhan su nhom KOC cu (KHACH) -> them KOC DANG_HOC, chua duoc dung vai KOC", async () => {
    const { prisma, nhatKy } = taoMock([{ vai: "KHACH", trang_thai: "HOAT_DONG", nguon: "HE_THONG" }]);
    const crmDoc = {
      layNhanSuCrm: jest.fn(async () => ({ id: ID, role: "employee", active: true, nhom_quyen: "KOC" }))
    } as unknown as CrmDocService;
    const nd = await new NguoiDungService(new CoreRepository(prisma), crmDoc, nhatKy).layTuToken(TOKEN);
    expect(nd.vaiChiTiet.map(v => `${v.vai}:${v.trang_thai}`)).toEqual(["KHACH:HOAT_DONG", "KOC:DANG_HOC"]);
    expect(nd.vai).toEqual(["KHACH"]);
  });

  it("khong dung vai Thien Khue cap (CTV / KOC) cua nguoi dang ky", async () => {
    const { prisma, nhatKy, tx } = taoMock(
      [
        { vai: "CTV", trang_thai: "HOAT_DONG", nguon: "DANG_KY" },
        { vai: "KOC", trang_thai: "HOAT_DONG", nguon: "QUAN_TRI" }
      ],
      null
    );
    const crmDoc = { layNhanSuCrm: jest.fn(async () => ({ id: ID, role: "employee", active: false, nhom_quyen: "KHONG" })) } as unknown as CrmDocService;
    const nd = await new NguoiDungService(new CoreRepository(prisma), crmDoc, nhatKy).layTuToken(TOKEN);
    expect(nd.vai).toEqual(["CTV", "KOC"]);
    expect(tx.vai_tro_ho_so.updateMany).not.toHaveBeenCalled();
  });
});
