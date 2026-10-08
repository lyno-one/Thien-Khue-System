import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { de_xuat_duyet, Vai } from "@prisma/client";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import type { ApDungDeXuatService } from "../../src/services/quan-tri-ap-dung.service";
import { DeXuatService } from "../../src/services/quan-tri.service";
import { LOI_VAI_TU_CRM } from "../../src/common/utils/quan-tri";
import { DeXuatRepository, NguoiTomTatRepository } from "../../src/repositories/quan-tri.repository";

// Maker-checker qua de_xuat_duyet — repository that boc Prisma mock (bang nho trong RAM), khong can DB

const QUAN_LY = "11111111-1111-4111-8111-111111111111";
const ADMIN = "22222222-2222-4222-8222-222222222222";
const CEO = "33333333-3333-4333-8333-333333333333";
const SALE = "44444444-4444-4444-8444-444444444444";
const ADMIN_2 = "55555555-5555-4555-8555-555555555555";

function nguoi(id: string, vai: Vai[]): ThongTinNguoiDung {
  return {
    id,
    email: `${id.slice(0, 4)}@lyno.test`,
    hoSo: { id, ho_ten: id.slice(0, 4), email: null, sdt: null, crm_user_id: null, kich_hoat_lam_viec: true },
    vai,
    vaiChiTiet: vai.map(v => ({ vai: v, trang_thai: "HOAT_DONG" as const, tu_luc: new Date(), den_luc: null }))
  };
}

const ndQuanLy = nguoi(QUAN_LY, ["QUAN_LY"]);
const ndAdmin = nguoi(ADMIN, ["ADMIN"]);
const ndAdmin2 = nguoi(ADMIN_2, ["ADMIN"]);
const ndCeo = nguoi(CEO, ["THIEN_KHUE"]);

type Where = Record<string, unknown>;

/** Khop where don gian cua updateMany (id, trang_thai | {in}, nguoi_de_xuat_id {not}, OR [{nguoi_kiem_id: null}, {nguoi_kiem_id: {not}}]) */
function khop(r: de_xuat_duyet, w: Where): boolean {
  if (w.id && r.id !== w.id) return false;
  const tt = w.trang_thai as string | { in: string[] } | undefined;
  if (typeof tt === "string" && r.trang_thai !== tt) return false;
  if (tt && typeof tt === "object" && !tt.in.includes(r.trang_thai)) return false;
  const ndx = w.nguoi_de_xuat_id as string | { not: string } | undefined;
  if (typeof ndx === "string" && r.nguoi_de_xuat_id !== ndx) return false;
  if (ndx && typeof ndx === "object" && r.nguoi_de_xuat_id === ndx.not) return false;
  const not = w.NOT as { nguoi_kiem_id?: string } | undefined;
  if (not?.nguoi_kiem_id && r.nguoi_kiem_id === not.nguoi_kiem_id) return false;
  const hoac = w.OR as { nguoi_kiem_id: null | { not: string } }[] | undefined;
  if (hoac) {
    const ok = hoac.some(dk => (dk.nguoi_kiem_id === null ? r.nguoi_kiem_id === null : r.nguoi_kiem_id !== null && r.nguoi_kiem_id !== dk.nguoi_kiem_id.not));
    if (!ok) return false;
  }
  return true;
}

