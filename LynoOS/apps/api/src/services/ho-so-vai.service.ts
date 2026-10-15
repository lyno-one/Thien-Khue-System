// Vai + dieu kien hoc truoc khi ban. Lop: DieuKienHocService, VaiService.
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { TrangThaiVai, Vai } from "@prisma/client";
import type { DieuKienKichHoat, HoSoChiTiet, HoSoTomTat, LichSuVai, PhanTrangMeta } from "@thien-khue/contracts";
import { DieuKienHocRepository, type HoSoTomTatDb, VaiRepository } from "../repositories/ho-so.repository";
import {
  danhGiaDieuKien, type DuLieuHocCuaHoSo, type KetQuaDieuKien, type KhoaHocCanDat, kiemChuyenTrangThai, kiemQuyenDoiVai, laVaiPhaiHoc,
  trangThaiKhoiTao, VAI_PHAI_HOC
} from "../common/utils/ho-so";
import { tinhTienDo } from "../common/utils/dao-tao";
import { kiemVaiKhongTuCrm, VAI_TU_CRM } from "../common/utils/quan-tri";
import { mapVaiCrm } from "../common/utils/core";
import { CrmDocService } from "../infrastructure/crm/crm-doc.service";
import { NhatKyService, ThongBaoService } from "./core.service";
import { phanTrang, taoMetaPhanTrang } from "../common/utils/phan-trang";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import type { DoiTrangThaiVaiDto, LocHoSoDto, ThemVaiDto } from "../dto/ho-so/ho-so.dto";
import { NHAN_VAI_VN } from "../constants/ho-so.constants";

// Ham thuan cua dao-tao: cung luat XetDatService dung de tu kich hoat
/*
 * Dieu kien "hoc truoc khi ban" (KIEN-TRUC muc 5) de vai DANG_HOC -> HOAT_DONG.
 * Checklist hien thi tinh bang danhGiaDieuKien (common/utils/ho-so); QUYET DINH dat cuoi cung doi chieu them
 * tinhTienDo cua dao-tao (cung ham XetDatService dung khi tu kich hoat) -> nut "Kích hoạt" va tu kich hoat khong lech luat.
 */

@Injectable()
export class DieuKienHocService {
  constructor(private readonly repo: DieuKienHocRepository) {}

  /** Khoa bat buoc (NEN_TANG + NGHIEP_VU) ap cho vai — khoa SAN_PHAM la quyen SKU rieng, khong chan kich hoat */
  async layKhoaCanDat(vai: Vai): Promise<KhoaHocCanDat[]> {
    return this.repo.layKhoaCanDat(vai);
  }

  async layDuLieuHoc(hoSoId: string, khoaHoc: KhoaHocCanDat[]): Promise<DuLieuHocCuaHoSo> {
    const baiHocIds = khoaHoc.flatMap(k => k.bai_hoc.map(b => b.id));
    const ktIds = khoaHoc.flatMap(k => k.bai_kiem_tra.map(b => b.id));
    const khoaThucHanh = khoaHoc.filter(k => k.can_thuc_hanh).map(k => k.id);
    const [tienDo, luot, thucHanh] = await Promise.all([
      baiHocIds.length ? this.repo.dsBaiHocXong(hoSoId, baiHocIds) : Promise.resolve([]),
      ktIds.length ? this.repo.dsLuotDat(hoSoId, ktIds) : Promise.resolve([]),
      khoaThucHanh.length ? this.repo.dsThucHanhDat(hoSoId, khoaThucHanh) : Promise.resolve([])
    ]);
    const diemDatCaoNhat = new Map<string, number>();
    for (const l of luot) diemDatCaoNhat.set(l.bai_kiem_tra_id, Math.max(diemDatCaoNhat.get(l.bai_kiem_tra_id) ?? 0, l.diem));
    return {
      baiHocXong: new Set(tienDo.map(t => t.bai_hoc_id)),
      diemDatCaoNhat,
      thucHanhDat: new Set(thucHanh.map(t => t.khoa_hoc_id))
    };
  }

