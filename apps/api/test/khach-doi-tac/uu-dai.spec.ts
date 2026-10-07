import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import type { HangThanhVienService } from "../../src/services/khach-doi-tac.service";
import { UuDaiService } from "../../src/services/khach-doi-tac-uu-dai.service";
import { DoiTacRepository, HoSoKhachRepository, UuDaiRepository } from "../../src/repositories/khach-doi-tac.repository";
import { nguoiDung, timHoSoGia } from "./ho-so-gia";

const QUA_GOC = {
  id: "11111111-1111-4111-8111-111111111111",
  doi_tac_id: null,
  ten: "Khăn lụa đối tác",
  mo_ta: null,
  hinh_anh: null,
  gia_tri: 500_000,
  so_luong: 10,
  hang_ap_dung: [],
  trang_thai: "CHO_THAM_DINH",
  nguoi_de_xuat_id: "ql-1",
  nguoi_tham_dinh_id: "ql-2",
  ket_qua_tham_dinh: "Đạt",
  nguoi_duyet_id: null,
  duyet_luc: null,
  ly_do_tu_choi: null,
  created_at: new Date()
};

function taoSv(tuyChon: { qua?: Record<string, unknown>[]; quaMot?: Record<string, unknown>; voucher?: Record<string, unknown>[]; voucherMot?: Record<string, unknown>; nguoiTaoVoucher?: string | null; hang?: "THAN_THIET" | "VIP" | null } = {}) {
  const tx = {
    qua_tang: { updateMany: jest.fn(async () => ({ count: 1 })), findUniqueOrThrow: jest.fn(async () => ({ ...QUA_GOC, trang_thai: "DA_DUYET" })) },
    voucher: { updateMany: jest.fn(async () => ({ count: 1 })), findUniqueOrThrow: jest.fn(async () => ({})) },
    cap_phat_uu_dai: { findFirst: jest.fn(async () => null), count: jest.fn(async () => 0), create: jest.fn(async ({ data }: { data: unknown }) => data) }
  };
  const prisma = {
    qua_tang: {
      findMany: jest.fn(async () => tuyChon.qua ?? []),
      findUnique: jest.fn(async () => tuyChon.quaMot ?? null)
    },
    voucher: {
      findMany: jest.fn(async () => tuyChon.voucher ?? []),
      findUnique: jest.fn(async () => tuyChon.voucherMot ?? null)
    },
    cap_phat_uu_dai: { findMany: jest.fn(async () => []) },
    nhat_ky: { findFirst: jest.fn(async () => (tuyChon.nguoiTaoVoucher === undefined ? null : tuyChon.nguoiTaoVoucher ? { ho_so_id: tuyChon.nguoiTaoVoucher } : null)) },
    ho_so: { findMany: jest.fn(async () => []), findUnique: timHoSoGia() },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;
  const hangSv = {
    tinhHangTheoSdt: jest.fn(async () => ({ hang: tuyChon.hang ?? null })),
    kiemDuocXemKhach: jest.fn(async (_nd: unknown, sdt: string) => sdt),
    phamViKhach: jest.fn(async () => null)
  } as unknown as HangThanhVienService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 0) } as unknown as ThongBaoService;
  return { sv: new UuDaiService(new UuDaiRepository(prisma), new DoiTacRepository(prisma), new HoSoKhachRepository(prisma), hangSv, nhatKy, thongBao), prisma, tx };
}

describe("UuDaiService — qua chua duyet khong hien thi cho khach", () => {
  it("chi lay DA_DUYET (where) va loc lai ca ket qua tra ve", async () => {
    const { sv, prisma } = taoSv({
      hang: "VIP",
      qua: [
        { ...QUA_GOC, id: "q-cho", trang_thai: "CHO_THAM_DINH" },
        { ...QUA_GOC, id: "q-tu-choi", trang_thai: "TU_CHOI" },
        { ...QUA_GOC, id: "q-duyet", trang_thai: "DA_DUYET", doi_tac: { ten: "Ngân hàng X" } }
      ],
      voucher: [
        { id: "v-cho", ma: "A", ten: "A", trang_thai: "CHO_THAM_DINH", hang_ap_dung: [], bat_dau: null, het_han: null },
        { id: "v-duyet", ma: "B", ten: "B", trang_thai: "DA_DUYET", hang_ap_dung: ["VIP"], bat_dau: null, het_han: null, loai_giam: "PHAN_TRAM", gia_tri: 10 }
      ]
    });
    const kq = await sv.layUuDaiCuaToi(nguoiDung("kh-1", ["KHACH"], "0901234567"));
    expect(kq.qua_tang.map(q => q.id)).toEqual(["q-duyet"]);
    expect(kq.qua_tang[0]!.ten_doi_tac).toBe("Ngân hàng X");
    expect(kq.voucher.map(v => v.id)).toEqual(["v-duyet"]);
    const whereQua = (prisma.qua_tang.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereQua.trang_thai).toBe("DA_DUYET");
    // ban cho khach khong lo truong noi bo
    expect(kq.qua_tang[0]).not.toHaveProperty("nguoi_de_xuat_id");
  });

  it("khach thuong khong thay uu dai theo hang", async () => {
    const { sv } = taoSv({ hang: null, qua: [{ ...QUA_GOC, trang_thai: "DA_DUYET" }] });
    const kq = await sv.layUuDaiCuaToi(nguoiDung("kh-1", ["KHACH"], "0901234567"));
    expect(kq.qua_tang).toEqual([]);
  });

  it("voucher het han khong hien thi", async () => {
    const { sv } = taoSv({
      hang: "VIP",
      voucher: [{ id: "v1", ma: "OLD", ten: "Cũ", trang_thai: "DA_DUYET", hang_ap_dung: [], bat_dau: null, het_han: new Date(Date.now() - 1000) }]
    });
    expect((await sv.layUuDaiCuaToi(nguoiDung("kh-1", ["KHACH"], "0901234567"))).voucher).toEqual([]);
  });
});

