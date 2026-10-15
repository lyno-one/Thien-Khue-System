import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import { DonRepository, KhachRepository } from "../../src/repositories/ban-hang.repository";
import { DonService, KhachService, LOI_KHACH_CHUA_GIAO, xacDinhGhiNhan } from "../../src/services/ban-hang.service";

const SALE_A = "11111111-1111-4111-8111-111111111111";
const SALE_B = "22222222-2222-4222-8222-222222222222";
const CTV = "33333333-3333-4333-8333-333333333333";
const MAU_AL01 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MAU_AK01 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function nd(id: string, vai: ThongTinNguoiDung["vai"] = ["SALE"]): ThongTinNguoiDung {
  return {
    id,
    email: `${id}@lyno.test`,
    hoSo: { id, ho_ten: `NV ${id.slice(0, 4)}`, email: null, sdt: null, crm_user_id: id, kich_hoat_lam_viec: true },
    vai,
    vaiChiTiet: []
  };
}

/** Bang giao_khach gia: khach 0911111111 giao cho SALE_A, 0922222222 giao cho SALE_B */
const BANG_GIAO = [
  { id: "gk-a", sdt_chuan: "0911111111", ten_khach: "Chị Lan", ho_so_id: SALE_A, nguon: "LEAD", trang_thai: "DANG_PHU_TRACH", giao_luc: new Date(), ly_do: null, lead_id: null, lead: null, ho_so: { ho_ten: "A" } },
  { id: "gk-b", sdt_chuan: "0922222222", ten_khach: "Chị Mai", ho_so_id: SALE_B, nguon: "LEAD", trang_thai: "DANG_PHU_TRACH", giao_luc: new Date(), ly_do: null, lead_id: null, lead: null, ho_so: { ho_ten: "B" } }
];

function locGiao(where: { sdt_chuan?: string; ho_so_id?: string; trang_thai?: string }) {
  return BANG_GIAO.filter(
    g => (!where.sdt_chuan || g.sdt_chuan === where.sdt_chuan) && (!where.ho_so_id || g.ho_so_id === where.ho_so_id) && (!where.trang_thai || g.trang_thai === where.trang_thai)
  );
}

/** Khach "da co" o dau do: SDT co tren CRM khach_hang / don_hang, hoac co lead / giao_khach cu */
interface TuyChonKhach {
  crmKhachSdt?: string[];
  crmDonSdt?: string[];
  leadSdt?: string[];
  giaoCuSdt?: string[];
}

function taoKhach(tc: TuyChonKhach = { crmKhachSdt: ["0911111111", "0922222222"] }) {
  const prisma = {
    giao_khach: {
      findMany: jest.fn(async ({ where }: { where: { ho_so_id?: string; trang_thai?: string } }) => locGiao(where)),
      count: jest.fn(async ({ where }: { where: { ho_so_id?: string; trang_thai?: string } }) => locGiao(where).length),
      findFirst: jest.fn(async ({ where }: { where: { sdt_chuan?: string; ho_so_id?: string; trang_thai?: string } }) => {
        const r = locGiao(where)[0];
        if (r) return r;
        // dong da KET_THUC / DA_CHUYEN (chi tra khi khong loc trang_thai)
        return !where.trang_thai && where.sdt_chuan && tc.giaoCuSdt?.includes(where.sdt_chuan) ? { id: "gk-cu" } : null;
      })
    },
    lead: { findFirst: jest.fn(async ({ where }: { where: { sdt_chuan: string } }) => (tc.leadSdt?.includes(where.sdt_chuan) ? { id: "lead-1" } : null)) }
  };
  const crmDoc = {
    layKhachTheoSdt: jest.fn(async (sdt: string) =>
      tc.crmKhachSdt?.includes(sdt) ? { id: "k1", ten: "Chị Lan", sdt, dia_chi: null, ghi_chu: null, created_at: new Date() } : null
    ),
    tongMuaHopLe: jest.fn(async () => ({ sdt_chuan: "0911111111", tong_tien: 900000, so_don: 2, lan_mua_cuoi: null })),
    layDonTheoSdt: jest.fn(async (sdt: string) => (tc.crmDonSdt?.includes(sdt) ? [{ id: "d-cu", ma_don: "DH-CU" }] : []))
  };
  const crmApi = { goi: jest.fn(async () => ({ dsCham: [] })) };
  const nhatKy = { ghi: jest.fn(async () => undefined) };
  const phanBo = {
    giaoKhach: jest.fn(async (yc: { hoSoId: string }) => ({ ho_so_id: yc.hoSoId as string | null, ho_ten: "A", giao_khach_id: "gk-moi" as string | null, ly_do: "", moi: true }))
  };
  const svc = new KhachService(new KhachRepository(prisma as never), crmDoc as never, crmApi as never, nhatKy as never, phanBo as never);
  return { svc, prisma, crmDoc, crmApi, phanBo };
}

