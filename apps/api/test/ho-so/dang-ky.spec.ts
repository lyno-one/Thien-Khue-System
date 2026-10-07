import { BadRequestException, ConflictException, HttpException } from "@nestjs/common";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import type { SupabaseAdminService } from "../../src/infrastructure/supabase/supabase-admin.service";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import type { DangKyDto } from "../../src/dto/ho-so/ho-so.dto";
import { HoSoRepository, VaiRepository } from "../../src/repositories/ho-so.repository";
import { HoSoService } from "../../src/services/ho-so.service";

const USER_ID = "33333333-3333-4333-8333-333333333333";

function taoMock(opt: { trungEmail?: boolean; trungSdt?: boolean; loiTx?: unknown } = {}) {
  const tx = {
    ho_so: { create: jest.fn(async () => ({ id: USER_ID })), findUnique: jest.fn(), update: jest.fn() },
    vai_tro_ho_so: { create: jest.fn(), update: jest.fn() },
    lich_su_vai_tro: { create: jest.fn() },
    nhat_ky: { create: jest.fn() },
    thong_bao: { create: jest.fn() }
  };
  const prisma = {
    ho_so: {
      findFirst: jest.fn(async ({ where }: { where: { email?: unknown; sdt_chuan?: unknown } }) => {
        if (where.email && opt.trungEmail) return { id: "cu" };
        if (where.sdt_chuan && opt.trungSdt) return { id: "cu" };
        return null;
      }),
      findUnique: jest.fn(async () => null)
    },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => {
      if (opt.loiTx) throw opt.loiTx;
      return fn(tx);
    })
  } as unknown as PrismaService;
  const supabaseAdmin = {
    taoNguoiDung: jest.fn(async () => ({ id: USER_ID })),
    xoaNguoiDung: jest.fn(async () => undefined)
  } as unknown as SupabaseAdminService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined) } as unknown as ThongBaoService;
  return { sv: new HoSoService(new HoSoRepository(prisma), new VaiRepository(prisma), supabaseAdmin, nhatKy, thongBao), prisma, supabaseAdmin, tx, nhatKy, thongBao };
}

const dto = (ghi: Partial<DangKyDto> = {}): DangKyDto =>
  Object.assign(
    { ho_ten: "Nguyễn Thị A", email: "a@vi.du", sdt: "0912 345 678", mat_khau: "matkhau123", vai: "CTV", hinh_thuc: "Bán thời gian" },
    ghi
  ) as DangKyDto;

let ipDem = 0;
const ipMoi = () => `10.0.0.${++ipDem}`;

describe("HoSoService.dangKy", () => {
  it("CTV -> tao user Auth + ho_so + vai DANG_HOC + lich su (chi create)", async () => {
    const { sv, supabaseAdmin, tx, thongBao } = taoMock();
    const kq = await sv.dangKy(dto(), ipMoi(), undefined);
    expect(kq).toMatchObject({ ho_so_id: USER_ID, vai: "CTV", trang_thai_vai: "DANG_HOC", email: "a@vi.du" });
    expect(supabaseAdmin.taoNguoiDung).toHaveBeenCalledWith(expect.objectContaining({ email: "a@vi.du", sdt: "0912345678" }));
    const hoSoTao = (tx.ho_so.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(hoSoTao).toMatchObject({ id: USER_ID, sdt_chuan: "0912345678" });
    expect(hoSoTao.kich_hoat_lam_viec).toBeUndefined(); // chua kich hoat lam viec cho toi khi hoc dat
    expect(tx.vai_tro_ho_so.create.mock.calls[0][0].data).toMatchObject({ vai: "CTV", trang_thai: "DANG_HOC", nguon: "DANG_KY" });
    expect(tx.lich_su_vai_tro.create.mock.calls[0][0].data).toMatchObject({ vai: "CTV", trang_thai_cu: null, trang_thai_moi: "DANG_HOC" });
    expect(thongBao.gui).toHaveBeenCalledTimes(1);
  });

  it("KHACH -> vai HOAT_DONG ngay (khong can hoc)", async () => {
    const { sv, tx } = taoMock();
    const kq = await sv.dangKy(dto({ vai: "KHACH", email: "k@vi.du" }), ipMoi(), undefined);
    expect(kq.trang_thai_vai).toBe("HOAT_DONG");
    expect(tx.vai_tro_ho_so.create.mock.calls[0][0].data).toMatchObject({ vai: "KHACH", trang_thai: "HOAT_DONG" });
  });

  it("khong cho dang ky vai noi bo (SALE / ADMIN)", async () => {
    const { sv, supabaseAdmin } = taoMock();
    await expect(sv.dangKy(dto({ vai: "ADMIN" }), ipMoi(), undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(sv.dangKy(dto({ vai: "SALE" }), ipMoi(), undefined)).rejects.toBeInstanceOf(BadRequestException);
    expect(supabaseAdmin.taoNguoiDung).not.toHaveBeenCalled();
  });

  it("trung email -> 409, khong tao user Auth", async () => {
    const { sv, supabaseAdmin } = taoMock({ trungEmail: true });
    await expect(sv.dangKy(dto(), ipMoi(), undefined)).rejects.toBeInstanceOf(ConflictException);
    expect(supabaseAdmin.taoNguoiDung).not.toHaveBeenCalled();
  });

  it("trung SDT (sau chuan hoa +84) -> 409, khong tao user Auth", async () => {
    const { sv, supabaseAdmin, prisma } = taoMock({ trungSdt: true });
    await expect(sv.dangKy(dto({ sdt: "+84 912 345 678" }), ipMoi(), undefined)).rejects.toBeInstanceOf(ConflictException);
    expect(supabaseAdmin.taoNguoiDung).not.toHaveBeenCalled();
    const goi = (prisma.ho_so.findFirst as jest.Mock).mock.calls as [{ where: { sdt_chuan?: string } }][];
    expect(goi.some(c => c[0].where.sdt_chuan === "0912345678")).toBe(true);
  });

  it("SDT sai -> 400", async () => {
    const { sv } = taoMock();
    await expect(sv.dangKy(dto({ sdt: "12345" }), ipMoi(), undefined)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("dang nhap roi thi khong dang ky tai khoan moi", async () => {
    const { sv } = taoMock();
    await expect(sv.dangKy(dto(), ipMoi(), { id: "x" } as ThongTinNguoiDung)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("loi khi tao ho so -> xoa user Auth vua tao (hoan tac)", async () => {
    const { sv, supabaseAdmin } = taoMock({ loiTx: new Error("db") });
    await expect(sv.dangKy(dto({ email: "loi@vi.du" }), ipMoi(), undefined)).rejects.toThrow("db");
    expect(supabaseAdmin.xoaNguoiDung).toHaveBeenCalledWith(USER_ID);
  });

  it("rate-limit: qua 5 lan / IP trong 15 phut -> 429", async () => {
    const { sv } = taoMock();
    const ip = "9.9.9.9";
    for (let i = 0; i < 5; i++) await sv.dangKy(dto({ email: `r${i}@vi.du` }), ip, undefined);
    const loi = await sv.dangKy(dto({ email: "r6@vi.du" }), ip, undefined).catch(e => e);
    expect(loi).toBeInstanceOf(HttpException);
    expect((loi as HttpException).getStatus()).toBe(429);
  });
});