  async kiem(hoSoId: string, vai: Vai): Promise<KetQuaDieuKien> {
    const khoa = await this.layKhoaCanDat(vai);
    const kq = danhGiaDieuKien(khoa, await this.layDuLieuHoc(hoSoId, khoa));
    if (!kq.dat) return kq;
    // Mot nguon luat: khoa phai "hoan_thanh" theo tinhTienDo cua dao-tao (co noi dung, thi dat dung phien ban, thuc hanh DAT)
    const dsKhoa = await this.repo.layKhoaTheoIds(khoa.map(k => k.id));
    const dl = await this.repo.napDuLieuHocVien(hoSoId, dsKhoa.map(k => k.id));
    const chuaXong = dsKhoa.filter(k => !tinhTienDo(k, dl).hoan_thanh);
    if (!chuaXong.length) return kq;
    return { dat: false, dieu_kien: kq.dieu_kien, con_thieu: chuaXong.map(k => `${k.ten} — chưa hoàn thành theo luật học viện`) };
  }
}

function sangTomTat(h: HoSoTomTatDb): HoSoTomTat {
  return {
    id: h.id,
    ho_ten: h.ho_ten,
    email: h.email,
    sdt: h.sdt,
    crm_user_id: h.crm_user_id,
    kich_hoat_lam_viec: h.kich_hoat_lam_viec,
    created_at: h.created_at.toISOString(),
    vai: h.vai_tro.map(v => ({
      vai: v.vai,
      trang_thai: v.trang_thai,
      tu_luc: v.tu_luc.toISOString(),
      den_luc: v.den_luc ? v.den_luc.toISOString() : null,
      nguon: v.nguon
    }))
  };
}
/**
 * Quan tri vai (them / tam dung / ket thuc), lich su chuyen vai (chi INSERT), kich hoat lam viec khi hoc dat.
 * Khong con de xuat chuyen vai: doi vai = doi phong ban / nhom quyen o CRM.
 * Export tu HoSoModule: `kichHoat` (dao-tao goi sau khi hoc dat).
 */
@Injectable()
export class VaiService {
  constructor(
    private readonly repo: VaiRepository,
    private readonly dieuKien: DieuKienHocService,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService,
    private readonly crmDoc: CrmDocService
  ) {}

  // ---------------------------------------------------------------- doc

  async danhSach(q: LocHoSoDto): Promise<{ data: HoSoTomTat[]; meta: PhanTrangMeta }> {
    const { skip, take, trang, so_dong } = phanTrang(q);
    const [ds, tong] = await this.repo.danhSachHoSo({ tuKhoa: q.tu_khoa?.trim(), vai: q.vai, skip, take });
    return { data: ds.map(sangTomTat), meta: taoMetaPhanTrang(trang, so_dong, tong) };
  }

  async chiTiet(hoSoId: string): Promise<HoSoChiTiet> {
    const h = await this.repo.layChiTietHoSo(hoSoId);
    if (!h) throw new NotFoundException("Không tìm thấy hồ sơ");
    return {
      ...sangTomTat(h),
      anh_dai_dien: h.anh_dai_dien,
      kich_hoat_luc: h.kich_hoat_luc ? h.kich_hoat_luc.toISOString() : null,
      ghi_chu: h.ghi_chu,
      lich_su_vai: await this.lichSu(hoSoId)
    };
  }

  /** Lich su chuyen vai (moi nhat truoc) kem ten nguoi doi */
  async lichSu(hoSoId: string): Promise<LichSuVai[]> {
    const ds = await this.repo.dsLichSuVai(hoSoId);
    const ids = [...new Set(ds.map(d => d.nguoi_doi_id).filter((x): x is string => !!x))];
    const ten = ids.length ? new Map((await this.repo.dsTenHoSo(ids)).map(h => [h.id, h.ho_ten])) : new Map<string, string>();
    return ds.map(d => ({
      id: d.id,
      vai: d.vai,
      trang_thai_cu: d.trang_thai_cu,
      trang_thai_moi: d.trang_thai_moi,
      nguoi_doi_id: d.nguoi_doi_id,
      nguoi_doi_ten: d.nguoi_doi_id ? (ten.get(d.nguoi_doi_id) ?? null) : null,
      ly_do: d.ly_do,
      de_xuat_duyet_id: d.de_xuat_duyet_id,
      created_at: d.created_at.toISOString()
    }));
  }

  // ---------------------------------------------------------------- quan tri vai

