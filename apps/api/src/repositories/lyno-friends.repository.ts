import { Injectable } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { CHON_KHOA } from "../common/utils/dao-tao";
import { napDuLieuHocVien } from "./dao-tao.repository";

@Injectable()
export class LynoFriendsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async dangKy(hoSoId: string) {
    return this.prisma.$transaction(async tx => {
      const cu = await tx.nhat_ky.findFirst({ where: { ho_so_id: hoSoId, hanh_dong: "DANG_KY_LYNO_FRIENDS" } });
      if (cu) return;
      // Chi them vai hoc vien, khong ghi de vai da bi tam dung / ket thuc boi quan ly.
      const vai = await tx.vai_tro_ho_so.findUnique({ where: { ho_so_id_vai: { ho_so_id: hoSoId, vai: "CTV" } } });
      if (!vai) {
        await tx.vai_tro_ho_so.create({ data: { ho_so_id: hoSoId, vai: "CTV", trang_thai: "DANG_HOC", nguon: "LYNO_FRIENDS" } });
        await tx.lich_su_vai_tro.create({ data: { ho_so_id: hoSoId, vai: "CTV", trang_thai_cu: null, trang_thai_moi: "DANG_HOC", ly_do: "Khách tự nguyện đăng ký học LYNO Friends" } });
      }
      await tx.nhat_ky.create({ data: { ho_so_id: hoSoId, tac_nhan: "NGUOI", hanh_dong: "DANG_KY_LYNO_FRIENDS", doi_tuong: "ho_so", doi_tuong_id: hoSoId, du_lieu: { dong_y: true, phien_ban: 1, nguong_dat: 90 } } });
    });
  }

  async duLieu(hoSoId: string) {
    const [hoSo, dangKy, khoa] = await Promise.all([
      this.prisma.ho_so.findUnique({ where: { id: hoSoId }, include: { vai_tro: true } }),
      this.prisma.nhat_ky.findFirst({ where: { ho_so_id: hoSoId, hanh_dong: "DANG_KY_LYNO_FRIENDS" }, select: { id: true } }),
      this.prisma.khoa_hoc.findMany({ where: { bat: true, OR: [{ vai_ap_dung: { has: "CTV" } }, { vai_ap_dung: { isEmpty: true } }] }, select: CHON_KHOA })
    ]);
    return { hoSo, dangKy, khoa, hoc: await napDuLieuHocVien(this.prisma, hoSoId, khoa.map(k => k.id)) };
  }
}
