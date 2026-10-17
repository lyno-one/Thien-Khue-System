import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import type { HangThanhVienService } from "../../src/services/khach-doi-tac.service";
import { UuDaiService } from "../../src/services/khach-doi-tac-uu-dai.service";
import { DoiTacRepository, HoSoKhachRepository, UuDaiRepository } from "../../src/repositories/khach-doi-tac.repository";
import { nguoiDung } from "./ho-so-gia";

const ID = "11111111-1111-4111-8111-111111111111";

const QUA = {
  id: ID,
  doi_tac_id: null,
  ten: "Khăn lụa",
  trang_thai: "CHO_THAM_DINH",
  nguoi_de_xuat_id: "ql-1",
  nguoi_tham_dinh_id: null
};
const VOUCHER = {
  id: ID,
  ma: "TET2026",
  ten: "Tết",
  loai_giam: "PHAN_TRAM",
  gia_tri: 10,
  bat_dau: null,
  het_han: null,
  trang_thai: "CHO_THAM_DINH",
  nguoi_de_xuat_id: "ql-1"
};

function taoSv(tuyChon: { qua?: Record<string, unknown>; voucher?: Record<string, unknown>; soDong?: number; capPhat?: number } = {}) {
  const soDong = tuyChon.soDong ?? 1;
  const capPhat = tuyChon.capPhat ?? 0;
  const tx = {
    qua_tang: {
      updateMany: jest.fn(async () => ({ count: soDong })),
      deleteMany: jest.fn(async () => ({ count: soDong })),
      findUniqueOrThrow: jest.fn(async () => QUA)
    },
    voucher: {
      updateMany: jest.fn(async () => ({ count: soDong })),
      deleteMany: jest.fn(async () => ({ count: soDong })),
      findUniqueOrThrow: jest.fn(async () => VOUCHER)
    },
    cap_phat_uu_dai: { count: jest.fn(async () => capPhat) }
  };
  const prisma = {
    qua_tang: { findUnique: jest.fn(async () => tuyChon.qua ?? null) },
    voucher: { findUnique: jest.fn(async () => tuyChon.voucher ?? null) },
    nhat_ky: { findFirst: jest.fn(async () => null) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 0) } as unknown as ThongBaoService;
  const sv = new UuDaiService(new UuDaiRepository(prisma), new DoiTacRepository(prisma), new HoSoKhachRepository(prisma), {} as HangThanhVienService, nhatKy, thongBao);
  return { sv, tx, nhatKy, thongBao };
}