  /** Them vai cho ho so KHAC (khong tu cap cho minh). Vai phai hoc luon bat dau DANG_HOC. */
  async themVai(nd: ThongTinNguoiDung, hoSoId: string, dto: ThemVaiDto): Promise<HoSoChiTiet> {
    kiemQuyenDoiVai(nd, hoSoId, dto.vai);
    // Vai nhan su (Admin / Quan ly / Sale / CSKH / CEO) lay tu CRM — khong cap tay o Thien Khue
    kiemVaiKhongTuCrm(dto.vai);
    const hienCo = await this.layVaiHienCo(hoSoId, dto.vai);
    if (hienCo && hienCo !== "KET_THUC") throw new ConflictException("Hồ sơ đã có vai trò này");
    const moi = trangThaiKhoiTao(dto.vai);
    await this.repo.chayTrongGiaoDich(async tx => {
      await this.repo.ghiDoiVai({ hoSoId, vai: dto.vai, cu: hienCo, moi, nguoiDoiId: nd.id, lyDo: dto.ly_do, nguon: "QUAN_TRI" }, tx);
      await this.nhatKy.ghi(
        { hoSoId: nd.id, hanhDong: "THEM_VAI", doiTuong: "ho_so", doiTuongId: hoSoId, duLieu: { vai: dto.vai, trang_thai: moi, ly_do: dto.ly_do } },
        tx
      );
      await this.thongBao.gui(
        {
          hoSoId,
          loai: laVaiPhaiHoc(dto.vai) ? "DAO_TAO" : "HE_THONG",
          tieuDe: `Bạn được thêm vai trò ${NHAN_VAI_VN[dto.vai]}`,
          noiDung: laVaiPhaiHoc(dto.vai) ? "Hoàn thành khoá học và đạt bài kiểm tra (≥ 90%) để kích hoạt vai trò." : undefined,
          lienKet: laVaiPhaiHoc(dto.vai) ? "/hoc-vien" : "/tai-khoan"
        },
        tx
      );
    });
    return this.chiTiet(hoSoId);
  }

  /** Tam dung / khoi phuc / ket thuc vai cua ho so KHAC */
  async doiTrangThai(nd: ThongTinNguoiDung, hoSoId: string, vai: Vai, dto: DoiTrangThaiVaiDto): Promise<HoSoChiTiet> {
    kiemQuyenDoiVai(nd, hoSoId, vai);
    const cu = await this.layVaiHienCo(hoSoId, vai);
    if (!cu) throw new NotFoundException("Hồ sơ không có vai trò này");
    const moi: TrangThaiVai = dto.trang_thai;
    kiemChuyenTrangThai(vai, cu, moi);
    // Vai lay tu CRM: chi duoc HOAT_DONG lai khi CRM HIEN dang cap vai nay (khong mo lai vai CRM da thu hoi bang tay o TK)
    if (moi === "HOAT_DONG" && VAI_TU_CRM.includes(vai)) {
      const vaiCrm = mapVaiCrm(await this.crmDoc.layNhanSuCrm(hoSoId));
      if (!vaiCrm.some(v => v.vai === vai)) kiemVaiKhongTuCrm(vai);
    }
    // Khoi phuc vai phai hoc tu TAM_DUNG: van phai con dat dieu kien hoc (tai lieu co the da doi)
    if (moi === "HOAT_DONG" && laVaiPhaiHoc(vai)) {
      const kq = await this.dieuKien.kiem(hoSoId, vai);
      if (!kq.dat) throw new BadRequestException({ message: "Chưa đủ điều kiện học để hoạt động lại", details: kq.con_thieu });
    }
    await this.repo.chayTrongGiaoDich(async tx => {
      await this.repo.ghiDoiVai({ hoSoId, vai, cu, moi, nguoiDoiId: nd.id, lyDo: dto.ly_do }, tx);
      await this.nhatKy.ghi(
        { hoSoId: nd.id, hanhDong: "DOI_TRANG_THAI_VAI", doiTuong: "ho_so", doiTuongId: hoSoId, duLieu: { vai, tu: cu, sang: moi, ly_do: dto.ly_do } },
        tx
      );
      await this.thongBao.gui(
        { hoSoId, tieuDe: `Vai trò ${NHAN_VAI_VN[vai]}: ${moTaTrangThai(moi)}`, noiDung: dto.ly_do, lienKet: "/tai-khoan" },
        tx
      );
    });
    return this.chiTiet(hoSoId);
  }

