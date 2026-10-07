import { ConflictException, NotFoundException } from "@nestjs/common";
import { HoTroRepository } from "../../src/repositories/ban-hang.repository";
import { HoTroService } from "../../src/services/ban-hang.service";

/* Yeu cau ho tro KOL / KOC luu o bang thien_khue.yeu_cau_ho_tro (truoc day tam trong thong_bao) */

const KOC = "koc-1";
const SALE_A = "sale-a";
const SALE_B = "sale-b";
const nd = (id: string, vai: string[]) => ({ id, email: null, hoSo: { id, ho_ten: `Người ${id}`, email: null, sdt: null, crm_user_id: null, kich_hoat_lam_viec: true }, vai, vaiChiTiet: [] }) as never;

function taoMock(opts: { ungVien?: string[]; mo?: Record<string, number>; hoatDong?: string[] } = {}) {
  const daTao: Record<string, unknown>[] = [];
  const bang = {
    groupBy: jest.fn(async (q: { where: { nguoi_ho_tro_id: { in: string[] } } }) =>
      q.where.nguoi_ho_tro_id.in.filter(id => opts.mo?.[id]).map(id => ({ nguoi_ho_tro_id: id, _count: { _all: opts.mo![id] } }))
    ),
    create: jest.fn(async (q: { data: Record<string, unknown> }) => {
      const r = { id: "yc-1", trang_thai: "MO", tra_loi: null, xu_ly_luc: null, created_at: new Date(), updated_at: new Date(), ...q.data };
      daTao.push(r);
      return r;
    }),
    findFirst: jest.fn(async (q: { where: { id: string; nguoi_ho_tro_id?: string } }) => {
      const r = daTao.find(y => y.id === q.where.id && (!q.where.nguoi_ho_tro_id || y.nguoi_ho_tro_id === q.where.nguoi_ho_tro_id));
      return r ?? null;
    }),
    update: jest.fn(async (q: { data: Record<string, unknown> }) => ({ ...daTao[0], ...q.data }))
  };
  const tx = { yeu_cau_ho_tro: bang, vai_tro_ho_so: { findMany: jest.fn(async () => (opts.hoatDong ?? []).map(id => ({ ho_so_id: id }))) } };
  const prisma = { ...tx, ho_so: { findMany: jest.fn(async () => []) }, $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
  const phanBo = { layUngVien: jest.fn(async () => ({ ds: (opts.ungVien ?? []).map(id => ({ hoSoId: id, vai: "SALE", mucNangLuc: 3, tai: 0, toiDaTrongCa: null, lanGiaoCuoi: null })), moTaNangLuc: "" })) };
  const thongBao = { gui: jest.fn(async () => undefined) };
  const nhatKy = { ghi: jest.fn(async () => undefined) };
  return { svc: new HoTroService(new HoTroRepository(prisma as never), phanBo as never, thongBao as never, nhatKy as never), bang, thongBao };
}

describe("HoTroService (bang yeu_cau_ho_tro)", () => {
  it("giao cho Sale dang truc it yeu cau MO nhat, luu bang rieng + bao nguoi ho tro", async () => {
    const { svc, bang, thongBao } = taoMock({ ungVien: [SALE_A, SALE_B], mo: { [SALE_A]: 3 } });
    const yc = await svc.tao(nd(KOC, ["KOC"]), { noi_dung: "Góp ý kịch bản", ma_mau: "al01" });
    expect(bang.create).toHaveBeenCalledWith({ data: expect.objectContaining({ nguoi_gui_id: KOC, nguoi_ho_tro_id: SALE_B, ma_mau: "AL01" }) });
    expect(yc.da_xu_ly).toBe(false);
    expect(thongBao.gui).toHaveBeenCalledWith(expect.objectContaining({ hoSoId: SALE_B, lienKet: "/lam-viec/ban-hang/ho-tro" }));
  });

  it("khong ai dang hoat dong -> 409, khong tao", async () => {
    const { svc, bang } = taoMock({ ungVien: [], hoatDong: [] });
    await expect(svc.tao(nd(KOC, ["KOC"]), { noi_dung: "Cần hỗ trợ" })).rejects.toBeInstanceOf(ConflictException);
    expect(bang.create).not.toHaveBeenCalled();
  });

  it("chi nguoi duoc giao (hoac QUAN_LY) tra loi duoc", async () => {
    const { svc } = taoMock({ ungVien: [SALE_A] });
    await svc.tao(nd(KOC, ["KOC"]), { noi_dung: "Cần hỗ trợ" });
    await expect(svc.traLoi(nd(SALE_B, ["SALE"]), "yc-1", "x")).rejects.toBeInstanceOf(NotFoundException);
    const kq = await svc.traLoi(nd(SALE_A, ["SALE"]), "yc-1", "Đã góp ý");
    expect(kq.da_xu_ly).toBe(true);
    expect(kq.tra_loi).toBe("Đã góp ý");
  });
});