function taoMoiTruong() {
  const bang = new Map<string, de_xuat_duyet>();
  let dem = 0;
  const nhatKyGhi: { hanhDong: string; hoSoId: string | null; doiTuongId?: string | null }[] = [];

  const deXuatDb = {
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => bang.get(where.id) ?? null),
    findUniqueOrThrow: jest.fn(async ({ where }: { where: { id: string } }) => {
      const r = bang.get(where.id);
      if (!r) throw new Error("khong thay");
      return r;
    }),
    findFirst: jest.fn(async () => null),
    create: jest.fn(async ({ data }: { data: Partial<de_xuat_duyet> }) => {
      const id = `aaaaaaaa-0000-4000-8000-${String(++dem).padStart(12, "0")}`;
      const r = {
        id,
        loai: data.loai,
        doi_tuong: data.doi_tuong,
        doi_tuong_id: data.doi_tuong_id ?? null,
        du_lieu: data.du_lieu ?? {},
        ly_do: data.ly_do ?? null,
        nguoi_de_xuat_id: data.nguoi_de_xuat_id,
        nguoi_kiem_id: null,
        kiem_luc: null,
        y_kien_kiem: null,
        nguoi_duyet_id: null,
        duyet_luc: null,
        y_kien_duyet: null,
        trang_thai: data.trang_thai ?? "CHO_KIEM",
        created_at: new Date(),
        updated_at: new Date()
      } as de_xuat_duyet;
      bang.set(id, r);
      return r;
    }),
    updateMany: jest.fn(async ({ where, data }: { where: Where; data: Partial<de_xuat_duyet> }) => {
      let count = 0;
      for (const r of bang.values()) {
        if (!khop(r, where)) continue;
        // Mo phong CHECK maker-checker o DB
        const sau = { ...r, ...data };
        if (sau.nguoi_kiem_id && sau.nguoi_kiem_id === sau.nguoi_de_xuat_id) throw new Error("CHECK de_xuat_duyet_kiem_khac_de_xuat");
        if (sau.nguoi_duyet_id && (sau.nguoi_duyet_id === sau.nguoi_de_xuat_id || sau.nguoi_duyet_id === sau.nguoi_kiem_id)) throw new Error("CHECK de_xuat_duyet_duyet_khac_hai_nguoi");
        bang.set(r.id, sau);
        count++;
      }
      return { count };
    }),
    findMany: jest.fn(async () => [...bang.values()]),
    count: jest.fn(async () => bang.size)
  };

  const tx = { de_xuat_duyet: deXuatDb, vai_tro_ho_so: { findMany: jest.fn(async () => [{ ho_so_id: ADMIN }, { ho_so_id: CEO }]) } };
  const prisma = {
    de_xuat_duyet: deXuatDb,
    ho_so: { findMany: jest.fn(async () => []) },
    nhat_ky: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  } as unknown as PrismaService;

  const apDung = {
    chuanBi: jest.fn(async (_loai: string, doiTuongId: string | null, duLieu: Record<string, unknown>) => ({ doi_tuong: "ty_le_hoa_hong", doi_tuong_id: doiTuongId ?? "SALE:*", du_lieu: duLieu })),
    nguoiLienQuan: jest.fn(async () => [] as string[]),
    apDung: jest.fn(async () => ({ da_ap_dung: true })),
    khiTuChoi: jest.fn(async () => null)
  };
  const nhatKy = {
    ghi: jest.fn(async (m: { hanhDong: string; hoSoId: string | null; doiTuongId?: string | null }) => {
      nhatKyGhi.push({ hanhDong: m.hanhDong, hoSoId: m.hoSoId, doiTuongId: m.doiTuongId });
    })
  } as unknown as NhatKyService;
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 0) } as unknown as ThongBaoService;

  const repo = new DeXuatRepository(prisma);
  const nguoiTomTat = new NguoiTomTatRepository(prisma);
  const sv = new DeXuatService(repo, nguoiTomTat, apDung as unknown as ApDungDeXuatService, nhatKy, thongBao);
  return { sv, bang, apDung, nhatKyGhi, deXuatDb, prisma, repo, nguoiTomTat, nhatKy, thongBao };
}

const BODY_CHINH_SACH = { loai: "DOI_CHINH_SACH" as const, du_lieu: { chinh_sach: "TY_LE_HOA_HONG", vai: "SALE", ty_le: 3 }, ly_do: "Tăng động lực Sale" };
/** Loai TIEN (3 buoc) — chuanBi da mock */
const BODY_TIEN = { loai: "CHI_TRA_HOA_HONG" as const, du_lieu: { ky: "2026-10" }, ly_do: "Chi trả kỳ 10" };
/** Loai 2 buoc lap tu ban phe duyet (ADMIN / THIEN_KHUE duyet) — chuanBi da mock */
const BODY_SKU = { loai: "CAP_QUYEN_SKU" as const, doi_tuong_id: "cccccccc-0000-4000-8000-000000000001", du_lieu: { mau_id: "mau-1", trang_thai_moi: "THU_HOI" } };
const LOAI_BA_BUOC = ["CHI_TRA_HOA_HONG", "DIEU_CHINH_HOA_HONG", "XAC_MINH_DON", "XUAT_DU_LIEU_KHACH"];