describe("KhachService — Sale chi thay khach duoc giao", () => {
  it("danh sach cua Sale luon ep ho_so_id = chinh minh (bo qua ho_so_id tren query)", async () => {
    const { svc, prisma } = taoKhach();
    const kq = await svc.danhSach(nd(SALE_A), { ho_so_id: SALE_B });
    expect(prisma.giao_khach.findMany.mock.calls[0]![0].where.ho_so_id).toBe(SALE_A);
    expect(kq.data.map(k => k.sdt_chuan)).toEqual(["0911111111"]);
  });

  it("khong xem duoc chi tiet khach giao cho nguoi khac -> 404, khong doc CRM", async () => {
    const { svc, crmDoc } = taoKhach();
    await expect(svc.chiTiet(nd(SALE_A), "0922222222", "tok")).rejects.toBeInstanceOf(NotFoundException);
    expect(crmDoc.layKhachTheoSdt).not.toHaveBeenCalled();
    expect(crmDoc.layDonTheoSdt).not.toHaveBeenCalled();
  });

  it("khong ghi cham duoc khach cua nguoi khac", async () => {
    const { svc, crmApi } = taoKhach();
    await expect(svc.ghiCham(nd(SALE_A), "0922 222 222", "Đã gọi", "tok")).rejects.toBeInstanceOf(NotFoundException);
    expect(crmApi.goi).not.toHaveBeenCalled();
  });

  it("xem duoc khach cua minh (SDT nhap kieu +84)", async () => {
    const { svc } = taoKhach();
    const ct = await svc.chiTiet(nd(SALE_A), "+84 911 111 111", "tok");
    expect(ct.giao.giao_khach_id).toBe("gk-a");
    expect(ct.tong_mua.so_don).toBe(2);
  });

  it("ghi cham khach cua minh -> goi CRM POST /api/khach-hang/:id/cham bang token nguoi dung", async () => {
    const { svc, crmApi } = taoKhach();
    await svc.ghiCham(nd(SALE_A), "0911111111", " Đã tư vấn size ", "tok-a");
    expect(crmApi.goi).toHaveBeenCalledWith("tok-a", "POST", "/api/khach-hang/k1/cham", { body: { noiDung: "Đã tư vấn size" } });
  });

  it("QUAN_LY xem duoc khach bat ky", async () => {
    const { svc } = taoKhach();
    const ct = await svc.chiTiet(nd("44444444-4444-4444-8444-444444444444", ["QUAN_LY"]), "0922222222", "tok");
    expect(ct.giao.ho_so_id).toBe(SALE_B);
  });

  it("tao don cho khach dang do nguoi khac phu trach -> 403", async () => {
    const { svc } = taoKhach();
    await expect(svc.damBaoDuocBan(nd(SALE_A), "0922222222")).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("KhachService.damBaoDuocBan — Sale khong tu nhan khach CRM chua giao (loi 8)", () => {
  const SDT_CU = "0933333333";

  it.each<[string, TuyChonKhach]>([
    ["co tren CRM khach_hang", { crmKhachSdt: [SDT_CU] }],
    ["co don cu tren CRM", { crmDonSdt: [SDT_CU] }],
    ["tung co giao_khach (da ket thuc)", { giaoCuSdt: [SDT_CU] }],
    ["dang co lead cho phan bo", { leadSdt: [SDT_CU] }]
  ])("khach %s, chua ai phu trach -> 403 'chua duoc giao', KHONG ghi giao_khach", async (_ten, tc) => {
    const { svc, phanBo } = taoKhach(tc);
    const loi = await svc.damBaoDuocBan(nd(SALE_A), SDT_CU).catch(e => e);
    expect(loi).toBeInstanceOf(ForbiddenException);
    expect((loi as Error).message).toBe(LOI_KHACH_CHUA_GIAO);
    expect(phanBo.giaoKhach).not.toHaveBeenCalled();
  });

  it("khach dang do nguoi khac phu trach -> thong bao chung, khong lo ai phu trach", async () => {
    const { svc } = taoKhach();
    await expect(svc.damBaoDuocBan(nd(SALE_A), "0922222222")).rejects.toThrow(LOI_KHACH_CHUA_GIAO);
  });

  it("khach MOI hoan toan -> cho phep nhung CHUA ghi giao_khach (chi danh dau can tiep nhan)", async () => {
    const { svc, phanBo } = taoKhach({});
    const kq = await svc.damBaoDuocBan(nd(SALE_A), "0944444444");
    expect(kq).toEqual({ giaoKhachId: null, leadMaGioiThieu: null, canTiepNhan: true });
    expect(phanBo.giaoKhach).not.toHaveBeenCalled();
  });

  it("khach cua minh -> dung giao_khach dang co, khong tiep nhan lai", async () => {
    const { svc } = taoKhach();
    const kq = await svc.damBaoDuocBan(nd(SALE_A), "0911111111");
    expect(kq).toMatchObject({ giaoKhachId: "gk-a", canTiepNhan: false });
  });

  it("chi tiet khach CRM chua giao cho ai -> 404, khong doc CRM", async () => {
    const { svc, crmDoc } = taoKhach({ crmKhachSdt: [SDT_CU] });
    await expect(svc.chiTiet(nd(SALE_A), SDT_CU, "tok")).rejects.toBeInstanceOf(NotFoundException);
    expect(crmDoc.layDonTheoSdt).not.toHaveBeenCalled();
    expect(crmDoc.tongMuaHopLe).not.toHaveBeenCalled();
  });

  it("tiepNhanSauTaoDon: ghi giao_khach THU_CONG cho chinh nguoi chot", async () => {
    const { svc, phanBo } = taoKhach({});
    const kq = await svc.tiepNhanSauTaoDon(nd(SALE_A), "0944444444", "Chị Hoa");
    expect(phanBo.giaoKhach).toHaveBeenCalledWith(expect.objectContaining({ sdt: "0944444444", hoSoId: SALE_A, nguon: "THU_CONG" }));
    expect(kq).toEqual({ giaoKhachId: "gk-moi", canhBao: null });
  });

  it("tiepNhanSauTaoDon: khach vua bi giao cho nguoi khac -> canh bao, khong nem", async () => {
    const { svc, phanBo } = taoKhach({});
    phanBo.giaoKhach.mockResolvedValueOnce({ ho_so_id: SALE_B, ho_ten: "B", giao_khach_id: "gk-x", ly_do: "", moi: false });
    const kq = await svc.tiepNhanSauTaoDon(nd(SALE_A), "0944444444", "Chị Hoa");
    expect(kq.giaoKhachId).toBeNull();
    expect(kq.canhBao).toContain("người khác");
  });
});

// ------------------------------------------------------------------ tao don

function taoDon(tuyChon: {
  quyen: string[];
  maGioiThieu?: { id: string; ma: string; ho_so_id: string } | null;
  /** khach moi (chua ai phu trach) -> can tiep nhan sau khi CRM tao don */
  khachMoi?: boolean;
  crmLoi?: boolean;
}) {
  const daGhi: Record<string, unknown>[] = [];
  const tx = {
    ghi_nhan_don: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        daGhi.push(data);
        return { id: "gn-1", ...data };
      })
    }
  };
  const prisma = {
    ma_gioi_thieu: { findFirst: jest.fn(async () => tuyChon.maGioiThieu ?? null) },
    vai_tro_ho_so: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx))
  };
  const crmDoc = {
    layMauTheoIds: jest.fn(async (ids: string[]) =>
      [
        { id: MAU_AL01, ma: "AL01", gia_ban: 450000, trang_thai: "dang_ban" },
        { id: MAU_AK01, ma: "AK01", gia_ban: 390000, trang_thai: "dang_ban" }
      ].filter(m => ids.includes(m.id))
    )
  };
  const crmApi = {
    taoDon: jest.fn(async () => {
      if (tuyChon.crmLoi) throw new BadRequestException("CRM: hết hàng size M");
      return { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", ma_don: "DH0001" };
    })
  };
  const quyenSku = { coQuyen: jest.fn(async (_h: string, mauId: string) => tuyChon.quyen.includes(mauId)) };
  const khach = {
    damBaoDuocBan: jest.fn(async () =>
      tuyChon.khachMoi
        ? { giaoKhachId: null as string | null, leadMaGioiThieu: null, canTiepNhan: true }
        : { giaoKhachId: "gk-a" as string | null, leadMaGioiThieu: null, canTiepNhan: false }
    ),
    tiepNhanSauTaoDon: jest.fn(async () => ({ giaoKhachId: "gk-moi" as string | null, canhBao: null as string | null }))
  };
  const nhatKy = { ghi: jest.fn(async () => undefined) };
  const thongBao = { guiNhieu: jest.fn(async () => 0) };
  const svc = new DonService(new DonRepository(prisma as never), crmDoc as never, crmApi as never, quyenSku as never, khach as never, nhatKy as never, thongBao as never);
  return { svc, crmApi, daGhi, khach };
}

