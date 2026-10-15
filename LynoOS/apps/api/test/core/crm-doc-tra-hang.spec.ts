import { Prisma, type PrismaClient } from "@prisma/client";
import { CrmDocService } from "../../src/infrastructure/crm/crm-doc.service";

// LOI-CAN-SUA muc 10: tich luy hang / dem lan mua phai loai don da TRA qua doi tra CRM va tru phan tien tra.
// Unit test khong DB: bat cau SQL ma CrmDocService gui ($queryRaw tagged template) va kiem dieu kien.

function taoDoc(ketQua: unknown[] = []) {
  const cau: Prisma.Sql[] = [];
  const queryRaw = jest.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    cau.push(Prisma.sql(strings, ...values));
    return ketQua;
  });
  const sv = new CrmDocService({ $queryRaw: queryRaw } as unknown as PrismaClient);
  /** SQL gop mot dong, bo khoang trang thua */
  const sql = (i = cau.length - 1) => cau[i]!.sql.replace(/\s+/g, " ");
  return { sv, sql, cau };
}

const DK_TRA = "y.loai_yeu_cau = 'TRA' and y.trang_thai in ('CHO_HOAN_TIEN', 'HOAN_TAT')";
const LOAI_DON_TRA = "not coalesce(tr.da_tra_hang, false)";
const TIEN_TRU_TRA = "sum((d.tong_tien - coalesce(tr.tien_tra, 0)))";

describe("CrmDocService — loai don tra hang khoi tich luy", () => {
  it("tongMuaHopLe: join yeu cau TRA da chap nhan, loai don tra ca don, tru tien tra", async () => {
    const { sv, sql } = taoDoc([{ tong_tien: 0, so_don: 0, lan_mua_cuoi: null }]);
    await sv.tongMuaHopLe("0902000052");
    const s = sql();
    expect(s).toContain("public.yeu_cau_doi_tra y");
    expect(s).toContain(DK_TRA);
    expect(s).toContain(LOAI_DON_TRA);
    expect(s).toContain(TIEN_TRU_TRA);
    expect(s).toContain("d.trang_thai not in ('huy', 'hoan')");
    // Yeu cau DOI khong lam mat tich luy: chi loc loai TRA
    expect(s).not.toContain("loai_yeu_cau = 'DOI'");
    // Tien tra lay tu snapshot da chot (khong lay UOC_TINH), chan tren tong_tien
    expect(s).toContain("t.loai <> 'UOC_TINH'");
    expect(s).toContain("least(z.tien, d.tong_tien)");
  });

  it("dem 10 lan mua (KH hanh phuc) va loc theo nguong hang dung cung dieu kien", async () => {
    const { sv, sql } = taoDoc();
    await sv.layKhachDuSoLanMua(10);
    expect(sql()).toContain(LOAI_DON_TRA);
    expect(sql()).toContain(TIEN_TRU_TRA);
    await sv.layKhachTheoTongMua(50_000_000);
    expect(sql()).toContain(LOAI_DON_TRA);
    expect(sql()).toContain(`having coalesce(${TIEN_TRU_TRA}, 0) >=`);
  });

  it("danh sach khach (tong mua) cung loai don tra", async () => {
    const { sv, sql } = taoDoc();
    await sv.layDanhSachKhach({});
    expect(sql(0)).toContain(LOAI_DON_TRA);
    expect(sql(0)).toContain(TIEN_TRU_TRA);
  });

  it("doc don tra kem co da_tra_hang / tien_tra_hang (mang-luoi dua vao luat hoa hong)", async () => {
    const { sv, sql } = taoDoc();
    await sv.layDon("d0000000-0000-4000-8000-000000000001");
    await sv.layDonTheoIds(["d0000000-0000-4000-8000-000000000001"]);
    await sv.layDonTheoMa("DH-00001");
    await sv.layDonTheoSdt("0900000001");
    await sv.layDonCoMaGioiThieu({});
    for (let i = 0; i < 5; i++) {
      expect(sql(i)).toContain("coalesce(tr.da_tra_hang, false) as da_tra_hang");
      expect(sql(i)).toContain("as tien_tra_hang");
      expect(sql(i)).toContain(DK_TRA);
    }
  });

  it("chi doc CRM bang tham so (khong noi chuoi SDT vao SQL)", async () => {
    const { sv, cau } = taoDoc([{ tong_tien: 0, so_don: 0, lan_mua_cuoi: null }]);
    await sv.tongMuaHopLe("0902000052");
    expect(cau[0]!.sql).not.toContain("0902000052");
    expect(cau[0]!.values).toContain("0902000052");
  });
});
