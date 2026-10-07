import { Logger } from "@nestjs/common";
import type { GhiNhanDonService } from "../../src/services/mang-luoi-hoa-hong.service";
import { DongBoDonJob, PHUT_DONG_BO_MAC_DINH, soPhutDongBo } from "../../src/jobs/dong-bo-don.job";

// LOI-CAN-SUA muc 14: job dong bo bat mac dinh, chi tat khi dat ro 0; khong chay chong; loi khong lam sap API

const KQ = { don_moi: 0, cap_nhat: 0, cho_xac_minh: 0, bi_tru: 0, du_dieu_kien: 0, bo_qua: 0, loi: 0, quet_don_moi: true, bat_dau: "", ket_thuc: "" };

function taoJob(dongBo: jest.Mock, dangChay = false) {
  const ghiNhan = { dongBo, get dangChay() { return dangChay; } } as unknown as GhiNhanDonService;
  return new DongBoDonJob(ghiNhan);
}

describe("DongBoDonJob", () => {
  const envCu = process.env.MANG_LUOI_DONG_BO_PHUT;
  beforeAll(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    if (envCu === undefined) delete process.env.MANG_LUOI_DONG_BO_PHUT;
    else process.env.MANG_LUOI_DONG_BO_PHUT = envCu;
  });
  afterAll(() => jest.restoreAllMocks());

  it("soPhutDongBo: trong -> mac dinh 10, '0' -> tat, so -> giu, rac -> mac dinh", () => {
    expect(PHUT_DONG_BO_MAC_DINH).toBe(10);
    expect(soPhutDongBo(undefined)).toBe(10);
    expect(soPhutDongBo("")).toBe(10);
    expect(soPhutDongBo("  ")).toBe(10);
    expect(soPhutDongBo("0")).toBe(0);
    expect(soPhutDongBo("-5")).toBe(0);
    expect(soPhutDongBo("15")).toBe(15);
    expect(soPhutDongBo("abc")).toBe(10);
  });

  it("khong dat bien moi truong -> van chay dinh ky", async () => {
    jest.useFakeTimers();
    delete process.env.MANG_LUOI_DONG_BO_PHUT;
    const dongBo = jest.fn(async () => KQ);
    const job = taoJob(dongBo);
    job.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(30_000); // lan dau sau khi API len
    expect(dongBo).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(10 * 60_000);
    expect(dongBo).toHaveBeenCalledTimes(2);
    job.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(30 * 60_000);
    expect(dongBo).toHaveBeenCalledTimes(2);
  });

  it("MANG_LUOI_DONG_BO_PHUT=0 -> tat", async () => {
    jest.useFakeTimers();
    process.env.MANG_LUOI_DONG_BO_PHUT = "0";
    const dongBo = jest.fn(async () => KQ);
    const job = taoJob(dongBo);
    job.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(60 * 60_000);
    expect(dongBo).not.toHaveBeenCalled();
    job.onModuleDestroy();
  });

  it("khong chay chong: lan truoc chua xong thi bo qua", async () => {
    let xong!: () => void;
    const dongBo = jest
      .fn<Promise<typeof KQ>, [string | null]>(async () => KQ)
      .mockImplementationOnce(() => new Promise<typeof KQ>(r => (xong = () => r(KQ))));
    const job = taoJob(dongBo);
    const lan1 = job.chay();
    await job.chay();
    await job.chay();
    expect(dongBo).toHaveBeenCalledTimes(1);
    xong();
    await lan1;
    await job.chay();
    expect(dongBo).toHaveBeenCalledTimes(2); // lan 1 + lan sau khi lan 1 xong
  });

  it("dang co lan bam tay (ghiNhan.dangChay) -> bo qua", async () => {
    const dongBo = jest.fn(async () => KQ);
    await taoJob(dongBo, true).chay();
    expect(dongBo).not.toHaveBeenCalled();
  });

  it("loi dong bo chi ghi log, khong nem ra ngoai, lan sau van chay", async () => {
    const dongBo = jest.fn().mockRejectedValueOnce(new Error("DB mat ket noi")).mockResolvedValue(KQ);
    const job = taoJob(dongBo);
    await expect(job.chay()).resolves.toBeUndefined();
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining("DB mat ket noi"));
    await job.chay();
    expect(dongBo).toHaveBeenCalledTimes(2);
  });
});
