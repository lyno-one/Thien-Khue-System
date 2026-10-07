/* Prisma gia lap trong bo nho cho test mang-luoi — chi cac lenh service dung, CO unique constraint (P2002) nhu DB that. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";
import { QuyenSkuRepository } from "../../src/repositories/dao-tao.repository";
import {
  ChienDichRepository, GhiNhanDonRepository, HoaHongRepository, HoSoMangLuoiRepository, MaGioiThieuRepository
} from "../../src/repositories/mang-luoi.repository";

type Dong = Record<string, any>;

function loiTrung(cot: string) {
  return Object.assign(new Error(`Unique constraint failed on ${cot}`), { code: "P2002" });
}

/** So khop where don gian: bang, { in }, { not }, { gte }, OR, AND, quan he is */
function khop(d: Dong, where: Dong | undefined, db: BoNho): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Dong[]).some(w => khop(d, w, db));
    if (k === "AND") return (v as Dong[]).every(w => khop(d, w, db));
    if (k === "hoa_hong") {
      const hh = db.hoa_hong.find(h => h.ghi_nhan_don_id === d.id) ?? null;
      if (v?.is === null) return hh === null;
      if (v?.is) return hh !== null && khop(hh, v.is, db);
      return true;
    }
    const gt = d[k];
    if (v !== null && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v)) {
      if ("in" in v) return (v.in as unknown[]).includes(gt);
      if ("not" in v) return v.not === null ? gt !== null && gt !== undefined : gt !== v.not;
      if ("gte" in v) return gt >= v.gte;
      if ("lte" in v) return gt <= v.lte;
      if ("has" in v) return Array.isArray(gt) && gt.includes(v.has);
      return true;
    }
    return gt === v;
  });
}

function bang(db: BoNho, ten: keyof BoNho["du"], unique: string[] = [], macDinh: Dong = {}) {
  const ds = () => db.du[ten];
  return {
    findUnique: async ({ where, include }: any) => {
      const d = ds().find(x => khop(x, where, db));
      if (!d) return null;
      return include?.hoa_hong ? { ...d, hoa_hong: db.hoa_hong.find(h => h.ghi_nhan_don_id === d.id) ?? null } : { ...d };
    },
    findFirst: async ({ where }: any = {}) => ds().find(x => khop(x, where, db)) ?? null,
    findMany: async ({ where, include }: any = {}) =>
      ds()
        .filter(x => khop(x, where, db))
        .map(x => (include?.hoa_hong ? { ...x, hoa_hong: db.hoa_hong.find(h => h.ghi_nhan_don_id === x.id) ?? null } : { ...x })),
    count: async ({ where }: any = {}) => ds().filter(x => khop(x, where, db)).length,
    create: async ({ data }: any) => {
      for (const c of unique) if (data[c] !== undefined && data[c] !== null && ds().some(x => x[c] === data[c])) throw loiTrung(c);
      const d = { id: randomUUID(), created_at: new Date(), updated_at: new Date(), ...macDinh, ...data };
      ds().push(d);
      return { ...d };
    },
    update: async ({ where, data }: any) => {
      const d = ds().find(x => khop(x, where, db));
      if (!d) throw new Error("Khong tim thay");
      Object.assign(d, data, { updated_at: new Date() });
      return { ...d };
    },
    updateMany: async ({ where, data }: any) => {
      const trung = ds().filter(x => khop(x, where, db));
      for (const d of trung) Object.assign(d, data, { updated_at: new Date() });
      return { count: trung.length };
    }
  };
}

export class BoNho {
  du = {
    ghi_nhan_don: [] as Dong[],
    hoa_hong: [] as Dong[],
    dieu_chinh_hoa_hong: [] as Dong[],
    ma_gioi_thieu: [] as Dong[],
    vai_tro_ho_so: [] as Dong[],
    ho_so: [] as Dong[],
    ty_le_hoa_hong: [] as Dong[],
    quyen_sku: [] as Dong[],
    chien_dich: [] as Dong[],
    tham_gia_chien_dich: [] as Dong[],
    de_xuat_duyet: [] as Dong[]
  };
  get hoa_hong() {
    return this.du.hoa_hong;
  }

  prisma(): any {
    const p: any = {
      ghi_nhan_don: bang(this, "ghi_nhan_don", ["crm_don_id"]),
      hoa_hong: bang(this, "hoa_hong", ["ghi_nhan_don_id"]),
      dieu_chinh_hoa_hong: bang(this, "dieu_chinh_hoa_hong"),
      ma_gioi_thieu: bang(this, "ma_gioi_thieu", ["ma"], { bat: true, chien_dich_id: null }),
      vai_tro_ho_so: bang(this, "vai_tro_ho_so"),
      ty_le_hoa_hong: bang(this, "ty_le_hoa_hong"),
      quyen_sku: {
        ...bang(this, "quyen_sku"),
        findUnique: async ({ where }: any) => {
          const k = where.ho_so_id_mau_id;
          return this.du.quyen_sku.find(q => q.ho_so_id === k.ho_so_id && q.mau_id === k.mau_id) ?? null;
        }
      },
      chien_dich: bang(this, "chien_dich"),
      tham_gia_chien_dich: {
        ...bang(this, "tham_gia_chien_dich"),
        findUnique: async ({ where }: any) => {
          const k = where.chien_dich_id_ho_so_id;
          if (k) return this.du.tham_gia_chien_dich.find(t => t.chien_dich_id === k.chien_dich_id && t.ho_so_id === k.ho_so_id) ?? null;
          return this.du.tham_gia_chien_dich.find(t => t.id === where.id) ?? null;
        },
        create: async ({ data }: any) => {
          if (this.du.tham_gia_chien_dich.some(t => t.chien_dich_id === data.chien_dich_id && t.ho_so_id === data.ho_so_id)) throw loiTrung("chien_dich_id,ho_so_id");
          const d = { id: randomUUID(), trang_thai: "CHO_DUYET", created_at: new Date(), ...data };
          this.du.tham_gia_chien_dich.push(d);
          return d;
        }
      },
      de_xuat_duyet: bang(this, "de_xuat_duyet"),
      ho_so: {
        ...bang(this, "ho_so"),
        findUnique: async ({ where }: any) => {
          const hs = this.du.ho_so.find(h => khop(h, where, this));
          if (!hs) return null;
          return { ...hs, vai_tro: this.du.vai_tro_ho_so.filter(v => v.ho_so_id === hs.id) };
        }
      }
    };
    p.$transaction = async (fn: (tx: any) => unknown) => fn(p);
    return p;
  }

  themNguoi(id: string, vai: { vai: string; trang_thai?: string }[], crmUserId: string | null = null) {
    this.du.ho_so.push({ id, ho_ten: `Người ${id}`, crm_user_id: crmUserId });
    for (const v of vai) this.du.vai_tro_ho_so.push({ id: randomUUID(), ho_so_id: id, vai: v.vai, trang_thai: v.trang_thai ?? "HOAT_DONG" });
  }
}

/** Repository that cua module mang-luoi boc prisma gia lap (service test qua repository, khong mock rieng tung ham) */
export function taoRepoMangLuoi(prisma: any) {
  return {
    ghiNhan: new GhiNhanDonRepository(prisma),
    hoaHong: new HoaHongRepository(prisma),
    ma: new MaGioiThieuRepository(prisma),
    chienDich: new ChienDichRepository(prisma),
    hoSo: new HoSoMangLuoiRepository(prisma),
    quyenSku: new QuyenSkuRepository(prisma)
  };
}
