import { ConflictException, NotFoundException } from "@nestjs/common";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import type { ChienDichRepository, MaGioiThieuRepository } from "../../src/repositories/mang-luoi.repository";
import { ChienDichService, MaGioiThieuService } from "../../src/services/mang-luoi.service";

// Xoa ma gioi thieu / chien dich: chi khi chua co du lieu gan vao (khong lam mat thong ke, hoa hong)

const ID = "11111111-1111-4111-8111-111111111111";
const nhatKy = () => ({ ghi: jest.fn(async () => undefined), ghiAnToan: jest.fn(async () => undefined) }) as unknown as NhatKyService & { ghiAnToan: jest.Mock };

describe("MaGioiThieuService.xoa", () => {
  function dung(tuyChon: { ma?: Record<string, unknown> | null; gan?: { click: number; ghi_nhan: number }; soXoa?: number } = {}) {
    const repo = {
      timTheoId: jest.fn(async () => (tuyChon.ma === undefined ? { id: ID, ho_so_id: "ctv-1", ma: "AL01-ABC123", ma_mau: "AL01" } : tuyChon.ma)),
      demDuLieuGanMa: jest.fn(async () => tuyChon.gan ?? { click: 0, ghi_nhan: 0 }),
      xoaCuaChu: jest.fn(async () => tuyChon.soXoa ?? 1)
    } as unknown as MaGioiThieuRepository & Record<string, jest.Mock>;
    const nk = nhatKy();
    const sv = new MaGioiThieuService(repo, {} as never, {} as never, {} as never, {} as never, nk);
    return { sv, repo, nk };
  }

  it("ma cua nguoi khac -> 404, khong xoa", async () => {
    const { sv, repo } = dung();
    await expect(sv.xoa("ctv-2", ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.xoaCuaChu).not.toHaveBeenCalled();
  });

  it("ma da co click -> 409 (chi tat duoc)", async () => {
    const { sv, repo } = dung({ gan: { click: 3, ghi_nhan: 0 } });
    await expect(sv.xoa("ctv-1", ID)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.xoaCuaChu).not.toHaveBeenCalled();
  });

  it("ma da gan don -> 409", async () => {
    const { sv } = dung({ gan: { click: 0, ghi_nhan: 1 } });
    await expect(sv.xoa("ctv-1", ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it("ma moi tao, chua dung -> xoa + nhat ky", async () => {
    const { sv, repo, nk } = dung();
    await expect(sv.xoa("ctv-1", ID)).resolves.toEqual({ id: ID, da_xoa: true });
    expect(repo.xoaCuaChu).toHaveBeenCalledWith(ID, "ctv-1");
    expect(nk.ghiAnToan).toHaveBeenCalledWith(expect.objectContaining({ hanhDong: "XOA_MA_GIOI_THIEU" }));
  });
});

describe("ChienDichService.xoa", () => {
  const ql = { id: "ql-1", vai: ["QUAN_LY"] } as unknown as ThongTinNguoiDung;

  function dung(tuyChon: { cd?: Record<string, unknown> | null; gan?: { tham_gia: number; noi_dung: number; ma: number }; soXoa?: number } = {}) {
    const repo = {
      timTheoId: jest.fn(async () => (tuyChon.cd === undefined ? { id: ID, ten: "Tết", trang_thai: "NHAP", ma_maus: ["AL01"] } : tuyChon.cd)),
      demDuLieuGanChienDich: jest.fn(async () => tuyChon.gan ?? { tham_gia: 0, noi_dung: 0, ma: 0 }),
      xoaNhap: jest.fn(async () => tuyChon.soXoa ?? 1)
    } as unknown as ChienDichRepository & Record<string, jest.Mock>;
    const nk = nhatKy();
    const sv = new ChienDichService(repo, {} as never, {} as never, {} as never, nk, {} as ThongBaoService);
    return { sv, repo, nk };
  }

  it("khong ton tai -> 404", async () => {
    const { sv } = dung({ cd: null });
    await expect(sv.xoa(ql, ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("chien dich da chay -> 409, goi y chuyen Ket thuc", async () => {
    const { sv, repo } = dung({ cd: { id: ID, ten: "Tết", trang_thai: "DANG_CHAY", ma_maus: [] } });
    await expect(sv.xoa(ql, ID)).rejects.toThrow(/Nháp/);
    expect(repo.xoaNhap).not.toHaveBeenCalled();
  });

  it("nhap nhung da co nguoi dang ky / noi dung / ma -> 409", async () => {
    const { sv, repo } = dung({ gan: { tham_gia: 2, noi_dung: 0, ma: 0 } });
    await expect(sv.xoa(ql, ID)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.xoaNhap).not.toHaveBeenCalled();
  });

  it("nhap, trong -> xoa + nhat ky", async () => {
    const { sv, nk } = dung();
    await expect(sv.xoa(ql, ID)).resolves.toEqual({ id: ID, da_xoa: true });
    expect(nk.ghiAnToan).toHaveBeenCalledWith(expect.objectContaining({ hanhDong: "XOA_CHIEN_DICH", hoSoId: "ql-1" }));
  });

  it("trang_thai doi giua chung (xoaNhap = 0 dong) -> 409", async () => {
    const { sv } = dung({ soXoa: 0 });
    await expect(sv.xoa(ql, ID)).rejects.toBeInstanceOf(ConflictException);
  });
});
