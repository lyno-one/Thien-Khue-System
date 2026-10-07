import { ConflictException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import type { SupabaseAdminService } from "../../src/infrastructure/supabase/supabase-admin.service";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import type { DangKyDto } from "../../src/dto/ho-so/ho-so.dto";
import { HoSoRepository, VaiRepository, XacMinhSdtRepository } from "../../src/repositories/ho-so.repository";
import { HoSoService, XacMinhSdtService } from "../../src/services/ho-so.service";
import { anEmail } from "../../src/common/utils/ho-so";

/*
 * LOI-CAN-SUA muc 1, 3: SDT tu khai -> chua xac minh; doi SDT -> xoa xac minh;
 * nhan vien (CSKH / QUAN_LY) xac minh SDT cua ho so KHAC sau khi goi, ghi nhat ky.
 */

const KHACH = "11111111-1111-4111-8111-111111111111";
const CSKH = "22222222-2222-4222-8222-222222222222";

function nd(id: string, vai: ThongTinNguoiDung["vai"]): ThongTinNguoiDung {
  return { id, email: null, hoSo: { id, ho_ten: id, email: null, sdt: null, crm_user_id: null, kich_hoat_lam_viec: true }, vai, vaiChiTiet: [] };
}

function taoHoSoSv(hoSoHienTai: { sdt_chuan: string | null; sdt_xac_minh_luc: Date | null }) {
  const tx = {
    ho_so: { update: jest.fn(async () => ({})), create: jest.fn(async () => ({ id: KHACH })) },
    vai_tro_ho_so: { create: jest.fn() },
    lich_su_vai_tro: { create: jest.fn() }
  };
  const prisma = {
    ho_so: { findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => hoSoHienTai) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const supabaseAdmin = { taoNguoiDung: jest.fn(async () => ({ id: KHACH })), xoaNguoiDung: jest.fn() } as unknown as SupabaseAdminService;
  const thongBao = { gui: jest.fn(async () => undefined) } as unknown as ThongBaoService;
  return { sv: new HoSoService(new HoSoRepository(prisma), new VaiRepository(prisma), supabaseAdmin, nhatKy, thongBao), prisma, tx, nhatKy };
}

describe("HoSoService — doi SDT xoa xac minh", () => {
  it("doi sang SDT khac -> sdt_xac_minh_luc / boi_id = null, ghi nhat ky bo xac minh", async () => {
    const { sv, tx, nhatKy } = taoHoSoSv({ sdt_chuan: "0901234567", sdt_xac_minh_luc: new Date() });
    await sv.capNhatCuaToi(nd(KHACH, ["KHACH"]), { sdt: "0987654321" });
    expect(tx.ho_so.update).toHaveBeenCalledWith({
      where: { id: KHACH },
      data: expect.objectContaining({ sdt_chuan: "0987654321", sdt_xac_minh_luc: null, sdt_xac_minh_boi_id: null })
    });
    expect((nhatKy.ghi as jest.Mock).mock.calls[0][0].duLieu).toMatchObject({ bo_xac_minh_sdt: true });
  });

  it("xoa SDT -> cung xoa xac minh", async () => {
    const { sv, tx } = taoHoSoSv({ sdt_chuan: "0901234567", sdt_xac_minh_luc: new Date() });
    await sv.capNhatCuaToi(nd(KHACH, ["KHACH"]), { sdt: "" });
    expect((tx.ho_so.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data).toMatchObject({ sdt: null, sdt_chuan: null, sdt_xac_minh_luc: null });
  });

  it("cung so (chi khac cach viet +84) -> giu xac minh", async () => {
    const { sv, tx } = taoHoSoSv({ sdt_chuan: "0901234567", sdt_xac_minh_luc: new Date() });
    await sv.capNhatCuaToi(nd(KHACH, ["KHACH"]), { sdt: "+84 901 234 567" });
    const data = (tx.ho_so.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data).not.toHaveProperty("sdt_xac_minh_luc");
  });

  it("chi chan trung voi ho so KHAC da xac minh (ke khai truoc khong chiem duoc so cua khach that)", async () => {
    const { sv, prisma } = taoHoSoSv({ sdt_chuan: null, sdt_xac_minh_luc: null });
    await sv.capNhatCuaToi(nd(KHACH, ["KHACH"]), { sdt: "0901234567" });
    expect((prisma.ho_so.findFirst as jest.Mock).mock.calls[0][0].where).toMatchObject({ sdt_chuan: "0901234567", sdt_xac_minh_luc: { not: null } });
  });

  it("dang ky: SDT tu khai khong duoc danh dau xac minh", async () => {
    const { sv, tx } = taoHoSoSv({ sdt_chuan: null, sdt_xac_minh_luc: null });
    const dto = { ho_ten: "Khách B", email: "b@vi.du", sdt: "0901234567", mat_khau: "matkhau123", vai: "KHACH" } as DangKyDto;
    await sv.dangKy(dto, "10.9.9.1", undefined);
    const data = (tx.ho_so.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data.sdt_chuan).toBe("0901234567");
    expect(data.sdt_xac_minh_luc ?? null).toBeNull();
  });
});

function taoXacMinh(opt: { hoSo?: { id: string; sdt_chuan: string | null; sdt_xac_minh_luc: Date | null } | null; daCoChu?: boolean; demCapNhat?: number; loiTx?: unknown } = {}) {
  const tx = {
    ho_so: { updateMany: jest.fn(async () => ({ count: opt.demCapNhat ?? 1 })), update: jest.fn(async () => ({})) }
  };
  const prisma = {
    ho_so: {
      findUnique: jest.fn(async () => (opt.hoSo === undefined ? { id: KHACH, sdt_chuan: "0901234567", sdt_xac_minh_luc: null, sdt_xac_minh_boi_id: null } : opt.hoSo)),
      findFirst: jest.fn(async () => (opt.daCoChu ? { id: "khac" } : null)),
      findMany: jest.fn(async () => [])
    },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => {
      if (opt.loiTx) throw opt.loiTx;
      return fn(tx);
    })
  } as unknown as PrismaService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined) } as unknown as ThongBaoService;
  return { sv: new XacMinhSdtService(new XacMinhSdtRepository(prisma), nhatKy, thongBao), tx, nhatKy, thongBao };
}

