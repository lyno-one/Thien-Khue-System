import { BadRequestException } from "@nestjs/common";
import { LOAI_DE_XUAT_BA_BUOC as LOAI_BA_BUOC_FE, soBuocDeXuat as soBuocFe, trangThaiKichHoatLamViec, VAI_TU_CRM as VAI_TU_CRM_FE } from "@thien-khue/contracts";
import {
  kiemChuyenVai, kiemVaiKhongTuCrm, LOAI_DE_XUAT_BA_BUOC, LOI_VAI_TU_CRM, loiDuyet, loiKiem, soBuocDeXuat, trangThaiBatDau, trangThaiChoDuyetDb, trangThaiHieuLuc,
  VAI_TU_CRM, vaiDuyetTheoLoai, type DeXuatToiThieu
} from "../../src/common/utils/quan-tri";
import { kiemThuTuHang, suyNguon, tinhHoaHong } from "../../src/services/quan-tri-ap-dung.service";
import { phanLoaiNguoiHoc, tinhHangTheoTong } from "../../src/services/quan-tri.service";

const dx = (x: Partial<DeXuatToiThieu> = {}): DeXuatToiThieu => ({
  loai: "DUYET_QUA_TANG",
  trang_thai: "CHO_DUYET",
  du_lieu: {},
  nguoi_de_xuat_id: "a",
  nguoi_kiem_id: "b",
  ...x
});

describe("luat-duyet — so buoc theo loai", () => {
  it("chi TIEN + du lieu khach giu 3 buoc; con lai 2 buoc", () => {
    expect([...LOAI_DE_XUAT_BA_BUOC].sort()).toEqual(["CHI_TRA_HOA_HONG", "DIEU_CHINH_HOA_HONG", "XAC_MINH_DON", "XUAT_DU_LIEU_KHACH"]);
    for (const l of ["CHUYEN_VAI", "CAP_QUYEN_SKU", "DUYET_QUA_TANG", "DUYET_VOUCHER", "DOI_CHINH_SACH", "KICH_HOAT_LAM_VIEC", "KHAC"] as const) {
      expect(soBuocDeXuat(l)).toBe(2);
      expect(trangThaiBatDau(l)).toBe("CHO_DUYET");
      expect(trangThaiChoDuyetDb(l)).toEqual(["CHO_DUYET", "CHO_KIEM"]);
    }
    for (const l of LOAI_DE_XUAT_BA_BUOC) {
      expect(soBuocDeXuat(l)).toBe(3);
      expect(trangThaiBatDau(l)).toBe("CHO_KIEM");
      expect(trangThaiChoDuyetDb(l)).toEqual(["CHO_DUYET"]);
    }
  });

  it("contracts (web) khop luat api", () => {
    expect([...LOAI_BA_BUOC_FE]).toEqual([...LOAI_DE_XUAT_BA_BUOC]);
    expect([...VAI_TU_CRM_FE]).toEqual([...VAI_TU_CRM]);
    expect(soBuocFe("CHUYEN_VAI")).toBe(2);
    expect(soBuocFe("CHI_TRA_HOA_HONG")).toBe(3);
  });

  it("de xuat 2 buoc con CHO_KIEM (du lieu cu) coi nhu CHO_DUYET; loai tien thi khong", () => {
    expect(trangThaiHieuLuc({ loai: "CHUYEN_VAI", trang_thai: "CHO_KIEM" })).toBe("CHO_DUYET");
    expect(trangThaiHieuLuc({ loai: "XAC_MINH_DON", trang_thai: "CHO_KIEM" })).toBe("CHO_KIEM");
    expect(trangThaiHieuLuc({ loai: "CHUYEN_VAI", trang_thai: "DA_DUYET" })).toBe("DA_DUYET");
  });

  it("2 buoc: khong co buoc kiem; duyet duoc ngay ca khi ban ghi cu con CHO_KIEM; nguoi de xuat khong tu duyet", () => {
    const hai = dx({ trang_thai: "CHO_DUYET", nguoi_kiem_id: null });
    expect(loiKiem({ id: "c", vai: ["ADMIN"] }, { ...hai, trang_thai: "CHO_KIEM" })?.kieu).toBe("trang_thai");
    expect(loiDuyet({ id: "c", vai: ["THIEN_KHUE"] }, hai)).toBeNull();
    expect(loiDuyet({ id: "c", vai: ["THIEN_KHUE"] }, { ...hai, trang_thai: "CHO_KIEM" })).toBeNull();
    expect(loiDuyet({ id: "a", vai: ["THIEN_KHUE"] }, hai)?.thongDiep).toContain("tự duyệt");
    expect(loiDuyet({ id: "c", vai: ["THIEN_KHUE"] }, hai, ["c"])?.thongDiep).toContain("người liên quan");
  });
});

