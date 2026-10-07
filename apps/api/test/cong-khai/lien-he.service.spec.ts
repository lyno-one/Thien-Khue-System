import { BadRequestException, HttpException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { GuiLienHeBody } from "@thien-khue/contracts";
import type { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";
import type { NhatKyService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import { GuiLienHeDto, laSdtVietNam } from "../../src/dto/cong-khai/cong-khai.dto";
import { GioiHanTheoKhoa, loaiLeadTheoTrang, nenGoiYDangKy, taoNhuCau } from "../../src/common/utils/cong-khai";
import { LienHeRepository } from "../../src/repositories/cong-khai.repository";
import { LienHeService } from "../../src/services/cong-khai.service";

function taoMock(leadTrung: { id: string } | null = null) {
  const prisma = {
    lead: {
      findFirst: jest.fn(async () => leadTrung),
      create: jest.fn(async () => ({ id: "lead-1" }))
    }
  } as unknown as PrismaService & { lead: { findFirst: jest.Mock; create: jest.Mock } };
  const crmDoc = {
    layMauTheoMa: jest.fn(async (ma: string) => (ma.toUpperCase() === "AL01" ? { ma: "AL01", trang_thai: "dang_ban" } : null))
  } as unknown as CrmDocService;
  const nhatKy = { ghiAnToan: jest.fn(async () => undefined) } as unknown as NhatKyService & { ghiAnToan: jest.Mock };
  const svc = new LienHeService(new LienHeRepository(prisma), crmDoc, nhatKy);
  return { svc, prisma, nhatKy };
}

const HOP_LE: GuiLienHeBody = { ho_ten: "Nguyễn Thị A", sdt: "+84 912 345 678", trang: "DAO_TAO", lo_trinh: "ctv", lua_chon: "Bán thời gian" };

describe("LienHeService.gui — tao lead tu form cong khai", () => {
  it("form dao tao hop le -> tao lead DANG_KY_HOC, SDT chuan hoa, nhu_cau doc duoc, goi y dang ky", async () => {
    const { svc, prisma, nhatKy } = taoMock();
    const kq = await svc.gui({ ...HOP_LE, loi_nhan: "Có kênh TikTok 5k" }, "1.1.1.1");
    expect(kq).toEqual({ da_nhan: true, goi_y_dang_ky: true });
    const data = prisma.lead.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ ten: "Nguyễn Thị A", sdt_chuan: "0912345678", loai: "DANG_KY_HOC", nguon: "DAO_TAO", dong_y_lien_he: true });
    expect(data.nhu_cau).toBe("Lộ trình: CTV online\nHình thức: Bán thời gian\nLời nhắn: Có kênh TikTok 5k");
    expect(nhatKy.ghiAnToan).toHaveBeenCalledWith(expect.objectContaining({ hanhDong: "TAO_LEAD_CONG_KHAI", doiTuongId: "lead-1", hoSoId: null }));
  });

  it("honeypot co gia tri -> tra thanh cong nhung KHONG ghi lead", async () => {
    const { svc, prisma } = taoMock();
    const kq = await svc.gui({ ...HOP_LE, website: "http://spam.example" }, "2.2.2.2");
    expect(kq.da_nhan).toBe(true);
    expect(prisma.lead.create).not.toHaveBeenCalled();
    expect(prisma.lead.findFirst).not.toHaveBeenCalled();
  });

  it("vuot gioi han theo IP -> 429, IP khac van gui duoc", async () => {
    const { svc, prisma } = taoMock();
    let nay = 0;
    svc.gioiHan = new GioiHanTheoKhoa(2, 60_000, () => nay);
    await svc.gui(HOP_LE, "3.3.3.3");
    await svc.gui(HOP_LE, "3.3.3.3");
    const loi = await svc.gui(HOP_LE, "3.3.3.3").catch(e => e);
    expect(loi).toBeInstanceOf(HttpException);
    expect((loi as HttpException).getStatus()).toBe(429);
    await expect(svc.gui(HOP_LE, "4.4.4.4")).resolves.toMatchObject({ da_nhan: true });
    nay = 61_000; // het cua so -> mo lai
    await expect(svc.gui(HOP_LE, "3.3.3.3")).resolves.toMatchObject({ da_nhan: true });
    expect(prisma.lead.create).toHaveBeenCalledTimes(4);
  });

  it("SDT sai -> 400, khong ghi", async () => {
    const { svc, prisma } = taoMock();
    await expect(svc.gui({ ...HOP_LE, sdt: "12345" }, "5.5.5.5")).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.gui({ ...HOP_LE, sdt: "0112345678" }, "5.5.5.5")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.lead.create).not.toHaveBeenCalled();
  });

  it("trung SDT + loai + trang trong 24h -> khong tao dong moi", async () => {
    const { svc, prisma } = taoMock({ id: "lead-cu" });
    await expect(svc.gui(HOP_LE, "6.6.6.6")).resolves.toMatchObject({ da_nhan: true });
    expect(prisma.lead.create).not.toHaveBeenCalled();
    expect(prisma.lead.findFirst.mock.calls[0][0].where).toMatchObject({ sdt_chuan: "0912345678", loai: "DANG_KY_HOC", nguon: "DAO_TAO" });
  });

  it("ma mau quan tam khong ton tai -> bo, khong chan khach", async () => {
    const { svc, prisma } = taoMock();
    await svc.gui({ ho_ten: "Khách", sdt: "0987654321", trang: "SAN_PHAM", ma_mau_quan_tam: "ZZ99" }, "7.7.7.7");
    await svc.gui({ ho_ten: "Khách", sdt: "0987654322", trang: "SAN_PHAM", ma_mau_quan_tam: "al01" }, "7.7.7.7");
    expect(prisma.lead.create.mock.calls[0][0].data.ma_mau_quan_tam).toBeNull();
    expect(prisma.lead.create.mock.calls[1][0].data).toMatchObject({ ma_mau_quan_tam: "AL01", loai: "MUA_HANG" });
  });
});