const BODY = {
  kenh: "facebook" as const,
  khach_ten: "Chị Lan",
  khach_sdt: "0911111111",
  dong: [
    { mau_id: MAU_AL01, size: "M", so_luong: 1 },
    { mau_id: MAU_AK01, size: "L", so_luong: 2 }
  ]
};

describe("DonService.taoDon — chan SKU chua duoc quyen", () => {
  it("co mot ma chua duoc quyen -> 403 neu ro ma, KHONG goi CRM", async () => {
    const { svc, crmApi, khach } = taoDon({ quyen: [MAU_AL01] });
    const loi = await svc.taoDon(nd(SALE_A), BODY, "tok").catch(e => e);
    expect(loi).toBeInstanceOf(ForbiddenException);
    expect((loi as Error).message).toContain("AK01");
    expect((loi as Error).message).not.toContain("AL01");
    expect(crmApi.taoDon).not.toHaveBeenCalled();
    expect(khach.damBaoDuocBan).not.toHaveBeenCalled();
  });

  it("chua lien ket nhan su CRM -> 403", async () => {
    const { svc, crmApi } = taoDon({ quyen: [MAU_AL01, MAU_AK01] });
    const nguoi = nd(SALE_A);
    nguoi.hoSo.crm_user_id = null;
    await expect(svc.taoDon(nguoi, BODY, "tok")).rejects.toBeInstanceOf(ForbiddenException);
    expect(crmApi.taoDon).not.toHaveBeenCalled();
  });

  it("du quyen -> tao don CRM (gia mac dinh = gia_ban) + ghi nhan HOP_LE nguon SALE", async () => {
    const { svc, crmApi, daGhi } = taoDon({ quyen: [MAU_AL01, MAU_AK01] });
    const kq = await svc.taoDon(nd(SALE_A), BODY, "tok-a");
    expect(crmApi.taoDon).toHaveBeenCalledWith(
      "tok-a",
      expect.objectContaining({
        kenh: "facebook",
        khach_sdt: "0911111111",
        dong: [
          expect.objectContaining({ mau_id: MAU_AL01, don_gia: 450000, so_luong: 1 }),
          expect.objectContaining({ mau_id: MAU_AK01, don_gia: 390000, so_luong: 2 })
        ]
      })
    );
    expect(kq.tong_tien).toBe(450000 + 2 * 390000);
    expect(kq.ghi_nhan.trang_thai).toBe("HOP_LE");
    expect(daGhi[0]).toMatchObject({ nguon: "SALE", nguoi_ban_ho_so_id: SALE_A, nguoi_chot_ho_so_id: SALE_A, trang_thai: "HOP_LE" });
  });

  it("ma gioi thieu cua CTV khac nguoi chot -> CHO_XAC_MINH, chua ghi nguoi ban", async () => {
    const { svc, daGhi } = taoDon({ quyen: [MAU_AL01, MAU_AK01], maGioiThieu: { id: "mg-1", ma: "CTV123", ho_so_id: CTV } });
    const kq = await svc.taoDon(nd(SALE_A), { ...BODY, ma_gioi_thieu: "ctv123" }, "tok");
    expect(kq.ghi_nhan.trang_thai).toBe("CHO_XAC_MINH");
    expect(daGhi[0]).toMatchObject({ trang_thai: "CHO_XAC_MINH", nguoi_ban_ho_so_id: null, nguoi_chot_ho_so_id: SALE_A, ma_gioi_thieu: "CTV123" });
  });

  it("ma gioi thieu nhap tay khong ton tai -> 400 truoc khi tao don CRM", async () => {
    const { svc, crmApi } = taoDon({ quyen: [MAU_AL01, MAU_AK01], maGioiThieu: null });
    await expect(svc.taoDon(nd(SALE_A), { ...BODY, ma_gioi_thieu: "KHONGCO" }, "tok")).rejects.toThrow("không tồn tại");
    expect(crmApi.taoDon).not.toHaveBeenCalled();
  });
});