describe("DeXuatService — 2 buoc (de xuat -> duyet) cho loai khong lien quan tien", () => {
  it("chinh sach: Quan ly de xuat -> CEO duyet thang (CHO_DUYET ngay, khong co nguoi kiem); nhat ky du buoc", async () => {
    const { sv, apDung, nhatKyGhi } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, BODY_CHINH_SACH);
    expect(dx.trang_thai).toBe("CHO_DUYET");
    expect(dx.so_buoc).toBe(2);
    const sau = await sv.duyet(ndCeo, dx.id, { dong_y: true });
    expect(sau.trang_thai).toBe("DA_DUYET");
    expect(sau.nguoi_kiem).toBeNull();
    expect(sau.nguoi_duyet?.id).toBe(CEO);
    expect(apDung.apDung).toHaveBeenCalledTimes(1);
    expect(nhatKyGhi.map(n => `${n.hanhDong}:${n.hoSoId}`)).toEqual([`DE_XUAT_TAO:${QUAN_LY}`, `DE_XUAT_DUYET:${CEO}`, `DE_XUAT_AP_DUNG:${CEO}`]);
  });

  it("2 buoc: nguoi de xuat tu duyet -> 403 (ke ca CEO), khong ap dung", async () => {
    const { sv, apDung } = taoMoiTruong();
    const dx = await sv.tao(ndCeo, BODY_CHINH_SACH);
    await expect(sv.duyet(ndCeo, dx.id, { dong_y: true })).rejects.toThrow("Người đề xuất không được tự duyệt");
    expect(apDung.apDung).not.toHaveBeenCalled();
  });

  it("2 buoc: nguoi lien quan (ho so duoc cap / thu quyen) khong duoc duyet", async () => {
    const { sv, apDung } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, BODY_SKU);
    apDung.nguoiLienQuan.mockResolvedValueOnce([ADMIN_2]);
    await expect(sv.duyet(ndAdmin2, dx.id, { dong_y: true })).rejects.toThrow("người liên quan");
  });

  it("2 buoc: khong co buoc kiem — goi kiem -> 409", async () => {
    const { sv } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, BODY_SKU);
    await expect(sv.kiem(ndAdmin, dx.id, { dong_y: true })).rejects.toBeInstanceOf(ConflictException);
  });

  it("quyen SKU (2 buoc): Quan ly de xuat -> Admin duyet", async () => {
    const { sv } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, BODY_SKU);
    const sau = await sv.duyet(ndAdmin, dx.id, { dong_y: true });
    expect(sau.trang_thai).toBe("DA_DUYET");
  });

  it("chinh sach / qua: chi THIEN_KHUE duyet — ADMIN bi 403", async () => {
    const { sv } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, BODY_CHINH_SACH);
    await expect(sv.duyet(ndAdmin2, dx.id, { dong_y: true })).rejects.toThrow("chỉ Thiên Khuê");
  });

  it("de xuat 2 buoc cu con CHO_KIEM (truoc khi gon / module khac tao): hien la cho duyet, duyet thang duoc", async () => {
    const { sv, deXuatDb } = taoMoiTruong();
    const cu = await deXuatDb.create({ data: { loai: "CAP_QUYEN_SKU", doi_tuong: "ho_so", doi_tuong_id: SALE, du_lieu: { mau_id: "mau-1" }, nguoi_de_xuat_id: QUAN_LY, trang_thai: "CHO_KIEM" } });
    const hien = (await sv.layDanhSach(ndAdmin, {})).ds[0];
    expect(hien.trang_thai).toBe("CHO_DUYET");
    expect(hien.co_the_kiem).toBe(false);
    expect(hien.co_the_duyet).toBe(true);
    const sau = await sv.duyet(ndAdmin, cu.id, { dong_y: true });
    expect(sau.trang_thai).toBe("DA_DUYET");
  });

  it("loc 'Chờ duyệt' gom ca loai 2 buoc con CHO_KIEM; 'Chờ kiểm' chi loai 3 buoc", async () => {
    const { sv, deXuatDb } = taoMoiTruong();
    await sv.layDanhSach(ndAdmin, { trang_thai: "CHO_DUYET" });
    await sv.layDanhSach(ndAdmin, { trang_thai: "CHO_KIEM" });
    const where = (i: number) => (deXuatDb.findMany.mock.calls[i] as unknown as [{ where: { AND: unknown[] } }])[0].where;
    expect(where(0).AND).toContainEqual({ OR: [{ trang_thai: "CHO_DUYET" }, { trang_thai: "CHO_KIEM", loai: { notIn: LOAI_BA_BUOC } }] });
    expect(where(1).AND).toContainEqual({ trang_thai: "CHO_KIEM", loai: { in: LOAI_BA_BUOC } });
  });
});

