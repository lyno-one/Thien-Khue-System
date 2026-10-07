import { NguoiDungService, type NhatKyService } from "../../src/services/core.service";
import type { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";
import { CoreRepository } from "../../src/repositories/core.repository";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";

// Mau test service voi Prisma mock — khong can DB (KIEN-TRUC muc 7)
function taoMock() {
  const daTao: unknown[] = [];
  const tx = {
    ho_so: {
      create: jest.fn(async ({ data }: { data: { id: string; ho_ten: string; email: string | null; crm_user_id: string | null; vai_tro: { create: { vai: string; trang_thai: string }[] } } }) => {
        daTao.push(data);
        return {
          id: data.id,
          ho_ten: data.ho_ten,
          email: data.email,
          sdt: null,
          crm_user_id: data.crm_user_id,
          kich_hoat_lam_viec: false,
          vai_tro: data.vai_tro.create.map(v => ({ ...v, tu_luc: new Date(), den_luc: null }))
        };
      })
    }
  };
  const prisma = {
    ho_so: { findUnique: jest.fn(async () => null) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  return { prisma, nhatKy, tx, daTao };
}

const TOKEN = { sub: "11111111-1111-4111-8111-111111111111", email: "sale@lyno.test", sdt: null, hoTen: null, sessionId: null };

describe("NguoiDungService.layTuToken — tao ho so lan dau", () => {
  it("nhan su CRM nhom SALE -> gan crm_user_id + vai SALE (DANG_HOC)", async () => {
    const { prisma, nhatKy } = taoMock();
    const crmDoc = {
      layNhanSuCrm: jest.fn(async () => ({ id: TOKEN.sub, email: TOKEN.email, full_name: "Sale Một", role: "employee", active: true, nhom_quyen: "SALE", phong_ban: "Sale" }))
    } as unknown as CrmDocService;
    const nd = await new NguoiDungService(new CoreRepository(prisma), crmDoc, nhatKy).layTuToken(TOKEN);
    expect(nd.hoSo.crm_user_id).toBe(TOKEN.sub);
    expect(nd.hoSo.ho_ten).toBe("Sale Một");
    expect(nd.vaiChiTiet.map(v => `${v.vai}:${v.trang_thai}`)).toEqual(["SALE:DANG_HOC"]);
    expect(nd.vai).toEqual([]); // chua HOAT_DONG cho toi khi hoc dat
    expect(nhatKy.ghi).toHaveBeenCalledTimes(1);
  });

  it("khong phai nhan su -> vai KHACH HOAT_DONG, khong gan crm_user_id", async () => {
    const { prisma, nhatKy } = taoMock();
    const crmDoc = { layNhanSuCrm: jest.fn(async () => null) } as unknown as CrmDocService;
    const nd = await new NguoiDungService(new CoreRepository(prisma), crmDoc, nhatKy).layTuToken({ ...TOKEN, email: "khach@x.vn" });
    expect(nd.hoSo.crm_user_id).toBeNull();
    expect(nd.vai).toEqual(["KHACH"]);
    expect(nd.hoSo.ho_ten).toBe("khach");
  });
});
