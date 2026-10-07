import {
  chonTyLe,
  chuyenTrangThaiHoaHong,
  kyDoiSoat,
  quyetDinhGhiNhan,
  skuThieuQuyen,
  tachMaGioiThieu,
  taoChuoiMa,
  tinhHoaHong,
  trangThaiHoaHongBanDau
} from "../../src/common/utils/mang-luoi";

describe("quy tac mang luoi — mot don mot nguoi ban", () => {
  const CTV = { hoSoId: "ctv-1", vai: "CTV" as const };
  const SALE = { hoSoId: "sale-1", vai: "SALE" as const };

  it("ma gioi thieu khac nguoi chot -> CHO_XAC_MINH, chua co nguoi ban", () => {
    const qd = quyetDinhGhiNhan({ trangThaiDon: "moi", chuMa: CTV, nguoiChot: SALE });
    expect(qd).toMatchObject({ trang_thai: "CHO_XAC_MINH", nguoi_ban_ho_so_id: null, nguon: "CTV", vai_tinh: null });
  });

  it("chi co ma gioi thieu -> HOP_LE cho chu ma", () => {
    expect(quyetDinhGhiNhan({ trangThaiDon: "moi", chuMa: CTV, nguoiChot: null })).toMatchObject({ trang_thai: "HOP_LE", nguoi_ban_ho_so_id: "ctv-1", nguon: "CTV" });
  });

  it("chu ma cung la nguoi chot -> khong xung dot", () => {
    expect(quyetDinhGhiNhan({ trangThaiDon: "moi", chuMa: { hoSoId: "x", vai: "KOC" }, nguoiChot: { hoSoId: "x", vai: "SALE" } })).toMatchObject({
      trang_thai: "HOP_LE",
      nguoi_ban_ho_so_id: "x",
      nguon: "KOC"
    });
  });

  it("chi co Sale chot -> HOP_LE nguon SALE; khong ai -> null", () => {
    expect(quyetDinhGhiNhan({ trangThaiDon: "dang_giao", chuMa: null, nguoiChot: SALE })).toMatchObject({ trang_thai: "HOP_LE", nguon: "SALE" });
    expect(quyetDinhGhiNhan({ trangThaiDon: "moi", chuMa: null, nguoiChot: null })).toBeNull();
  });

  it("don da hoan luc ghi nhan -> BI_HUY", () => {
    expect(quyetDinhGhiNhan({ trangThaiDon: "hoan", chuMa: CTV, nguoiChot: SALE })?.trang_thai).toBe("BI_HUY");
    expect(quyetDinhGhiNhan({ trangThaiDon: "huy", chuMa: CTV, nguoiChot: null })?.trang_thai).toBe("BI_HUY");
  });
});