describe("DeXuatService — vai lay tu CRM khong chuyen bang de xuat", () => {
  it.each(["SALE", "CSKH", "THUC_TAP", "CTV", "KOL", "KOC", "DOI_TAC", "MENTOR", "QUAN_LY", "ADMIN", "THIEN_KHUE", "KHACH"])("CHUYEN_VAI sang %s -> 400 'lấy từ CRM', khong tao de xuat", async vai => {
    const { sv, apDung, deXuatDb } = taoMoiTruong();
    await expect(sv.tao(ndAdmin, { loai: "CHUYEN_VAI", doi_tuong_id: SALE, du_lieu: { vai, trang_thai_moi: "HOAT_DONG" } })).rejects.toThrow(LOI_VAI_TU_CRM);
    await expect(sv.tao(ndAdmin, { loai: "CHUYEN_VAI", doi_tuong_id: SALE, du_lieu: { vai_moi: vai } })).rejects.toBeInstanceOf(BadRequestException);
    expect(apDung.chuanBi).not.toHaveBeenCalled();
    expect(deXuatDb.create).not.toHaveBeenCalled();
  });
});

describe("DeXuatService — TIEN giu 3 buoc (de xuat -> kiem -> duyet, 3 nguoi khac nhau)", () => {
  it("chi tra hoa hong: Quan ly de xuat -> Admin kiem -> CEO duyet; nhat ky ghi du moi buoc", async () => {
    const { sv, apDung, nhatKyGhi } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, BODY_TIEN);
    expect(dx.trang_thai).toBe("CHO_KIEM");
    expect(dx.so_buoc).toBe(3);

    const sauKiem = await sv.kiem(ndAdmin, dx.id, { dong_y: true, y_kien: "Hợp lý" });
    expect(sauKiem.trang_thai).toBe("CHO_DUYET");

    const sauDuyet = await sv.duyet(ndCeo, dx.id, { dong_y: true });
    expect(sauDuyet.trang_thai).toBe("DA_DUYET");
    expect(sauDuyet.nguoi_de_xuat?.id).toBe(QUAN_LY);
    expect(sauDuyet.nguoi_kiem?.id).toBe(ADMIN);
    expect(sauDuyet.nguoi_duyet?.id).toBe(CEO);
    expect(apDung.apDung).toHaveBeenCalledTimes(1);
    expect(nhatKyGhi.map(n => `${n.hanhDong}:${n.hoSoId}`)).toEqual([
      `DE_XUAT_TAO:${QUAN_LY}`,
      `DE_XUAT_KIEM_DONG_Y:${ADMIN}`,
      `DE_XUAT_DUYET:${CEO}`,
      `DE_XUAT_AP_DUNG:${CEO}`
    ]);
    expect(nhatKyGhi.every(n => n.doiTuongId === dx.id)).toBe(true);
  });

  it("tien: duyet khi chua kiem -> 409 (chi tra + xac minh don)", async () => {
    const { sv, apDung } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, BODY_TIEN);
    await expect(sv.duyet(ndCeo, dx.id, { dong_y: true })).rejects.toBeInstanceOf(ConflictException);
    const xm = await sv.tao(ndQuanLy, { loai: "XAC_MINH_DON", doi_tuong_id: "bbbbbbbb-0000-4000-8000-000000000009", du_lieu: { ket_qua: "HUY" } });
    expect(xm.so_buoc).toBe(3);
    await expect(sv.duyet(ndAdmin, xm.id, { dong_y: true })).rejects.toThrow("chưa được kiểm");
    expect(apDung.apDung).not.toHaveBeenCalled();
  });

  it("tien: nguoi de xuat tu kiem -> 403", async () => {
    const { sv } = taoMoiTruong();
    const dx = await sv.tao(ndAdmin, BODY_TIEN);
    await expect(sv.kiem(ndAdmin, dx.id, { dong_y: true })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("tien: nguoi de xuat tu duyet -> 403 (ke ca CEO)", async () => {
    const { sv, apDung } = taoMoiTruong();
    const dx = await sv.tao(ndCeo, BODY_TIEN);
    await sv.kiem(ndAdmin, dx.id, { dong_y: true });
    await expect(sv.duyet(ndCeo, dx.id, { dong_y: true })).rejects.toThrow("Người đề xuất không được tự duyệt");
    expect(apDung.apDung).not.toHaveBeenCalled();
  });

  it("tien: nguoi kiem dong thoi duyet -> 403", async () => {
    const { sv, apDung } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, { loai: "XAC_MINH_DON", doi_tuong_id: "bbbbbbbb-0000-4000-8000-000000000003", du_lieu: { ket_qua: "HUY" } });
    await sv.kiem(ndAdmin, dx.id, { dong_y: true });
    await expect(sv.duyet(ndAdmin, dx.id, { dong_y: true })).rejects.toThrow("Người kiểm không được đồng thời là người duyệt");
    expect(apDung.apDung).not.toHaveBeenCalled();
  });

  it("nguoi lien quan (vd chu don dang xac minh) khong duoc duyet", async () => {
    const { sv, apDung } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, { loai: "XAC_MINH_DON", doi_tuong_id: "bbbbbbbb-0000-4000-8000-000000000001", du_lieu: { ket_qua: "GHI_NHAN" } });
    await sv.kiem(ndAdmin, dx.id, { dong_y: true });
    apDung.nguoiLienQuan.mockResolvedValueOnce([ADMIN_2]);
    await expect(sv.duyet(ndAdmin2, dx.id, { dong_y: true })).rejects.toThrow("người liên quan");
  });

  it("tu choi o buoc kiem: can y kien, ghi nhat ky, khong ap dung", async () => {
    const { sv, apDung, nhatKyGhi } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, BODY_TIEN);
    await expect(sv.kiem(ndAdmin, dx.id, { dong_y: false })).rejects.toThrow("cần ghi ý kiến");
    const kq = await sv.kiem(ndAdmin, dx.id, { dong_y: false, y_kien: "Chưa đủ số liệu" });
    expect(kq.trang_thai).toBe("TU_CHOI");
    expect(apDung.apDung).not.toHaveBeenCalled();
    expect(apDung.khiTuChoi).toHaveBeenCalledTimes(1);
    expect(nhatKyGhi.map(n => n.hanhDong)).toEqual(["DE_XUAT_TAO", "DE_XUAT_KIEM_TU_CHOI"]);
  });
});

