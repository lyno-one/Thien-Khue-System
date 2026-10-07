import { BadRequestException, ConflictException, ExecutionContext, ForbiddenException, GoneException, UnauthorizedException } from "@nestjs/common";
import { datLaiCauHinh } from "../../src/config/cau-hinh";
import { bienTheDuongDan, HmacStGuard } from "../../src/common/guards/hmac-st.guard";
import { kiemChuKy, kyHmac, taoHeaderKy } from "../../src/common/utils/hmac";
import { datPhienLuyenAi, docYeuCauLuyenAi, mocTinhLai, tinhTienDoLuyenAi } from "../../src/common/utils/dao-tao-luyen-ai";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import type { KetQuaLuyenAiDto } from "../../src/dto/dao-tao/dao-tao-luyen-ai.dto";
import type { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import { DuLieuHocRepository, LuyenAiRepository, ThucHanhRepository } from "../../src/repositories/dao-tao.repository";
import type { NhatKyService, ThongBaoService } from "../../src/services/core.service";
import { LuyenAiService } from "../../src/services/dao-tao-luyen-ai.service";
import { ThucHanhService, type XetDatService } from "../../src/services/dao-tao.service";

const BI_MAT = "tk-st-test-bi-mat-dung-chung-0123456789abcdef";
const HOC_VIEN = "33333333-3333-4333-8333-333333333333";
const CRM_USER = "44444444-4444-4444-8444-444444444444";
const KHOA = "55555555-5555-4555-8555-555555555555";
const YC = { nguong: 80, can: { TU_VAN: 1, DOI_TRA: 1 } };

beforeAll(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test";
  process.env.SALES_TRAINING_URL = "http://localhost:3020/";
  process.env.TICH_HOP_ST_SECRET = BI_MAT;
  datLaiCauHinh();
});
afterAll(() => datLaiCauHinh());

// ------------------------------------------------------------------ HMAC

