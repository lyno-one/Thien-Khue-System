import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { CrmDocService, MauCrm, TonKhoCrm } from "../../src/infrastructure/crm/crm-doc.service";
import { chuanHoaBangSize, suyNhom, tomTatTonKho } from "../../src/common/utils/cong-khai";
import { SanPhamCongKhaiService } from "../../src/services/cong-khai.service";

function mau(ma: string, them: Partial<MauCrm> = {}): MauCrm {
  return {
    id: `id-${ma}`,
    ma,
    ten: `Mẫu ${ma}`,
    chat_lieu: "Lụa",
    form_dang: "Suông",
    size_chart: [{ size: "S", nguc: 86 }, { size: "M", nguc: "90" }, { khong_size: 1 }],
    gia_ban: 450000,
    anh_url: `http://anh/${ma}.png`,
    anh_size_chart: null,
    cau_tu_van: "Câu tư vấn NỘI BỘ",
    tu_khoa: "tu khoa noi bo",
    trang_thai: "dang_ban",
    updated_at: new Date("2026-01-01"),
    ...them
  };
}

const TON: TonKhoCrm[] = [
  { size: "M", mau_sac: "Trắng", so_luong: 12 },
  { size: "S", mau_sac: "Đen", so_luong: 3 },
  { size: "XL", mau_sac: "Đen", so_luong: 0 }
];

function taoService(dsMau: MauCrm[]) {
  const crmDoc = {
    layDanhSachMau: jest.fn(async () => dsMau),
    layMauTheoMa: jest.fn(async (ma: string) => dsMau.find(m => m.ma === ma.toUpperCase()) ?? null),
    layTonKho: jest.fn(async () => TON)
  } as unknown as CrmDocService;
  return { svc: new SanPhamCongKhaiService(crmDoc), crmDoc };
}

const TRUONG_CONG_KHAI = ["anh_url", "con_hang", "gia_ban", "ma", "nhom", "ten", "trang_thai"];

describe("SanPhamCongKhaiService — chi tra truong cong khai", () => {
  it("danh sach: chi dung whitelist truong, khong lo id / cau tu van / tu khoa / ton kho", async () => {
    const { svc } = taoService([mau("AL01")]);
    const ds = await svc.danhSach();
    expect(ds).toHaveLength(1);
    expect(Object.keys(ds[0]!).sort()).toEqual(TRUONG_CONG_KHAI);
    const json = JSON.stringify(ds);
    expect(json).not.toContain("id-AL01");
    expect(json).not.toContain("NỘI BỘ");
    expect(json).not.toContain("tu khoa noi bo");
    expect(ds[0]).toMatchObject({ ma: "AL01", gia_ban: 450000, trang_thai: "dang_ban", con_hang: true, nhom: "Áo & sơ mi" });
  });

  it("an mau 'ngung' (ke ca neu CRM tra nham) va gia null giu null", async () => {
    const { svc } = taoService([mau("AL01", { gia_ban: null }), mau("QD04", { trang_thai: "ngung" }), mau("AL04", { trang_thai: "het_hang" })]);
    const ds = await svc.danhSach({ gioi_han: 10 });
    expect(ds.map(s => s.ma)).toEqual(["AL01", "AL04"]);
    expect(ds[0]!.gia_ban).toBeNull();
    expect(ds[1]).toMatchObject({ trang_thai: "het_hang", con_hang: false });
  });

  it("sap_xep=moi: con hang truoc, roi cap nhat gan nhat truoc; cat theo gioi_han", async () => {
    const { svc, crmDoc } = taoService([
      mau("AL01", { updated_at: new Date("2026-01-01") }),
      mau("AL02", { updated_at: new Date("2026-03-01"), trang_thai: "het_hang" }),
      mau("AL03", { updated_at: new Date("2026-02-01") }),
      mau("AL05", { updated_at: new Date("2026-02-15") })
    ]);
    const ds = await svc.danhSach({ sap_xep: "moi", gioi_han: 3 });
    expect(ds.map(s => s.ma)).toEqual(["AL05", "AL03", "AL01"]);
    expect(crmDoc.layDanhSachMau).toHaveBeenCalledWith({ tuKhoa: undefined, gioiHan: 200 });
  });

  it("chi tiet: chi ten mau / size con hang, KHONG so luong ton", async () => {
    const { svc } = taoService([mau("AL01")]);
    const ct = await svc.chiTiet("al01");
    expect(ct.mau_sac).toEqual(["Đen", "Trắng"]);
    expect(ct.size_con).toEqual(["S", "M"]);
    expect(ct.bang_size).toEqual([{ size: "S", nguc: "86" }, { size: "M", nguc: "90" }]);
    const json = JSON.stringify(ct);
    expect(json).not.toContain("so_luong");
    expect(json).not.toContain("id-AL01");
    expect(json).not.toContain("NỘI BỘ");
    expect(Object.keys(ct).sort()).toEqual(
      [...TRUONG_CONG_KHAI, "anh_bang_size", "bang_size", "chat_lieu", "form_dang", "mau_sac", "size_con"].sort()
    );
  });

  it("chi tiet: mau ngung / khong co -> 404; ma sai dinh dang -> 400", async () => {
    const { svc } = taoService([mau("QD04", { trang_thai: "ngung" })]);
    await expect(svc.chiTiet("QD04")).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.chiTiet("ZZ99")).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.chiTiet("a' or 1=1")).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("ham phu san pham", () => {
  it("suyNhom theo tien to ma, khan lua theo ten", () => {
    expect(suyNhom("VD02", "Đầm công sở")).toBe("Váy & đầm");
    expect(suyNhom("PK03", "Khăn lụa")).toBe("Khăn lụa");
    expect(suyNhom("ZZ01", "Lạ")).toBe("LYNO");
  });
  it("chuanHoaBangSize bo dong rac, khong phai mang -> []", () => {
    expect(chuanHoaBangSize(null)).toEqual([]);
    expect(chuanHoaBangSize({ size: "S" })).toEqual([]);
    expect(chuanHoaBangSize([{ size: "L", eo: 70, x: { y: 1 } }, "rac"])).toEqual([{ size: "L", eo: "70" }]);
  });
  it("tomTatTonKho sap size theo thu tu chuan", () => {
    expect(tomTatTonKho([{ size: "3XL", mau_sac: "A", so_luong: 1 }, { size: "XS", mau_sac: "A", so_luong: 2 }]).size_con).toEqual(["XS", "3XL"]);
  });
});
