import {
  type CauHoiCham, chamDe, chonCauHoi, datNguong, type DuLieuHocVien, type KhoaDeTinh, timCauThieu, tinhPhanTram, tinhTienDo
} from "../../src/common/utils/dao-tao";

function cau(id: string, dapAn: number[], diem = 1): CauHoiCham {
  return { id, ma: id, noi_dung: `Câu ${id}`, lua_chon: ["A", "B", "C", "D"], dap_an: dapAn, giai_thich: null, diem, thu_tu: 0 };
}

describe("cham diem — nguong 90%", () => {
  it("89% truot, 90% dat (lam tron xuong, khong lam tron len)", () => {
    expect(tinhPhanTram(89, 100)).toBe(89);
    expect(datNguong(tinhPhanTram(89, 100), 90)).toBe(false);
    expect(tinhPhanTram(899, 1000)).toBe(89); // 89,9% van la 89 -> truot
    expect(datNguong(tinhPhanTram(899, 1000), 90)).toBe(false);
    expect(datNguong(tinhPhanTram(90, 100), 90)).toBe(true);
    expect(datNguong(tinhPhanTram(9, 10), 90)).toBe(true);
  });

  it("de co trong so: sai cau 11 diem / tong 100 -> 89% truot", () => {
    const de = [cau("nang", [0], 11), ...Array.from({ length: 89 }, (_, i) => cau(`c${i}`, [1]))];
    const traLoi: Record<string, number[]> = { nang: [2] };
    for (let i = 0; i < 89; i++) traLoi[`c${i}`] = [1];
    const kq = chamDe(de, traLoi);
    expect(kq.diem).toBe(89);
    expect(datNguong(kq.diem, 90)).toBe(false);
  });

  it("10 cau dung 9 -> 90% dat; dung 8 -> 80% truot", () => {
    const de = Array.from({ length: 10 }, (_, i) => cau(`c${i}`, [i % 4]));
    const dung9: Record<string, number[]> = Object.fromEntries(de.map((c, i) => [c.id, i === 0 ? [3] : c.dap_an]));
    expect(chamDe(de, dung9)).toMatchObject({ diem: 90, so_cau_dung: 9, tong_cau: 10 });
    const dung8: Record<string, number[]> = Object.fromEntries(de.map((c, i) => [c.id, i < 2 ? [3 - (i % 4)] : c.dap_an]));
    expect(datNguong(chamDe(de, dung8).diem, 90)).toBe(false);
  });

  it("nhieu dap an: phai chon dung ca tap", () => {
    const de = [cau("m", [0, 2])];
    expect(chamDe(de, { m: [0] }).so_cau_dung).toBe(0);
    expect(chamDe(de, { m: [2, 0] }).so_cau_dung).toBe(1);
    expect(chamDe(de, { m: [0, 1, 2] }).so_cau_dung).toBe(0);
  });

  it("bat buoc tra loi het: tim cau thieu / chi so ngoai khoang", () => {
    const de = [cau("a", [0]), cau("b", [1]), cau("c", [2])];
    expect(timCauThieu(de, { a: [0], b: [], c: [9] })).toEqual(["b", "c"]);
    expect(timCauThieu(de, { a: [0], b: [1], c: [2] })).toEqual([]);
  });

  it("chon cau hoi theo hat luot lam: on dinh giua bat dau va nop", () => {
    const ds = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, thu_tu: i }));
    const a = chonCauHoi(ds, 5, "luot-1");
    expect(a).toHaveLength(5);
    expect(chonCauHoi(ds, 5, "luot-1")).toEqual(a);
    expect(chonCauHoi(ds, null, "x")).toHaveLength(20);
  });
});

describe("tinhTienDo — dat khoa", () => {
  const khoaSp: KhoaDeTinh = {
    id: "k1",
    loai: "SAN_PHAM",
    phien_ban_tai_lieu: 2,
    can_thuc_hanh: false,
    mau_id: "m1",
    bai_hoc: [{ id: "b1" }, { id: "b2" }],
    bai_kiem_tra: [{ id: "d1", bat_buoc: true }]
  };
  const dl = (p: Partial<DuLieuHocVien>): DuLieuHocVien => ({ baiXong: new Set(["b1", "b2"]), luotLam: [], thucHanh: [], quyenSku: [], ...p });
  const luot = (phienBan: number, dat = true) => ({ id: `l${phienBan}`, bai_kiem_tra_id: "d1", diem: dat ? 100 : 50, dat, phien_ban_tai_lieu: phienBan, nop_luc: new Date() });

  it("khoa SAN_PHAM: thi dat o phien ban cu khong tinh -> chua hoan thanh", () => {
    expect(tinhTienDo(khoaSp, dl({ luotLam: [luot(1)] })).hoan_thanh).toBe(false);
    expect(tinhTienDo(khoaSp, dl({ luotLam: [luot(2)] })).hoan_thanh).toBe(true);
  });

  it("quyen CAN_HOC_LAI -> trang thai CAN_HOC_LAI", () => {
    const t = tinhTienDo(khoaSp, dl({ luotLam: [luot(1)], quyenSku: [{ mau_id: "m1", trang_thai: "CAN_HOC_LAI", phien_ban_tai_lieu: 1 }] }));
    expect(t.trang_thai).toBe("CAN_HOC_LAI");
  });

  it("can thuc hanh: chua duyet thi chua hoan thanh", () => {
    const k = { ...khoaSp, loai: "NGHIEP_VU" as const, can_thuc_hanh: true, mau_id: null };
    const th = (trang_thai: "CHO_CHAM" | "DAT") => ({ id: "t", khoa_hoc_id: "k1", trang_thai, nop_luc: new Date(), nguoi_cham_id: null, nhan_xet: null, cham_luc: null });
    expect(tinhTienDo(k, dl({ luotLam: [luot(1)], thucHanh: [th("CHO_CHAM")] })).hoan_thanh).toBe(false);
    expect(tinhTienDo(k, dl({ luotLam: [luot(1)], thucHanh: [th("DAT")] })).hoan_thanh).toBe(true);
  });

  it("chua hoc het bai thi chua hoan thanh du thi dat", () => {
    expect(tinhTienDo(khoaSp, dl({ baiXong: new Set(["b1"]), luotLam: [luot(2)] })).hoan_thanh).toBe(false);
  });
});