describe("HMAC Sales Training", () => {
  const bayGio = 1_791_000_000_000;
  const tg = String(Math.floor(bayGio / 1000));
  const than = '{"phien_id":"p1"}';
  const co = (chuKy: string, thoiGian = tg, duongDan = ["/api/dao-tao/luyen-ai/ket-qua"]) =>
    kiemChuKy({ biMat: BI_MAT, thoiGian, chuKy, phuongThuc: "POST", duongDan, than, bayGioMs: bayGio });

  it("chu ky dung -> hop le", () => {
    expect(co(kyHmac(BI_MAT, tg, "POST", "/api/dao-tao/luyen-ai/ket-qua", than))).toEqual({ hopLe: true });
  });

  it("chu ky dung theo cong thuc '<thoi-gian>.<METHOD>.<path>.<body>'", () => {
    const { createHmac } = jest.requireActual<typeof import("node:crypto")>("node:crypto");
    const tuTinh = createHmac("sha256", BI_MAT).update(`${tg}.POST./api/dao-tao/luyen-ai/ket-qua.${than}`).digest("hex");
    expect(kyHmac(BI_MAT, tg, "post", "/api/dao-tao/luyen-ai/ket-qua", than)).toBe(tuTinh);
  });

  it("sai chu ky / sai bi mat / sua than -> SAI_CHU_KY", () => {
    expect(co("0".repeat(64))).toEqual({ hopLe: false, lyDo: "SAI_CHU_KY" });
    expect(co(kyHmac("bi-mat-khac-bi-mat-khac-bi-mat-khac-1234", tg, "POST", "/api/dao-tao/luyen-ai/ket-qua", than))).toEqual({ hopLe: false, lyDo: "SAI_CHU_KY" });
    expect(co(kyHmac(BI_MAT, tg, "POST", "/api/dao-tao/luyen-ai/ket-qua", '{"phien_id":"p2"}'))).toEqual({ hopLe: false, lyDo: "SAI_CHU_KY" });
    // Ky cho route khac khong dung duoc o route nay
    expect(co(kyHmac(BI_MAT, tg, "POST", "/api/dao-tao/luyen-ai/phieu", than))).toEqual({ hopLe: false, lyDo: "SAI_CHU_KY" });
  });

  it("lech gio > 300 s -> LECH_GIO (ca truoc lan sau); 300 s van hop le", () => {
    const cu = String(Number(tg) - 301);
    expect(co(kyHmac(BI_MAT, cu, "POST", "/api/dao-tao/luyen-ai/ket-qua", than), cu)).toEqual({ hopLe: false, lyDo: "LECH_GIO" });
    const tuongLai = String(Number(tg) + 301);
    expect(co(kyHmac(BI_MAT, tuongLai, "POST", "/api/dao-tao/luyen-ai/ket-qua", than), tuongLai)).toEqual({ hopLe: false, lyDo: "LECH_GIO" });
    const bien = String(Number(tg) - 300);
    expect(co(kyHmac(BI_MAT, bien, "POST", "/api/dao-tao/luyen-ai/ket-qua", than), bien)).toEqual({ hopLe: true });
  });

  it("thieu header / bi mat ngan -> tu choi", () => {
    expect(kiemChuKy({ biMat: BI_MAT, thoiGian: undefined, chuKy: undefined, phuongThuc: "GET", duongDan: ["/x"], than: "" })).toEqual({ hopLe: false, lyDo: "THIEU_HEADER" });
    expect(kiemChuKy({ biMat: "ngan", thoiGian: tg, chuKy: "a".repeat(64), phuongThuc: "GET", duongDan: ["/x"], than: "" })).toEqual({ hopLe: false, lyDo: "CHUA_CAU_HINH" });
  });

  it("bien the duong dan: co / khong tien to /api", () => {
    expect(bienTheDuongDan("/api/dao-tao/luyen-ai/phieu/abc")).toEqual(["/api/dao-tao/luyen-ai/phieu/abc", "/dao-tao/luyen-ai/phieu/abc"]);
  });

  function nguCanh(req: Record<string, unknown>): ExecutionContext {
    return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
  }

  it("HmacStGuard: dung -> qua; sai -> 401; ky tren rawBody", () => {
    const guard = new HmacStGuard();
    const headers = taoHeaderKy(BI_MAT, "POST", "/api/dao-tao/luyen-ai/ket-qua", than);
    const req = {
      method: "POST",
      originalUrl: "/api/dao-tao/luyen-ai/ket-qua",
      headers: { "x-tk-thoi-gian": headers["X-TK-Thoi-Gian"], "x-tk-chu-ky": headers["X-TK-Chu-Ky"] },
      rawBody: Buffer.from(than)
    };
    expect(guard.canActivate(nguCanh(req))).toBe(true);
    expect(() => guard.canActivate(nguCanh({ ...req, rawBody: Buffer.from('{"phien_id":"gia"}') }))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(nguCanh({ ...req, headers: {} }))).toThrow(UnauthorizedException);
    // GET khong than: chuoi ky ket thuc bang "."
    const hGet = taoHeaderKy(BI_MAT, "GET", "/api/dao-tao/luyen-ai/phieu/abc");
    expect(
      guard.canActivate(
        nguCanh({ method: "GET", originalUrl: "/api/dao-tao/luyen-ai/phieu/abc", headers: { "x-tk-thoi-gian": hGet["X-TK-Thoi-Gian"], "x-tk-chu-ky": hGet["X-TK-Chu-Ky"] } })
      )
    ).toBe(true);
  });
});

// ------------------------------------------------------------------ luat dat

