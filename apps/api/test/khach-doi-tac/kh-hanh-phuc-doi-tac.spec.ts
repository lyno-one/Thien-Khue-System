import { BadRequestException, ConflictException } from "@nestjs/common";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import type { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import { DoiTacService, type HangThanhVienService, KhHanhPhucService } from "../../src/services/khach-doi-tac.service";
import { DoiTacRepository, HoSoKhachRepository, KhHanhPhucRepository } from "../../src/repositories/khach-doi-tac.repository";
import { nguoiDung, timHoSoGia } from "./ho-so-gia";

function taoHanhPhuc(soDon: number, loiMoi: Record<string, unknown> | null = null) {
  const tx = {
    moi_kh_hanh_phuc: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "m-1", ...data })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...loiMoi, ...data }))
    },
    phan_hoi_mau_thu: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "p-1", ...data })) }
  };
  const prisma = {
    moi_kh_hanh_phuc: { findFirst: jest.fn(async () => loiMoi) },
    phan_hoi_mau_thu: { findMany: jest.fn(async () => []) },
    ho_so: { findMany: jest.fn(async () => [{ id: "kh-1" }]), findUnique: timHoSoGia() },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;
  const crmDoc = {
    tongMuaHopLe: jest.fn(async (sdt: string) => ({ sdt_chuan: sdt, tong_tien: 1, so_don: soDon, lan_mua_cuoi: null })),
    layKhachTheoSdt: jest.fn(async () => ({ ten: "Khách CRM" })),
    layMauTheoMa: jest.fn(async () => null)
  } as unknown as CrmDocService;
  const hangSv = { kiemDuocXemKhach: jest.fn(async (_n: unknown, sdt: string) => sdt), phamViKhach: jest.fn(async () => null) } as unknown as HangThanhVienService;
  const nhatKy = { ghi: jest.fn(async () => undefined) } as unknown as NhatKyService;
  const thongBao = { guiNhieu: jest.fn(async () => 1) } as unknown as ThongBaoService;
  return { sv: new KhHanhPhucService(new KhHanhPhucRepository(prisma), new HoSoKhachRepository(prisma), crmDoc, hangSv, nhatKy, thongBao), tx };
}

