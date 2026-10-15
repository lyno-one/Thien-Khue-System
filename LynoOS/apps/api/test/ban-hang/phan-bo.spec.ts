import { bayGioVn, chonNguoiPhuTrach, trongCa, type UngVienPhanBo } from "../../src/common/utils/ban-hang";
import { PhanBoRepository } from "../../src/repositories/ban-hang.repository";
import { PhanBoService } from "../../src/services/ban-hang-phan-bo.service";

function uv(id: string, tai: number, them: Partial<UngVienPhanBo> = {}): UngVienPhanBo {
  return {
    hoSoId: id,
    hoTen: `Sale ${id}`,
    tai,
    mucNangLuc: null,
    lanGiaoCuoi: null,
    caTrucId: `ca-${id}`,
    caNhan: "08:00–17:00",
    daGiaoTrongCa: 0,
    toiDaTrongCa: null,
    ...them
  };
}

describe("chonNguoiPhuTrach — round-robin co trong so theo tai", () => {
  it("chon nguoi it khach dang phu trach nhat", () => {
    const kq = chonNguoiPhuTrach([uv("a", 5), uv("b", 2), uv("c", 3)]);
    expect(kq?.ungVien.hoSoId).toBe("b");
    expect(kq?.lyDo).toContain("tải 2 khách");
  });

  it("nang luc cao duoc nhan nhieu hon: (tai+1)/trong so", () => {
    // a: (4+1)/5 = 1; b: (1+1)/1 = 2 -> a duoc chon du dang nhieu khach hon
    const kq = chonNguoiPhuTrach([uv("a", 4, { mucNangLuc: 5 }), uv("b", 1)]);
    expect(kq?.ungVien.hoSoId).toBe("a");
  });

  it("bo qua nguoi da du so khach toi da trong ca", () => {
    const kq = chonNguoiPhuTrach([uv("a", 0, { daGiaoTrongCa: 3, toiDaTrongCa: 3 }), uv("b", 9)]);
    expect(kq?.ungVien.hoSoId).toBe("b");
    expect(chonNguoiPhuTrach([uv("a", 0, { daGiaoTrongCa: 3, toiDaTrongCa: 3 })])).toBeNull();
  });

  it("hoa diem -> vong tron: ai duoc giao lau nhat truoc", () => {
    const kq = chonNguoiPhuTrach([
      uv("a", 1, { lanGiaoCuoi: new Date("2026-10-07T03:00:00Z") }),
      uv("b", 1, { lanGiaoCuoi: new Date("2026-10-07T01:00:00Z") }),
      uv("c", 1, { lanGiaoCuoi: new Date("2026-10-07T02:00:00Z") })
    ]);
    expect(kq?.ungVien.hoSoId).toBe("b");
  });

  it("phan bo lien tiep chia deu theo tai", () => {
    const ds = [uv("a", 0), uv("b", 0), uv("c", 0)];
    const dem: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 9; i++) {
      const kq = chonNguoiPhuTrach(ds)!;
      kq.ungVien.tai += 1;
      kq.ungVien.lanGiaoCuoi = new Date(Date.UTC(2026, 9, 7, 0, i));
      dem[kq.ungVien.hoSoId]! += 1;
    }
    expect(dem).toEqual({ a: 3, b: 3, c: 3 });
  });
});

describe("thoi gian ca truc (gio Viet Nam)", () => {
  it("doi UTC sang gio VN", () => {
    expect(bayGioVn(new Date("2026-10-07T18:30:00Z"))).toEqual({ ngay: "2026-10-08", gio: "01:30" });
  });
  it("trong ca [tu, den)", () => {
    expect(trongCa("08:00", "08:00", "12:00")).toBe(true);
    expect(trongCa("12:00", "08:00", "12:00")).toBe(false);
    expect(trongCa("23:00", "22:00", "02:00")).toBe(true);
  });
});

// ------------------------------------------------------------------ PhanBoService voi Prisma mock