describe("UuDaiService — nguoi tao khong tu duyet", () => {
  const thienKhue = (id: string) => nguoiDung(id, ["THIEN_KHUE"]);

  it("nguoi de xuat qua khong tu duyet", async () => {
    const { sv, tx } = taoSv({ quaMot: { ...QUA_GOC } });
    await expect(sv.duyetQua(thienKhue("ql-1"), QUA_GOC.id, { duyet: true })).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.qua_tang.updateMany).not.toHaveBeenCalled();
  });

  it("nguoi tham dinh khong dong thoi duyet", async () => {
    const { sv } = taoSv({ quaMot: { ...QUA_GOC } });
    await expect(sv.duyetQua(thienKhue("ql-2"), QUA_GOC.id, { duyet: true })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("chua tham dinh thi khong duyet duoc", async () => {
    const { sv } = taoSv({ quaMot: { ...QUA_GOC, nguoi_tham_dinh_id: null } });
    await expect(sv.duyetQua(thienKhue("tk-1"), QUA_GOC.id, { duyet: true })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("nguoi thu ba (Thien Khue) duyet -> DA_DUYET", async () => {
    const { sv, tx } = taoSv({ quaMot: { ...QUA_GOC } });
    await sv.duyetQua(thienKhue("tk-1"), QUA_GOC.id, { duyet: true });
    expect(tx.qua_tang.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: QUA_GOC.id, trang_thai: "CHO_THAM_DINH" }, data: expect.objectContaining({ trang_thai: "DA_DUYET", nguoi_duyet_id: "tk-1" }) })
    );
  });

  it("nguoi de xuat khong tu tham dinh", async () => {
    const { sv } = taoSv({ quaMot: { ...QUA_GOC, nguoi_tham_dinh_id: null } });
    await expect(sv.thamDinhQua(nguoiDung("ql-1", ["QUAN_LY"]), QUA_GOC.id, { dat: true, ket_qua: "ok" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("nguoi tao voucher khong tu duyet", async () => {
    const { sv, tx } = taoSv({ voucherMot: { id: "v1", ma: "VIP10", trang_thai: "CHO_THAM_DINH" }, nguoiTaoVoucher: "tk-1" });
    await expect(sv.duyetVoucher(thienKhue("tk-1"), "v1", { duyet: true })).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.voucher.updateMany).not.toHaveBeenCalled();
    const { sv: sv2, tx: tx2 } = taoSv({ voucherMot: { id: "v1", ma: "VIP10", trang_thai: "CHO_THAM_DINH" }, nguoiTaoVoucher: "ql-1" });
    await sv2.duyetVoucher(thienKhue("tk-1"), "v1", { duyet: true });
    expect(tx2.voucher.updateMany).toHaveBeenCalled();
  });
});

describe("UuDaiService — cap phat theo hang", () => {
  it("qua chua duyet khong cap duoc", async () => {
    const { sv } = taoSv({ quaMot: { ...QUA_GOC, trang_thai: "CHO_THAM_DINH" }, hang: "VIP" });
    await expect(sv.capPhat(nguoiDung("ql-1", ["QUAN_LY"]), { sdt: "0901234567", qua_tang_id: QUA_GOC.id })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("hang khach khong khop -> tu choi; khop -> cap", async () => {
    const quaVip = { ...QUA_GOC, trang_thai: "DA_DUYET", hang_ap_dung: ["VIP"] };
    const { sv } = taoSv({ quaMot: quaVip, hang: "THAN_THIET" });
    await expect(sv.capPhat(nguoiDung("ql-1", ["QUAN_LY"]), { sdt: "0901234567", qua_tang_id: QUA_GOC.id })).rejects.toBeInstanceOf(BadRequestException);
    const { sv: sv2, tx } = taoSv({ quaMot: quaVip, hang: "VIP" });
    await sv2.capPhat(nguoiDung("ql-1", ["QUAN_LY"]), { sdt: "0901234567", qua_tang_id: QUA_GOC.id });
    expect(tx.cap_phat_uu_dai.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sdt_chuan: "0901234567", qua_tang_id: QUA_GOC.id }) }));
  });
});
