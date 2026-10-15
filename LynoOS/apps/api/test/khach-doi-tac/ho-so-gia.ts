import type { ThongTinNguoiDung } from "../../src/common/types/nguoi-dung.type";
import { chuanHoaSdt } from "../../src/infrastructure/crm/chuan-hoa-sdt";

/*
 * Ho so gia cho test khach-doi-tac: cac API /toi/* doc lai SDT + co xac minh tu DB (ho_so.findUnique),
 * khong tin nd.hoSo. nguoiDung(...) ghi vao day, prisma.ho_so.findUnique doc ra.
 */
const HO_SO = new Map<string, { sdt: string | null; xacMinh: boolean }>();

export function nguoiDung(id: string, vai: ThongTinNguoiDung["vai"], sdt: string | null = null, xacMinh = true): ThongTinNguoiDung {
  HO_SO.set(id, { sdt, xacMinh });
  return { id, email: null, hoSo: { id, ho_ten: "Khách " + id, email: null, sdt, crm_user_id: null, kich_hoat_lam_viec: false }, vai, vaiChiTiet: [] };
}

/** Mock prisma.ho_so.findUnique({ where: { id } }) theo ho so gia */
export function timHoSoGia() {
  return jest.fn(async ({ where }: { where: { id: string } }) => {
    const h = HO_SO.get(where.id);
    if (!h) return null;
    return { sdt: h.sdt, sdt_chuan: h.sdt ? chuanHoaSdt(h.sdt) : null, sdt_xac_minh_luc: h.sdt && h.xacMinh ? new Date("2026-10-07T00:00:00Z") : null };
  });
}
