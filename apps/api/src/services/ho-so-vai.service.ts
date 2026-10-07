// Vai + dieu kien hoc truoc khi ban. Lop: DieuKienHocService, VaiService.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Prisma, TrangThaiVai, Vai } from "@prisma/client";
import type {
  DeXuatChuyenVai, DieuKienKichHoat, DuLieuDeXuatChuyenVai, HoSoChiTiet, HoSoTomTat, LichSuVai, PhanTrangMeta, VaiChuyenTuThucTap
} from "@thien-khue/contracts";
import { DieuKienHocRepository, type HoSoTomTatDb, VaiRepository } from "../repositories/ho-so.repository";
import {
  danhGiaDieuKien, type DuLieuHocCuaHoSo, type KetQuaDieuKien, type KhoaHocCanDat, kiemChuyenTrangThai, kiemQuyenDoiVai, laVaiPhaiHoc,
  trangThaiKhoiTao, VAI_CHUYEN_TU_THUC_TAP, VAI_PHAI_HOC
} from "../common/utils/ho-so";
import { tinhTienDo } from "../common/utils/dao-tao";
import { kiemVaiKhongTuCrm, trangThaiHieuLuc } from "../common/utils/quan-tri";
import { NhatKyService, ThongBaoService } from "./core.service";
import { phanTrang, taoMetaPhanTrang } from "../common/utils/phan-trang";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import type { DeXuatChuyenVaiDto, DoiTrangThaiVaiDto, LocHoSoDto, ThemVaiDto } from "../dto/ho-so/ho-so.dto";
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

  /** Co khoa NGHIEP_VU bat buoc cho vai (vd khoa CTV) */
  coKhoaNghiepVu(vai: Vai): Promise<boolean> {
    return this.repo.coKhoaNghiepVu(vai);
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

/**
 * Thuc tap sinh (THUC_TAP DANG_HOC / HOAT_DONG) chua tung co vai CTV -> can xet tu len CTV.
 * Da co CTV (ke ca KET_THUC do con nguoi quyet dinh) hoac THUC_TAP tam dung / ket thuc -> khong xet.
 */
export function canXetTtsLenCtv(vai: readonly { vai: Vai; trang_thai: TrangThaiVai }[]): boolean {
  const tts = vai.find(v => v.vai === "THUC_TAP");
  if (!tts || (tts.trang_thai !== "DANG_HOC" && tts.trang_thai !== "HOAT_DONG")) return false;
  return !vai.some(v => v.vai === "CTV");
}
const laLoiTrungKhoa = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

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
 * Quan tri vai (them / tam dung / ket thuc), lich su chuyen vai (chi INSERT), kich hoat lam viec khi hoc dat,
 * de xuat chuyen vai cho thuc tap sinh (de_xuat_duyet, maker-checker).
 * Export tu HoSoModule: `kichHoat` (dao-tao goi sau khi hoc dat), `apDungDeXuatChuyenVai` (quan-tri goi khi duyet).
 */
@Injectable()
export class VaiService {
  private readonly logger = new Logger("VaiService");

  constructor(
    private readonly repo: VaiRepository,
    private readonly dieuKien: DieuKienHocService,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
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
    await this.xetTtsLenCtvAnToan(hoSoId);
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

  // ---------------------------------------------------------------- thuc tap sinh tu len CTV

  /**
   * TTS hoc dat khoa CTV (co khoa NGHIEP_VU bat buoc ap cho CTV; dat moi khoa bat buoc cua vai CTV theo cung luat
   * DieuKienHocService.kiem / tinhTienDo cua dao-tao) -> he thong tu them vai CTV HOAT_DONG, KHONG qua de xuat.
   * Giu vai THUC_TAP. Ghi lich_su_vai_tro (nguoi_doi null = he thong) + nhat_ky + thong bao. Idempotent:
   * chi them khi ho so chua tung co vai CTV (CTV da bi ket thuc la quyet dinh cua nguoi — khong tu mo lai).
   * Tra true neu vua them.
   * Goi tu: GET /ho-so/toi (HoSoService.layCuaToi), checklist kich hoat, job quet dinh ky (TtsLenCtvJob), quan tri bam "Xét".
   */
  async xetTtsLenCtv(hoSoId: string): Promise<boolean> {
    const hs = await this.repo.layHoSoKemVai(hoSoId);
    if (!hs || !canXetTtsLenCtv(hs.vai_tro)) return false;
    if (!(await this.dieuKien.coKhoaNghiepVu("CTV"))) return false;
    const kq = await this.dieuKien.kiem(hoSoId, "CTV");
    if (!kq.dat) return false;
    const lyDo = "Thực tập sinh học đạt khoá CTV — hệ thống tự thêm vai Cộng tác viên";
    try {
      return await this.repo.chayTrongGiaoDich(async tx => {
        const daCo = await this.repo.dsVaiTheoDs(hoSoId, ["CTV"], tx);
        if (daCo.length) return false;
        await this.repo.ghiDoiVai({ hoSoId, vai: "CTV", cu: null, moi: "HOAT_DONG", nguoiDoiId: null, lyDo, nguon: "HE_THONG" }, tx);
        await this.repo.batKichHoatLamViecNeuChua(hoSoId, tx);
        await this.nhatKy.ghi(
          {
            hoSoId: null,
            hanhDong: "TU_DONG_THEM_VAI_CTV",
            doiTuong: "ho_so",
            doiTuongId: hoSoId,
            duLieu: { vai: "CTV", trang_thai: "HOAT_DONG", tu_vai: "THUC_TAP", dieu_kien: kq.dieu_kien.map(d => `${d.khoa_hoc_ma}:${d.loai}:${d.dat ? "dat" : "chua"}`) }
          },
          tx
        );
        await this.thongBao.gui(
          {
            hoSoId,
            loai: "DAO_TAO",
            tieuDe: `Bạn đã trở thành ${NHAN_VAI_VN.CTV}`,
            noiDung: "Bạn đã học đạt khoá CTV — vai Cộng tác viên được kích hoạt. Quyền bán từng mã mở khi học và đạt khoá sản phẩm đó.",
            lienKet: "/lam-viec"
          },
          tx
        );
        return true;
      });
    } catch (e) {
      if (laLoiTrungKhoa(e)) return false; // request song song da them truoc
      throw e;
    }
  }

  /** Nhu xetTtsLenCtv nhung khong lam hong luong goi (loi chi log) */
  async xetTtsLenCtvAnToan(hoSoId: string): Promise<boolean> {
    try {
      return await this.xetTtsLenCtv(hoSoId);
    } catch (e) {
      this.logger.warn(`Xét thực tập sinh lên CTV lỗi (${hoSoId}): ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  /** Quet moi TTS chua co CTV — tra so ho so da xet + danh sach vua duoc them vai CTV */
  async quetTtsLenCtv(): Promise<{ da_xet: number; len_ctv: string[] }> {
    const ds = await this.repo.dsTtsChuaCoCtv();
    const len: string[] = [];
    for (const id of ds) if (await this.xetTtsLenCtvAnToan(id)) len.push(id);
    return { da_xet: ds.length, len_ctv: len };
  }

  // ---------------------------------------------------------------- de xuat chuyen vai (thuc tap sinh)

  /**
   * Tao de_xuat_duyet CHUYEN_VAI cho thuc tap sinh (THUC_TAP -> vai_moi) — de xuat 2 buoc (CHO_DUYET):
   * nguoi duyet (ADMIN / THIEN_KHUE) khac nguoi de xuat va khac ho so duoc chuyen (CHECK DB + ban phe duyet o quan-tri).
   * Sale / CSKH la vai lay tu CRM -> 400 (tuyen o CRM). CTV: TTS hoc dat khoa CTV thi he thong tu them, khong can de xuat.
   */
  async deXuatChuyenVai(nd: ThongTinNguoiDung, hoSoId: string, dto: DeXuatChuyenVaiDto): Promise<DeXuatChuyenVai> {
    if (!VAI_CHUYEN_TU_THUC_TAP.includes(dto.vai_moi)) throw new BadRequestException("Vai trò chuyển sang không hợp lệ");
    kiemVaiKhongTuCrm(dto.vai_moi);
    const hs = await this.repo.layHoSoKemVai(hoSoId);
    if (!hs) throw new NotFoundException("Không tìm thấy hồ sơ");
    const thucTap = hs.vai_tro.find(v => v.vai === "THUC_TAP");
    if (!thucTap || thucTap.trang_thai === "KET_THUC") throw new BadRequestException("Hồ sơ không phải thực tập sinh đang hoạt động");
    const daCo = hs.vai_tro.find(v => v.vai === dto.vai_moi);
    if (daCo && daCo.trang_thai !== "KET_THUC") throw new ConflictException(`Hồ sơ đã có vai trò ${NHAN_VAI_VN[dto.vai_moi]}`);
    const dangMo = await this.repo.timDeXuatChuyenVaiDangMo(hoSoId);
    if (dangMo) throw new ConflictException("Hồ sơ đang có đề xuất chuyển vai chờ duyệt");

    const duLieu: DuLieuDeXuatChuyenVai = {
      ho_so_id: hoSoId,
      ho_ten: hs.ho_ten,
      tu_vai: "THUC_TAP",
      vai_moi: dto.vai_moi as VaiChuyenTuThucTap,
      trang_thai_vai_moi: trangThaiKhoiTao(dto.vai_moi)
    };
    const dx = await this.repo.chayTrongGiaoDich(async tx => {
      const tao = await this.repo.taoDeXuatChuyenVai(
        { hoSoId, duLieu: duLieu as unknown as Prisma.InputJsonValue, lyDo: dto.ly_do, nguoiDeXuatId: nd.id },
        tx
      );
      await this.nhatKy.ghi(
        { hoSoId: nd.id, hanhDong: "DE_XUAT_CHUYEN_VAI", doiTuong: "de_xuat_duyet", doiTuongId: tao.id, duLieu: { ho_so_id: hoSoId, vai_moi: dto.vai_moi } },
        tx
      );
      // Bao nguoi co quyen duyet (tru nguoi de xuat va ho so duoc chuyen)
      const nguoiDuyet = await this.repo.dsNguoiDuyetChuyenVai([nd.id, hoSoId], tx);
      await this.thongBao.guiNhieu(
        nguoiDuyet.map(n => n.ho_so_id),
        {
          loai: "PHE_DUYET",
          tieuDe: `Đề xuất chuyển ${hs.ho_ten} sang ${NHAN_VAI_VN[dto.vai_moi]}`,
          noiDung: dto.ly_do,
          lienKet: "/quan-tri/phe-duyet"
        },
        tx
      );
      return tao;
    });
    return {
      id: dx.id,
      trang_thai: trangThaiHieuLuc(dx),
      du_lieu: duLieu,
      ly_do: dx.ly_do,
      nguoi_de_xuat_id: dx.nguoi_de_xuat_id,
      created_at: dx.created_at.toISOString()
    };
  }

  /** De xuat chuyen vai lien quan ho so (moi nhat truoc) */
  async deXuatCuaHoSo(hoSoId: string): Promise<DeXuatChuyenVai[]> {
    const ds = await this.repo.dsDeXuatChuyenVai(hoSoId);
    return ds.map(d => ({
      id: d.id,
      trang_thai: trangThaiHieuLuc(d),
      du_lieu: d.du_lieu as unknown as DuLieuDeXuatChuyenVai,
      ly_do: d.ly_do,
      nguoi_de_xuat_id: d.nguoi_de_xuat_id,
      created_at: d.created_at.toISOString()
    }));
  }

  /**
   * Ap dung de xuat CHUYEN_VAI DA_DUYET (quan-tri goi sau khi duyet, nen trong cung tx):
   * ket thuc THUC_TAP, cap vai moi (vai phai hoc -> DANG_HOC). Idempotent: da ap dung thi bo qua.
   */
  async apDungDeXuatChuyenVai(deXuatId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const chay = async (t: Prisma.TransactionClient) => {
      const dx = await this.repo.layDeXuat(deXuatId, t);
      if (!dx || dx.loai !== "CHUYEN_VAI") throw new NotFoundException("Không tìm thấy đề xuất chuyển vai");
      if (dx.trang_thai !== "DA_DUYET") throw new ForbiddenException("Đề xuất chưa được duyệt");
      const d = dx.du_lieu as unknown as DuLieuDeXuatChuyenVai;
      const daApDung = await this.repo.timLichSuTheoDeXuat(dx.id, t);
      if (daApDung) return;
      const hienCo = await this.repo.dsVaiTheoDs(d.ho_so_id, ["THUC_TAP", d.vai_moi], t);
      const thucTap = hienCo.find(v => v.vai === "THUC_TAP");
      const vaiMoi = hienCo.find(v => v.vai === d.vai_moi);
      const lyDo = `Chuyển vai theo đề xuất đã duyệt${dx.ly_do ? `: ${dx.ly_do}` : ""}`;
      const nguoiDoiId = dx.nguoi_duyet_id ?? null;
      if (thucTap && thucTap.trang_thai !== "KET_THUC") {
        await this.repo.ghiDoiVai({ hoSoId: d.ho_so_id, vai: "THUC_TAP", cu: thucTap.trang_thai, moi: "KET_THUC", nguoiDoiId, lyDo, deXuatId: dx.id }, t);
      }
      if (!vaiMoi || vaiMoi.trang_thai === "KET_THUC") {
        await this.repo.ghiDoiVai(
          {
            hoSoId: d.ho_so_id,
            vai: d.vai_moi,
            cu: vaiMoi?.trang_thai ?? null,
            moi: trangThaiKhoiTao(d.vai_moi),
            nguoiDoiId,
            lyDo,
            deXuatId: dx.id,
            nguon: "QUAN_TRI"
          },
          t
        );
      }
      await this.nhatKy.ghi(
        { hoSoId: nguoiDoiId, hanhDong: "AP_DUNG_CHUYEN_VAI", doiTuong: "ho_so", doiTuongId: d.ho_so_id, duLieu: { de_xuat_id: dx.id, vai_moi: d.vai_moi } },
        t
      );
      await this.thongBao.gui(
        {
          hoSoId: d.ho_so_id,
          loai: "PHE_DUYET",
          tieuDe: `Bạn đã được chuyển sang vai trò ${NHAN_VAI_VN[d.vai_moi]}`,
          noiDung: laVaiPhaiHoc(d.vai_moi) ? "Hoàn thành khoá học của vai trò mới để kích hoạt." : undefined,
          lienKet: laVaiPhaiHoc(d.vai_moi) ? "/hoc-vien" : "/tai-khoan"
        },
        t
      );
    };
    if (tx) return chay(tx);
    await this.repo.chayTrongGiaoDich(chay);
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
