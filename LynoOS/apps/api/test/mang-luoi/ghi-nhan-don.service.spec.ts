import { ConflictException, ForbiddenException } from "@nestjs/common";
import type { CrmDocService, DonCrm } from "../../src/infrastructure/crm/crm-doc.service";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import { QuyenSkuService } from "../../src/services/dao-tao-quyen-sku.service";
import { GhiNhanDonService, type DonCoGhiChu } from "../../src/services/mang-luoi-hoa-hong.service";
import { BoNho, taoRepoMangLuoi } from "./prisma-bo-nho";

// Luat chinh: MOT don MOT nguoi ban, xung dot -> CHO_XAC_MINH, hoan -> BI_TRU, khong bao gio 2 hoa hong / don

const MAU_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const MAU_B = "bbbbbbbb-0000-4000-8000-00000000000b";
const CRM_SALE = "cccccccc-0000-4000-8000-000000000001";

function taoDon(ghiDe: Partial<DonCoGhiChu> = {}): DonCoGhiChu {
  return {
    id: "d0000000-0000-4000-8000-000000000001",
    ma_don: "DH-00001",
    kenh: "facebook",
    loai_don: "BAN_HANG",
    khach_ten: "Chị Lan",
    khach_sdt: "0900000001",
    sdt_chuan: "0900000001",
    trang_thai: "moi",
    tong_tien: 1_000_000,
    giam_gia: 0,
    nguoi_tao: null,
    created_at: new Date("2026-10-05T03:00:00Z"),
    giao_thanh_cong_luc: null,
    hoan_luc: null,
    ghi_chu: "[MGT:AL01-CTV111]",
    ...ghiDe
  };
}

function dung(boNho: BoNho, don: DonCoGhiChu) {
  const prisma = boNho.prisma();
  prisma.nhat_ky = { findMany: jest.fn(async () => []) };
  const cacDon = new Map<string, DonCrm>([[don.id, don]]);
  const crmDoc = {
    layDongDon: jest.fn(async () => [
      { id: "l1", don_id: don.id, mau_id: MAU_A, ma_mau: "AL01", size: "M", mau_sac: "Trắng", so_luong: 2, don_gia: 400_000 },
      { id: "l2", don_id: don.id, mau_id: MAU_B, ma_mau: "AK01", size: "M", mau_sac: "Đen", so_luong: 1, don_gia: 200_000 }
    ]),
    layDon: jest.fn(async (id: string) => cacDon.get(id) ?? null),
    layDonTheoMa: jest.fn(async (ma: string) => [...cacDon.values()].find(d => d.ma_don === ma) ?? null)
  } as unknown as CrmDocService;
  const nhatKy = { ghi: jest.fn(async () => undefined), ghiAnToan: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 0) } as unknown as ThongBaoService;
  const repo = taoRepoMangLuoi(prisma);
  const quyenSku = new QuyenSkuService(repo.quyenSku, nhatKy, thongBao);
  const sv = new GhiNhanDonService(repo.ghiNhan, repo.ma, repo.hoSo, crmDoc, quyenSku, nhatKy, thongBao);
  return { sv, crmDoc, thongBao, cacDon };
}

function chuanBi() {
  const bn = new BoNho();
  bn.themNguoi("ctv-1", [{ vai: "CTV" }]);
  bn.themNguoi("sale-1", [{ vai: "SALE" }], CRM_SALE);
  bn.themNguoi("ql-1", [{ vai: "QUAN_LY" }]);
  bn.du.ma_gioi_thieu.push({ id: "ma-1", ho_so_id: "ctv-1", ma: "AL01-CTV111", mau_id: MAU_A, bat: true });
  bn.du.quyen_sku.push({ ho_so_id: "ctv-1", mau_id: MAU_A, ma_mau: "AL01", trang_thai: "HOAT_DONG" });
  bn.du.quyen_sku.push({ ho_so_id: "sale-1", mau_id: MAU_A, ma_mau: "AL01", trang_thai: "HOAT_DONG" });
  bn.du.quyen_sku.push({ ho_so_id: "sale-1", mau_id: MAU_B, ma_mau: "AK01", trang_thai: "HOAT_DONG" });
  bn.du.ty_le_hoa_hong.push({ vai: "CTV", mau_id: null, ty_le: 10, bat: true, hieu_luc_tu: new Date("2026-01-01"), hieu_luc_den: null });
  bn.du.ty_le_hoa_hong.push({ vai: "SALE", mau_id: null, ty_le: 2, bat: true, hieu_luc_tu: new Date("2026-01-01"), hieu_luc_den: null });
  return bn;
}

