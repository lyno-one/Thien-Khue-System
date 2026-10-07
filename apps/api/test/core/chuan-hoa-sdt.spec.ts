import { chuanHoaSdt, laSdtHopLe } from "../../src/infrastructure/crm/chuan-hoa-sdt";

describe("chuanHoaSdt (giong CRM)", () => {
  it("bo ky tu khong phai so", () => {
    expect(chuanHoaSdt("0901 234-567")).toBe("0901234567");
    expect(chuanHoaSdt("(090) 123.4567")).toBe("0901234567");
  });

  it("84... -> 0...", () => {
    expect(chuanHoaSdt("+84901234567")).toBe("0901234567");
    expect(chuanHoaSdt("84901234567")).toBe("0901234567");
  });

  it("9 so -> them 0", () => {
    expect(chuanHoaSdt("901234567")).toBe("0901234567");
  });

  it("chuoi rong / null", () => {
    expect(chuanHoaSdt("")).toBe("");
    expect(chuanHoaSdt(null)).toBe("");
    expect(chuanHoaSdt(undefined)).toBe("");
  });

  it("laSdtHopLe", () => {
    expect(laSdtHopLe("+84 901 234 567")).toBe(true);
    expect(laSdtHopLe("12345")).toBe(false);
  });
});