describe("DonService.taoDon — giao_khach chi ghi SAU khi CRM tao don (loi 8)", () => {
  it("khach moi + CRM tu choi don -> nem loi, KHONG tiep nhan khach", async () => {
    const { svc, khach } = taoDon({ quyen: [MAU_AL01, MAU_AK01], khachMoi: true, crmLoi: true });
    await expect(svc.taoDon(nd(SALE_A), BODY, "tok")).rejects.toBeInstanceOf(BadRequestException);
    expect(khach.tiepNhanSauTaoDon).not.toHaveBeenCalled();
  });

  it("khach moi + CRM tao don thanh cong -> tiep nhan khach SAU CRM", async () => {
    const { svc, khach, crmApi } = taoDon({ quyen: [MAU_AL01, MAU_AK01], khachMoi: true });
    const kq = await svc.taoDon(nd(SALE_A), BODY, "tok");
    expect(khach.damBaoDuocBan).toHaveBeenCalledWith(expect.objectContaining({ id: SALE_A }), "0911111111");
    expect(khach.tiepNhanSauTaoDon).toHaveBeenCalledWith(expect.objectContaining({ id: SALE_A }), "0911111111", "Chị Lan");
    expect(crmApi.taoDon.mock.invocationCallOrder[0]!).toBeLessThan(khach.tiepNhanSauTaoDon.mock.invocationCallOrder[0]!);
    expect(kq.canh_bao).toBeNull();
  });

  it("khach da duoc giao cho minh -> khong tiep nhan lai", async () => {
    const { svc, khach } = taoDon({ quyen: [MAU_AL01, MAU_AK01] });
    await svc.taoDon(nd(SALE_A), BODY, "tok");
    expect(khach.tiepNhanSauTaoDon).not.toHaveBeenCalled();
  });

  it("tiep nhan sau CRM khong thanh -> don van tao, tra canh bao doi soat", async () => {
    const { svc, khach } = taoDon({ quyen: [MAU_AL01, MAU_AK01], khachMoi: true });
    khach.tiepNhanSauTaoDon.mockResolvedValueOnce({ giaoKhachId: null, canhBao: "Khách vừa được giao cho người khác trong lúc tạo đơn — báo quản lý đối soát" });
    const kq = await svc.taoDon(nd(SALE_A), BODY, "tok");
    expect(kq.ma_don).toBe("DH0001");
    expect(kq.canh_bao).toContain("DH0001");
    expect(kq.canh_bao).toContain("người khác");
  });
});

describe("xacDinhGhiNhan — mot don mot nguoi ban", () => {
  it("ma cua chinh nguoi chot -> HOP_LE", () => {
    expect(xacDinhGhiNhan(SALE_A, { id: "m", ma: "X", ho_so_id: SALE_A })).toMatchObject({ trang_thai: "HOP_LE", nguoi_ban_ho_so_id: SALE_A });
  });
  it("khong ma -> HOP_LE cho nguoi chot", () => {
    expect(xacDinhGhiNhan(SALE_A, null)).toMatchObject({ trang_thai: "HOP_LE", nguon: "SALE", nguoi_ban_ho_so_id: SALE_A });
  });
});
