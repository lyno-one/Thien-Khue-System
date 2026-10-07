import { danhGiaDieuKien, type KhoaHocCanDat } from "../../src/common/utils/ho-so";

const KHOA: KhoaHocCanDat[] = [
  { id: "k1", ma: "nhap-mon", ten: "Nhập môn", can_thuc_hanh: false, bai_hoc: [{ id: "b1" }, { id: "b2" }], bai_kiem_tra: [{ id: "t1", tieu_de: "KT nhập môn", nguong_dat: 90 }] },
  { id: "k2", ma: "ctv-online", ten: "CTV online", can_thuc_hanh: true, bai_hoc: [{ id: "b3" }], bai_kiem_tra: [{ id: "t2", tieu_de: "KT CTV", nguong_dat: 90 }] }
];

const hocDu = () => ({
  baiHocXong: new Set(["b1", "b2", "b3"]),
  diemDatCaoNhat: new Map([
    ["t1", 100],
    ["t2", 90]
  ]),
  thucHanhDat: new Set(["k2"])
});

describe("danhGiaDieuKien — hoc truoc khi ban", () => {
  it("du bai hoc + thi >= 90% + thuc hanh duyet -> dat", () => {
    const kq = danhGiaDieuKien(KHOA, hocDu());
    expect(kq.dat).toBe(true);
    expect(kq.con_thieu).toEqual([]);
  });

  it("89% -> chua dat", () => {
    const hoc = hocDu();
    hoc.diemDatCaoNhat.set("t2", 89);
    const kq = danhGiaDieuKien(KHOA, hoc);
    expect(kq.dat).toBe(false);
    expect(kq.con_thieu.join(" ")).toContain("≥ 90%");
  });

  it("thieu bai thuc hanh duoc duyet -> chua dat", () => {
    const hoc = hocDu();
    hoc.thucHanhDat.clear();
    expect(danhGiaDieuKien(KHOA, hoc).dat).toBe(false);
  });

  it("chua xong bai hoc -> chua dat", () => {
    const hoc = hocDu();
    hoc.baiHocXong.delete("b2");
    const kq = danhGiaDieuKien(KHOA, hoc);
    expect(kq.dat).toBe(false);
    expect(kq.dieu_kien.find(d => d.loai === "BAI_HOC" && d.khoa_hoc_id === "k1")?.mo_ta).toBe("Hoàn thành 1/2 bài học");
  });

  it("vai chua cau hinh khoa bat buoc -> khong tu kich hoat (fail-safe)", () => {
    expect(danhGiaDieuKien([], hocDu()).dat).toBe(false);
  });
});
