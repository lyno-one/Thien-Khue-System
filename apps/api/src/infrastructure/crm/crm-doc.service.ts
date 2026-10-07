import { Inject, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { chuanHoaSdt } from "./chuan-hoa-sdt";

/*
 * DOC du lieu CRM Lyno (schema public) — CHO DUY NHAT trong toan app duoc viet SQL vao public.
 * Chi SELECT, tham so hoa ($queryRaw tagged template). Ghi du lieu CRM -> CrmApiClient (Bearer nguoi dung).
 * Dinh nghia nghiep vu lay y CRM (KIEN-TRUC muc 3).
 */

export type TrangThaiMauCrm = "dang_ban" | "het_hang" | "ngung";

export interface MauCrm {
  id: string;
  ma: string;
  ten: string;
  chat_lieu: string | null;
  form_dang: string | null;
  size_chart: unknown;
  gia_ban: number | null;
  anh_url: string | null;
  anh_size_chart: string | null;
  cau_tu_van: string | null;
  tu_khoa: string | null;
  trang_thai: TrangThaiMauCrm;
  updated_at: Date;
}

export interface TonKhoCrm {
  size: string;
  mau_sac: string;
  so_luong: number;
}

export interface KhachCrm {
  id: string;
  ten: string;
  sdt: string;
  dia_chi: string | null;
  ghi_chu: string | null;
  created_at: Date;
}

export type TrangThaiDonCrm = "moi" | "dang_giao" | "giao_thanh_cong" | "hoan" | "huy";

export interface DonCrm {
  id: string;
  ma_don: string;
  kenh: string;
  loai_don: "BAN_HANG" | "DOI_TRA";
  khach_ten: string;
  khach_sdt: string | null;
  sdt_chuan: string | null;
  trang_thai: TrangThaiDonCrm;
  tong_tien: number;
  giam_gia: number;
  nguoi_tao: string | null;
  created_at: Date;
  giao_thanh_cong_luc: Date | null;
  hoan_luc: Date | null;
  /**
   * Khach da TRA CA DON qua luong doi tra CRM (yeu cau TRA da chap nhan: CHO_HOAN_TIEN / HOAN_TAT, moi mon / toan bo tien).
   * Don goc van o 'giao_thanh_cong' tren CRM — Thien Khue coi nhu don hoan: khong tich luy, hoa hong BI_TRU.
   * CrmDocService luon tra; optional chi de mock / du lieu cu tuong thich (thieu = chua tra).
   */
  da_tra_hang?: boolean;
  /** Tien hang khach da tra (tien_hoan snapshot moi nhat cua yeu cau TRA da chap nhan, <= tong_tien); 0 = khong tra */
  tien_tra_hang?: number;
}

export interface DongDonCrm {
  id: string;
  don_id: string;
  mau_id: string;
  ma_mau: string;
  size: string;
  mau_sac: string;
  so_luong: number;
  don_gia: number;
}

export interface TongMuaHopLe {
  sdt_chuan: string;
  /** Tong tong_tien cac don hop le (dong) */
  tong_tien: number;
  /** So lan mua hop le */
  so_don: number;
  lan_mua_cuoi: Date | null;
}

export interface ChamSocCrm {
  id: string;
  khach_id: string;
  user_id: string | null;
  /** public.users.full_name cua nguoi cham */
  nguoi_cham: string | null;
  noi_dung: string;
  created_at: Date;
}

/** Khach CRM kem tong mua hop le (danh sach khach co phan trang) */
export interface KhachKemTongMua extends KhachCrm {
  tong_tien: number;
  so_don: number;
  lan_mua_cuoi: Date | null;
}

export interface NhanSuCrm {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "employee";
  active: boolean;
  /**
   * phong_ban.nhom_quyen (text + CHECK o CRM); chua co phong = KHONG. 075: SALE / CSKH / KHO / KE_TOAN / KHONG;
   * 079 them THUC_TAP / CTV / KOL / KOC / DOI_TAC. Gia tri la -> mapVaiCrm coi nhu khong vai.
   */
  nhom_quyen: NhomQuyenCrm;
  phong_ban: string | null;
}

export type NhomQuyenCrm = "SALE" | "CSKH" | "KHO" | "KE_TOAN" | "KHONG" | "THUC_TAP" | "CTV" | "KOL" | "KOC" | "DOI_TAC" | (string & {});

const COT_MAU = Prisma.sql`m.id, m.ma, m.ten, m.chat_lieu, m.form_dang, m.size_chart, m.gia_ban::float8 as gia_ban,
  m.anh_url, m.anh_size_chart, m.cau_tu_van, m.tu_khoa, m.trang_thai, m.updated_at`;

/**
 * Tra hang qua luong doi tra CRM (migration 067): don goc giu 'giao_thanh_cong', tien tra nam o yeu_cau_doi_tra loai TRA.
 * Chi tinh yeu cau TRA da duoc chap nhan (kho ket luan co mon dat -> CHO_HOAN_TIEN; ke toan xac nhan hoan -> HOAN_TAT).
 * Moi don goc toi da 1 yeu cau khong HUY (unique index 067). Yeu cau DOI khong lam mat tich luy (khong vao day).
 * - tien_tra: tien_hoan cua snapshot moi nhat khong phai UOC_TINH (CHOT / DIEU_CHINH / HOAN_TIEN), chan tren tong_tien.
 * - da_tra_hang: tra CA DON — so luong chap nhan >= tong so luong don, hoac tien tra >= tong_tien.
 * Phai dat ngay sau `from public.don_hang d` (dung alias d, tao alias tr).
 */
const JOIN_TRA_HANG = Prisma.sql`left join lateral (
    select least(z.tien, d.tong_tien) as tien_tra, (z.sl_tra >= z.sl_don or z.tien >= d.tong_tien) as da_tra_hang
    from (
      select
        coalesce((select t.tien_hoan from public.doi_tra_tai_chinh t
          where t.yeu_cau_id = y.id and t.loai <> 'UOC_TINH' order by t.phien_ban desc limit 1), 0) as tien,
        coalesce((select sum(coalesce(x.so_luong_chap_nhan, 0)) from public.doi_tra_dong x where x.yeu_cau_id = y.id), 0) as sl_tra,
        coalesce((select sum(l.so_luong) from public.don_hang_dong l where l.don_id = d.id), 0) as sl_don
      from public.yeu_cau_doi_tra y
      where y.don_hang_goc_id = d.id and y.loai_yeu_cau = 'TRA' and y.trang_thai in ('CHO_HOAN_TIEN', 'HOAN_TAT')
      order by y.tao_luc desc limit 1
    ) z
  ) tr on true`;

const COT_DON = Prisma.sql`d.id, d.ma_don, d.kenh, d.loai_don, d.khach_ten, d.khach_sdt, d.sdt_chuan, d.trang_thai,
  d.tong_tien::float8 as tong_tien, d.giam_gia::float8 as giam_gia, d.nguoi_tao, d.created_at, d.giao_thanh_cong_luc, d.hoan_luc,
  coalesce(tr.da_tra_hang, false) as da_tra_hang, coalesce(tr.tien_tra, 0)::float8 as tien_tra_hang`;

/**
 * Don hop le (tich luy hang, dem lan mua): BAN_HANG, khong huy / hoan, khong bi TRA CA DON qua doi tra CRM.
 * Hoan / huy / tra tu rot khi doc lai. Can JOIN_TRA_HANG trong cung truy van.
 */
const DIEU_KIEN_DON_HOP_LE = Prisma.sql`d.loai_don = 'BAN_HANG' and d.trang_thai not in ('huy', 'hoan') and not coalesce(tr.da_tra_hang, false)`;

/** Tien tich luy cua mot don hop le: tong_tien tru phan hang da tra (tra mot phan van dem lan mua) */
const TIEN_HOP_LE = Prisma.sql`(d.tong_tien - coalesce(tr.tien_tra, 0))`;

@Injectable()
export class CrmDocService {
  /** Nhan PrismaClient de seed / script dung lai duoc (PrismaService la PrismaClient) */
  constructor(@Inject(PrismaService) private readonly prisma: PrismaClient) {}

  // ---------------------------------------------------------------- san pham (public.mau)

  /** Mot mau theo id (ke ca da ngung — noi goi tu loc) */
  async layMau(mauId: string): Promise<MauCrm | null> {
    const rows = await this.prisma.$queryRaw<MauCrm[]>`select ${COT_MAU} from public.mau m where m.id = ${mauId}::uuid`;
    return rows[0] ?? null;
  }

  async layMauTheoMa(ma: string): Promise<MauCrm | null> {
    const rows = await this.prisma.$queryRaw<MauCrm[]>`select ${COT_MAU} from public.mau m where m.ma = ${ma.trim().toUpperCase()}`;
    return rows[0] ?? null;
  }

  /** Nhieu mau theo id (giu thu tu theo ma) */
  async layMauTheoIds(ids: string[]): Promise<MauCrm[]> {
    if (!ids.length) return [];
    return this.prisma.$queryRaw<MauCrm[]>`
      select ${COT_MAU} from public.mau m where m.id = any(${ids}::uuid[]) order by m.ma`;
  }

  /**
   * Danh sach san pham. Mac dinh chi mau con ban (trang_thai <> 'ngung').
   * tuKhoa tim theo ma / ten / tu_khoa.
   */
  async layDanhSachMau(tuyChon: { baoGomNgung?: boolean; tuKhoa?: string; gioiHan?: number; boQua?: number } = {}): Promise<MauCrm[]> {
    const loc: Prisma.Sql[] = [];
    if (!tuyChon.baoGomNgung) loc.push(Prisma.sql`m.trang_thai <> 'ngung'`);
    const tk = tuyChon.tuKhoa?.trim();
    if (tk) {
      const mau = `%${tk}%`;
      loc.push(Prisma.sql`(m.ma ilike ${mau} or m.ten ilike ${mau} or coalesce(m.tu_khoa, '') ilike ${mau})`);
    }
    const where = loc.length ? Prisma.sql`where ${Prisma.join(loc, " and ")}` : Prisma.empty;
    const gioiHan = Math.min(Math.max(tuyChon.gioiHan ?? 200, 1), 500);
    const boQua = Math.max(tuyChon.boQua ?? 0, 0);
    return this.prisma.$queryRaw<MauCrm[]>`
      select ${COT_MAU} from public.mau m ${where} order by m.ma limit ${gioiHan} offset ${boQua}`;
  }

  /** Dem mau (cung bo loc layDanhSachMau) — phan trang co tong */
  async demMau(tuyChon: { baoGomNgung?: boolean; tuKhoa?: string } = {}): Promise<number> {
    const loc: Prisma.Sql[] = [];
    if (!tuyChon.baoGomNgung) loc.push(Prisma.sql`m.trang_thai <> 'ngung'`);
    const tk = tuyChon.tuKhoa?.trim();
    if (tk) {
      const mau = `%${tk}%`;
      loc.push(Prisma.sql`(m.ma ilike ${mau} or m.ten ilike ${mau} or coalesce(m.tu_khoa, '') ilike ${mau})`);
    }
    const where = loc.length ? Prisma.sql`where ${Prisma.join(loc, " and ")}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ n: number }[]>`select count(*)::int as n from public.mau m ${where}`;
    return rows[0]?.n ?? 0;
  }

  /** Ton kho theo size / mau sac cua mot mau */
  async layTonKho(mauId: string): Promise<TonKhoCrm[]> {
    return this.prisma.$queryRaw<TonKhoCrm[]>`
      select t.size, t.mau_sac, t.so_luong from public.ton_kho t where t.mau_id = ${mauId}::uuid order by t.size, t.mau_sac`;
  }

  // ---------------------------------------------------------------- khach & don

  /** Khach CRM theo SDT (tu chuan hoa) */
  async layKhachTheoSdt(sdt: string): Promise<KhachCrm | null> {
    const chuan = chuanHoaSdt(sdt);
    if (!chuan) return null;
    const rows = await this.prisma.$queryRaw<KhachCrm[]>`
      select k.id, k.ten, k.sdt, k.dia_chi, k.ghi_chu, k.created_at from public.khach_hang k where k.sdt = ${chuan}`;
    return rows[0] ?? null;
  }

  /** Don cua khach theo SDT chuan (moi nhat truoc) — moi loai, moi trang thai */
  async layDonTheoSdt(sdt: string, gioiHan = 50): Promise<DonCrm[]> {
    const chuan = chuanHoaSdt(sdt);
    if (!chuan) return [];
    return this.prisma.$queryRaw<DonCrm[]>`
      select ${COT_DON} from public.don_hang d ${JOIN_TRA_HANG} where d.sdt_chuan = ${chuan}
      order by d.created_at desc limit ${Math.min(Math.max(gioiHan, 1), 500)}`;
  }

  async layDon(donId: string): Promise<DonCrm | null> {
    const rows = await this.prisma.$queryRaw<DonCrm[]>`select ${COT_DON} from public.don_hang d ${JOIN_TRA_HANG} where d.id = ${donId}::uuid`;
    return rows[0] ?? null;
  }

  async layDonTheoMa(maDon: string): Promise<DonCrm | null> {
    const rows = await this.prisma.$queryRaw<DonCrm[]>`select ${COT_DON} from public.don_hang d ${JOIN_TRA_HANG} where d.ma_don = ${maDon.trim()}`;
    return rows[0] ?? null;
  }

  /** Nhieu don theo id (doc theo lo — job dong bo) */
  async layDonTheoIds(ids: string[]): Promise<DonCrm[]> {
    if (!ids.length) return [];
    return this.prisma.$queryRaw<DonCrm[]>`select ${COT_DON} from public.don_hang d ${JOIN_TRA_HANG} where d.id = any(${ids}::uuid[])`;
  }

  /**
   * Don BAN_HANG co ma gioi thieu trong ghi chu dang `[MGT:XXXX]` (luong dat hang that dua ma vao ghi chu CRM).
   * Mang-luoi quet de ghi nhan + tinh hoa hong.
   */
  async layDonCoMaGioiThieu(tuyChon: { tuLuc?: Date; gioiHan?: number } = {}): Promise<(DonCrm & { ghi_chu: string | null })[]> {
    const tuLuc = tuyChon.tuLuc ?? new Date(Date.now() - 180 * 24 * 3600 * 1000);
    const gioiHan = Math.min(Math.max(tuyChon.gioiHan ?? 500, 1), 2000);
    return this.prisma.$queryRaw<(DonCrm & { ghi_chu: string | null })[]>`
      select ${COT_DON}, d.ghi_chu from public.don_hang d ${JOIN_TRA_HANG}
      where d.loai_don = 'BAN_HANG' and upper(d.ghi_chu) like '%[MGT:%' and d.created_at >= ${tuLuc}
      order by d.created_at desc limit ${gioiHan}`;
  }

  /** Lich su cham soc khach (public.cham_soc_log), moi nhat truoc */
  async layChamTheoKhach(khachId: string, gioiHan = 50): Promise<ChamSocCrm[]> {
    return this.prisma.$queryRaw<ChamSocCrm[]>`
      select c.id, c.khach_id, c.user_id, u.full_name as nguoi_cham, c.noi_dung, c.created_at
      from public.cham_soc_log c left join public.users u on u.id = c.user_id
      where c.khach_id = ${khachId}::uuid order by c.created_at desc limit ${Math.min(Math.max(gioiHan, 1), 200)}`;
  }

  /** Dong san pham cua don (kem ma mau) */
  async layDongDon(donId: string): Promise<DongDonCrm[]> {
    return this.prisma.$queryRaw<DongDonCrm[]>`
      select l.id, l.don_id, l.mau_id, m.ma as ma_mau, l.size, l.mau_sac, l.so_luong, l.don_gia::float8 as don_gia
      from public.don_hang_dong l join public.mau m on m.id = l.mau_id where l.don_id = ${donId}::uuid`;
  }

  /**
   * Tong mua hop le cua mot khach — co so hang the (THAN_THIET / VIP) va "10 lan mua" KH hanh phuc.
   * Tinh luc doc: don hoan / huy / tra ca don (doi tra CRM) tu rot, tra mot phan tru tien -> hang tu tinh lai.
   */
  async tongMuaHopLe(sdt: string): Promise<TongMuaHopLe> {
    const chuan = chuanHoaSdt(sdt);
    if (!chuan) return { sdt_chuan: chuan, tong_tien: 0, so_don: 0, lan_mua_cuoi: null };
    const rows = await this.prisma.$queryRaw<{ tong_tien: number | null; so_don: number; lan_mua_cuoi: Date | null }[]>`
      select coalesce(sum(${TIEN_HOP_LE}), 0)::float8 as tong_tien, count(*)::int as so_don, max(d.created_at) as lan_mua_cuoi
      from public.don_hang d ${JOIN_TRA_HANG} where d.sdt_chuan = ${chuan} and ${DIEU_KIEN_DON_HOP_LE}`;
    const r = rows[0];
    return { sdt_chuan: chuan, tong_tien: Number(r?.tong_tien ?? 0), so_don: r?.so_don ?? 0, lan_mua_cuoi: r?.lan_mua_cuoi ?? null };
  }

  /** Khach co tu soLan don hop le tro len (moi KH hanh phuc) — chi tra sdt_chuan + tong */
  async layKhachDuSoLanMua(soLan: number, gioiHan = 200): Promise<TongMuaHopLe[]> {
    return this.prisma.$queryRaw<TongMuaHopLe[]>`
      select d.sdt_chuan, coalesce(sum(${TIEN_HOP_LE}), 0)::float8 as tong_tien, count(*)::int as so_don, max(d.created_at) as lan_mua_cuoi
      from public.don_hang d ${JOIN_TRA_HANG} where d.sdt_chuan is not null and d.sdt_chuan <> '' and ${DIEU_KIEN_DON_HOP_LE}
      group by d.sdt_chuan having count(*) >= ${soLan}
      order by count(*) desc limit ${Math.min(Math.max(gioiHan, 1), 1000)}`;
  }

  /** Khach co tong mua hop le >= nguong (cap uu dai ca hang) — sap theo tong tien giam dan */
  async layKhachTheoTongMua(nguong: number, gioiHan = 5000): Promise<TongMuaHopLe[]> {
    return this.prisma.$queryRaw<TongMuaHopLe[]>`
      select d.sdt_chuan, coalesce(sum(${TIEN_HOP_LE}), 0)::float8 as tong_tien, count(*)::int as so_don, max(d.created_at) as lan_mua_cuoi
      from public.don_hang d ${JOIN_TRA_HANG} where d.sdt_chuan is not null and d.sdt_chuan <> '' and ${DIEU_KIEN_DON_HOP_LE}
      group by d.sdt_chuan having coalesce(sum(${TIEN_HOP_LE}), 0) >= ${nguong}
      order by sum(${TIEN_HOP_LE}) desc limit ${Math.min(Math.max(gioiHan, 1), 20000)}`;
  }

  /** Danh sach khach CRM co phan trang + tong (kem tong mua hop le), tim theo ten / SDT */
  async layDanhSachKhach(tuyChon: { tuKhoa?: string; gioiHan?: number; boQua?: number } = {}): Promise<{ ds: KhachKemTongMua[]; tong: number }> {
    const tk = tuyChon.tuKhoa?.trim();
    const sdt = tk ? chuanHoaSdt(tk) : "";
    const where = tk
      ? Prisma.sql`where (k.ten ilike ${`%${tk}%`} or k.sdt like ${`%${sdt || tk}%`})`
      : Prisma.empty;
    const gioiHan = Math.min(Math.max(tuyChon.gioiHan ?? 20, 1), 200);
    const boQua = Math.max(tuyChon.boQua ?? 0, 0);
    const [ds, dem] = await Promise.all([
      this.prisma.$queryRaw<KhachKemTongMua[]>`
        select k.id, k.ten, k.sdt, k.dia_chi, k.ghi_chu, k.created_at,
          coalesce(t.tong_tien, 0)::float8 as tong_tien, coalesce(t.so_don, 0)::int as so_don, t.lan_mua_cuoi
        from public.khach_hang k
        left join (
          select d.sdt_chuan, sum(${TIEN_HOP_LE}) as tong_tien, count(*) as so_don, max(d.created_at) as lan_mua_cuoi
          from public.don_hang d ${JOIN_TRA_HANG} where ${DIEU_KIEN_DON_HOP_LE} group by d.sdt_chuan
        ) t on t.sdt_chuan = k.sdt
        ${where}
        order by coalesce(t.tong_tien, 0) desc, k.created_at desc limit ${gioiHan} offset ${boQua}`,
      this.prisma.$queryRaw<{ n: number }[]>`select count(*)::int as n from public.khach_hang k ${where}`
    ]);
    return { ds: ds.map(k => ({ ...k, tong_tien: Number(k.tong_tien) })), tong: dem[0]?.n ?? 0 };
  }

  // ---------------------------------------------------------------- nhan su

  /**
   * Nhan su CRM theo auth uid (public.users + nhom_quyen cua phong ban: users.phong_ban_id -> phong_ban.nhom_quyen).
   * Doc ::text — khong phu thuoc CRM da ap migration 079 hay chua (nhom moi chi la gia tri text them vao CHECK).
   */
  async layNhanSuCrm(userId: string): Promise<NhanSuCrm | null> {
    const rows = await this.prisma.$queryRaw<NhanSuCrm[]>`
      select u.id, u.email, u.full_name, u.role, u.active, coalesce(p.nhom_quyen::text, 'KHONG') as nhom_quyen, p.ten as phong_ban
      from public.users u left join public.phong_ban p on p.id = u.phong_ban_id where u.id = ${userId}::uuid`;
    return rows[0] ?? null;
  }

  /** Trong cac auth uid dua vao, nhung uid KHONG con lam tren CRM (bi khoa active=false hoac da xoa khoi public.users) */
  async locNhanSuKhongConLam(userIds: string[]): Promise<string[]> {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) return [];
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      select u.id::text as id from public.users u where u.id = any(${ids}::uuid[]) and u.active = true`;
    const conLam = new Set(rows.map(r => r.id));
    return ids.filter(id => !conLam.has(id));
  }

  /** Nhan su CRM dang lam theo nhom quyen (vd SALE / CSKH) — phan bo khach */
  async layNhanSuTheoNhom(nhomQuyen: NhanSuCrm["nhom_quyen"]): Promise<NhanSuCrm[]> {
    return this.prisma.$queryRaw<NhanSuCrm[]>`
      select u.id, u.email, u.full_name, u.role, u.active, coalesce(p.nhom_quyen::text, 'KHONG') as nhom_quyen, p.ten as phong_ban
      from public.users u left join public.phong_ban p on p.id = u.phong_ban_id
      where u.active = true and coalesce(p.nhom_quyen::text, 'KHONG') = ${nhomQuyen} order by u.full_name`;
  }
}