const MAU_AL01 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function taoPhanBo(tuyChon: {
  coQuyenAl01: string[];
  tai: Record<string, number>;
  dangPhuTrach?: { id: string; ho_so_id: string; ho_ten: string };
  crmUser?: Record<string, string>;
  crmKhoa?: string[];
}) {
  const { ngay } = bayGioVn();
  const nguoi = ["s1", "s2", "s3"];
  const daTao: { ho_so_id: string; ly_do: string; nguon: string }[] = [];
  const tx = {
    $executeRaw: jest.fn(async () => 1),
    vai_tro_ho_so: { findMany: jest.fn(async () => nguoi.map(id => ({ ho_so_id: id, ho_so: { crm_user_id: tuyChon.crmUser?.[id] ?? null } }))) },
    ca_truc: {
      findMany: jest.fn(async ({ where }: { where: { ho_so_id: { in: string[] } } }) =>
        nguoi.filter(id => where.ho_so_id.in.includes(id)).map(id => ({ id: `ca-${id}`, ho_so_id: id, ngay: new Date(`${ngay}T00:00:00Z`), tu_gio: "00:00", den_gio: "23:59", so_khach_toi_da: null }))
      )
    },
    quyen_sku: {
      findMany: jest.fn(async ({ where }: { where: { ho_so_id: { in: string[] } } }) =>
        where.ho_so_id.in.filter(id => tuyChon.coQuyenAl01.includes(id)).map(id => ({ ho_so_id: id }))
      )
    },
    ho_so: { findMany: jest.fn(async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.map(id => ({ id, ho_ten: `Sale ${id}` }))) },
    giao_khach: {
      findFirst: jest.fn(async () => (tuyChon.dangPhuTrach ? { ...tuyChon.dangPhuTrach, ho_so: { ho_ten: tuyChon.dangPhuTrach.ho_ten } } : null)),
      groupBy: jest.fn(async ({ by, where }: { by: string[]; where: { ho_so_id?: { in: string[] }; trang_thai?: string } }) => {
        if (by[0] === "ho_so_id" && where.trang_thai === "DANG_PHU_TRACH") {
          return where.ho_so_id!.in.map(id => ({ ho_so_id: id, _count: { _all: tuyChon.tai[id] ?? 0 } }));
        }
        return [];
      }),
      create: jest.fn(async ({ data }: { data: { ho_so_id: string; ly_do: string; nguon: string } }) => {
        daTao.push(data);
        return { id: "gk-moi", ...data };
      })
    },
    nang_luc: { findMany: jest.fn(async () => []) },
    lead: { update: jest.fn(async () => ({})) }
  };
  const prisma = { $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
  const crmDoc = {
    layMauTheoMa: jest.fn(async (ma: string) => (ma === "AL01" ? { id: MAU_AL01, ma: "AL01" } : null)),
    locNhanSuKhongConLam: jest.fn(async (ids: string[]) => ids.filter(id => (tuyChon.crmKhoa ?? []).includes(id)))
  };
  const nhatKy = { ghi: jest.fn(async () => undefined) };
  const thongBao = { gui: jest.fn(async () => undefined), guiNhieu: jest.fn(async () => 0) };
  const svc = new PhanBoService(new PhanBoRepository(prisma as never), crmDoc as never, {} as never, nhatKy as never, thongBao as never);
  return { svc, tx, daTao, thongBao };
}

describe("PhanBoService.giaoKhach", () => {
  it("bo qua nhan su CRM da bi khoa du vai chua kip dong bo", async () => {
    const { svc, daTao } = taoPhanBo({ coQuyenAl01: [], tai: { s1: 4, s2: 0, s3: 2 }, crmUser: { s1: "u1", s2: "u2" }, crmKhoa: ["u2"] });
    const kq = await svc.giaoKhach({ sdt: "0912345678", nguon: "LEAD", nguoiGiaoId: null, vaiUuTien: ["SALE"] });
    expect(kq.ho_so_id).toBe("s3");
    expect(daTao[0]).toMatchObject({ ho_so_id: "s3" });
  });

  it("giao cho nguoi trong ca co tai thap nhat, ghi ly do", async () => {
    const { svc, daTao, thongBao } = taoPhanBo({ coQuyenAl01: [], tai: { s1: 4, s2: 1, s3: 2 } });
    const kq = await svc.giaoKhach({ sdt: "0912 345 678", nguon: "LEAD", nguoiGiaoId: null, vaiUuTien: ["SALE"] });
    expect(kq.ho_so_id).toBe("s2");
    expect(daTao[0]).toMatchObject({ ho_so_id: "s2", nguon: "LEAD", sdt_chuan: "0912345678" });
    expect(daTao[0]!.ly_do).toContain("tải 1 khách");
    expect(thongBao.gui).toHaveBeenCalledWith(expect.objectContaining({ hoSoId: "s2" }), expect.anything());
  });

  it("khach quan tam ma AL01 -> chi nguoi co quyen SKU AL01 (du tai cao hon)", async () => {
    const { svc } = taoPhanBo({ coQuyenAl01: ["s1"], tai: { s1: 9, s2: 0, s3: 0 } });
    const kq = await svc.giaoKhach({ sdt: "0912345678", nguon: "LEAD", nguoiGiaoId: null, vaiUuTien: ["SALE"], maMau: "al01" });
    expect(kq.ho_so_id).toBe("s1");
    expect(kq.ly_do).toContain("mã AL01");
  });

  it("khong ai co quyen ma -> khong giao, de quan ly phan bo", async () => {
    const { svc, daTao } = taoPhanBo({ coQuyenAl01: [], tai: {} });
    const kq = await svc.giaoKhach({ sdt: "0912345678", nguon: "LEAD", nguoiGiaoId: null, vaiUuTien: ["SALE"], maMau: "AL01" });
    expect(kq.ho_so_id).toBeNull();
    expect(kq.ly_do).toContain("quyền");
    expect(daTao).toHaveLength(0);
  });

  it("khach dang co nguoi phu trach -> giu nguoi cu, khong tao dong moi", async () => {
    const { svc, daTao } = taoPhanBo({ coQuyenAl01: [], tai: {}, dangPhuTrach: { id: "gk-cu", ho_so_id: "s3", ho_ten: "Sale s3" } });
    const kq = await svc.giaoKhach({ sdt: "84912345678", nguon: "LEAD", nguoiGiaoId: null, vaiUuTien: ["SALE"] });
    expect(kq).toMatchObject({ ho_so_id: "s3", giao_khach_id: "gk-cu", moi: false });
    expect(daTao).toHaveLength(0);
  });

  it("SDT khong hop le -> 400", async () => {
    const { svc } = taoPhanBo({ coQuyenAl01: [], tai: {} });
    await expect(svc.giaoKhach({ sdt: "123", nguon: "LEAD", nguoiGiaoId: null, vaiUuTien: ["SALE"] })).rejects.toThrow("không hợp lệ");
  });
});
