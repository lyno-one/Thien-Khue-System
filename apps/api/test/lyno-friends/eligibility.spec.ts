import { LynoFriendsService } from "../../src/services/lyno-friends.service";

describe("LYNO Friends: ket qua dao tao la nguon cap quyen", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  function duLieu() {
    return {
      hoSo: { ho_ten: "Hà", sdt_chuan: "0912345678", vai_tro: [{ vai: "CTV", trang_thai: "DANG_HOC" }] }, dangKy: { id: "consent" },
      khoa: [{ id: "A", ten: "Sơ mi A", ma: "SP-A", ma_mau: "AB0483", mau_id: "mau-a", loai: "SAN_PHAM", bat_buoc: false, can_thuc_hanh: false, phien_ban_tai_lieu: 1, bai_hoc: [{ id: "lesson" }], bai_kiem_tra: [{ id: "exam", bat_buoc: true }] }],
      hoc: { baiXong: new Set(["lesson"]), luotLam: [{ id: "attempt", bai_kiem_tra_id: "exam", dat: true, diem: 90, phien_ban_tai_lieu: 1, nop_luc: new Date() }], thucHanh: [], quyenSku: [{ mau_id: "mau-a", trang_thai: "HOAT_DONG", phien_ban_tai_lieu: 1 }] }
    };
  }
  it("khong nhan dong y gia", async () => {
    const repo = { dangKy: jest.fn() };
    const service = new LynoFriendsService(repo as any, {} as any, {} as any);
    await expect(service.dangKy(id, false)).rejects.toThrow();
    expect(repo.dangKy).not.toHaveBeenCalled();
  });
  it("chi cap SKU khi dong y + hoc het bai + thi >=90 + quyen con hieu luc", async () => {
    const data: any = duLieu();
    const repo = { duLieu: jest.fn(async () => data) };
    const service = new LynoFriendsService(repo as any, {} as any, {} as any);
    expect((await service.dieuKien(id)).products.map(p => p.code)).toEqual(["AB0483"]);
    data.hoc.baiXong.clear(); expect((await service.dieuKien(id)).ready).toBe(false);
    data.hoc.baiXong.add("lesson"); data.hoc.luotLam[0].diem = 89; expect((await service.dieuKien(id)).ready).toBe(false);
    data.hoc.luotLam[0].diem = 90; data.hoc.quyenSku[0].trang_thai = "THU_HOI"; expect((await service.dieuKien(id)).ready).toBe(false);
    data.hoc.quyenSku[0].trang_thai = "CAN_HOC_LAI"; expect((await service.dieuKien(id)).ready).toBe(false);
    data.hoc.quyenSku[0].trang_thai = "HOAT_DONG"; data.dangKy = null; expect((await service.dieuKien(id)).ready).toBe(false);
  });
  it("de A dat khong bu cho de B chua dat, vai bi khoa khong tu mo", async () => {
    const data: any = duLieu(); const service = new LynoFriendsService({ duLieu: async () => data } as any, {} as any, {} as any);
    data.khoa[0].bai_kiem_tra.push({ id: "exam-b", bat_buoc: true });
    expect((await service.dieuKien(id)).ready).toBe(false);
    data.khoa[0].bai_kiem_tra.pop(); data.hoSo.vai_tro[0].trang_thai = "TAM_DUNG";
    expect((await service.dieuKien(id)).ready).toBe(false);
  });
  it("API noi bo tu choi khoa sai / chua cau hinh", () => {
    const old = process.env.LYNO_FRIENDS_INTEGRATION_KEY;
    const service = new LynoFriendsService({} as any, {} as any, {} as any);
    delete process.env.LYNO_FRIENDS_INTEGRATION_KEY;
    expect(() => service.kiemKhoa("abc")).toThrow();
    process.env.LYNO_FRIENDS_INTEGRATION_KEY = "a".repeat(32);
    expect(() => service.kiemKhoa("b".repeat(32))).toThrow();
    expect(() => service.kiemKhoa("a".repeat(32))).not.toThrow();
    if (old === undefined) delete process.env.LYNO_FRIENDS_INTEGRATION_KEY; else process.env.LYNO_FRIENDS_INTEGRATION_KEY = old;
  });
});