describe("UuDaiService — sua qua chua duoc duyet", () => {
  it("nguoi khac khong sua duoc qua cua nguoi de xuat", async () => {
    const { sv, tx } = taoSv({ qua: QUA });
    await expect(sv.suaQua(nguoiDung("ql-2", ["QUAN_LY"]), ID, { ten: "Đổi tên" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.qua_tang.updateMany).not.toHaveBeenCalled();
  });

  it("gui body rong -> 400", async () => {
    const { sv } = taoSv({ qua: QUA });
    await expect(sv.suaQua(nguoiDung("ql-1", ["QUAN_LY"]), ID, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it("nguoi de xuat sua duoc, chi dong CHO_THAM_DINH chua ai tham dinh hoac da TU_CHOI", async () => {
    const { sv, tx, nhatKy } = taoSv({ qua: QUA });
    await sv.suaQua(nguoiDung("ql-1", ["QUAN_LY"]), ID, { ten: "  Khăn lụa mới " });
    const arg = (tx.qua_tang.updateMany.mock.calls as unknown as [{ where: Record<string, unknown>; data: Record<string, unknown> }][])[0]![0];
    expect(arg.data).toEqual({ ten: "Khăn lụa mới" });
    expect(arg.where).toEqual({ id: ID, OR: [{ trang_thai: "CHO_THAM_DINH", nguoi_tham_dinh_id: null }, { trang_thai: "TU_CHOI" }] });
    expect(nhatKy.ghi).toHaveBeenCalledWith(expect.objectContaining({ hanhDong: "SUA_QUA_TANG" }), tx);
  });

  it("qua da bi tu choi: sua xong quay lai CHO_THAM_DINH va xoa dau vet duyet cu", async () => {
    const { sv, tx } = taoSv({ qua: { ...QUA, trang_thai: "TU_CHOI" } });
    await sv.suaQua(nguoiDung("ql-1", ["QUAN_LY"]), ID, { gia_tri: 100 });
    const arg = (tx.qua_tang.updateMany.mock.calls as unknown as [{ data: Record<string, unknown> }][])[0]![0];
    expect(arg.data).toMatchObject({ gia_tri: 100, trang_thai: "CHO_THAM_DINH", nguoi_tham_dinh_id: null, nguoi_duyet_id: null, ly_do_tu_choi: null });
  });

  it("qua da tham dinh/duyet (updateMany khong khop dong nao) -> 409", async () => {
    const { sv } = taoSv({ qua: QUA, soDong: 0 });
    await expect(sv.suaQua(nguoiDung("ql-1", ["QUAN_LY"]), ID, { ten: "x" })).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("UuDaiService — huy qua / voucher chua duyet", () => {
  it("nguoi khac khong huy duoc", async () => {
    const { sv, tx } = taoSv({ qua: QUA });
    await expect(sv.huyQua(nguoiDung("ql-2", ["QUAN_LY"]), ID)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.qua_tang.deleteMany).not.toHaveBeenCalled();
  });

  it("nguoi de xuat huy -> xoa + ghi nhat ky", async () => {
    const { sv, tx, nhatKy } = taoSv({ qua: QUA });
    await expect(sv.huyQua(nguoiDung("ql-1", ["QUAN_LY"]), ID)).resolves.toEqual({ id: ID, da_huy: true });
    expect(tx.qua_tang.deleteMany).toHaveBeenCalledWith({ where: { id: ID, trang_thai: { in: ["CHO_THAM_DINH", "TU_CHOI"] } } });
    expect(nhatKy.ghi).toHaveBeenCalledWith(expect.objectContaining({ hanhDong: "HUY_QUA_TANG" }), tx);
  });

  it("qua da duyet (deleteMany khong xoa dong nao) -> 409", async () => {
    const { sv } = taoSv({ qua: { ...QUA, trang_thai: "DA_DUYET" }, soDong: 0 });
    await expect(sv.huyQua(nguoiDung("ql-1", ["QUAN_LY"]), ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it("voucher da co luot cap phat thi khong xoa", async () => {
    const { sv, tx } = taoSv({ voucher: VOUCHER, capPhat: 2 });
    await expect(sv.huyVoucher(nguoiDung("ql-1", ["QUAN_LY"]), ID)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.voucher.deleteMany).not.toHaveBeenCalled();
  });

  it("nguoi tao huy voucher -> xoa", async () => {
    const { sv, tx } = taoSv({ voucher: VOUCHER });
    await expect(sv.huyVoucher(nguoiDung("ql-1", ["QUAN_LY"]), ID)).resolves.toEqual({ id: ID, da_huy: true });
    expect(tx.voucher.deleteMany).toHaveBeenCalled();
  });
});

describe("UuDaiService — sua voucher", () => {
  it("gop gia tri cu: doi sang PHAN_TRAM nhung gia tri cu > 100 -> 400", async () => {
    const { sv } = taoSv({ voucher: { ...VOUCHER, loai_giam: "SO_TIEN", gia_tri: 50_000 } });
    await expect(sv.suaVoucher(nguoiDung("ql-1", ["QUAN_LY"]), ID, { loai_giam: "PHAN_TRAM" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("het han phai sau bat dau (tinh ca gia tri cu)", async () => {
    const { sv } = taoSv({ voucher: { ...VOUCHER, bat_dau: new Date("2026-12-01T00:00:00Z") } });
    await expect(sv.suaVoucher(nguoiDung("ql-1", ["QUAN_LY"]), ID, { het_han: "2026-11-01T00:00:00Z" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("voucher bi tu choi: sua xong quay lai CHO_THAM_DINH", async () => {
    const { sv, tx } = taoSv({ voucher: { ...VOUCHER, trang_thai: "TU_CHOI" } });
    await sv.suaVoucher(nguoiDung("ql-1", ["QUAN_LY"]), ID, { gia_tri: 20 });
    const arg = (tx.voucher.updateMany.mock.calls as unknown as [{ data: Record<string, unknown> }][])[0]![0];
    expect(arg.data).toMatchObject({ gia_tri: 20, trang_thai: "CHO_THAM_DINH", nguoi_duyet_id: null });
  });
});

describe("UuDaiService — ngung ap dung (chi Thien Khue that)", () => {
  it("ADMIN khong ngung thay duoc", async () => {
    const { sv } = taoSv({ qua: { ...QUA, trang_thai: "DA_DUYET" } });
    await expect(sv.ngungQua(nguoiDung("ad-1", ["ADMIN"]), ID, { ly_do: "x" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("chi ngung qua dang DA_DUYET", async () => {
    const { sv } = taoSv({ qua: QUA });
    await expect(sv.ngungQua(nguoiDung("tk-1", ["THIEN_KHUE"]), ID, { ly_do: "x" })).rejects.toBeInstanceOf(ConflictException);
  });

  it("ngung qua -> TU_CHOI kem ly do, bao nguoi de xuat", async () => {
    const { sv, tx, thongBao } = taoSv({ qua: { ...QUA, trang_thai: "DA_DUYET" } });
    await sv.ngungQua(nguoiDung("tk-1", ["THIEN_KHUE"]), ID, { ly_do: " hết hàng " });
    expect(tx.qua_tang.updateMany).toHaveBeenCalledWith({ where: { id: ID, trang_thai: "DA_DUYET" }, data: { trang_thai: "TU_CHOI", ly_do_tu_choi: "Ngừng áp dụng: hết hàng" } });
    expect(thongBao.gui).toHaveBeenCalledWith(expect.objectContaining({ hoSoId: "ql-1" }), tx);
  });

  it("ngung voucher -> dat het_han = bay gio", async () => {
    const { sv, tx } = taoSv({ voucher: { ...VOUCHER, trang_thai: "DA_DUYET" } });
    await sv.ngungVoucher(nguoiDung("tk-1", ["THIEN_KHUE"]), ID, { ly_do: "sai giá" });
    const arg = (tx.voucher.updateMany.mock.calls as unknown as [{ data: { het_han: Date } }][])[0]![0];
    expect(arg.data.het_han).toBeInstanceOf(Date);
  });
});