const QUAN_LY = { id: "ql-1", vai: ["QUAN_LY"], vaiChiTiet: [], hoSo: { id: "ql-1", ho_ten: "Quản lý" } } as unknown as ThongTinNguoiDung;

describe("GhiNhanDonService — mot don mot nguoi ban", () => {
  it("don co ma CTV, nguoi tao khong phai Sale -> HOP_LE, hoa hong chi tinh SKU co quyen", async () => {
    const bn = chuanBi();
    const { sv } = dung(bn, taoDon());
    const kq = await sv.xuLyDon(taoDon());
    expect(kq).toMatchObject({ ket_qua: "MOI", trang_thai: "HOP_LE" });
    expect(bn.du.ghi_nhan_don).toHaveLength(1);
    expect(bn.du.ghi_nhan_don[0]).toMatchObject({ nguoi_ban_ho_so_id: "ctv-1", nguon: "CTV" });
    expect(bn.hoa_hong).toHaveLength(1);
    // he so 1.000.000 / 1.000.000 = 1; chi dong AL01 (800.000) co quyen -> 10% = 80.000; AK01 bo qua
    expect(Number(bn.hoa_hong[0]!.so_tien)).toBe(80_000);
    expect(bn.hoa_hong[0]!.trang_thai).toBe("CHO_DOI_SOAT");
  });

  it("goi lai cung don -> khong tao ghi nhan / hoa hong thu hai", async () => {
    const bn = chuanBi();
    const { sv } = dung(bn, taoDon());
    await sv.xuLyDon(taoDon());
    const lan2 = await sv.xuLyDon(taoDon());
    expect(lan2.ket_qua).toBe("BO_QUA");
    expect(bn.du.ghi_nhan_don).toHaveLength(1);
    expect(bn.hoa_hong).toHaveLength(1);
  });

  it("hai luong ghi nhan cung luc -> unique crm_don_id chan, chi mot hoa hong", async () => {
    const bn = chuanBi();
    const { sv } = dung(bn, taoDon());
    const kq = await Promise.all([sv.xuLyDon(taoDon()), sv.xuLyDon(taoDon()), sv.xuLyDon(taoDon())]);
    expect(kq.filter(k => k.ket_qua === "MOI")).toHaveLength(1);
    expect(bn.du.ghi_nhan_don).toHaveLength(1);
    expect(bn.hoa_hong).toHaveLength(1);
  });

  it("ma gioi thieu khac Sale chot -> CHO_XAC_MINH, KHONG tao hoa hong, bao nguoi lien quan", async () => {
    const bn = chuanBi();
    const don = taoDon({ nguoi_tao: CRM_SALE });
    const { sv, thongBao } = dung(bn, don);
    const kq = await sv.xuLyDon(don);
    expect(kq).toMatchObject({ ket_qua: "MOI", trang_thai: "CHO_XAC_MINH" });
    expect(bn.du.ghi_nhan_don[0]).toMatchObject({ nguoi_ban_ho_so_id: null, nguoi_chot_ho_so_id: "sale-1", ma_gioi_thieu_id: "ma-1" });
    expect(bn.hoa_hong).toHaveLength(0);
    expect(thongBao.guiNhieu).toHaveBeenCalledWith(expect.arrayContaining(["ctv-1", "sale-1"]), expect.objectContaining({ loai: "DON_HANG" }));
  });

  it("ma nhap tay boi Sale (khong phai quan ly) -> luon CHO_XAC_MINH", async () => {
    const bn = chuanBi();
    const don = taoDon({ ghi_chu: null });
    const { sv } = dung(bn, don);
    const sale = { id: "sale-1", vai: ["SALE"], vaiChiTiet: [], hoSo: { id: "sale-1", ho_ten: "Sale" } } as unknown as ThongTinNguoiDung;
    const kq = await sv.ghiNhanTheoMaDon(sale, "DH-00001", "AL01-CTV111");
    expect(kq.trang_thai).toBe("CHO_XAC_MINH");
    expect(bn.hoa_hong).toHaveLength(0);
    await expect(sv.ghiNhanTheoMaDon(sale, "DH-00001", "AL01-CTV111")).rejects.toBeInstanceOf(ConflictException);
  });

  it("xac minh: nguoi lien quan bi chan; quan ly chi LAP de xuat (maker-checker), chua doi ghi nhan / chua co hoa hong; lap lai -> 409", async () => {
    const bn = chuanBi();
    const don = taoDon({ nguoi_tao: CRM_SALE });
    const { sv } = dung(bn, don);
    const { id } = await sv.xuLyDon(don);
    const sale = { id: "sale-1", vai: ["SALE", "QUAN_LY"], vaiChiTiet: [], hoSo: { id: "sale-1", ho_ten: "Sale" } } as unknown as ThongTinNguoiDung;
    await expect(sv.xacMinh(sale, id!, "NGUOI_CHOT", "Tôi chốt đơn")).rejects.toBeInstanceOf(ForbiddenException);

    const kq = await sv.xacMinh(QUAN_LY, id!, "GIOI_THIEU", "Khách vào từ link CTV");
    expect(kq.trang_thai).toBe("CHO_KIEM");
    expect(kq.ghi_nhan.trang_thai).toBe("CHO_XAC_MINH");
    expect(bn.du.de_xuat_duyet).toHaveLength(1);
    expect(bn.du.de_xuat_duyet[0]).toMatchObject({ loai: "XAC_MINH_DON", doi_tuong_id: id, nguoi_de_xuat_id: "ql-1", trang_thai: "CHO_KIEM", du_lieu: expect.objectContaining({ ket_qua: "GHI_NHAN", nguoi_ban_ho_so_id: "ctv-1" }) });
    expect(bn.hoa_hong).toHaveLength(0);
    await expect(sv.xacMinh(QUAN_LY, id!, "NGUOI_CHOT", "Đổi ý")).rejects.toBeInstanceOf(ConflictException);
    expect(bn.du.de_xuat_duyet).toHaveLength(1);
  });
});