describe("KhHanhPhucService — tu nguyen, dong y hinh la co rieng", () => {
  const ql = nguoiDung("ql-1", ["QUAN_LY"]);

  it("moi khach < 10 lan mua hop le -> tu choi", async () => {
    const { sv } = taoHanhPhuc(9);
    await expect(sv.moi(ql, { sdt: "0901234567" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("moi khach du 10 lan -> DA_MOI, dong_y_dung_hinh mac dinh false", async () => {
    const { sv, tx } = taoHanhPhuc(10);
    await sv.moi(ql, { sdt: "0901234567" });
    const data = tx.moi_kh_hanh_phuc.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({ trang_thai: "DA_MOI", dong_y_dung_hinh: false, so_lan_mua_luc_moi: 10, ten_khach: "Khách CRM" });
  });

  it("khach da tu choi thi khong moi lai", async () => {
    const { sv } = taoHanhPhuc(12, { id: "m-1", trang_thai: "TU_CHOI" });
    await expect(sv.moi(ql, { sdt: "0901234567" })).rejects.toBeInstanceOf(ConflictException);
  });

  it("khach dong y tham gia KHONG tu bat dong y dung hinh", async () => {
    const { sv, tx } = taoHanhPhuc(10, { id: "m-1", trang_thai: "DA_MOI", dong_y_dung_hinh: false });
    await sv.traLoi(nguoiDung("kh-1", ["KHACH"], "0901234567"), true);
    const data = tx.moi_kh_hanh_phuc.update.mock.calls[0]![0].data;
    expect(data.trang_thai).toBe("THAM_GIA");
    expect(data).not.toHaveProperty("dong_y_dung_hinh");
  });

  it("khach tu choi loi moi -> TU_CHOI; dang tham gia ma tu choi -> ROI_CHUONG_TRINH", async () => {
    const a = taoHanhPhuc(10, { id: "m-1", trang_thai: "DA_MOI" });
    await a.sv.traLoi(nguoiDung("kh-1", ["KHACH"], "0901234567"), false);
    expect(a.tx.moi_kh_hanh_phuc.update.mock.calls[0]![0].data.trang_thai).toBe("TU_CHOI");
    const b = taoHanhPhuc(10, { id: "m-1", trang_thai: "DA_PHAN_HOI" });
    await b.sv.traLoi(nguoiDung("kh-1", ["KHACH"], "0901234567"), false);
    expect(b.tx.moi_kh_hanh_phuc.update.mock.calls[0]![0].data.trang_thai).toBe("ROI_CHUONG_TRINH");
  });

  it("gop y: cho_phep_dung_hinh mac dinh false du co gui hinh", async () => {
    const { sv, tx } = taoHanhPhuc(10, { id: "m-1", trang_thai: "THAM_GIA" });
    await sv.guiPhanHoi(nguoiDung("kh-1", ["KHACH"], "0901234567"), { noi_dung: "Size M hơi chật vai", diem_size: 3, hinh_anh: ["https://x/1.jpg"] });
    expect(tx.phan_hoi_mau_thu.create.mock.calls[0]![0].data).toMatchObject({ cho_phep_dung_hinh: false, diem_size: 3 });
  });

  it("chua tham gia thi khong bat duoc dong y hinh", async () => {
    const { sv } = taoHanhPhuc(10, { id: "m-1", trang_thai: "DA_MOI" });
    await expect(sv.doiDongYHinh(nguoiDung("kh-1", ["KHACH"], "0901234567"), true)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("DoiTacService — khong lo khach ca nhan cho doi tac", () => {
  it("bao cao chi co so tong hop, tach doanh thu qua / chi phi tai tro / ket qua", async () => {
    const prisma = {
      doi_tac: {
        findMany: jest.fn(async () => [
          {
            id: "dt-1",
            ten: "Ngân hàng X",
            loai: "NGAN_HANG",
            hop_dong: [
              { doanh_thu_qua: 200_000_000, chi_phi_tai_tro: 0, ket_qua_chien_dich: { don_hang: 40, luot_tiep_can: 1000 } },
              { doanh_thu_qua: 0, chi_phi_tai_tro: 50_000_000, ket_qua_chien_dich: { don_hang: 10 } }
            ],
            _count: { qua_tang: 2, voucher: 1 }
          }
        ])
      },
      cap_phat_uu_dai: { count: jest.fn(async ({ where }: { where: { trang_thai: unknown } }) => (where.trang_thai === "DA_DUNG" ? 3 : 7)) }
    } as unknown as PrismaService;
    const sv = new DoiTacService(new DoiTacRepository(prisma), { ghi: jest.fn() } as unknown as NhatKyService);
    const [bc] = await sv.baoCao();
    expect(bc).toEqual({
      doi_tac_id: "dt-1",
      ten: "Ngân hàng X",
      loai: "NGAN_HANG",
      so_hop_dong: 2,
      doanh_thu_qua: 200_000_000,
      chi_phi_tai_tro: 50_000_000,
      ket_qua_chien_dich: { don_hang: 50, luot_tiep_can: 1000 },
      so_qua_da_duyet: 2,
      so_voucher_da_duyet: 1,
      luot_cap: 7,
      luot_dung: 3
    });
    expect(JSON.stringify(bc)).not.toMatch(/sdt|0\d{9}/);
  });

  it("ket qua chien dich chi nhan so (chan nhet danh sach khach)", async () => {
    const prisma = { doi_tac: { findUnique: jest.fn(async () => ({ id: "dt-1" })) } } as unknown as PrismaService;
    const sv = new DoiTacService(new DoiTacRepository(prisma), { ghi: jest.fn() } as unknown as NhatKyService);
    await expect(
      sv.taoHopDong(nguoiDung("ql-1", ["QUAN_LY"]), "dt-1", {
        ten: "HĐ quà tết",
        loai: "DAT_QUA",
        ket_qua_chien_dich: { khach: ["0901234567"] } as unknown as Record<string, number>
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