describe("luat phu form lien he", () => {
  it("loai lead theo trang", () => {
    expect(loaiLeadTheoTrang("DAO_TAO")).toBe("DANG_KY_HOC");
    expect(loaiLeadTheoTrang("DOI_TAC")).toBe("HOP_TAC");
    expect(loaiLeadTheoTrang("VIP")).toBe("MUA_HANG");
    expect(loaiLeadTheoTrang("THAN_THIEN")).toBe("MUA_HANG");
  });
  it("goi y dang ky tai khoan: CTV / KOL / khac va khach; khong cho Sale (tuyen qua CRM) va doi tac", () => {
    expect(nenGoiYDangKy("DAO_TAO", "ctv")).toBe(true);
    expect(nenGoiYDangKy("DAO_TAO", "kol")).toBe(true);
    expect(nenGoiYDangKy("DAO_TAO", "sale")).toBe(false);
    expect(nenGoiYDangKy("DOI_TAC")).toBe(false);
    expect(nenGoiYDangKy("VIP")).toBe(true);
  });
  it("taoNhuCau rong -> null", () => {
    expect(taoNhuCau({ trang: "VIP" })).toBeNull();
  });
  it("laSdtVietNam", () => {
    expect(laSdtVietNam("0912 345 678")).toBe(true);
    expect(laSdtVietNam("84912345678")).toBe(true);
    expect(laSdtVietNam("912345678")).toBe(true);
    expect(laSdtVietNam("0212345678")).toBe(true);
    expect(laSdtVietNam("0612345678")).toBe(false);
    expect(laSdtVietNam("09123")).toBe(false);
  });
});

describe("GuiLienHeDto — validate form", () => {
  async function loi(body: Record<string, unknown>) {
    const dto = plainToInstance(GuiLienHeDto, body);
    const ds = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    return { dto, truong: ds.map(e => e.property), thongDiep: ds.flatMap(e => Object.values(e.constraints ?? {})) };
  }

  it("body hop le, chuoi rong -> undefined", async () => {
    const { dto, truong } = await loi({ ...HOP_LE, email: "  ", loi_nhan: "" });
    expect(truong).toEqual([]);
    expect(dto.email).toBeUndefined();
    expect(dto.loi_nhan).toBeUndefined();
  });

  it("SDT sai, email sai, trang la, thieu ho ten -> loi tieng Viet", async () => {
    const { truong, thongDiep } = await loi({ ho_ten: " ", sdt: "abc", email: "x@", trang: "HACK" });
    expect(truong.sort()).toEqual(["email", "ho_ten", "sdt", "trang"]);
    expect(thongDiep.join(" ")).toContain("Số điện thoại không hợp lệ");
  });

  it("DAO_TAO bat buoc lo_trinh; trang khac khong can", async () => {
    expect((await loi({ ho_ten: "Lan", sdt: "0912345678", trang: "DAO_TAO" })).truong).toEqual(["lo_trinh"]);
    expect((await loi({ ho_ten: "Lan", sdt: "0912345678", trang: "DOI_TAC" })).truong).toEqual([]);
  });

  it("truong la (vd ho_so_id, trang_thai) bi tu choi — khong cho client tu dat", async () => {
    const { truong } = await loi({ ...HOP_LE, trang_thai: "THANH_CONG", phan_bo_cho: "x" });
    expect(truong.sort()).toEqual(["phan_bo_cho", "trang_thai"]);
  });

  it("ho ten / loi nhan qua dai bi chan", async () => {
    const { truong } = await loi({ ...HOP_LE, ho_ten: "a".repeat(101), loi_nhan: "b".repeat(1001) });
    expect(truong.sort()).toEqual(["ho_ten", "loi_nhan"]);
  });
});
