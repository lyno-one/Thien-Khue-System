import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { ghiDoiVai } from "../../src/repositories/ho-so.repository";

describe("lich_su_vai_tro chi INSERT", () => {
  it("ghiDoiVai chi goi lich_su_vai_tro.create", async () => {
    const tx = {
      vai_tro_ho_so: { create: jest.fn(), update: jest.fn() },
      lich_su_vai_tro: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), upsert: jest.fn() }
    };
    await ghiDoiVai(tx as never, { hoSoId: "h", vai: "CTV", cu: null, moi: "DANG_HOC", nguoiDoiId: null, lyDo: "Đăng ký" });
    await ghiDoiVai(tx as never, { hoSoId: "h", vai: "CTV", cu: "DANG_HOC", moi: "KET_THUC", nguoiDoiId: "q", lyDo: "Nghỉ" });
    expect(tx.lich_su_vai_tro.create).toHaveBeenCalledTimes(2);
    expect(tx.lich_su_vai_tro.create.mock.calls[1][0].data).toMatchObject({ trang_thai_cu: "DANG_HOC", trang_thai_moi: "KET_THUC", nguoi_doi_id: "q" });
    for (const k of ["update", "delete", "updateMany", "deleteMany", "upsert"] as const) expect(tx.lich_su_vai_tro[k]).not.toHaveBeenCalled();
    // KET_THUC -> den_luc duoc dat
    expect(tx.vai_tro_ho_so.update.mock.calls[0][0].data.den_luc).toBeInstanceOf(Date);
  });

  it("ma nguon module ho-so khong sua / xoa lich_su_vai_tro", () => {
    // ma nguon module ho-so (bo cuc phang): <lop>/ho-so*.ts + dto/ho-so/*.ts
    const goc = join(__dirname, "../../src");
    const files = [
      ...["controllers", "services", "repositories", "common/utils"].flatMap(d =>
        readdirSync(join(goc, d))
          .filter(f => f.startsWith("ho-so") && f.endsWith(".ts"))
          .map(f => join(goc, d, f))
      ),
      ...readdirSync(join(goc, "dto/ho-so"))
        .filter(f => f.endsWith(".ts"))
        .map(f => join(goc, "dto/ho-so", f))
    ];
    // controller, 2 service, repository, utils, dto
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/lich_su_vai_tro\.(update|delete|upsert|updateMany|deleteMany)\b/);
    }
  });
});
