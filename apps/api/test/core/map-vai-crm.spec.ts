import { mapVaiCrm, type NhanSuDeMap, TRANG_THAI_VAI_BAN_HANG_TU_CRM, viTriTheoChucDanh } from "../../src/common/utils/core";

// KIEN-TRUC muc 4 — "uu tien lay vai tu CRM": bang map day du
const ns = (p: Partial<NhanSuDeMap>): NhanSuDeMap => ({ role: "employee", active: true, nhom_quyen: "KHONG", position: null, ...p });
const tom = (n: NhanSuDeMap | null) => mapVaiCrm(n).map(v => `${v.vai}:${v.trang_thai}`);

describe("mapVaiCrm (KIEN-TRUC muc 4)", () => {
  it.each<[string, NhanSuDeMap | null, string[]]>([
    ["khong phai nhan su", null, []],
    ["bi khoa (active=false) — ke ca admin", ns({ role: "admin", active: false }), []],
    ["bi khoa nhom SALE", ns({ active: false, nhom_quyen: "SALE" }), []],
    ["bi khoa chuc danh CTV", ns({ active: false, position: "CTV" }), []],
    ["admin", ns({ role: "admin" }), ["ADMIN:HOAT_DONG", "THIEN_KHUE:HOAT_DONG"]],
    ["manager khong phong", ns({ role: "manager" }), ["QUAN_LY:HOAT_DONG", "MENTOR:HOAT_DONG"]],
    ["manager nhom SALE", ns({ role: "manager", nhom_quyen: "SALE" }), ["QUAN_LY:HOAT_DONG", "MENTOR:HOAT_DONG", "SALE:DANG_HOC"]],
    ["manager nhom KHO", ns({ role: "manager", nhom_quyen: "KHO" }), ["QUAN_LY:HOAT_DONG", "MENTOR:HOAT_DONG"]],
    ["employee nhom SALE", ns({ nhom_quyen: "SALE" }), ["SALE:DANG_HOC"]],
    ["employee nhom CSKH", ns({ nhom_quyen: "CSKH" }), ["CSKH:DANG_HOC"]],
    ["employee nhom KHO", ns({ nhom_quyen: "KHO" }), []],
    ["employee nhom KE_TOAN", ns({ nhom_quyen: "KE_TOAN" }), []],
    ["employee KHONG + chuc danh CTV", ns({ position: "CTV bán hàng" }), ["CTV:DANG_HOC"]],
    ["employee KHONG + chuc danh Cộng tác viên", ns({ position: "Cộng tác viên" }), ["CTV:DANG_HOC"]],
    ["employee chua co phong (null) + chuc danh CTV", ns({ nhom_quyen: null, position: "ctv" }), ["CTV:DANG_HOC"]],
    ["employee KHONG + chuc danh Marketing", ns({ position: "Nhân viên Marketing" }), ["KOC:DANG_HOC"]],
    ["employee KHONG + chuc danh MKT", ns({ position: "MKT" }), ["KOC:DANG_HOC"]],
    ["employee KHONG + chuc danh Content", ns({ position: "Content creator" }), ["KOC:DANG_HOC"]],
    ["employee KHONG + chuc danh Truyền thông", ns({ position: "Truyền thông" }), ["KOC:DANG_HOC"]],
    ["employee KHONG + chuc danh khac", ns({ position: "Thiết kế" }), []],
    ["employee KHONG + khong chuc danh", ns({ position: null }), []],
    ["chuc danh CTV nhung o phong SALE -> nhom quyen quyet dinh", ns({ nhom_quyen: "SALE", position: "CTV" }), ["SALE:DANG_HOC"]],
    ["chuc danh marketing nhung o phong KHO -> khong vai", ns({ nhom_quyen: "KHO", position: "Marketing" }), []]
  ])("%s", (_ten, nhanSu, mongDoi) => {
    expect(tom(nhanSu)).toEqual(mongDoi);
  });

  it("vai phai hoc tu CRM luon DANG_HOC (khong tu HOAT_DONG)", () => {
    expect(TRANG_THAI_VAI_BAN_HANG_TU_CRM).toBe("DANG_HOC");
  });

  it("viTriTheoChucDanh khop CRM viTriCuaNhanSu: marketing xet truoc ctv", () => {
    expect(viTriTheoChucDanh("CTV marketing")).toBe("marketing");
    expect(viTriTheoChucDanh("Cong tac vien")).toBe("ctv");
    expect(viTriTheoChucDanh("CỘNG TÁC VIÊN")).toBe("ctv");
    expect(viTriTheoChucDanh("Cộng tác viên".normalize("NFD"))).toBe("ctv");
    expect(viTriTheoChucDanh("truyen thong")).toBe("marketing");
    expect(viTriTheoChucDanh("")).toBeNull();
    expect(viTriTheoChucDanh(undefined)).toBeNull();
  });
});
