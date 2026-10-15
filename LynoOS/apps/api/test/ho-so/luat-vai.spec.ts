import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { Vai } from "@prisma/client";
import { kiemChuyenTrangThai, kiemQuyenDoiVai, trangThaiKhoiTao } from "../../src/common/utils/ho-so";

const nguoi = (id: string, vai: Vai[]) => ({ id, vai });
const KHAC = "22222222-2222-4222-8222-222222222222";

describe("luat vai — map trang thai khoi tao", () => {
  it.each<[Vai, string]>([
    ["CTV", "DANG_HOC"],
    ["THUC_TAP", "DANG_HOC"],
    ["KOL", "DANG_HOC"],
    ["KOC", "DANG_HOC"],
    ["SALE", "DANG_HOC"],
    ["CSKH", "DANG_HOC"],
    ["KHACH", "HOAT_DONG"],
    ["MENTOR", "HOAT_DONG"],
    ["QUAN_LY", "HOAT_DONG"]
  ])("%s -> %s", (vai, tt) => {
    expect(trangThaiKhoiTao(vai)).toBe(tt);
  });
});

describe("luat vai — khong tu cap vai cho minh", () => {
  it("ADMIN cung khong tu doi vai cua chinh minh", () => {
    expect(() => kiemQuyenDoiVai(nguoi("a", ["ADMIN"]), "a", "CTV")).toThrow(ForbiddenException);
    expect(() => kiemQuyenDoiVai(nguoi("a", ["THIEN_KHUE"]), "a", "QUAN_LY")).toThrow(ForbiddenException);
  });

  it("QUAN_LY them CTV cho nguoi khac duoc", () => {
    expect(() => kiemQuyenDoiVai(nguoi("q", ["QUAN_LY"]), KHAC, "CTV")).not.toThrow();
  });

  it("QUAN_LY khong cap vai cap cao (QUAN_LY / ADMIN / THIEN_KHUE)", () => {
    for (const v of ["QUAN_LY", "ADMIN", "THIEN_KHUE"] as Vai[]) {
      expect(() => kiemQuyenDoiVai(nguoi("q", ["QUAN_LY"]), KHAC, v)).toThrow(ForbiddenException);
    }
  });

  it("ADMIN cap QUAN_LY duoc nhung khong cap THIEN_KHUE", () => {
    expect(() => kiemQuyenDoiVai(nguoi("a", ["ADMIN"]), KHAC, "QUAN_LY")).not.toThrow();
    expect(() => kiemQuyenDoiVai(nguoi("a", ["ADMIN"]), KHAC, "THIEN_KHUE")).toThrow(ForbiddenException);
    expect(() => kiemQuyenDoiVai(nguoi("t", ["THIEN_KHUE"]), KHAC, "THIEN_KHUE")).not.toThrow();
  });

  it("vai thuong (SALE, CTV, MENTOR) khong duoc doi vai nguoi khac", () => {
    expect(() => kiemQuyenDoiVai(nguoi("s", ["SALE", "MENTOR"]), KHAC, "CTV")).toThrow(ForbiddenException);
  });
});

describe("luat vai — chuyen trang thai bang tay", () => {
  it("vai phai hoc DANG_HOC khong duoc bat HOAT_DONG bang tay", () => {
    expect(() => kiemChuyenTrangThai("CTV", "DANG_HOC", "HOAT_DONG")).toThrow(BadRequestException);
  });
  it("khong chuyen ve DANG_HOC, khong doi vai da KET_THUC", () => {
    expect(() => kiemChuyenTrangThai("CTV", "HOAT_DONG", "DANG_HOC")).toThrow(BadRequestException);
    expect(() => kiemChuyenTrangThai("CTV", "KET_THUC", "HOAT_DONG")).toThrow(BadRequestException);
  });
  it("tam dung / ket thuc / khoi phuc hop le", () => {
    expect(() => kiemChuyenTrangThai("SALE", "HOAT_DONG", "TAM_DUNG")).not.toThrow();
    expect(() => kiemChuyenTrangThai("SALE", "TAM_DUNG", "HOAT_DONG")).not.toThrow();
    expect(() => kiemChuyenTrangThai("CTV", "DANG_HOC", "KET_THUC")).not.toThrow();
  });
});
