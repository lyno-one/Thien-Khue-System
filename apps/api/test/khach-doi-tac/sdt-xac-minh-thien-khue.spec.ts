import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import { HangThanhVienService, KhHanhPhucService } from "../../src/services/khach-doi-tac.service";
import { MA_LOI_SDT_CHUA_XAC_MINH } from "../../src/common/utils/khach-doi-tac";
import { UuDaiService } from "../../src/services/khach-doi-tac-uu-dai.service";
import {
  DoiTacRepository, HangThanhVienRepository, HoSoKhachRepository, KhHanhPhucRepository, UuDaiRepository
} from "../../src/repositories/khach-doi-tac.repository";
import { nguoiDung, timHoSoGia } from "./ho-so-gia";

/*
 * LOI-CAN-SUA muc 1, 3: SDT tu khai chua xac minh KHONG duoc dung lam danh tinh khach CRM.
 * LOI-CAN-SUA muc 5, 12: duyet qua / voucher / doi cau hinh hang chi THIEN_KHUE that (ADMIN khong thay).
 */

const SDT_VIP = "0901234567";

/** Loi 403 phai mang ma SDT_CHUA_XAC_MINH de web hien huong dan */
async function la403ChuaXacMinh(p: Promise<unknown>) {
  const loi = await p.catch(e => e);
  expect(loi).toBeInstanceOf(ForbiddenException);
  expect((loi as ForbiddenException).getResponse()).toMatchObject({ code: MA_LOI_SDT_CHUA_XAC_MINH });
}

const CAU_HINH_DB = [
  { id: "c1", hang: "THAN_THIET", ten: "Thân thiết", nguong_tich_luy: 50_000_000, giam_gia_phan_tram: 5, quyen_loi: null, thu_tu: 1, bat: true },
  { id: "c2", hang: "VIP", ten: "VIP", nguong_tich_luy: 100_000_000, giam_gia_phan_tram: 10, quyen_loi: null, thu_tu: 2, bat: true }
];

function taoMock() {
  const tx = {
    hang_thanh_vien_cau_hinh: { update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...CAU_HINH_DB[1], ...data })) },
    qua_tang: { updateMany: jest.fn(async () => ({ count: 1 })), findUniqueOrThrow: jest.fn(async () => ({})) },
    voucher: { updateMany: jest.fn(async () => ({ count: 1 })), findUniqueOrThrow: jest.fn(async () => ({})) },
    moi_kh_hanh_phuc: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "m-1", ...data })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "m-1", ...data }))
    },
    phan_hoi_mau_thu: { create: jest.fn(async () => ({ id: "p-1" })) },
    cap_phat_uu_dai: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: { data: unknown }) => ({ id: "cp-1", ...(data as object) })) }
  };
  const loiMoi = {
    id: "m-1",
    sdt_chuan: SDT_VIP,
    ten_khach: "Khách VIP",
    so_lan_mua_luc_moi: 12,
    trang_thai: "THAM_GIA",
    dong_y_dung_hinh: false,
    dong_y_dung_hinh_luc: null,
    nguoi_moi_id: "cskh-1",
    moi_luc: new Date(),
    tra_loi_luc: null,
    ghi_chu: "Khách khó tính, hay đổi trả — ghi chú nội bộ"
  };
  const prisma = {
    ho_so: { findUnique: timHoSoGia(), findMany: jest.fn(async () => [{ id: "kh-that" }]) },
    hang_thanh_vien_cau_hinh: { findMany: jest.fn(async () => CAU_HINH_DB) },
    giao_khach: { findMany: jest.fn(async () => []) },
    voucher: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => ({ id: "v1", ma: "VIP10", trang_thai: "CHO_THAM_DINH", nguoi_de_xuat_id: "ql-1" }))
    },
    qua_tang: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => ({ id: "q1", ten: "Khăn", trang_thai: "CHO_THAM_DINH", nguoi_de_xuat_id: "ql-1", nguoi_tham_dinh_id: "ql-2", hang_ap_dung: [], so_luong: null }))
    },
    cap_phat_uu_dai: {
      findMany: jest.fn(async () => [
        {
          id: "cp-1",
          sdt_chuan: SDT_VIP,
          voucher_id: "v1",
          qua_tang_id: null,
          ly_do: "Ưu đãi hạng VIP",
          trang_thai: "DA_CAP",
          nguoi_cap_id: "cskh-1",
          cap_luc: new Date(),
          dung_luc: null,
          crm_don_id: "don-crm-1",
          voucher: { ma: "VIP10", ten: "Giảm 10%" },
          qua_tang: null
        }
      ])
    },
    nhat_ky: { findFirst: jest.fn(async () => null) },
    moi_kh_hanh_phuc: { findFirst: jest.fn(async () => loiMoi) },
    phan_hoi_mau_thu: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;
  const crmDoc = {
    tongMuaHopLe: jest.fn(async (sdt: string) => ({ sdt_chuan: sdt, tong_tien: 150_000_000, so_don: 12, lan_mua_cuoi: null })),
    layDonTheoSdt: jest.fn(async () => [{ id: "uuid-crm-1", ma_don: "DH001", loai_don: "BAN_HANG", trang_thai: "giao_thanh_cong", tong_tien: 150_000_000, created_at: new Date() }]),
    layKhachTheoSdt: jest.fn(async () => ({ ten: "Khách VIP" })),
    layMauTheoMa: jest.fn(async () => null)
  } as unknown as CrmDocService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 1) } as unknown as ThongBaoService;
  const hoSoKhach = new HoSoKhachRepository(prisma);
  const hangSv = new HangThanhVienService(new HangThanhVienRepository(prisma), hoSoKhach, crmDoc, nhatKy);
  return {
    prisma,
    tx,
    crmDoc,
    hangSv,
    uuDai: new UuDaiService(new UuDaiRepository(prisma), new DoiTacRepository(prisma), hoSoKhach, hangSv, nhatKy, thongBao),
    hanhPhuc: new KhHanhPhucService(new KhHanhPhucRepository(prisma), hoSoKhach, crmDoc, hangSv, nhatKy, thongBao)
  };
}

