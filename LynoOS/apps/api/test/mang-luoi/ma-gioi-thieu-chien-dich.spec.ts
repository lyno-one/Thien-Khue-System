import { ForbiddenException } from "@nestjs/common";
import type { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import { QuyenSkuService } from "../../src/services/dao-tao-quyen-sku.service";
import { ChienDichService, MaGioiThieuService } from "../../src/services/mang-luoi.service";
import { BoNho, taoRepoMangLuoi } from "./prisma-bo-nho";

// Hoc truoc khi ban: khong lay ma / nhan chien dich cho SKU chua duoc cap quyen

const MAU_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const MAU_B = "bbbbbbbb-0000-4000-8000-00000000000b";
const mau = (id: string, ma: string) => ({ id, ma, ten: `Mẫu ${ma}`, gia_ban: 450_000, anh_url: null, trang_thai: "dang_ban" });

function dung() {
  const bn = new BoNho();
  bn.themNguoi("ctv-1", [{ vai: "CTV" }]);
  bn.themNguoi("koc-1", [{ vai: "KOC" }]);
  bn.du.quyen_sku.push({ ho_so_id: "ctv-1", mau_id: MAU_A, ma_mau: "AL01", trang_thai: "HOAT_DONG" });
  bn.du.quyen_sku.push({ ho_so_id: "ctv-1", mau_id: MAU_B, ma_mau: "AK01", trang_thai: "CAN_HOC_LAI" });
  bn.du.quyen_sku.push({ ho_so_id: "koc-1", mau_id: MAU_A, ma_mau: "AL01", trang_thai: "HOAT_DONG" });
  const prisma = bn.prisma();
  // groupBy / include _count chi can cho dinhDang ma — gia lap toi thieu
  prisma.ghi_nhan_don.groupBy = jest.fn(async () => []);
  const goc = prisma.ma_gioi_thieu.findMany;
  prisma.ma_gioi_thieu.findMany = async (a: { where?: unknown; include?: unknown }) => {
    const ds = await goc(a);
    return a.include ? ds.map((d: Record<string, unknown>) => ({ ...d, chien_dich: null, _count: { luot_click: 0 } })) : ds;
  };
  const crmDoc = {
    layMau: jest.fn(async (id: string) => (id === MAU_A ? mau(MAU_A, "AL01") : id === MAU_B ? mau(MAU_B, "AK01") : null)),
    layMauTheoMa: jest.fn(async (ma: string) => (ma.toUpperCase() === "AL01" ? mau(MAU_A, "AL01") : ma.toUpperCase() === "AK01" ? mau(MAU_B, "AK01") : null)),
    layMauTheoIds: jest.fn(async (ids: string[]) => ids.map(id => (id === MAU_A ? mau(MAU_A, "AL01") : mau(MAU_B, "AK01"))))
  } as unknown as CrmDocService;
  const nhatKy = { ghi: jest.fn(async () => undefined), ghiAnToan: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 0) } as unknown as ThongBaoService;
  const repo = taoRepoMangLuoi(prisma);
  const quyenSku = new QuyenSkuService(repo.quyenSku, nhatKy, thongBao);
  return {
    bn,
    ma: new MaGioiThieuService(repo.ma, repo.chienDich, repo.hoSo, crmDoc, quyenSku, nhatKy),
    cd: new ChienDichService(repo.chienDich, repo.hoSo, crmDoc, quyenSku, nhatKy, thongBao)
  };
}

const nguoi = (id: string, vai: string[]) => ({ id, vai, vaiChiTiet: vai.map(v => ({ vai: v, trang_thai: "HOAT_DONG" })), hoSo: { id, ho_ten: id } }) as unknown as ThongTinNguoiDung;

describe("MaGioiThieuService — chi SKU da duoc cap quyen", () => {
  it("SKU co quyen -> tao ma dang AL01-XXXXXX; goi lai tra ma cu", async () => {
    const { ma, bn } = dung();
    const m1 = await ma.layHoacTao("ctv-1", { ma_mau: "AL01" });
    expect(m1.ma).toMatch(/^AL01-[2-9A-Z]{6}$/);
    expect(m1.con_quyen).toBe(true);
    const m2 = await ma.layHoacTao("ctv-1", { mau_id: MAU_A });
    expect(m2.id).toBe(m1.id);
    expect(bn.du.ma_gioi_thieu).toHaveLength(1);
  });

  it("SKU chua co quyen -> 403, khong tao ma", async () => {
    const { ma, bn } = dung();
    await expect(ma.layHoacTao("koc-1", { ma_mau: "AK01" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(bn.du.ma_gioi_thieu).toHaveLength(0);
  });

  it("SKU dang CAN_HOC_LAI -> 403 (phai hoc lai)", async () => {
    const { ma } = dung();
    await expect(ma.layHoacTao("ctv-1", { ma_mau: "AK01" })).rejects.toThrow(/học lại/);
  });

  it("khong co vai mang luoi HOAT_DONG -> 403", async () => {
    const { ma, bn } = dung();
    bn.themNguoi("khach-1", [{ vai: "KHACH" }]);
    await expect(ma.layHoacTao("khach-1", { ma_mau: "AL01" })).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("ChienDichService — chi nhan chien dich khi moi SKU deu co quyen", () => {
  function themChienDich(bn: BoNho, id: string, mauIds: string[], maMaus: string[]) {
    bn.du.chien_dich.push({ id, ten: `Chiến dịch ${id}`, mau_ids: mauIds, ma_maus: maMaus, vai_ap_dung: ["KOC", "KOL"], trang_thai: "DANG_CHAY", han: null });
  }

  it("thieu quyen mot SKU -> 403, khong tao tham gia", async () => {
    const { cd, bn } = dung();
    themChienDich(bn, "cd-2", [MAU_A, MAU_B], ["AL01", "AK01"]);
    await expect(cd.nhan(nguoi("koc-1", ["KOC"]), "cd-2")).rejects.toBeInstanceOf(ForbiddenException);
    expect(bn.du.tham_gia_chien_dich).toHaveLength(0);
  });

  it("du quyen moi SKU -> CHO_DUYET; dang ky lai -> 409", async () => {
    const { cd, bn } = dung();
    themChienDich(bn, "cd-1", [MAU_A], ["AL01"]);
    const kq = await cd.nhan(nguoi("koc-1", ["KOC"]), "cd-1");
    expect(kq.trang_thai).toBe("CHO_DUYET");
    await expect(cd.nhan(nguoi("koc-1", ["KOC"]), "cd-1")).rejects.toThrow(/đã đăng ký/);
  });

  it("vai khong ap dung -> 403", async () => {
    const { cd, bn } = dung();
    themChienDich(bn, "cd-1", [MAU_A], ["AL01"]);
    await expect(cd.nhan(nguoi("ctv-1", ["CTV"]), "cd-1")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
