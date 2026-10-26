import { BadRequestException, ForbiddenException, ValidationPipe } from "@nestjs/common";
import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import { kiemTraLoiQuizLyno } from "../../src/common/utils/dao-tao-bai-lyno";
import { NopQuizBaiLynoDto } from "../../src/dto/dao-tao/dao-tao-bai-lyno.dto";
import type { CrmApiClient } from "../../src/infrastructure/crm/crm-api.client";
import { BaiLynoService } from "../../src/services/dao-tao-bai-lyno.service";

const TOKEN = "token-cua-nguoi-dung";
const BAI = "11111111-1111-4111-8111-111111111111";
const QUIZ = "22222222-2222-4222-8222-222222222222";
const CAU_1 = "33333333-3333-4333-8333-333333333333";
const CAU_2 = "44444444-4444-4444-8444-444444444444";

function taoNguoiDung(crmUserId: string | null): ThongTinNguoiDung {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    email: "nv@lyno.test",
    hoSo: {
      id: "55555555-5555-4555-8555-555555555555",
      ho_ten: "Nhân viên",
      email: "nv@lyno.test",
      sdt: null,
      crm_user_id: crmUserId,
      kich_hoat_lam_viec: true
    },
    vai: [],
    vaiChiTiet: []
  };
}

const NHAN_SU = taoNguoiDung("66666666-6666-4666-8666-666666666666");
const KHACH = taoNguoiDung(null);

function taoCrm() {
  return {
    layLoTrinhKb: jest.fn().mockResolvedValue({ viTri: "sale", tongBatBuoc: 2, xongBatBuoc: 1, baiHoc: [] }),
    layBaiKb: jest.fn().mockResolvedValue({ bai: { id: BAI }, daDoc: false }),
    danhDauDaDocKb: jest.fn().mockResolvedValue(undefined),
    layQuizKb: jest.fn().mockResolvedValue(null),
    nopQuizKb: jest.fn().mockResolvedValue({ diem: 100, dung: 2, tong: 2, dau: true, nguongDau: 80, chiTiet: {} })
  };
}

function dung() {
  const crm = taoCrm();
  return { crm, svc: new BaiLynoService(crm as unknown as CrmApiClient) };
}

describe("BaiLynoService — chi nhan su CRM", () => {
  it("nguoi khong co crm_user_id -> 403 o moi route, khong goi CRM", async () => {
    const { crm, svc } = dung();
    expect(() => svc.layLoTrinh(KHACH, TOKEN)).toThrow(ForbiddenException);
    expect(() => svc.layBai(KHACH, TOKEN, BAI)).toThrow(ForbiddenException);
    expect(() => svc.danhDauDaDoc(KHACH, TOKEN, BAI)).toThrow(ForbiddenException);
    await expect(svc.layQuiz(KHACH, TOKEN, BAI)).rejects.toBeInstanceOf(ForbiddenException);
    expect(() => svc.nopQuiz(KHACH, TOKEN, QUIZ, { traLoi: { [CAU_1]: 0 } })).toThrow(ForbiddenException);
    for (const f of Object.values(crm)) expect(f).not.toHaveBeenCalled();
  });

  it("403 dung truoc kiem id (khong lo id hop le hay khong)", () => {
    const { svc } = dung();
    expect(() => svc.layBai(KHACH, TOKEN, "khong-phai-uuid")).toThrow(ForbiddenException);
  });
});

describe("BaiLynoService — id sai -> 400, khong goi CRM", () => {
  it.each(["abc", "1", `${BAI}x`, "../kb/lo-trinh", ""])("bai id %p", async id => {
    const { crm, svc } = dung();
    expect(() => svc.layBai(NHAN_SU, TOKEN, id)).toThrow(BadRequestException);
    expect(() => svc.danhDauDaDoc(NHAN_SU, TOKEN, id)).toThrow(BadRequestException);
    await expect(svc.layQuiz(NHAN_SU, TOKEN, id)).rejects.toBeInstanceOf(BadRequestException);
    expect(() => svc.nopQuiz(NHAN_SU, TOKEN, id, { traLoi: {} })).toThrow(BadRequestException);
    for (const f of Object.values(crm)) expect(f).not.toHaveBeenCalled();
  });
});