describe("SDT tu khai chua xac minh -> khong xem / thao tac du lieu khach CRM (muc 1, 3)", () => {
  // Ke gia mao: tu khai SDT cua khach VIP that, chua duoc xac minh
  const keGiaMao = () => nguoiDung("gia-mao", ["KHACH"], SDT_VIP, false);

  it("hang + don gan day: 403 SDT_CHUA_XAC_MINH, khong doc CRM", async () => {
    const m = taoMock();
    await la403ChuaXacMinh(m.hangSv.layHangCuaToi(keGiaMao()));
    expect(m.crmDoc.tongMuaHopLe).not.toHaveBeenCalled();
    expect(m.crmDoc.layDonTheoSdt).not.toHaveBeenCalled();
  });

  it("uu dai: 403, khong lo voucher da cap (ma voucher) cua khach", async () => {
    const m = taoMock();
    await la403ChuaXacMinh(m.uuDai.layUuDaiCuaToi(keGiaMao()));
    expect(m.prisma.cap_phat_uu_dai.findMany).not.toHaveBeenCalled();
  });

  it("KH hanh phuc: xem / tham gia / dong y hinh / gop y deu 403, khong ghi gi", async () => {
    const m = taoMock();
    await la403ChuaXacMinh(m.hanhPhuc.layCuaToi(keGiaMao()));
    await la403ChuaXacMinh(m.hanhPhuc.traLoi(keGiaMao(), true));
    await la403ChuaXacMinh(m.hanhPhuc.doiDongYHinh(keGiaMao(), true));
    await la403ChuaXacMinh(m.hanhPhuc.guiPhanHoi(keGiaMao(), { noi_dung: "Góp ý giả" }));
    expect(m.tx.moi_kh_hanh_phuc.create).not.toHaveBeenCalled();
    expect(m.tx.moi_kh_hanh_phuc.update).not.toHaveBeenCalled();
    expect(m.tx.phan_hoi_mau_thu.create).not.toHaveBeenCalled();
  });

  it("doc co xac minh tu DB, khong tin nd.hoSo", async () => {
    const m = taoMock();
    keGiaMao(); // DB: chua xac minh
    const nd = { ...keGiaMao(), hoSo: { ...keGiaMao().hoSo, sdt_chuan: SDT_VIP } };
    await la403ChuaXacMinh(m.hangSv.layHangCuaToi(nd));
    expect(m.prisma.ho_so.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "gia-mao" } }));
  });

  it("chua co SDT -> hang thuong, khong goi CRM (khong 403)", async () => {
    const m = taoMock();
    const kq = await m.hangSv.layHangCuaToi(nguoiDung("chua-sdt", ["KHACH"], null));
    expect(kq.co_sdt).toBe(false);
    expect(m.crmDoc.tongMuaHopLe).not.toHaveBeenCalled();
  });
});

