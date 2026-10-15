import { Prisma } from "@prisma/client";
import { coVai } from "../../src/common/guards/vai.guard";
import { chuanHoaGiaTri } from "../../src/common/interceptors/bao-response.interceptor";
import { phanTrang, taoMetaPhanTrang } from "../../src/common/utils/phan-trang";

describe("coVai", () => {
  it("chi tinh vai HOAT_DONG trong danh sach", () => {
    expect(coVai({ vai: ["SALE"] }, ["SALE", "CSKH"])).toBe(true);
    expect(coVai({ vai: ["KHACH"] }, ["SALE"])).toBe(false);
    expect(coVai(undefined, ["SALE"])).toBe(false);
  });

  it("ADMIN / THIEN_KHUE luon qua", () => {
    expect(coVai({ vai: ["ADMIN"] }, ["KOC"])).toBe(true);
    expect(coVai({ vai: ["THIEN_KHUE"] }, ["CTV"])).toBe(true);
  });
});

describe("chuanHoaGiaTri (interceptor { data })", () => {
  it("Decimal / BigInt -> number, giu Date", () => {
    const ngay = new Date("2026-10-07T00:00:00Z");
    expect(chuanHoaGiaTri({ tien: new Prisma.Decimal("50000000"), n: BigInt(3), ngay, ds: [new Prisma.Decimal("1.5")] })).toEqual({
      tien: 50000000,
      n: 3,
      ngay,
      ds: [1.5]
    });
  });
});

describe("phanTrang", () => {
  it("mac dinh trang 1, 20 dong", () => {
    expect(phanTrang(undefined)).toEqual({ skip: 0, take: 20, trang: 1, so_dong: 20 });
    expect(phanTrang({ trang: 3, so_dong: 10 })).toEqual({ skip: 20, take: 10, trang: 3, so_dong: 10 });
    expect(taoMetaPhanTrang(1, 20, 41)).toEqual({ trang: 1, so_dong: 20, tong: 41, tong_trang: 3 });
  });
});