describe("quy tac hoa hong", () => {
  it("trang thai ban dau theo don", () => {
    expect(trangThaiHoaHongBanDau("moi")).toBe("CHO_DOI_SOAT");
    expect(trangThaiHoaHongBanDau("giao_thanh_cong")).toBe("DU_DIEU_KIEN");
    expect(trangThaiHoaHongBanDau("hoan")).toBe("BI_TRU");
  });

  it("hoan / huy -> BI_TRU; da tra roi moi hoan -> ghi dieu chinh tru", () => {
    expect(chuyenTrangThaiHoaHong("DU_DIEU_KIEN", "hoan")).toEqual({ moi: "BI_TRU", ghiDieuChinhTru: false });
    expect(chuyenTrangThaiHoaHong("CHO_DOI_SOAT", "huy")).toEqual({ moi: "BI_TRU", ghiDieuChinhTru: false });
    expect(chuyenTrangThaiHoaHong("DA_TRA", "hoan")).toEqual({ moi: "BI_TRU", ghiDieuChinhTru: true });
    expect(chuyenTrangThaiHoaHong("BI_TRU", "hoan")).toBeNull();
  });

  it("giao thanh cong -> DU_DIEU_KIEN chi tu CHO_DOI_SOAT", () => {
    expect(chuyenTrangThaiHoaHong("CHO_DOI_SOAT", "giao_thanh_cong")).toEqual({ moi: "DU_DIEU_KIEN", ghiDieuChinhTru: false });
    expect(chuyenTrangThaiHoaHong("DA_TRA", "giao_thanh_cong")).toBeNull();
    expect(chuyenTrangThaiHoaHong("CHO_DOI_SOAT", "dang_giao")).toBeNull();
  });

  it("chi tinh dong SKU da co quyen, phan bo giam gia", () => {
    const kq = tinhHoaHong(
      [
        { mau_id: "a", so_luong: 2, don_gia: 500_000 },
        { mau_id: "b", so_luong: 1, don_gia: 1_000_000 }
      ],
      1_800_000, // giam 10%
      new Set(["a"]),
      () => 10
    );
    // dong a: 1.000.000 * 0.9 = 900.000 * 10% = 90.000; dong b bi bo qua (chua quyen)
    expect(kq).toEqual({ so_tien: 90_000, co_so: 900_000, ty_le: 10, mau_bo_qua: ["b"] });
  });

  it("phi ship (tong_tien > tong dong) khong tinh hoa hong", () => {
    expect(tinhHoaHong([{ mau_id: "a", so_luong: 1, don_gia: 400_000 }], 430_000, new Set(["a"]), () => 10).so_tien).toBe(40_000);
  });

  it("ty le rieng SKU uu tien ty le chung, lay dong moi nhat", () => {
    const ds = [
      { mau_id: null, ty_le: 10, hieu_luc_tu: new Date("2026-01-01") },
      { mau_id: null, ty_le: 12, hieu_luc_tu: new Date("2026-06-01") },
      { mau_id: "a", ty_le: 15, hieu_luc_tu: new Date("2026-02-01") }
    ];
    expect(chonTyLe(ds, "a")).toBe(15);
    expect(chonTyLe(ds, "b")).toBe(12);
    expect(chonTyLe(ds, "b", new Date("2026-03-01"))).toBe(10); // theo ngay tao don
    expect(chonTyLe([], "b")).toBe(0);
  });

  it("ty le ban hanh SAU ngay tao don -> van dung dong som nhat (don cu khong bi 0)", () => {
    const ds = [
      { mau_id: null, ty_le: 10, hieu_luc_tu: new Date("2026-10-07") },
      { mau_id: null, ty_le: 12, hieu_luc_tu: new Date("2026-12-01") }
    ];
    expect(chonTyLe(ds, "a", new Date("2026-09-01"))).toBe(10);
  });
});

describe("tien ich", () => {
  it("tach ma gioi thieu tu ghi chu CRM", () => {
    expect(tachMaGioiThieu("Khach quen [MGT:al01-k7q2m9] giao gio hanh chinh")).toBe("AL01-K7Q2M9");
    expect(tachMaGioiThieu("khong co ma")).toBeNull();
    expect(tachMaGioiThieu(null)).toBeNull();
  });

  it("tao chuoi ma theo SKU", () => {
    let i = 0;
    expect(taoChuoiMa("al01", () => i++ % 3)).toBe("AL01-234234");
    expect(taoChuoiMa("AK01")).toMatch(/^AK01-[2-9A-Z]{6}$/);
  });

  it("ky doi soat theo gio Viet Nam", () => {
    expect(kyDoiSoat(new Date("2026-09-30T18:00:00Z"))).toBe("2026-10"); // 01:00 ngay 1/10 gio VN
  });

  it("chien dich: SKU thieu quyen", () => {
    expect(skuThieuQuyen(["a", "b"], new Set(["a"]))).toEqual(["b"]);
    expect(skuThieuQuyen(["a"], new Set(["a", "c"]))).toEqual([]);
  });
});