describe("Luat dat phien luyen AI", () => {
  it("79 truot, 80 + 0 vi pham dat, 90 + 1 vi pham truot", () => {
    expect(datPhienLuyenAi(79, 0)).toBe(false);
    expect(datPhienLuyenAi(80, 0)).toBe(true);
    expect(datPhienLuyenAi(90, 1)).toBe(false);
  });

  it("nguong cau hinh khong ha duoi 80", () => {
    expect(datPhienLuyenAi(75, 0, 70)).toBe(false);
    expect(docYeuCauLuyenAi({ nguong: 60 })?.nguong).toBe(80);
    expect(docYeuCauLuyenAi({ nguong: 85, can: { TU_VAN: 2 } })).toEqual({ nguong: 85, can: { TU_VAN: 2, DOI_TRA: 1 } });
    expect(docYeuCauLuyenAi(null)).toBeNull();
  });

  it("can du ca TU_VAN va DOI_TRA; phien truoc lan mentor tra ve khong tinh", () => {
    const t = (ngay: number) => new Date(Date.UTC(2026, 9, ngay));
    const phien = [
      { loai: "TU_VAN" as const, dat: true, diem_tong: 85, nhan_luc: t(1) },
      { loai: "DOI_TRA" as const, dat: false, diem_tong: 92, nhan_luc: t(1) }
    ];
    expect(tinhTienDoLuyenAi(YC, phien, null).du).toBe(false);
    const du = [...phien, { loai: "DOI_TRA" as const, dat: true, diem_tong: 81, nhan_luc: t(2) }];
    expect(tinhTienDoLuyenAi(YC, du, null)).toMatchObject({ du: true, theoLoai: { TU_VAN: true, DOI_TRA: true } });
    const moc = mocTinhLai([{ trang_thai: "CHUA_DAT", cham_luc: t(3) }]);
    expect(tinhTienDoLuyenAi(YC, du, moc).du).toBe(false);
  });
});

// ------------------------------------------------------------------ service voi Prisma gia trong bo nho

const nhatKy = () => ({ ghi: jest.fn(async () => undefined) }) as unknown as NhatKyService;
const thongBao = () => ({ gui: jest.fn(async () => undefined) }) as unknown as ThongBaoService;

function nguoiDung(vai: { vai: string; trang_thai: string }[]): ThongTinNguoiDung {
  return {
    id: HOC_VIEN,
    email: "hv@lyno.test",
    hoSo: { id: HOC_VIEN, ho_ten: "Học viên", email: "hv@lyno.test", sdt: null, crm_user_id: CRM_USER, kich_hoat_lam_viec: false },
    vai: vai.filter(v => v.trang_thai === "HOAT_DONG").map(v => v.vai),
    vaiChiTiet: vai.map(v => ({ ...v, tu_luc: new Date(), den_luc: null }))
  } as unknown as ThongTinNguoiDung;
}

interface Phieu {
  id: string;
  ma: string;
  ho_so_id: string;
  khoa_hoc_id: string;
  loai: "TU_VAN" | "DOI_TRA";
  het_han: Date;
  dung_luc: Date | null;
}