describe("BaiLynoService — chuyen tiep CRM bang token nguoi dung", () => {
  it("lo trinh", async () => {
    const { crm, svc } = dung();
    await expect(svc.layLoTrinh(NHAN_SU, TOKEN)).resolves.toEqual({ viTri: "sale", tongBatBuoc: 2, xongBatBuoc: 1, baiHoc: [] });
    expect(crm.layLoTrinhKb).toHaveBeenCalledWith(TOKEN);
  });

  it("chi tiet bai / da doc / quiz", async () => {
    const { crm, svc } = dung();
    await expect(svc.layBai(NHAN_SU, TOKEN, BAI)).resolves.toEqual({ bai: { id: BAI }, daDoc: false });
    expect(crm.layBaiKb).toHaveBeenCalledWith(TOKEN, BAI);
    await expect(svc.danhDauDaDoc(NHAN_SU, TOKEN, BAI)).resolves.toBeUndefined();
    expect(crm.danhDauDaDocKb).toHaveBeenCalledWith(TOKEN, BAI);
    await expect(svc.layQuiz(NHAN_SU, TOKEN, BAI)).resolves.toBeNull();
    expect(crm.layQuizKb).toHaveBeenCalledWith(TOKEN, BAI);
  });

  it("quiz CRM tra undefined -> null", async () => {
    const { crm, svc } = dung();
    crm.layQuizKb.mockResolvedValueOnce(undefined);
    await expect(svc.layQuiz(NHAN_SU, TOKEN, BAI)).resolves.toBeNull();
  });

  it("nop quiz chuyen nguyen traLoi", async () => {
    const { crm, svc } = dung();
    const traLoi = { [CAU_1]: 0, [CAU_2]: 19 };
    await expect(svc.nopQuiz(NHAN_SU, TOKEN, QUIZ, { traLoi })).resolves.toMatchObject({ diem: 100, dau: true });
    expect(crm.nopQuizKb).toHaveBeenCalledWith(TOKEN, QUIZ, traLoi);
  });

  it("loi CRM (vd 404 bai tat) tra nguyen", async () => {
    const { crm, svc } = dung();
    const loi = new Error("CRM 404");
    crm.layBaiKb.mockRejectedValueOnce(loi);
    await expect(svc.layBai(NHAN_SU, TOKEN, BAI)).rejects.toBe(loi);
  });

  it("bai lam sai -> 400, khong goi CRM", () => {
    const { crm, svc } = dung();
    expect(() => svc.nopQuiz(NHAN_SU, TOKEN, QUIZ, { traLoi: { [CAU_1]: -1 } })).toThrow(BadRequestException);
    expect(crm.nopQuizKb).not.toHaveBeenCalled();
  });
});

describe("kiemTraLoiQuizLyno", () => {
  it("hop le: rong, 0..19", () => {
    expect(kiemTraLoiQuizLyno({})).toBeNull();
    expect(kiemTraLoiQuizLyno({ [CAU_1]: 0, [CAU_2]: 19 })).toBeNull();
    expect(kiemTraLoiQuizLyno({ [CAU_1.toUpperCase()]: 3 })).toBeNull();
  });

  it.each([null, undefined, "abc", 5, [], [0, 1]])("khong phai object %p -> loi", v => {
    expect(kiemTraLoiQuizLyno(v)).toBe("Bài làm không hợp lệ");
  });

  it("khoa khong phai uuid -> loi", () => {
    expect(kiemTraLoiQuizLyno({ cau1: 0 })).toBe("Mã câu hỏi không hợp lệ");
    expect(kiemTraLoiQuizLyno({ [CAU_1]: 0, __proto__x: 1 })).toBe("Mã câu hỏi không hợp lệ");
  });

  it.each([-1, 1.5, 20, 100, NaN, Infinity, "1", null, true])("gia tri %p -> loi", v => {
    expect(kiemTraLoiQuizLyno({ [CAU_1]: v })).toBe("Lựa chọn trả lời không hợp lệ");
  });

  it("qua 200 cau -> loi; dung 200 cau -> hop le", () => {
    const taoId = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    const du200 = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [taoId(i), 0]));
    expect(kiemTraLoiQuizLyno(du200)).toBeNull();
    expect(kiemTraLoiQuizLyno({ ...du200, [taoId(200)]: 0 })).toMatch(/quá nhiều câu/);
  });
});

describe("NopQuizBaiLynoDto qua pipe toan cuc (whitelist + forbidNonWhitelisted)", () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, stopAtFirstError: false });
  const qua = (body: unknown) => pipe.transform(body, { type: "body", metatype: NopQuizBaiLynoDto });

  it("giu nguyen traLoi (khong cat khoa dong)", async () => {
    const kq = (await qua({ traLoi: { [CAU_1]: 2, [CAU_2]: 0 } })) as NopQuizBaiLynoDto;
    expect(kq.traLoi).toEqual({ [CAU_1]: 2, [CAU_2]: 0 });
  });

  it("truong la o cap tren -> 400", async () => {
    await expect(qua({ traLoi: {}, nguoiDungId: "x" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("thieu traLoi / traLoi khong phai object -> 400", async () => {
    await expect(qua({})).rejects.toBeInstanceOf(BadRequestException);
    await expect(qua({ traLoi: "abc" })).rejects.toBeInstanceOf(BadRequestException);
  });
});
