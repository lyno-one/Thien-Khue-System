import {
  chuyenTrangThaiHoaHong,
  donBiHuy,
  donDaTraHang,
  quyetDinhGhiNhan,
  trangThaiHoaHongBanDau
} from "../../src/common/utils/mang-luoi";

// LOI-CAN-SUA muc 10: tra hang qua doi tra CRM giu don goc o 'giao_thanh_cong' -> phai nhan ra bang co da_tra_hang
describe("quy tac mang luoi — don da tra hang qua doi tra CRM", () => {
  const DA_TRA = { trang_thai: "giao_thanh_cong", da_tra_hang: true };
  const KHONG_TRA = { trang_thai: "giao_thanh_cong", da_tra_hang: false };
  const CTV = { hoSoId: "ctv-1", vai: "CTV" as const };

  it("don tra ca don (van giao_thanh_cong) bi coi nhu rot", () => {
    expect(donDaTraHang(DA_TRA)).toBe(true);
    expect(donBiHuy(DA_TRA)).toBe(true);
    expect(donBiHuy(KHONG_TRA)).toBe(false);
  });

  it("hoa hong dang DU_DIEU_KIEN / CHO_DOI_SOAT cua don da tra -> BI_TRU", () => {
    expect(chuyenTrangThaiHoaHong("DU_DIEU_KIEN", DA_TRA)).toEqual({ moi: "BI_TRU", ghiDieuChinhTru: false });
    expect(chuyenTrangThaiHoaHong("CHO_DOI_SOAT", DA_TRA)).toEqual({ moi: "BI_TRU", ghiDieuChinhTru: false });
  });

  it("da chi tra roi khach moi tra hang -> BI_TRU kem dieu chinh am", () => {
    expect(chuyenTrangThaiHoaHong("DA_TRA", DA_TRA)).toEqual({ moi: "BI_TRU", ghiDieuChinhTru: true });
    expect(chuyenTrangThaiHoaHong("BI_TRU", DA_TRA)).toBeNull();
  });

  it("hoa hong tao moi cho don da tra -> BI_TRU (khong DU_DIEU_KIEN du don giao_thanh_cong)", () => {
    expect(trangThaiHoaHongBanDau(DA_TRA)).toBe("BI_TRU");
    expect(trangThaiHoaHongBanDau(KHONG_TRA)).toBe("DU_DIEU_KIEN");
  });

  it("ghi nhan don da tra -> BI_HUY, ly do noi ro tra hang", () => {
    const qd = quyetDinhGhiNhan({ trangThaiDon: DA_TRA, chuMa: CTV, nguoiChot: null });
    expect(qd).toMatchObject({ trang_thai: "BI_HUY", ly_do: "Khách đã trả hàng (đổi trả CRM)" });
  });

  it("don DOI hang (khong co co da_tra_hang) khong mat tich luy / hoa hong", () => {
    expect(chuyenTrangThaiHoaHong("CHO_DOI_SOAT", KHONG_TRA)).toEqual({ moi: "DU_DIEU_KIEN", ghiDieuChinhTru: false });
    expect(chuyenTrangThaiHoaHong("DU_DIEU_KIEN", KHONG_TRA)).toBeNull();
  });

  it("tuong thich nguoc: van nhan chuoi trang thai nhu cu", () => {
    expect(donBiHuy("hoan")).toBe(true);
    expect(donBiHuy("giao_thanh_cong")).toBe(false);
    expect(trangThaiHoaHongBanDau("giao_thanh_cong")).toBe("DU_DIEU_KIEN");
    expect(chuyenTrangThaiHoaHong("DA_TRA", "huy")).toEqual({ moi: "BI_TRU", ghiDieuChinhTru: true });
    expect(quyetDinhGhiNhan({ trangThaiDon: "hoan", chuMa: CTV, nguoiChot: null })?.ly_do).toBe("Đơn đã hoàn / huỷ trên CRM");
    // DonCrm cu / mock khong co co -> khong tra
    expect(donBiHuy({ trang_thai: "giao_thanh_cong" })).toBe(false);
  });
});