function taoKho() {
  const khoa = { id: KHOA, ma: "sale-cskh", ten: "Sale / CSKH chuẩn LYNO", bat: true, can_thuc_hanh: true, yeu_cau_luyen_ai: YC as unknown, vai_ap_dung: ["SALE", "CSKH"] };
  const phieu: Phieu[] = [];
  const phien: Record<string, unknown>[] = [];
  const bai: Record<string, unknown>[] = [];
  let dem = 0;
  const id = () => `00000000-0000-4000-8000-${String(++dem).padStart(12, "0")}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma gia trong bo nho
  const db: Record<string, any> = {
    khoa_hoc: {
      findUnique: jest.fn(async ({ where }: { where: { id?: string; ma?: string } }) => (where.id === KHOA || where.ma === "sale-cskh" ? khoa : null)),
      findMany: jest.fn(async () => [{ ma_mau: "AL01" }])
    },
    quyen_sku: { findMany: jest.fn(async () => []) },
    phieu_luyen_ai: {
      create: jest.fn(async ({ data }: { data: Omit<Phieu, "id" | "dung_luc"> }) => {
        const p = { id: id(), dung_luc: null, ...data };
        phieu.push(p);
        return p;
      }),
      updateMany: jest.fn(async ({ where, data }: { where: { ma: string; het_han: { gt: Date } }; data: { dung_luc: Date } }) => {
        const p = phieu.find(x => x.ma === where.ma && !x.dung_luc && x.het_han > where.het_han.gt);
        if (!p) return { count: 0 };
        p.dung_luc = data.dung_luc;
        return { count: 1 };
      }),
      findUnique: jest.fn(async ({ where }: { where: { ma: string } }) => {
        const p = phieu.find(x => x.ma === where.ma);
        return p ? { ...p, ho_so: { id: p.ho_so_id, crm_user_id: CRM_USER, vai_tro: [{ vai: "SALE" }] }, khoa_hoc: khoa } : null;
      })
    },
    phien_luyen_ai: {
      findUnique: jest.fn(async ({ where }: { where: { phien_id_st: string } }) => phien.find(p => p.phien_id_st === where.phien_id_st) ?? null),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const p = { id: id(), nhan_luc: new Date(Date.now() + dem), ...data };
        phien.push(p);
        return p;
      }),
      findMany: jest.fn(async () => [...phien].reverse())
    },
    bai_thuc_hanh: {
      findMany: jest.fn(async () => [...bai].reverse()),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const b = { id: id(), cham_luc: null, nhan_xet: null, ...data };
        bai.push(b);
        return { id: b.id };
      }),
      updateMany: jest.fn(async () => ({ count: 1 }))
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown): Promise<unknown> => fn(db))
  };
  const svc = new LuyenAiService(new LuyenAiRepository(db as unknown as PrismaService), nhatKy(), thongBao());
  return { svc, db, phieu, phien, bai, khoa };
}

const ketQua = (maPhieu: string, them: Partial<KetQuaLuyenAiDto> = {}): KetQuaLuyenAiDto =>
  ({
    ma_phieu: maPhieu,
    phien_id: `st-${Math.random().toString(36).slice(2)}`,
    crm_user_id: CRM_USER,
    loai: "TU_VAN",
    diem_tong: 85,
    diem_ky_nang: { khai_thac: 80, lang_nghe: 90, gia_tri: 85, phan_doi: 80, chot: 85, tuan_thu: 100 },
    so_vi_pham: 0,
    vi_pham: [],
    tom_tat: "Tư vấn tốt",
    diem_manh: ["Hỏi số đo"],
    can_cai_thien: [],
    link_xem: "http://localhost:3020/luyen-tap/1",
    ket_thuc_luc: new Date().toISOString(),
    ...them
  }) as KetQuaLuyenAiDto;

const SALE = [{ vai: "SALE", trang_thai: "DANG_HOC" }];

/** Mo phieu (Bearer) + Sales Training doi phieu (HMAC) */
async function moPhieu(k: ReturnType<typeof taoKho>, loai: "TU_VAN" | "DOI_TRA") {
  const p = await k.svc.taoPhieu(nguoiDung(SALE), { khoa_hoc_id: KHOA, loai });
  await k.svc.doiPhieu(p.ma_phieu);
  return p.ma_phieu;
}

describe("LuyenAiService — phieu", () => {
  it("SALE dang hoc mo phieu: url_vao toi Sales Training, han 10 phut", async () => {
    const k = taoKho();
    const p = await k.svc.taoPhieu(nguoiDung(SALE), { khoa_hoc_id: KHOA, loai: "TU_VAN" });
    expect(p.url_vao).toBe("http://localhost:3020/api/vao-tu-thien-khue");
    expect(p.ma_phieu.length).toBeGreaterThanOrEqual(32);
    const han = new Date(p.het_han).getTime() - Date.now();
    expect(han).toBeGreaterThan(9 * 60_000);
    expect(han).toBeLessThanOrEqual(10 * 60_000);
  });

  it("vai khong phai SALE / CSKH (CTV, SALE da KET_THUC) -> 403", async () => {
    const k = taoKho();
    await expect(k.svc.taoPhieu(nguoiDung([{ vai: "CTV", trang_thai: "HOAT_DONG" }]), { khoa_hoc_id: KHOA, loai: "TU_VAN" })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(k.svc.taoPhieu(nguoiDung([{ vai: "SALE", trang_thai: "KET_THUC" }]), { khoa_hoc_id: KHOA, loai: "TU_VAN" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(k.db.phieu_luyen_ai.create).not.toHaveBeenCalled();
  });

  it("khoa khong yeu cau luyen AI -> 400", async () => {
    const k = taoKho();
    k.khoa.yeu_cau_luyen_ai = null;
    await expect(k.svc.taoPhieu(nguoiDung(SALE), { khoa_hoc_id: KHOA, loai: "TU_VAN" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("doi phieu tra ngu canh; dung lan hai -> 410", async () => {
    const k = taoKho();
    const p = await k.svc.taoPhieu(nguoiDung(SALE), { khoa_hoc_id: KHOA, loai: "DOI_TRA" });
    const nc = await k.svc.doiPhieu(p.ma_phieu);
    expect(nc).toEqual({ ho_so_id: HOC_VIEN, crm_user_id: CRM_USER, loai: "DOI_TRA", khoa_hoc_ma: "sale-cskh", ten_khoa: "Sale / CSKH chuẩn LYNO", ma_mau: ["AL01"] });
    await expect(k.svc.doiPhieu(p.ma_phieu)).rejects.toBeInstanceOf(GoneException);
  });

  it("phieu het han -> 410", async () => {
    const k = taoKho();
    const p = await k.svc.taoPhieu(nguoiDung(SALE), { khoa_hoc_id: KHOA, loai: "TU_VAN" });
    k.phieu[0].het_han = new Date(Date.now() - 1000);
    await expect(k.svc.doiPhieu(p.ma_phieu)).rejects.toBeInstanceOf(GoneException);
  });
});

describe("LuyenAiService — nhan ket qua", () => {
  it("sai nguoi (crm_user_id khac nguoi mo phieu) -> 403, khong luu", async () => {
    const k = taoKho();
    const ma = await moPhieu(k, "TU_VAN");
    await expect(k.svc.nhanKetQua(ketQua(ma, { crm_user_id: "99999999-9999-4999-8999-999999999999" }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(k.phien).toHaveLength(0);
  });

  it("phieu chua duoc doi -> 409; loai khac phieu -> 400", async () => {
    const k = taoKho();
    const p = await k.svc.taoPhieu(nguoiDung(SALE), { khoa_hoc_id: KHOA, loai: "TU_VAN" });
    await expect(k.svc.nhanKetQua(ketQua(p.ma_phieu))).rejects.toBeInstanceOf(ConflictException);
    await k.svc.doiPhieu(p.ma_phieu);
    await expect(k.svc.nhanKetQua(ketQua(p.ma_phieu, { loai: "DOI_TRA" }))).rejects.toBeInstanceOf(BadRequestException);
  });

  it("79 truot, 80 dat, 90 + 1 vi pham truot (ke ca so_vi_pham = 0 ma danh sach co vi pham)", async () => {
    const k = taoKho();
    const ma = await moPhieu(k, "TU_VAN");
    expect((await k.svc.nhanKetQua(ketQua(ma, { diem_tong: 79 }))).dat).toBe(false);
    expect((await k.svc.nhanKetQua(ketQua(ma, { diem_tong: 80 }))).dat).toBe(true);
    expect((await k.svc.nhanKetQua(ketQua(ma, { diem_tong: 90, so_vi_pham: 1, vi_pham: [{ loai: "HUA_SAI", trich: "Chị trả lúc nào cũng được" }] }))).dat).toBe(false);
    expect((await k.svc.nhanKetQua(ketQua(ma, { diem_tong: 95, so_vi_pham: 0, vi_pham: [{ loai: "HUA_SAI", trich: "Freeship mọi đơn" }] }))).dat).toBe(false);
    expect(k.phien.map(p => p.dat)).toEqual([false, true, false, false]);
  });

  it("chi dat TU_VAN -> chua tao bai; them DOI_TRA dat -> bai LUYEN_AI CHO_CHAM kem bang chung", async () => {
    const k = taoKho();
    const maTv = await moPhieu(k, "TU_VAN");
    const r1 = await k.svc.nhanKetQua(ketQua(maTv, { diem_tong: 88 }));
    expect(r1).toEqual({ dat: true, tien_do: { TU_VAN: true, DOI_TRA: false } });
    expect(k.bai).toHaveLength(0);

    const maDt = await moPhieu(k, "DOI_TRA");
    const r2 = await k.svc.nhanKetQua(ketQua(maDt, { loai: "DOI_TRA", diem_tong: 82 }));
    expect(r2.tien_do).toEqual({ TU_VAN: true, DOI_TRA: true });
    expect(r2.bai_thuc_hanh_id).toBeDefined();
    expect(k.bai).toHaveLength(1);
    const b = k.bai[0] as { trang_thai: string; nguon: string; ho_so_id: string; vai: string; bang_chung: { phien: { loai: string; diem_tong: number }[] } };
    expect(b).toMatchObject({ trang_thai: "CHO_CHAM", nguon: "LUYEN_AI", ho_so_id: HOC_VIEN, vai: "SALE" });
    expect(b.bang_chung.phien.map(p => [p.loai, p.diem_tong])).toEqual([
      ["TU_VAN", 88],
      ["DOI_TRA", 82]
    ]);
    // Khong tu dat: chi CHO_CHAM, khong ai cham
    expect(k.db.bai_thuc_hanh.create).toHaveBeenCalledTimes(1);
  });

  it("idempotent theo phien_id: gui lai khong nhan ban phien / bai", async () => {
    const k = taoKho();
    const maTv = await moPhieu(k, "TU_VAN");
    await k.svc.nhanKetQua(ketQua(maTv));
    const maDt = await moPhieu(k, "DOI_TRA");
    const kq = ketQua(maDt, { loai: "DOI_TRA", phien_id: "st-co-dinh" });
    const r1 = await k.svc.nhanKetQua(kq);
    const r2 = await k.svc.nhanKetQua(kq);
    expect(r2).toEqual(r1);
    expect(k.phien).toHaveLength(2);
    expect(k.bai).toHaveLength(1);
    expect(k.db.bai_thuc_hanh.updateMany).not.toHaveBeenCalled();
  });

  it("phien_id da ghi cho nguoi khac -> 409", async () => {
    const k = taoKho();
    const ma = await moPhieu(k, "TU_VAN");
    k.phien.push({ id: "x", phien_id_st: "st-trung", ho_so_id: "khac", khoa_hoc_id: KHOA, loai: "TU_VAN", dat: true, diem_tong: 90, nhan_luc: new Date() });
    await expect(k.svc.nhanKetQua(ketQua(ma, { phien_id: "st-trung" }))).rejects.toBeInstanceOf(ConflictException);
  });

  it("tien do cua toi: hai loai, phien moi nhat truoc", async () => {
    const k = taoKho();
    const ma = await moPhieu(k, "TU_VAN");
    await k.svc.nhanKetQua(ketQua(ma, { diem_tong: 70 }));
    await k.svc.nhanKetQua(ketQua(ma, { diem_tong: 86 }));
    const td = await k.svc.tienDo(nguoiDung(SALE), "sale-cskh");
    expect(td.duoc_luyen).toBe(true);
    expect(td.loai.find(l => l.loai === "TU_VAN")).toMatchObject({ so_dat: 1, so_phien: 2, diem_cao_nhat: 86, dat: true });
    expect(td.loai.find(l => l.loai === "DOI_TRA")).toMatchObject({ so_dat: 0, dat: false });
    expect(td.phien[0].diem_tong).toBe(86);
    expect(td.du_dieu_kien).toBe(false);
  });
});

describe("ThucHanhService.nop — khoa co yeu cau luyen AI", () => {
  it("SALE khong nop link tay -> 400 (bai di qua Sales Training)", async () => {
    const prisma = {
      khoa_hoc: { findUnique: jest.fn(async () => ({ id: KHOA, ten: "Sale", bat: true, can_thuc_hanh: true, yeu_cau_luyen_ai: YC, vai_ap_dung: ["SALE", "CSKH"] })) },
      bai_thuc_hanh: { findFirst: jest.fn(async () => null), create: jest.fn() }
    } as unknown as PrismaService;
    const svc = new ThucHanhService(new ThucHanhRepository(prisma), new DuLieuHocRepository(prisma), {} as XetDatService, nhatKy(), thongBao());
    await expect(svc.nop(nguoiDung(SALE), KHOA, { link: "https://x.vn" })).rejects.toBeInstanceOf(BadRequestException);
    expect((prisma as unknown as { bai_thuc_hanh: { create: jest.Mock } }).bai_thuc_hanh.create).not.toHaveBeenCalled();
  });
});