describe("luat-duyet — vai lay tu CRM", () => {
  it("moi vai nghiep vu (ke ca CTV / THUC_TAP / KOL / KOC / MENTOR / DOI_TAC) -> 400 'lấy từ CRM'; chi KHACH qua duoc", () => {
    for (const v of ["ADMIN", "QUAN_LY", "SALE", "CSKH", "THIEN_KHUE", "CTV", "THUC_TAP", "KOL", "KOC", "MENTOR", "DOI_TAC"] as const) {
      expect(() => kiemVaiKhongTuCrm(v)).toThrow(LOI_VAI_TU_CRM);
      expect(() => kiemVaiKhongTuCrm(v)).toThrow(BadRequestException);
    }
    expect(() => kiemVaiKhongTuCrm("KHACH")).not.toThrow();
    expect(() => kiemVaiKhongTuCrm(null)).not.toThrow();
  });
});

describe("hien thi Kich hoat lam viec", () => {
  it("chi ap cho vai phai hoc; khong co vai phai hoc -> Khong ap dung", () => {
    expect(trangThaiKichHoatLamViec([{ vai: "ADMIN", trang_thai: "HOAT_DONG" }, { vai: "QUAN_LY", trang_thai: "HOAT_DONG" }], false)).toBe("KHONG_AP_DUNG");
    expect(trangThaiKichHoatLamViec([{ vai: "SALE", trang_thai: "KET_THUC" }, { vai: "MENTOR", trang_thai: "HOAT_DONG" }], true)).toBe("KHONG_AP_DUNG");
    expect(trangThaiKichHoatLamViec([{ vai: "SALE", trang_thai: "DANG_HOC" }], false)).toBe("CHUA_KICH_HOAT");
    expect(trangThaiKichHoatLamViec([{ vai: "CTV", trang_thai: "HOAT_DONG" }], true)).toBe("DA_KICH_HOAT");
  });
});

describe("luat-duyet", () => {
  it("TIEN 3 nguoi khac nhau: de xuat != kiem != duyet", () => {
    const tien = (x: Partial<DeXuatToiThieu> = {}) => dx({ loai: "CHI_TRA_HOA_HONG", ...x });
    expect(loiKiem({ id: "a", vai: ["ADMIN"] }, tien({ trang_thai: "CHO_KIEM", nguoi_kiem_id: null }))?.kieu).toBe("quyen");
    expect(loiDuyet({ id: "c", vai: ["THIEN_KHUE"] }, tien({ trang_thai: "CHO_KIEM", nguoi_kiem_id: null }))?.thongDiep).toContain("chưa được kiểm");
    expect(loiDuyet({ id: "a", vai: ["THIEN_KHUE"] }, tien())?.thongDiep).toContain("tự duyệt");
    expect(loiDuyet({ id: "b", vai: ["THIEN_KHUE"] }, tien())?.thongDiep).toContain("Người kiểm");
    expect(loiDuyet({ id: "c", vai: ["THIEN_KHUE"] }, tien())).toBeNull();
  });

  it("qua tang / chinh sach / dong tien: chi THIEN_KHUE duyet, ADMIN khong duoc", () => {
    expect(loiDuyet({ id: "c", vai: ["ADMIN"] }, dx())?.kieu).toBe("quyen");
    expect(vaiDuyetTheoLoai("DOI_CHINH_SACH")).toEqual(["THIEN_KHUE"]);
    expect(vaiDuyetTheoLoai("CHI_TRA_HOA_HONG")).toEqual(["THIEN_KHUE"]);
    expect(vaiDuyetTheoLoai("XAC_MINH_DON")).toEqual(["ADMIN", "THIEN_KHUE"]);
  });

  it("cap vai ADMIN / THIEN_KHUE: chi THIEN_KHUE duyet (doc ca dang du lieu cua ho-so)", () => {
    expect(vaiDuyetTheoLoai("CHUYEN_VAI", { vai: "ADMIN" })).toEqual(["THIEN_KHUE"]);
    expect(vaiDuyetTheoLoai("CHUYEN_VAI", { vai_moi: "KOC" })).toEqual(["ADMIN", "THIEN_KHUE"]);
  });

  it("QUAN_LY chi kiem (loai tien), khong duyet", () => {
    expect(loiKiem({ id: "c", vai: ["QUAN_LY"] }, dx({ loai: "XAC_MINH_DON", trang_thai: "CHO_KIEM", nguoi_kiem_id: null }))).toBeNull();
    expect(loiDuyet({ id: "c", vai: ["QUAN_LY"] }, dx({ loai: "CHUYEN_VAI", du_lieu: { vai: "KOC" } }))?.kieu).toBe("quyen");
  });

  it("hoc truoc khi ban: vai phai hoc khong nhay len HOAT_DONG bang de xuat", () => {
    expect(() => kiemChuyenVai("SALE", "DANG_HOC", "HOAT_DONG")).toThrow(BadRequestException);
    expect(() => kiemChuyenVai("KOC", null, "HOAT_DONG")).toThrow(BadRequestException);
    expect(() => kiemChuyenVai("SALE", "TAM_DUNG", "HOAT_DONG")).not.toThrow(); // da tung dat
    expect(() => kiemChuyenVai("KOC", null, "DANG_HOC")).not.toThrow();
    expect(() => kiemChuyenVai("MENTOR", null, "HOAT_DONG")).not.toThrow();
    expect(() => kiemChuyenVai("MENTOR", null, "DANG_HOC")).toThrow(BadRequestException);
    expect(() => kiemChuyenVai("CTV", null, "TAM_DUNG")).toThrow(BadRequestException);
  });
});

