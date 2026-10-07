import { ForbiddenException } from "@nestjs/common";
import type { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";
import type { NhatKyService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import { hangDuocHuong, laDonHopLe, tinhHang, tinhTichLuy, type CauHinhHangTinh } from "../../src/common/utils/khach-doi-tac";
import { HangThanhVienService } from "../../src/services/khach-doi-tac.service";
import { HangThanhVienRepository, HoSoKhachRepository } from "../../src/repositories/khach-doi-tac.repository";
import { nguoiDung as nguoiDungGia, timHoSoGia } from "./ho-so-gia";

// Cau hinh theo seed: Than thiet 50tr giam 5%, VIP 100tr giam 10%
const CAU_HINH: CauHinhHangTinh[] = [
  { hang: "THAN_THIET", ten: "Thân thiết", nguong_tich_luy: 50_000_000, giam_gia_phan_tram: 5, quyen_loi: null, bat: true },
  { hang: "VIP", ten: "VIP", nguong_tich_luy: 100_000_000, giam_gia_phan_tram: 10, quyen_loi: "Voucher / quà đối tác", bat: true }
];

const CAU_HINH_DB = [
  { id: "c1", hang: "THAN_THIET", ten: "Thân thiết", nguong_tich_luy: 50_000_000, giam_gia_phan_tram: 5, quyen_loi: null, thu_tu: 1, bat: true },
  { id: "c2", hang: "VIP", ten: "VIP", nguong_tich_luy: 100_000_000, giam_gia_phan_tram: 10, quyen_loi: null, thu_tu: 2, bat: true }
];

function nguoiDung(vai: ThongTinNguoiDung["vai"], sdt: string | null = "0901234567", id = "nd-1", xacMinh = true): ThongTinNguoiDung {
  return nguoiDungGia(id, vai, sdt, xacMinh);
}

describe("tinhHang — nguong hang the", () => {
  it("49.999.999 -> khach thuong, con thieu 1 dong de len Than thiet", () => {
    const kq = tinhHang(49_999_999, CAU_HINH);
    expect(kq.hang).toBeNull();
    expect(kq.giam_gia_phan_tram).toBe(0);
    expect(kq.hang_tiep_theo).toEqual({ hang: "THAN_THIET", ten: "Thân thiết", nguong_tich_luy: 50_000_000, con_thieu: 1 });
  });

  it("50.000.000 -> Than thiet giam 5%", () => {
    const kq = tinhHang(50_000_000, CAU_HINH);
    expect(kq.hang).toBe("THAN_THIET");
    expect(kq.giam_gia_phan_tram).toBe(5);
    expect(kq.hang_tiep_theo?.hang).toBe("VIP");
  });

  it("99.999.999 van Than thiet; 100.000.000 -> VIP giam 10%", () => {
    expect(tinhHang(99_999_999, CAU_HINH).hang).toBe("THAN_THIET");
    const vip = tinhHang(100_000_000, CAU_HINH);
    expect(vip.hang).toBe("VIP");
    expect(vip.giam_gia_phan_tram).toBe(10);
    expect(vip.hang_tiep_theo).toBeNull();
  });

  it("cau hinh tat (bat=false) khong duoc tinh", () => {
    const kq = tinhHang(120_000_000, CAU_HINH.map(c => (c.hang === "VIP" ? { ...c, bat: false } : c)));
    expect(kq.hang).toBe("THAN_THIET");
  });

  it("nguong doc tu cau hinh (doi nguong -> doi hang)", () => {
    const kq = tinhHang(40_000_000, CAU_HINH.map(c => (c.hang === "THAN_THIET" ? { ...c, nguong_tich_luy: 30_000_000 } : c)));
    expect(kq.hang).toBe("THAN_THIET");
  });
});

describe("don hop le — hoan / huy / doi tra khong tinh", () => {
  it("laDonHopLe giong CRM: BAN_HANG va khong huy / hoan", () => {
    expect(laDonHopLe({ loai_don: "BAN_HANG", trang_thai: "giao_thanh_cong" })).toBe(true);
    expect(laDonHopLe({ loai_don: "BAN_HANG", trang_thai: "moi" })).toBe(true);
    expect(laDonHopLe({ loai_don: "BAN_HANG", trang_thai: "hoan" })).toBe(false);
    expect(laDonHopLe({ loai_don: "BAN_HANG", trang_thai: "huy" })).toBe(false);
    expect(laDonHopLe({ loai_don: "DOI_TRA", trang_thai: "giao_thanh_cong" })).toBe(false);
  });

  it("don hoan khong cong vao tich luy -> rot hang", () => {
    const don = [
      { loai_don: "BAN_HANG", trang_thai: "giao_thanh_cong", tong_tien: 30_000_000 },
      { loai_don: "BAN_HANG", trang_thai: "giao_thanh_cong", tong_tien: 20_000_000 }
    ];
    expect(tinhHang(tinhTichLuy(don).tong_tien, CAU_HINH).hang).toBe("THAN_THIET");
    const sauHoan = [don[0]!, { ...don[1]!, trang_thai: "hoan" }];
    const tl = tinhTichLuy(sauHoan);
    expect(tl).toEqual({ tong_tien: 30_000_000, so_don: 1 });
    expect(tinhHang(tl.tong_tien, CAU_HINH).hang).toBeNull();
  });

  it("don tra ca don (doi tra CRM) khong tinh; tra mot phan chi tinh phan con lai", () => {
    expect(laDonHopLe({ loai_don: "BAN_HANG", trang_thai: "giao_thanh_cong", da_tra_hang: true })).toBe(false);
    expect(laDonHopLe({ loai_don: "BAN_HANG", trang_thai: "giao_thanh_cong", da_tra_hang: false })).toBe(true);
    const tl = tinhTichLuy([
      { loai_don: "BAN_HANG", trang_thai: "giao_thanh_cong", tong_tien: 30_000_000, da_tra_hang: true, tien_tra_hang: 30_000_000 },
      { loai_don: "BAN_HANG", trang_thai: "giao_thanh_cong", tong_tien: 20_000_000, da_tra_hang: false, tien_tra_hang: 5_000_000 }
    ]);
    expect(tl).toEqual({ tong_tien: 15_000_000, so_don: 1 });
  });
});

describe("hangDuocHuong", () => {
  it("khach thuong khong huong uu dai hang; rong = moi hang thanh vien", () => {
    expect(hangDuocHuong([], null)).toBe(false);
    expect(hangDuocHuong([], "THAN_THIET")).toBe(true);
    expect(hangDuocHuong(["VIP"], "THAN_THIET")).toBe(false);
    expect(hangDuocHuong(["VIP"], "VIP")).toBe(true);
  });
});

describe("HangThanhVienService", () => {
  function taoSv(tongMua: { tong_tien: number; so_don: number }[], giao: { sdt_chuan: string }[] = []) {
    let lan = 0;
    const crmDoc = {
      tongMuaHopLe: jest.fn(async (sdt: string) => {
        const t = tongMua[Math.min(lan++, tongMua.length - 1)]!;
        return { sdt_chuan: sdt, tong_tien: t.tong_tien, so_don: t.so_don, lan_mua_cuoi: null };
      }),
      layDonTheoSdt: jest.fn(async () => [
        { id: "d1", ma_don: "D1", loai_don: "BAN_HANG", trang_thai: "giao_thanh_cong", tong_tien: 60_000_000, created_at: new Date() },
        { id: "d2", ma_don: "D2", loai_don: "BAN_HANG", trang_thai: "hoan", tong_tien: 5_000_000, created_at: new Date() }
      ]),
      layKhachTheoSdt: jest.fn(async () => ({ ten: "Khách A" }))
    } as unknown as CrmDocService;
    const prisma = {
      hang_thanh_vien_cau_hinh: { findMany: jest.fn(async () => CAU_HINH_DB) },
      giao_khach: { findMany: jest.fn(async () => giao) },
      ho_so: { findUnique: timHoSoGia() }
    } as unknown as PrismaService;
    const nhatKy = { ghi: jest.fn() } as unknown as NhatKyService;
    return { sv: new HangThanhVienService(new HangThanhVienRepository(prisma), new HoSoKhachRepository(prisma), crmDoc, nhatKy), crmDoc };
  }

  it("tinh lai moi lan doc (khong cache): don bi hoan -> lan doc sau rot hang", async () => {
    const { sv, crmDoc } = taoSv([
      { tong_tien: 55_000_000, so_don: 6 },
      { tong_tien: 45_000_000, so_don: 5 }
    ]);
    const nd = nguoiDung(["KHACH"]);
    expect((await sv.layHangCuaToi(nd)).hang).toBe("THAN_THIET");
    expect((await sv.layHangCuaToi(nd)).hang).toBeNull();
    expect(crmDoc.tongMuaHopLe).toHaveBeenCalledTimes(2);
  });

  it("don gan day danh dau don hoan khong tinh vao hang", async () => {
    const { sv } = taoSv([{ tong_tien: 60_000_000, so_don: 1 }]);
    const kq = await sv.layHangCuaToi(nguoiDung(["KHACH"]));
    expect(kq.don_gan_day.map(d => [d.ma_don, d.tinh_vao_hang])).toEqual([
      ["D1", true],
      ["D2", false]
    ]);
  });

  it("ho so chua co SDT -> khong goi CRM, hang thuong", async () => {
    const { sv, crmDoc } = taoSv([{ tong_tien: 999_000_000, so_don: 99 }]);
    const kq = await sv.layHangCuaToi(nguoiDung(["KHACH"], null));
    expect(kq.co_sdt).toBe(false);
    expect(kq.hang).toBeNull();
    expect(crmDoc.tongMuaHopLe).not.toHaveBeenCalled();
  });

  it("du 10 lan mua hop le -> du dieu kien KH hanh phuc", async () => {
    const { sv } = taoSv([{ tong_tien: 10_000_000, so_don: 10 }]);
    expect((await sv.tinhHangTheoSdt("0901234567")).du_dieu_kien_hanh_phuc).toBe(true);
    const { sv: sv2 } = taoSv([{ tong_tien: 10_000_000, so_don: 9 }]);
    expect((await sv2.tinhHangTheoSdt("0901234567")).du_dieu_kien_hanh_phuc).toBe(false);
  });

  it("CSKH chi tra cuu khach duoc giao", async () => {
    const { sv } = taoSv([{ tong_tien: 0, so_don: 0 }], [{ sdt_chuan: "0900000001" }]);
    const cskh = nguoiDung(["CSKH"], null, "cskh-1");
    await expect(sv.traCuu(cskh, "0901234567")).rejects.toBeInstanceOf(ForbiddenException);
    await expect(sv.traCuu(cskh, "+84 900 000 001")).resolves.toMatchObject({ sdt_chuan: "0900000001", ten_khach: "Khách A" });
  });
});
