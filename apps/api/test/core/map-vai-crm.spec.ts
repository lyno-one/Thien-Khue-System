import { mapVaiCrm, type NhanSuDeMap, TRANG_THAI_VAI_BAN_HANG_TU_CRM, vaiTheoNhomQuyen } from "../../src/common/utils/core";

// KIEN-TRUC muc 4 — vai CHI lay tu CRM (role + nhom quyen phong ban), khong map theo chuc danh
const ns = (p: Partial<NhanSuDeMap>): NhanSuDeMap => ({ role: "employee", active: true, nhom_quyen: "KHONG", ...p });
const tom = (n: NhanSuDeMap | null) => mapVaiCrm(n).map(v => `${v.vai}:${v.trang_thai}`);

describe("mapVaiCrm (KIEN-TRUC muc 4)", () => {
  it.each<[string, NhanSuDeMap | null, string[]]>([
    ["khong phai nhan su", null, []],
    ["bi khoa (active=false) — ke ca admin", ns({ role: "admin", active: false }), []],
    ["bi khoa nhom SALE", ns({ active: false, nhom_quyen: "SALE" }), []],
    ["bi khoa nhom CTV", ns({ active: false, nhom_quyen: "CTV" }), []],
    ["admin", ns({ role: "admin" }), ["ADMIN:HOAT_DONG", "THIEN_KHUE:HOAT_DONG"]],
    ["manager khong phong", ns({ role: "manager" }), ["QUAN_LY:HOAT_DONG", "MENTOR:HOAT_DONG"]],
    ["manager nhom SALE", ns({ role: "manager", nhom_quyen: "SALE" }), ["QUAN_LY:HOAT_DONG", "MENTOR:HOAT_DONG", "SALE:DANG_HOC"]],
    ["manager nhom KHO", ns({ role: "manager", nhom_quyen: "KHO" }), ["QUAN_LY:HOAT_DONG", "MENTOR:HOAT_DONG"]],
    ["employee nhom SALE", ns({ nhom_quyen: "SALE" }), ["SALE:DANG_HOC"]],
    ["employee nhom CSKH", ns({ nhom_quyen: "CSKH" }), ["CSKH:DANG_HOC"]],
    ["employee nhom THUC_TAP", ns({ nhom_quyen: "THUC_TAP" }), ["THUC_TAP:DANG_HOC"]],
    ["employee nhom CTV", ns({ nhom_quyen: "CTV" }), ["CTV:DANG_HOC"]],
    ["employee nhom KOL", ns({ nhom_quyen: "KOL" }), ["KOL:DANG_HOC"]],
    ["employee nhom KOC", ns({ nhom_quyen: "KOC" }), ["KOC:DANG_HOC"]],
    ["employee nhom DOI_TAC (khong can hoc)", ns({ nhom_quyen: "DOI_TAC" }), ["DOI_TAC:HOAT_DONG"]],
    ["employee nhom KHO", ns({ nhom_quyen: "KHO" }), []],
    ["employee nhom KE_TOAN", ns({ nhom_quyen: "KE_TOAN" }), []],
    ["employee KHONG", ns({}), []],
    ["employee chua co phong (null)", ns({ nhom_quyen: null }), []],
    ["nhom quyen la (CRM them nhom moi) -> khong vai", ns({ nhom_quyen: "MARKETING" }), []]
  ])("%s", (_ten, nhanSu, mongDoi) => {
    expect(tom(nhanSu)).toEqual(mongDoi);
  });

  it("vai phai hoc tu CRM luon DANG_HOC (khong tu HOAT_DONG)", () => {
    expect(TRANG_THAI_VAI_BAN_HANG_TU_CRM).toBe("DANG_HOC");
  });

  it("vaiTheoNhomQuyen khong phan biet hoa thuong / khoang trang", () => {
    expect(vaiTheoNhomQuyen(" ctv ")).toEqual({ vai: "CTV", trang_thai: "DANG_HOC" });
    expect(vaiTheoNhomQuyen(undefined)).toBeNull();
    expect(vaiTheoNhomQuyen("toString")).toBeNull();
  });
});