describe("DeXuatService — chung", () => {
  it("khong lap de xuat co loi cho chinh minh (vd tu xin quyen SKU)", async () => {
    const { sv, apDung } = taoMoiTruong();
    apDung.chuanBi.mockResolvedValueOnce({ doi_tuong: "ho_so", doi_tuong_id: QUAN_LY, du_lieu: { ho_so_id: QUAN_LY, mau_id: "mau-1", trang_thai_moi: "HOAT_DONG" } });
    await expect(sv.tao(ndQuanLy, { loai: "CAP_QUYEN_SKU", doi_tuong_id: QUAN_LY, du_lieu: { mau_id: "mau-1" } })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("vai khong du (SALE) khong lap duoc de xuat", async () => {
    const { sv } = taoMoiTruong();
    await expect(sv.tao(nguoi(SALE, ["SALE"]), BODY_CHINH_SACH)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("ap dung loi -> loi lan ra (transaction rollback), khong bao duyet thanh cong", async () => {
    const { sv, apDung } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, BODY_CHINH_SACH);
    apDung.apDung.mockRejectedValueOnce(new ConflictException("Quà tặng không còn ở trạng thái chờ thẩm định"));
    await expect(sv.duyet(ndCeo, dx.id, { dong_y: true })).rejects.toBeInstanceOf(ConflictException);
  });

  it("chi nguoi de xuat rut duoc; rut ghi nhat ky", async () => {
    const { sv, nhatKyGhi } = taoMoiTruong();
    const dx = await sv.tao(ndQuanLy, BODY_CHINH_SACH);
    await expect(sv.huy(ndAdmin, dx.id)).rejects.toBeInstanceOf(ForbiddenException);
    const kq = await sv.huy(ndQuanLy, dx.id, "Lập nhầm");
    expect(kq.trang_thai).toBe("HUY");
    expect(nhatKyGhi.at(-1)?.hanhDong).toBe("DE_XUAT_HUY");
    await expect(sv.duyet(ndCeo, dx.id, { dong_y: true })).rejects.toBeInstanceOf(ConflictException);
  });

  it("co hien nut theo nguoi xem: 2 buoc khong co nut kiem; tien co nut kiem roi moi den duyet", async () => {
    const { sv } = taoMoiTruong();
    const hai = await sv.tao(ndQuanLy, BODY_SKU);
    expect(hai.co_the_kiem).toBe(false);
    expect(hai.co_the_duyet).toBe(false); // nguoi de xuat
    expect(hai.co_the_huy).toBe(true);
    const haiAdmin = (await sv.layDanhSach(ndAdmin, {})).ds.find(d => d.id === hai.id)!;
    expect(haiAdmin.co_the_kiem).toBe(false);
    expect(haiAdmin.co_the_duyet).toBe(true);

    const ba = await sv.tao(ndQuanLy, BODY_TIEN);
    const baAdmin = (await sv.layDanhSach(ndAdmin, {})).ds.find(d => d.id === ba.id)!;
    expect(baAdmin.co_the_kiem).toBe(true);
    expect(baAdmin.co_the_duyet).toBe(false);
    await sv.kiem(ndAdmin, ba.id, { dong_y: true });
    const sau = (await sv.layDanhSach(ndAdmin, {})).ds.find(d => d.id === ba.id)!;
    expect(sau.co_the_duyet).toBe(false);
    expect(sau.ly_do_khong_duyet).toContain("Người kiểm");
    const cuaCeo = (await sv.layDanhSach(ndCeo, {})).ds.find(d => d.id === ba.id)!;
    expect(cuaCeo.co_the_duyet).toBe(true);
  });
});

describe("DeXuatService — buoc mang-luoi sau khi duyet (commit xong moi chay)", () => {
  function voiMangLuoi() {
    const m = taoMoiTruong();
    const ghiNhan = { taoHoaHongNeuThieu: jest.fn(async () => true) };
    const hoaHong = { apDungDieuChinh: jest.fn(async () => ({})) };
    const sv = new DeXuatService(m.repo, m.nguoiTomTat, m.apDung as unknown as ApDungDeXuatService, m.nhatKy, m.thongBao, ghiNhan as never, hoaHong as never);
    return { ...m, sv, ghiNhan, hoaHong };
  }

  it("XAC_MINH_DON duoc duyet -> GhiNhanDonService.taoHoaHongNeuThieu (hoa hong theo SKU duoc quyen)", async () => {
    const { sv, ghiNhan, hoaHong } = voiMangLuoi();
    const GN = "bbbbbbbb-0000-4000-8000-000000000001";
    const dx = await sv.tao(ndQuanLy, { loai: "XAC_MINH_DON", doi_tuong_id: GN, du_lieu: { ket_qua: "GHI_NHAN" } });
    await sv.kiem(ndAdmin, dx.id, { dong_y: true });
    await sv.duyet(ndCeo, dx.id, { dong_y: true });
    expect(ghiNhan.taoHoaHongNeuThieu).toHaveBeenCalledWith(GN, CEO);
    expect(hoaHong.apDungDieuChinh).not.toHaveBeenCalled();
  });

  it("DIEU_CHINH_HOA_HONG duoc duyet -> HoaHongService.apDungDieuChinh; loi o buoc nay khong lam hong quyet dinh", async () => {
    const { sv, bang, ghiNhan, hoaHong, deXuatDb } = voiMangLuoi();
    hoaHong.apDungDieuChinh.mockRejectedValueOnce(new Error("CRM tat"));
    const dx = await deXuatDb.create({ data: { loai: "DIEU_CHINH_HOA_HONG", doi_tuong: "hoa_hong", du_lieu: { ho_so_id: SALE, so_tien: -10000 }, nguoi_de_xuat_id: QUAN_LY, trang_thai: "CHO_DUYET" } });
    bang.set(dx.id, { ...dx, nguoi_kiem_id: ADMIN });
    const kq = await sv.duyet(ndCeo, dx.id, { dong_y: true });
    expect(kq.trang_thai).toBe("DA_DUYET");
    expect(hoaHong.apDungDieuChinh).toHaveBeenCalledWith(CEO, dx.id);
    expect(ghiNhan.taoHoaHongNeuThieu).not.toHaveBeenCalled();
  });

  it("tu choi -> khong goi buoc mang-luoi", async () => {
    const { sv, ghiNhan } = voiMangLuoi();
    const dx = await sv.tao(ndQuanLy, { loai: "XAC_MINH_DON", doi_tuong_id: "bbbbbbbb-0000-4000-8000-000000000002", du_lieu: { ket_qua: "GHI_NHAN" } });
    await sv.kiem(ndAdmin, dx.id, { dong_y: true });
    await sv.duyet(ndCeo, dx.id, { dong_y: false, y_kien: "Không đủ căn cứ" });
    expect(ghiNhan.taoHoaHongNeuThieu).not.toHaveBeenCalled();
  });
});