describe("ap dung — ham thuan", () => {
  it("nguon don theo vai nguoi ban", () => {
    expect(suyNguon(["KOC", "KHACH"])).toBe("KOC");
    expect(suyNguon(["THUC_TAP"])).toBe("CTV");
    expect(suyNguon(["SALE"])).toBe("SALE");
  });

  it("hoa hong lam tron dong", () => {
    expect(tinhHoaHong(450000, 8)).toBe(36000);
    expect(tinhHoaHong(333333, 2.5)).toBe(8333);
    expect(tinhHoaHong(100000, 0)).toBe(0);
  });

  it("nguong Than thiet phai thap hon VIP", () => {
    expect(() => kiemThuTuHang([{ hang: "THAN_THIET", nguong: 120_000_000 }, { hang: "VIP", nguong: 100_000_000 }])).toThrow(BadRequestException);
    expect(() => kiemThuTuHang([{ hang: "THAN_THIET", nguong: 50_000_000 }, { hang: "VIP", nguong: 100_000_000 }])).not.toThrow();
  });

  it("hang tinh luc doc tu tong mua hop le", () => {
    const ch = [
      { hang: "THAN_THIET" as const, nguong: 50_000_000, bat: true },
      { hang: "VIP" as const, nguong: 100_000_000, bat: true }
    ];
    expect(tinhHangTheoTong(49_999_999, ch)).toBeNull();
    expect(tinhHangTheoTong(50_000_000, ch)).toBe("THAN_THIET");
    expect(tinhHangTheoTong(100_000_000, ch)).toBe("VIP");
  });

  it("phan loai nguoi hoc tren bang dieu hanh", () => {
    const co = { baiHocXong: 0, tongBaiHoc: 10, baiDat: 0, tongBai: 2, truotNhieuNhat: 0, coLuotLam: false };
    expect(phanLoaiNguoiHoc({ ...co, vaiDangHoc: [{ vai: "SALE", trang_thai: "DANG_HOC" }] })).toBe("CHUA_BAT_DAU");
    expect(phanLoaiNguoiHoc({ ...co, baiHocXong: 3, vaiDangHoc: [{ vai: "SALE", trang_thai: "DANG_HOC" }] })).toBe("DANG_HOC");
    expect(phanLoaiNguoiHoc({ ...co, truotNhieuNhat: 2, coLuotLam: true, vaiDangHoc: [{ vai: "CTV", trang_thai: "DANG_HOC" }] })).toBe("CAN_HO_TRO");
    expect(phanLoaiNguoiHoc({ ...co, vaiDangHoc: [{ vai: "SALE", trang_thai: "HOAT_DONG" }] })).toBe("HOAN_THANH");
  });
});