  // ---------------------------------------------------------------- kich hoat lam viec

  /** Checklist dieu kien cho moi vai phai hoc dang DANG_HOC / TAM_DUNG / HOAT_DONG cua ho so */
  async dieuKienKichHoat(hoSoId: string): Promise<DieuKienKichHoat[]> {
    const ds = await this.repo.dsVaiChuaKetThuc(hoSoId, [...VAI_PHAI_HOC]);
    return Promise.all(
      ds.map(async v => {
        const kq = await this.dieuKien.kiem(hoSoId, v.vai);
        return { vai: v.vai, trang_thai: v.trang_thai, ...kq };
      })
    );
  }

  /**
   * DANG_HOC -> HOAT_DONG khi dat dieu kien hoc (KIEN-TRUC muc 5); dong thoi bat ho_so.kich_hoat_lam_viec.
   * nguoiDoiId: null = he thong (tu kiem khi nguoi dung bam / dao-tao goi sau khi dat), hoac id quan ly / mentor.
   * Chua dat -> 400 kem danh sach con thieu.
   */
  async kichHoat(hoSoId: string, vai: Vai, nguoiDoiId: string | null): Promise<DieuKienKichHoat> {
    if (!laVaiPhaiHoc(vai)) throw new BadRequestException("Vai trò này không cần kích hoạt qua học");
    const cu = await this.layVaiHienCo(hoSoId, vai);
    if (!cu || cu === "KET_THUC") throw new NotFoundException("Hồ sơ không có vai trò này");
    if (cu === "HOAT_DONG") throw new ConflictException("Vai trò đã được kích hoạt");
    if (cu === "TAM_DUNG") throw new BadRequestException("Vai trò đang tạm dừng — cần quản lý khôi phục");
    const kq = await this.dieuKien.kiem(hoSoId, vai);
    if (!kq.dat) throw new BadRequestException({ message: "Chưa đủ điều kiện kích hoạt", details: kq.con_thieu });

    await this.repo.chayTrongGiaoDich(async tx => {
      await this.repo.ghiDoiVai(
        {
          hoSoId,
          vai,
          cu,
          moi: "HOAT_DONG",
          nguoiDoiId,
          lyDo: "Đạt điều kiện học: hoàn thành bài học, bài kiểm tra ≥ 90%, thực hành được duyệt"
        },
        tx
      );
      await this.repo.batKichHoatLamViecNeuChua(hoSoId, tx);
      await this.nhatKy.ghi(
        {
          hoSoId: nguoiDoiId,
          hanhDong: "KICH_HOAT_VAI",
          doiTuong: "ho_so",
          doiTuongId: hoSoId,
          duLieu: { vai, dieu_kien: kq.dieu_kien.map(d => `${d.khoa_hoc_ma}:${d.loai}:${d.dat ? "dat" : "chua"}`) }
        },
        tx
      );
      await this.thongBao.gui(
        {
          hoSoId,
          loai: "DAO_TAO",
          tieuDe: `Vai trò ${NHAN_VAI_VN[vai]} đã được kích hoạt`,
          noiDung: "Bạn đã có không gian làm việc. Quyền với từng sản phẩm mở khi học và đạt khoá sản phẩm đó.",
          lienKet: "/lam-viec"
        },
        tx
      );
    });
    return { vai, trang_thai: "HOAT_DONG", ...kq };
  }

  // ---------------------------------------------------------------- tien ich

  private async layVaiHienCo(hoSoId: string, vai: Vai): Promise<TrangThaiVai | null> {
    const hs = await this.repo.layHoSoKemMotVai(hoSoId, vai);
    if (!hs) throw new NotFoundException("Không tìm thấy hồ sơ");
    return hs.vai_tro[0]?.trang_thai ?? null;
  }
}
function moTaTrangThai(t: TrangThaiVai): string {
  return { DANG_HOC: "đang học", HOAT_DONG: "hoạt động trở lại", TAM_DUNG: "tạm dừng", KET_THUC: "kết thúc" }[t];
}