describe("SDT da xac minh -> xem duoc, bo truong noi bo", () => {
  const khachThat = () => nguoiDung("kh-that", ["KHACH"], SDT_VIP, true);

  it("hang: don gan day khong lo id noi bo CRM", async () => {
    const m = taoMock();
    const kq = await m.hangSv.layHangCuaToi(khachThat());
    expect(kq.hang).toBe("VIP");
    expect(kq.don_gan_day[0]).toEqual(expect.objectContaining({ ma_don: "DH001", tinh_vao_hang: true }));
    expect(kq.don_gan_day[0]).not.toHaveProperty("id");
  });

  it("uu dai da cap: chi ten / ma voucher / trang thai / ngay — khong nguoi cap, ly do, don CRM, sdt", async () => {
    const m = taoMock();
    const kq = await m.uuDai.layUuDaiCuaToi(khachThat());
    expect(kq.da_cap).toHaveLength(1);
    expect(Object.keys(kq.da_cap[0]!).sort()).toEqual(["cap_luc", "dung_luc", "id", "ma_voucher", "ten_uu_dai", "trang_thai"]);
    expect(kq.da_cap[0]!.ma_voucher).toBe("VIP10");
  });

  it("KH hanh phuc: loi moi tra cho khach bo ghi chu noi bo + nguoi moi", async () => {
    const m = taoMock();
    const kq = await m.hanhPhuc.layCuaToi(khachThat());
    expect(kq.loi_moi).not.toBeNull();
    expect(kq.loi_moi).not.toHaveProperty("ghi_chu");
    expect(kq.loi_moi).not.toHaveProperty("nguoi_moi_id");
    const traLoi = await m.hanhPhuc.doiDongYHinh(khachThat(), true);
    expect(traLoi).not.toHaveProperty("ghi_chu");
  });

  it("thong bao loi moi / cap uu dai chi gui ho so DA XAC MINH SDT", async () => {
    const m = taoMock();
    (m.prisma.moi_kh_hanh_phuc.findFirst as jest.Mock).mockResolvedValueOnce(null);
    await m.hanhPhuc.moi(nguoiDung("ql-1", ["QUAN_LY"]), { sdt: SDT_VIP });
    expect((m.prisma.ho_so.findMany as jest.Mock).mock.calls[0][0].where).toMatchObject({ sdt_chuan: SDT_VIP, sdt_xac_minh_luc: { not: null } });

    const m2 = taoMock();
    (m2.prisma.voucher.findUnique as jest.Mock).mockResolvedValue({ id: "v1", ma: "VIP10", ten: "Giảm", trang_thai: "DA_DUYET", hang_ap_dung: [], so_luong: null, bat_dau: null, het_han: null });
    (m2.tx as unknown as { voucher: { update: jest.Mock } }).voucher.update = jest.fn(async () => ({}));
    await m2.uuDai.capPhat(nguoiDung("ql-1", ["QUAN_LY"]), { sdt: SDT_VIP, voucher_id: "v1" });
    expect((m2.prisma.ho_so.findMany as jest.Mock).mock.calls[0][0].where).toMatchObject({ sdt_xac_minh_luc: { not: null } });
  });
});

describe("Quyet dinh chi THIEN_KHUE that — ADMIN khong duyet thay (muc 5, 12)", () => {
  const admin = nguoiDung("admin-1", ["ADMIN"]);
  const ceo = nguoiDung("tk-1", ["THIEN_KHUE"]);

  it("ADMIN duyet qua -> 403, khong ghi", async () => {
    const m = taoMock();
    await expect(m.uuDai.duyetQua(admin, "q1", { duyet: true })).rejects.toBeInstanceOf(ForbiddenException);
    expect(m.tx.qua_tang.updateMany).not.toHaveBeenCalled();
    await m.uuDai.duyetQua(ceo, "q1", { duyet: true });
    expect(m.tx.qua_tang.updateMany).toHaveBeenCalled();
  });

  it("ADMIN duyet voucher -> 403, khong ghi; THIEN_KHUE duoc", async () => {
    const m = taoMock();
    await expect(m.uuDai.duyetVoucher(admin, "v1", { duyet: true })).rejects.toBeInstanceOf(ForbiddenException);
    expect(m.tx.voucher.updateMany).not.toHaveBeenCalled();
    await m.uuDai.duyetVoucher(ceo, "v1", { duyet: true });
    expect(m.tx.voucher.updateMany).toHaveBeenCalled();
  });

  it("ADMIN (hay QUAN_LY) doi cau hinh hang -> 403", async () => {
    const m = taoMock();
    await expect(m.hangSv.capNhatCauHinh(admin, "VIP", { ten: "VIP Kim cương" })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(m.hangSv.capNhatCauHinh(nguoiDung("ql-1", ["QUAN_LY"]), "VIP", { ten: "X" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(m.tx.hang_thanh_vien_cau_hinh.update).not.toHaveBeenCalled();
  });

  it("THIEN_KHUE doi nguong / % giam truc tiep -> 400 (phai qua de xuat DOI_CHINH_SACH)", async () => {
    const m = taoMock();
    await expect(m.hangSv.capNhatCauHinh(ceo, "VIP", { nguong_tich_luy: 80_000_000 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(m.hangSv.capNhatCauHinh(ceo, "VIP", { giam_gia_phan_tram: 15 })).rejects.toBeInstanceOf(BadRequestException);
    expect(m.tx.hang_thanh_vien_cau_hinh.update).not.toHaveBeenCalled();
  });

  it("THIEN_KHUE sua ten / quyen loi (gui kem nguong cu khong doi) -> chi ghi truong hien thi", async () => {
    const m = taoMock();
    await m.hangSv.capNhatCauHinh(ceo, "VIP", { ten: "VIP Kim cương", quyen_loi: "Quà sinh nhật", nguong_tich_luy: 100_000_000, giam_gia_phan_tram: 10 });
    const data = m.tx.hang_thanh_vien_cau_hinh.update.mock.calls[0]![0].data;
    expect(data).toEqual({ ten: "VIP Kim cương", quyen_loi: "Quà sinh nhật" });
  });
});