describe("GhiNhanDonService — dong bo trang thai don", () => {
  it("giao thanh cong -> DU_DIEU_KIEN; sau do hoan -> BI_TRU, ghi nhan BI_HUY", async () => {
    const bn = chuanBi();
    const don = taoDon();
    const { sv, cacDon } = dung(bn, don);
    await sv.xuLyDon(don);

    cacDon.set(don.id, { ...don, trang_thai: "giao_thanh_cong" });
    let kq = await sv.dongBo();
    expect(kq.du_dieu_kien).toBe(1);
    expect(bn.hoa_hong[0]!.trang_thai).toBe("DU_DIEU_KIEN");

    cacDon.set(don.id, { ...don, trang_thai: "hoan" });
    kq = await sv.dongBo();
    expect(kq.bi_tru).toBe(1);
    expect(bn.hoa_hong[0]!.trang_thai).toBe("BI_TRU");
    expect(bn.du.ghi_nhan_don[0]!.trang_thai).toBe("BI_HUY");
    // Chua chi tra -> chi rot khoi tich luy, khong can dieu chinh am
    expect(bn.du.dieu_chinh_hoa_hong).toHaveLength(0);

    // Quet lai khong tru lan hai
    kq = await sv.dongBo();
    expect(kq.bi_tru).toBe(0);
    expect(bn.hoa_hong).toHaveLength(1);
  });

  it("da chi tra roi don moi hoan -> BI_TRU + dieu chinh am dung bang so tien", async () => {
    const bn = chuanBi();
    const don = taoDon({ trang_thai: "giao_thanh_cong" });
    const { sv, cacDon } = dung(bn, don);
    await sv.xuLyDon(don);
    bn.hoa_hong[0]!.trang_thai = "DA_TRA";

    cacDon.set(don.id, { ...don, trang_thai: "hoan" });
    await sv.dongBo();
    expect(bn.hoa_hong[0]!.trang_thai).toBe("BI_TRU");
    expect(bn.du.dieu_chinh_hoa_hong).toHaveLength(1);
    expect(Number(bn.du.dieu_chinh_hoa_hong[0]!.so_tien)).toBe(-80_000);
  });

  it("don da huy luc ghi nhan -> BI_HUY, khong co hoa hong", async () => {
    const bn = chuanBi();
    const don = taoDon({ trang_thai: "huy" });
    const { sv } = dung(bn, don);
    const kq = await sv.xuLyDon(don);
    expect(kq.trang_thai).toBe("BI_HUY");
    expect(bn.hoa_hong).toHaveLength(0);
  });

  it("ghi nhan HOP_LE chua co hoa hong (duyet o quan-tri) -> dong bo tao bu dung mot lan", async () => {
    const bn = chuanBi();
    const don = taoDon({ nguoi_tao: CRM_SALE });
    const { sv } = dung(bn, don);
    const { id } = await sv.xuLyDon(don);
    // quan-tri ap dung XAC_MINH_DON: chi doi ghi_nhan_don
    Object.assign(bn.du.ghi_nhan_don.find(g => g.id === id)!, { trang_thai: "HOP_LE", nguoi_ban_ho_so_id: "sale-1", nguon: "SALE" });
    await sv.dongBo();
    await sv.dongBo();
    expect(bn.hoa_hong).toHaveLength(1);
    // Sale 2% tren ca hai SKU (co quyen ca hai): 1.000.000 * 2% = 20.000
    expect(Number(bn.hoa_hong[0]!.so_tien)).toBe(20_000);
  });
});