describe("XacMinhSdtService — nhan vien xac minh sau khi goi", () => {
  const cskh = nd(CSKH, ["CSKH"]);
  const dto = { sdt: "090 123 4567", ghi_chu: "Gọi lại số này, khách xác nhận email đăng ký" };

  it("thanh cong: ghi moc + nguoi xac minh co dieu kien (chong doi so dong thoi), nhat ky XAC_MINH_SDT", async () => {
    const { sv, tx, nhatKy, thongBao } = taoXacMinh();
    await sv.xacMinhBoiNhanVien(cskh, KHACH, dto);
    expect(tx.ho_so.updateMany).toHaveBeenCalledWith({
      where: { id: KHACH, sdt_chuan: "0901234567", sdt_xac_minh_luc: null },
      data: { sdt_xac_minh_luc: expect.any(Date), sdt_xac_minh_boi_id: CSKH }
    });
    expect((nhatKy.ghi as jest.Mock).mock.calls[0][0]).toMatchObject({
      hoSoId: CSKH,
      hanhDong: "XAC_MINH_SDT",
      doiTuongId: KHACH,
      duLieu: { sdt_chuan: "0901234567", cach: "NHAN_VIEN", ghi_chu: dto.ghi_chu }
    });
    expect(thongBao.gui).toHaveBeenCalledWith(expect.objectContaining({ hoSoId: KHACH }), expect.anything());
  });

  it("khong tu xac minh SDT cua chinh minh", async () => {
    const { sv, tx } = taoXacMinh({ hoSo: { id: CSKH, sdt_chuan: "0901234567", sdt_xac_minh_luc: null } });
    await expect(sv.xacMinhBoiNhanVien(cskh, CSKH, dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.ho_so.updateMany).not.toHaveBeenCalled();
  });

  it("SDT vua goi khac SDT hien tai cua ho so (vua doi so) -> 409", async () => {
    const { sv, tx } = taoXacMinh({ hoSo: { id: KHACH, sdt_chuan: "0987654321", sdt_xac_minh_luc: null } });
    await expect(sv.xacMinhBoiNhanVien(cskh, KHACH, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.ho_so.updateMany).not.toHaveBeenCalled();
  });

  it("so da xac minh cho ho so khac -> 409", async () => {
    const { sv, tx } = taoXacMinh({ daCoChu: true });
    await expect(sv.xacMinhBoiNhanVien(cskh, KHACH, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.ho_so.updateMany).not.toHaveBeenCalled();
  });

  it("ho so da xac minh roi -> 409", async () => {
    const { sv } = taoXacMinh({ hoSo: { id: KHACH, sdt_chuan: "0901234567", sdt_xac_minh_luc: new Date() } });
    await expect(sv.xacMinhBoiNhanVien(cskh, KHACH, dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it("ho so doi so giua luc doc va ghi (updateMany 0 dong) -> 409", async () => {
    const { sv } = taoXacMinh({ demCapNhat: 0 });
    await expect(sv.xacMinhBoiNhanVien(cskh, KHACH, dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it("unique mot phan (hai ho so cung so xac minh dong thoi) -> 409", async () => {
    const loi = new Prisma.PrismaClientKnownRequestError("trung", { code: "P2002", clientVersion: "6" });
    const { sv } = taoXacMinh({ loiTx: loi });
    await expect(sv.xacMinhBoiNhanVien(cskh, KHACH, dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it("huy xac minh: xoa moc + ghi nhat ky kem ly do", async () => {
    const { sv, tx, nhatKy } = taoXacMinh({ hoSo: { id: KHACH, sdt_chuan: "0901234567", sdt_xac_minh_luc: new Date() } });
    await sv.huyXacMinh(nd("ql-1", ["QUAN_LY"]), KHACH, { ly_do: "Xác minh nhầm người" });
    expect(tx.ho_so.update).toHaveBeenCalledWith({ where: { id: KHACH }, data: { sdt_xac_minh_luc: null, sdt_xac_minh_boi_id: null } });
    expect((nhatKy.ghi as jest.Mock).mock.calls[0][0]).toMatchObject({ hanhDong: "HUY_XAC_MINH_SDT", duLieu: { ly_do: "Xác minh nhầm người" } });
  });

  it("che email khi nhan vien doi chieu", () => {
    expect(anEmail("nguyenthia@gmail.com")).toBe("ng***@gmail.com");
    expect(anEmail("a@x.vn")).toBe("a***@x.vn");
    expect(anEmail(null)).toBeNull();
  });
});
