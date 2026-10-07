// Dao tao (LMS) phia hoc vien: xet dat, hoc, kiem tra, thuc hanh, tien do doi. Lop: XetDatService, HocVienService, KiemTraService, ThucHanhService, TienDoDoiService.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { type LoaiKhoaHoc, Prisma, type TrangThaiThucHanh, type Vai } from "@prisma/client";
import type {
  BaiHocChiTiet, BaiKiemTraTomTat, BaiThucHanh, BaiThucHanhChoCham, BangChungQuyenSku, CauHoiDeThi, ChamThucHanhBody, ChungChi, ChuongKhoaHoc, DeThi,
  GiaiThichCauHoi, HangTienDoDoi, KetQuaChamThucHanh, KetQuaHoanThanhBai, KetQuaNopBai, KhoaHocChiTiet, KhoaHocTomTat, LoTrinhCuaToi, LuotLamTomTat,
  NhomLoTrinh, NopThucHanhBody, ThayDoiSauDanhGia, TongHopTienDoDoi, TrangThaiHocVien
} from "@thien-khue/contracts";
import { randomUUID } from "node:crypto";
import {
  anhXaChungChi, anhXaQuyenSku, anhXaThucHanh, chamDe, chonCauHoi, chuanHoaCauHoi, type ClientDb, datNguong, type DuLieuHocVien, khoaBatBuocCuaVai,
  type KhoaDaNap, laUuid, luotDuocTinh, sapXepKhoa, type TienDoChiTiet, tienDoChoClient, timCauThieu, tinhTienDo, VAI_PHAI_HOC, VAI_XEM_MOI_KHOA,
  xetDieuKienVai
} from "../common/utils/dao-tao";
import {
  type DeDaNap, DuLieuHocRepository, HocVienRepository, KiemTraRepository, ThucHanhRepository, TienDoDoiRepository, XetDatRepository
} from "../repositories/dao-tao.repository";
import { NhatKyService, ThongBaoService } from "./core.service";
import { coVaiLuyenAi, docYeuCauLuyenAi } from "../common/utils/dao-tao-luyen-ai";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { coMeta, type KetQuaCoMeta } from "../common/interceptors/bao-response.interceptor";
import { phanTrang, type PhanTrangMeta, taoMetaPhanTrang } from "../common/utils/phan-trang";

export const KHONG_THAY_DOI: ThayDoiSauDanhGia = { chung_chi_moi: null, quyen_sku_moi: null, vai_kich_hoat: [] };
/**
 * Xet dat sau moi hanh dong hoc (hoc xong bai / thi dat / thuc hanh duoc duyet) — chay TRONG transaction nghiep vu:
 *  1) khoa hoan thanh -> cap / cap lai chung chi;
 *  2) khoa SAN_PHAM hoan thanh -> cap quyen SKU (hoac hoat dong lai neu CAN_HOC_LAI) kem bang chung;
 *  3) vai DANG_HOC du dieu kien (moi khoa NEN_TANG + NGHIEP_VU bat buoc cua vai deu hoan thanh) -> HOAT_DONG.
 * Cap quyen tu dong vi bang chung da tach nguoi: diem do server cham, thuc hanh do nguoi khac (mentor / quan ly) duyet.
 */
@Injectable()
export class XetDatService {
  constructor(
    private readonly repo: XetDatRepository,
    private readonly duLieuHoc: DuLieuHocRepository,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  async xetSauThayDoi(tx: ClientDb, hoSoId: string, khoaHocId: string): Promise<ThayDoiSauDanhGia> {
    const kq: ThayDoiSauDanhGia = { chung_chi_moi: null, quyen_sku_moi: null, vai_kich_hoat: [] };
    const khoa = await this.repo.layKhoa(khoaHocId, tx);
    if (khoa?.bat) {
      const dl = await this.duLieuHoc.napDuLieuHocVien(hoSoId, [khoa.id], tx);
      const td = tinhTienDo(khoa, dl);
      if (td.hoan_thanh) {
        kq.chung_chi_moi = await this.capChungChi(tx, hoSoId, khoa, td);
        if (khoa.loai === "SAN_PHAM" && khoa.mau_id && khoa.ma_mau) {
          kq.quyen_sku_moi = await this.capQuyenSku(tx, hoSoId, khoa, td);
        }
      }
    }
    kq.vai_kich_hoat = await this.xetKichHoatVai(tx, hoSoId);
    return kq;
  }

  /** Cap chung chi khi hoan thanh — da co o phien ban hien hanh thi thoi */
  async capChungChi(tx: ClientDb, hoSoId: string, khoa: KhoaDaNap, td: TienDoChiTiet): Promise<ChungChi | null> {
    const cu = await this.repo.layChungChi(hoSoId, khoa.id, tx);
    if (cu && !cu.thu_hoi_luc && cu.phien_ban_tai_lieu >= khoa.phien_ban_tai_lieu) return null;
    const bayGio = new Date();
    const bangChung = {
      diem: td.luotDat?.diem ?? null,
      luot_lam_id: td.luotDat?.id ?? null,
      bai_thuc_hanh_id: td.thucHanhDat?.id ?? null,
      nguoi_cham_id: td.thucHanhDat?.nguoi_cham_id ?? null,
      duyet_luc: td.thucHanhDat?.cham_luc?.toISOString() ?? null
    };
    const du = {
      phien_ban_tai_lieu: khoa.phien_ban_tai_lieu,
      diem: td.luotDat?.diem ?? null,
      cap_luc: bayGio,
      thu_hoi_luc: null,
      bang_chung: bangChung
    };
    const cc = await this.repo.luuChungChi(hoSoId, khoa.id, taoMaChungChi(khoa.ma, bayGio), du, tx);
    await this.thongBao.gui(
      {
        hoSoId,
        loai: "DAO_TAO",
        tieuDe: `Chúc mừng! Bạn đã hoàn thành khoá “${khoa.ten}”`,
        noiDung: `Chứng chỉ ${cc.ma_chung_chi} đã được cấp.`,
        lienKet: `/hoc-vien/chung-chi`,
        duLieu: { khoa_hoc_id: khoa.id, chung_chi_id: cc.id }
      },
      tx
    );
    await this.nhatKy.ghi(
      { hoSoId: null, hanhDong: "CAP_CHUNG_CHI", doiTuong: "chung_chi", doiTuongId: cc.id, duLieu: { ho_so_id: hoSoId, khoa_hoc_id: khoa.id, ...bangChung } },
      tx
    );
    return anhXaChungChi(cc);
  }

  /** Cap quyen SKU (hoac hoat dong lai sau CAN_HOC_LAI). THU_HOI khong tu mo lai. */
  async capQuyenSku(tx: ClientDb, hoSoId: string, khoa: KhoaDaNap, td: TienDoChiTiet): Promise<{ mau_id: string; ma_mau: string } | null> {
    const mauId = khoa.mau_id!;
    const maMau = khoa.ma_mau!;
    const cu = await this.repo.layQuyenSku(hoSoId, mauId, tx);
    if (cu?.trang_thai === "THU_HOI") return null;
    if (cu?.trang_thai === "HOAT_DONG" && cu.phien_ban_tai_lieu >= khoa.phien_ban_tai_lieu) return null;

    const bayGio = new Date();
    const bangChung: BangChungQuyenSku = {
      khoa_hoc_id: khoa.id,
      khoa_hoc_ma: khoa.ma,
      phien_ban_tai_lieu: khoa.phien_ban_tai_lieu,
      diem: td.luotDat?.diem ?? null,
      luot_lam_id: td.luotDat?.id ?? null,
      thi_luc: td.luotDat?.nop_luc?.toISOString() ?? null,
      bai_thuc_hanh_id: td.thucHanhDat?.id ?? null,
      nguoi_cham_id: td.thucHanhDat?.nguoi_cham_id ?? null,
      nhan_xet: td.thucHanhDat?.nhan_xet ?? null,
      duyet_luc: td.thucHanhDat?.cham_luc?.toISOString() ?? null,
      cap_luc: bayGio.toISOString(),
      xac_nhan_luc: null,
      can_hoc_lai: null
    };
    const du = {
      ma_mau: maMau,
      trang_thai: "HOAT_DONG" as const,
      phien_ban_tai_lieu: khoa.phien_ban_tai_lieu,
      khoa_hoc_id: khoa.id,
      cap_luc: bayGio,
      nguoi_cap_id: null,
      thu_hoi_luc: null,
      ly_do: null,
      bang_chung: bangChung as unknown as Prisma.InputJsonValue
    };
    const q = await this.repo.luuQuyenSku(hoSoId, mauId, du, tx);
    const hocLai = cu?.trang_thai === "CAN_HOC_LAI";
    await this.thongBao.gui(
      {
        hoSoId,
        loai: "QUYEN_SKU",
        tieuDe: hocLai ? `Mã ${maMau} đã hoạt động lại` : `Bạn được cấp quyền bán mã ${maMau}`,
        noiDung: hocLai
          ? `Bạn đã học lại tài liệu phiên bản ${khoa.phien_ban_tai_lieu} — có thể tiếp tục tư vấn / bán mã ${maMau}.`
          : `Bạn có thể tư vấn, lấy mã giới thiệu và nhận chiến dịch cho mã ${maMau}.`,
        lienKet: `/hoc-vien/khoa-hoc/${khoa.id}`,
        duLieu: { mau_id: mauId, ma_mau: maMau, quyen_sku_id: q.id }
      },
      tx
    );
    await this.nhatKy.ghi(
      {
        hoSoId: null,
        hanhDong: hocLai ? "KICH_HOAT_LAI_QUYEN_SKU" : "CAP_QUYEN_SKU",
        doiTuong: "quyen_sku",
        doiTuongId: q.id,
        duLieu: { ho_so_id: hoSoId, mau_id: mauId, ma_mau: maMau, bang_chung: bangChung as unknown as Prisma.InputJsonValue }
      },
      tx
    );
    return { mau_id: mauId, ma_mau: maMau };
  }

  /** Vai DANG_HOC du dieu kien -> HOAT_DONG (ghi lich_su_vai_tro, bat kich_hoat_lam_viec) */
  async xetKichHoatVai(tx: ClientDb, hoSoId: string): Promise<Vai[]> {
    const dangHoc = await this.repo.dsVaiDangHoc(hoSoId, VAI_PHAI_HOC, tx);
    if (!dangHoc.length) return [];
    const dsKhoa = await this.duLieuHoc.dsKhoaBatBuocCuaVai(dangHoc.map(v => v.vai), tx);
    if (!dsKhoa.length) return [];
    const dl = await this.duLieuHoc.napDuLieuHocVien(hoSoId, dsKhoa.map(k => k.id), tx);
    const xong = new Set(dsKhoa.filter(k => tinhTienDo(k, dl).hoan_thanh).map(k => k.id));

    const kichHoat: Vai[] = [];
    for (const v of dangHoc) {
      const req = khoaBatBuocCuaVai(dsKhoa, v.vai);
      if (!req.length || !req.every(k => xong.has(k.id))) continue;
      // Doi co dieu kien DANG_HOC: hai request song song khong kich hoat hai lan
      if (!(await this.repo.kichHoatVaiDangHoc(v.id, tx))) continue;
      await this.repo.ghiLichSuVai(
        {
          ho_so_id: hoSoId,
          vai: v.vai,
          trang_thai_cu: "DANG_HOC",
          trang_thai_moi: "HOAT_DONG",
          nguoi_doi_id: null,
          ly_do: `Hoàn thành đào tạo bắt buộc: ${req.map(k => k.ten).join(", ")}`
        },
        tx
      );
      kichHoat.push(v.vai);
    }
    if (!kichHoat.length) return [];

    await this.repo.batKichHoatLamViec(hoSoId, new Date(), tx);
    await this.thongBao.gui(
      {
        hoSoId,
        loai: "DAO_TAO",
        tieuDe: "Vai trò của bạn đã được kích hoạt",
        noiDung: `Bạn đã hoàn thành đào tạo bắt buộc — vai ${kichHoat.join(", ")} chuyển sang hoạt động.`,
        lienKet: "/lam-viec",
        duLieu: { vai: kichHoat }
      },
      tx
    );
    await this.nhatKy.ghi({ hoSoId: null, hanhDong: "KICH_HOAT_VAI", doiTuong: "ho_so", doiTuongId: hoSoId, duLieu: { vai: kichHoat } }, tx);
    return kichHoat;
  }
}
/** TK-<MA>-<yyyymmdd>-<6 ky tu> — duy nhat nho phan ngau nhien + unique constraint */
export function taoMaChungChi(maKhoa: string, luc: Date): string {
  const ngay = luc.toISOString().slice(0, 10).replace(/-/g, "");
  const ngauNhien = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
  return `TK-${maKhoa.toUpperCase().replace(/[^A-Z0-9]+/g, "")}-${ngay}-${ngauNhien}`;
}

const TIEU_DE_NHOM: Record<LoaiKhoaHoc, string> = {
  NEN_TANG: "Kiến thức chung",
  NGHIEP_VU: "Nghiệp vụ theo vai",
  SAN_PHAM: "Khoá sản phẩm"
};
/** Phan nguoi hoc: lo trinh, khoa, bai, danh dau hoc xong, chung chi */
@Injectable()
export class HocVienService {
  constructor(
    private readonly repo: HocVienRepository,
    private readonly duLieuHoc: DuLieuHocRepository,
    private readonly xetDat: XetDatService
  ) {}

  /** Vai dung de chon khoa: moi vai tru KET_THUC (DANG_HOC van phai thay khoa de hoc) */
  private vaiHoc(nd: ThongTinNguoiDung): Vai[] {
    return [...new Set(nd.vaiChiTiet.filter(v => v.trang_thai !== "KET_THUC").map(v => v.vai))];
  }

  private xemMoiKhoa(nd: ThongTinNguoiDung): boolean {
    return nd.vai.some(v => VAI_XEM_MOI_KHOA.includes(v));
  }

  /** Khoa thuoc lo trinh cua nguoi dung */
  private async khoaCuaLoTrinh(nd: ThongTinNguoiDung): Promise<KhoaDaNap[]> {
    return sapXepKhoa(await this.repo.dsKhoaDangBat(this.xemMoiKhoa(nd) ? null : this.vaiHoc(nd)));
  }

  private tomTat(k: KhoaDaNap, td: TienDoChiTiet): KhoaHocTomTat {
    return {
      id: k.id,
      ma: k.ma,
      ten: k.ten,
      mo_ta: k.mo_ta,
      loai: k.loai,
      vai_ap_dung: k.vai_ap_dung,
      mau_id: k.mau_id,
      ma_mau: k.ma_mau,
      phien_ban_tai_lieu: k.phien_ban_tai_lieu,
      bat_buoc: k.bat_buoc,
      can_thuc_hanh: k.can_thuc_hanh,
      mau_sac: k.mau_sac,
      thu_tu: k.thu_tu,
      so_bai: k.bai_hoc.length,
      tong_phut: k.bai_hoc.reduce((a, b) => a + (b.thoi_luong_phut ?? 0), 0),
      co_bai_kiem_tra: k.bai_kiem_tra.length > 0,
      tien_do: tienDoChoClient(td)
    };
  }

  async loTrinh(nd: ThongTinNguoiDung): Promise<LoTrinhCuaToi> {
    const dsKhoa = await this.khoaCuaLoTrinh(nd);
    const dl = await this.duLieuHoc.napDuLieuHocVien(nd.id, dsKhoa.map(k => k.id));
    const tienDo = new Map(dsKhoa.map(k => [k.id, tinhTienDo(k, dl)]));
    const nhom: NhomLoTrinh[] = (["NEN_TANG", "NGHIEP_VU", "SAN_PHAM"] as LoaiKhoaHoc[]).map(loai => ({
      loai,
      tieu_de: TIEU_DE_NHOM[loai],
      khoa_hoc: dsKhoa.filter(k => k.loai === loai).map(k => this.tomTat(k, tienDo.get(k.id)!))
    }));
    const [soChungChi, soQuyen] = await Promise.all([
      this.repo.demChungChiConHieuLuc(nd.id),
      this.repo.demQuyenSkuHoatDong(nd.id)
    ]);
    const soBai = dsKhoa.reduce((a, k) => a + k.bai_hoc.length, 0);
    const soBaiXong = dsKhoa.reduce((a, k) => a + tienDo.get(k.id)!.so_bai_xong, 0);

    // Khoa bat buoc (vai) truoc, roi den khoa san pham — lay bai chua hoc dau tien
    let baiTiep: LoTrinhCuaToi["bai_tiep_theo"] = null;
    const uuTien = [...dsKhoa.filter(k => k.bat_buoc), ...dsKhoa.filter(k => !k.bat_buoc)];
    for (const k of uuTien) {
      const chuaHoc = k.bai_hoc.find(b => !dl.baiXong.has(b.id));
      if (!chuaHoc) continue;
      const bai = await this.repo.layTieuDeBai(chuaHoc.id);
      baiTiep = { khoa_hoc_id: k.id, khoa_hoc_ten: k.ten, bai_hoc_id: chuaHoc.id, tieu_de: bai?.tieu_de ?? "" };
      break;
    }

    // Dieu kien vai can xet tren MOI khoa bat buoc cua vai (khong phu thuoc bo loc lo trinh)
    const vaiPhaiHoc = nd.vaiChiTiet.map(v => ({ vai: v.vai, trang_thai: v.trang_thai }));
    const vaiCanXet = vaiPhaiHoc.map(v => v.vai);
    const khoaVai = sapXepKhoa(await this.duLieuHoc.dsKhoaBatBuocCuaVai(vaiCanXet));
    const thieu = khoaVai.filter(k => !tienDo.has(k.id));
    const dlThem = thieu.length ? await this.duLieuHoc.napDuLieuHocVien(nd.id, thieu.map(k => k.id)) : null;
    for (const k of thieu) tienDo.set(k.id, tinhTienDo(k, dlThem!));

    return {
      nhom,
      tong: {
        so_khoa: dsKhoa.length,
        so_bai: soBai,
        so_bai_xong: soBaiXong,
        phan_tram: soBai ? Math.round((soBaiXong * 100) / soBai) : 0,
        so_khoa_da_bat_dau: dsKhoa.filter(k => tienDo.get(k.id)!.trang_thai !== "CHUA_BAT_DAU").length,
        so_chung_chi: soChungChi,
        so_quyen_sku: soQuyen
      },
      vai: xetDieuKienVai(vaiPhaiHoc, khoaVai, tienDo),
      bai_tiep_theo: baiTiep
    };
  }

  /** Danh muc moi khoa dang bat (kem tien do cua toi) */
  async danhSachKhoa(nd: ThongTinNguoiDung, loai?: LoaiKhoaHoc): Promise<KhoaHocTomTat[]> {
    const ds = sapXepKhoa(await this.repo.dsKhoaDangBatTheoLoai(loai));
    const dl = await this.duLieuHoc.napDuLieuHocVien(nd.id, ds.map(k => k.id));
    return ds.map(k => this.tomTat(k, tinhTienDo(k, dl)));
  }

  private async timKhoa(idHoacMa: string): Promise<KhoaDaNap> {
    const k = await this.repo.timKhoaTheoIdHoacMa(idHoacMa);
    if (!k || !k.bat) throw new NotFoundException("Không tìm thấy khoá học");
    return k;
  }

  async chiTietKhoa(nd: ThongTinNguoiDung, idHoacMa: string): Promise<KhoaHocChiTiet> {
    const k = await this.timKhoa(idHoacMa);
    const dl = await this.duLieuHoc.napDuLieuHocVien(nd.id, [k.id]);
    const td = tinhTienDo(k, dl);
    const [baiHoc, deThi, thucHanh, chungChi, quyen, tienDoBai] = await Promise.all([
      this.repo.dsBaiDangBatCuaKhoa(k.id),
      this.repo.dsDeDangBatCuaKhoa(k.id),
      this.repo.dsThucHanhCuaKhoa(nd.id, k.id),
      this.repo.layChungChi(nd.id, k.id),
      k.mau_id ? this.repo.layQuyenSku(nd.id, k.mau_id) : null,
      this.repo.dsTienDoBaiCuaKhoa(nd.id, k.id)
    ]);
    const xongLuc = new Map(tienDoBai.filter(t => t.hoan_thanh_luc).map(t => [t.bai_hoc_id, t.hoan_thanh_luc!]));

    const chuong: ChuongKhoaHoc[] = [];
    for (const b of baiHoc) {
      const ten = b.chuong ?? null;
      let c = chuong.find(x => x.ten === ten);
      if (!c) chuong.push((c = { ten, bai_hoc: [] }));
      c.bai_hoc.push({ ...b, da_xong: xongLuc.has(b.id), hoan_thanh_luc: xongLuc.get(b.id)?.toISOString() ?? null });
    }

    const tenNguoiCham = await this.duLieuHoc.tenHoSo(thucHanh.map(t => t.nguoi_cham_id));
    return {
      ...this.tomTat(k, td),
      yeu_cau_thuc_hanh: k.yeu_cau_thuc_hanh,
      yeu_cau_luyen_ai: docYeuCauLuyenAi(k.yeu_cau_luyen_ai),
      chuong,
      bai_kiem_tra: deThi.map(d => this.tomTatDe(k, d, dl)),
      thuc_hanh: thucHanh.map(t => anhXaThucHanh(t, tenNguoiCham)),
      chung_chi: chungChi ? anhXaChungChi(chungChi) : null,
      quyen_sku: quyen ? anhXaQuyenSku(quyen) : null
    };
  }

  private tomTatDe(
    k: KhoaDaNap,
    d: { id: string; ma: string; tieu_de: string; nguong_dat: number; bat_buoc: boolean; so_cau_hien: number | null; thoi_gian_phut: number | null; so_lan_toi_da: number | null; _count: { cau_hoi: number } },
    dl: DuLieuHocVien
  ): BaiKiemTraTomTat {
    const luot = dl.luotLam.filter(l => l.bai_kiem_tra_id === d.id && l.nop_luc).sort((a, b) => b.nop_luc!.getTime() - a.nop_luc!.getTime());
    const quyen = k.mau_id ? dl.quyenSku.find(q => q.mau_id === k.mau_id) : undefined;
    // Khoa SAN_PHAM: so lan lam tinh theo phien ban hien hanh (tang phien ban = duoc lam lai)
    const luotTinhLan = k.loai === "SAN_PHAM" ? luot.filter(l => l.phien_ban_tai_lieu >= k.phien_ban_tai_lieu) : luot;
    return {
      id: d.id,
      ma: d.ma,
      tieu_de: d.tieu_de,
      nguong_dat: d.nguong_dat,
      bat_buoc: d.bat_buoc,
      so_cau: d.so_cau_hien && d.so_cau_hien < d._count.cau_hoi ? d.so_cau_hien : d._count.cau_hoi,
      thoi_gian_phut: d.thoi_gian_phut,
      so_lan_toi_da: d.so_lan_toi_da,
      so_lan_da_lam: luotTinhLan.length,
      diem_cao_nhat: luot.length ? Math.max(...luot.map(l => l.diem)) : null,
      da_dat: luot.some(l => luotDuocTinh(k, l, quyen)),
      lan_cuoi: luot[0] ? { diem: luot[0].diem, dat: luot[0].dat, nop_luc: luot[0].nop_luc!.toISOString() } : null
    };
  }

  async chiTietBai(nd: ThongTinNguoiDung, baiHocId: string): Promise<BaiHocChiTiet> {
    if (!laUuid(baiHocId)) throw new NotFoundException("Không tìm thấy bài học");
    const b = await this.repo.layBaiKemKhoa(baiHocId);
    if (!b || !b.bat || !b.khoa_hoc.bat) throw new NotFoundException("Không tìm thấy bài học");
    const [anhEm, td] = await Promise.all([
      this.repo.dsIdBaiDangBatCuaKhoa(b.khoa_hoc_id),
      this.repo.layTienDoBai(nd.id, b.id)
    ]);
    const vt = anhEm.findIndex(x => x.id === b.id);
    return {
      id: b.id,
      ma: b.ma,
      tieu_de: b.tieu_de,
      chuong: b.chuong,
      loai_noi_dung: b.loai_noi_dung,
      tom_tat: b.tom_tat,
      thoi_luong_phut: b.thoi_luong_phut,
      thu_tu: b.thu_tu,
      da_xong: !!td?.hoan_thanh_luc,
      hoan_thanh_luc: td?.hoan_thanh_luc?.toISOString() ?? null,
      khoa_hoc_id: b.khoa_hoc_id,
      khoa_hoc_ten: b.khoa_hoc.ten,
      noi_dung: b.noi_dung,
      video_url: b.video_url,
      bai_truoc_id: vt > 0 ? anhEm[vt - 1].id : null,
      bai_sau_id: vt >= 0 && vt < anhEm.length - 1 ? anhEm[vt + 1].id : null
    };
  }

  /** Danh dau hoc xong (daXong=true) / bo danh dau. Hoc xong -> xet chung chi / quyen SKU / kich hoat vai. */
  async danhDauBai(nd: ThongTinNguoiDung, baiHocId: string, daXong: boolean): Promise<KetQuaHoanThanhBai> {
    if (!laUuid(baiHocId)) throw new NotFoundException("Không tìm thấy bài học");
    const b = await this.repo.layBaiDeDanhDau(baiHocId);
    if (!b || !b.bat || !b.khoa_hoc.bat) throw new NotFoundException("Không tìm thấy bài học");

    const thayDoi = await this.repo.chayTrongGiaoDich(async tx => {
      if (daXong) {
        const cu = await this.repo.layTienDoBai(nd.id, b.id, tx);
        if (cu?.hoan_thanh_luc) return KHONG_THAY_DOI;
        await this.repo.danhDauXong(nd.id, b.id, tx);
        return this.xetDat.xetSauThayDoi(tx, nd.id, b.khoa_hoc_id);
      }
      // Bo danh dau chi doi tien do hien thi — khong thu hoi chung chi / quyen da cap (bang chung giu nguyen)
      await this.repo.boDanhDau(nd.id, b.id, tx);
      return KHONG_THAY_DOI;
    });

    const k = await this.repo.layKhoa(b.khoa_hoc_id);
    const dl = await this.duLieuHoc.napDuLieuHocVien(nd.id, [k.id]);
    return { bai_hoc_id: b.id, da_xong: daXong, tien_do: tienDoChoClient(tinhTienDo(k, dl)), thay_doi: thayDoi };
  }

  async chungChiCuaToi(hoSoId: string): Promise<ChungChi[]> {
    const ds = await this.repo.dsChungChi(hoSoId);
    return ds.map(anhXaChungChi);
  }

  async thucHanhCuaToi(hoSoId: string): Promise<BaiThucHanh[]> {
    const ds = await this.repo.dsThucHanh(hoSoId);
    const ten = await this.duLieuHoc.tenHoSo(ds.map(t => t.nguoi_cham_id));
    return ds.map(t => anhXaThucHanh(t, ten));
  }
}

/** Cho them sau han nop (do tre mang) truoc khi coi la qua gio */
const AN_HAN_MS = 60_000;
/**
 * Bai kiem tra: cham o SERVER. De tra cho client KHONG co dap_an / giai_thich.
 * Bat buoc tra loi het; diem = % lam tron xuong; dat khi >= nguong (mac dinh 90).
 * Truot: chi tra diem / so cau dung — KHONG lo cau nao dung / sai. Dat: tra giai thich tung cau.
 */
/** De da phat cho luot: theo cau_hoi_ids da chot; luot cu (truoc khi co cot) thi chon lai theo hat = luot.id */
function deCuaLuot(de: DeDaNap, luot: { id: string; cau_hoi_ids?: string[] | null }) {
  const tatCa = de.cau_hoi.map(chuanHoaCauHoi);
  if (!luot.cau_hoi_ids?.length) return chonCauHoi(tatCa, de.so_cau_hien, luot.id);
  const theoId = new Map(tatCa.map(c => [c.id, c]));
  return luot.cau_hoi_ids.map(id => theoId.get(id)).filter((c): c is (typeof tatCa)[number] => !!c);
}
@Injectable()
export class KiemTraService {
  constructor(
    private readonly repo: KiemTraRepository,
    private readonly xetDat: XetDatService,
    private readonly nhatKy: NhatKyService
  ) {}

  private async napDe(baiKiemTraId: string): Promise<DeDaNap> {
    if (!laUuid(baiKiemTraId)) throw new NotFoundException("Không tìm thấy bài kiểm tra");
    const de = await this.repo.layDe(baiKiemTraId);
    if (!de || !de.bat || !de.khoa_hoc.bat) throw new NotFoundException("Không tìm thấy bài kiểm tra");
    return de;
  }

  /** So lan da nop (khoa SAN_PHAM: tinh trong phien ban tai lieu hien hanh) */
  private demLanDaLam(hoSoId: string, de: DeDaNap): Promise<number> {
    return this.repo.demLuotDaNop(hoSoId, de.id, de.khoa_hoc.loai === "SAN_PHAM" ? de.khoa_hoc.phien_ban_tai_lieu : null);
  }

  private hetHan(de: Pick<DeDaNap, "thoi_gian_phut">, batDau: Date): Date | null {
    return de.thoi_gian_phut ? new Date(batDau.getTime() + de.thoi_gian_phut * 60_000) : null;
  }

  /** Mo luot lam moi (hoac tra lai luot dang do con han) — de khong kem dap an */
  async batDau(hoSoId: string, baiKiemTraId: string): Promise<DeThi> {
    const de = await this.napDe(baiKiemTraId);
    if (!de.cau_hoi.length) throw new BadRequestException("Bài kiểm tra chưa có câu hỏi");
    const soLan = await this.demLanDaLam(hoSoId, de);
    if (de.so_lan_toi_da != null && soLan >= de.so_lan_toi_da) {
      throw new ForbiddenException(`Bạn đã dùng hết ${de.so_lan_toi_da} lượt làm bài này — liên hệ mentor để được hỗ trợ`);
    }

    const bayGio = Date.now();
    const dangDo = await this.repo.timLuotDangDo(hoSoId, de.id, de.khoa_hoc.phien_ban_tai_lieu);
    const conHan = dangDo && (!de.thoi_gian_phut || this.hetHan(de, dangDo.bat_dau_luc)!.getTime() > bayGio);
    let luot: { id: string; bat_dau_luc: Date; cau_hoi_ids: string[] };
    if (conHan) luot = dangDo;
    else {
      // Chot de ngay khi phat: luu cau_hoi_ids de quan tri sua cau hoi giua chung khong lam lech de
      const id = randomUUID();
      const ids = chonCauHoi(de.cau_hoi.map(chuanHoaCauHoi), de.so_cau_hien, id).map(c => c.id);
      luot = await this.repo.taoLuot({ id, bai_kiem_tra_id: de.id, ho_so_id: hoSoId, phien_ban_tai_lieu: de.khoa_hoc.phien_ban_tai_lieu, cau_hoi_ids: ids });
    }

    const cauHoi: CauHoiDeThi[] = deCuaLuot(de, luot).map(c => ({
      id: c.id,
      ma: c.ma,
      noi_dung: c.noi_dung,
      lua_chon: c.lua_chon,
      nhieu_dap_an: c.dap_an.length > 1,
      thu_tu: c.thu_tu
    }));
    const hetHan = this.hetHan(de, luot.bat_dau_luc);
    return {
      luot_lam_id: luot.id,
      bai_kiem_tra_id: de.id,
      khoa_hoc_id: de.khoa_hoc_id,
      ma: de.ma,
      tieu_de: de.tieu_de,
      nguong_dat: de.nguong_dat,
      thoi_gian_phut: de.thoi_gian_phut,
      het_han_luc: hetHan?.toISOString() ?? null,
      bat_dau_luc: luot.bat_dau_luc.toISOString(),
      so_lan_toi_da: de.so_lan_toi_da,
      so_lan_da_lam: soLan,
      cau_hoi: cauHoi
    };
  }

  async nop(hoSoId: string, baiKiemTraId: string, luotLamId: string, traLoiTho: unknown): Promise<KetQuaNopBai> {
    const de = await this.napDe(baiKiemTraId);
    if (!laUuid(luotLamId)) throw new NotFoundException("Không tìm thấy lượt làm bài");
    // Danh tinh tu token: luot phai cua chinh nguoi nop
    const luot = await this.repo.timLuotCuaHoSo(luotLamId, hoSoId, de.id);
    if (!luot) throw new NotFoundException("Không tìm thấy lượt làm bài");
    if (luot.nop_luc) throw new ConflictException("Lượt làm bài này đã nộp — hãy bắt đầu lượt mới");

    if (!traLoiTho || typeof traLoiTho !== "object" || Array.isArray(traLoiTho)) throw new BadRequestException("Câu trả lời không hợp lệ");
    const traLoi = traLoiTho as Record<string, unknown>;
    const deThi = deCuaLuot(de, luot);
    if (!deThi.length) throw new BadRequestException("Bài kiểm tra chưa có câu hỏi");
    const thieu = timCauThieu(deThi, traLoi);
    if (thieu.length) {
      throw new BadRequestException({
        code: "CHUA_TRA_LOI_HET",
        message: `Bạn cần trả lời tất cả câu hỏi (còn ${thieu.length} câu chưa trả lời hợp lệ)`,
        details: { cau_hoi_ids: thieu }
      });
    }

    const kq = chamDe(deThi, traLoi as Record<string, number[]>);
    const bayGio = new Date();
    const hetHan = this.hetHan(de, luot.bat_dau_luc);
    const quaGio = !!hetHan && bayGio.getTime() > hetHan.getTime() + AN_HAN_MS;
    const dat = !quaGio && datNguong(kq.diem, de.nguong_dat);
    const luuTraLoi = Object.fromEntries(kq.chiTiet.map(c => [c.cau.id, c.ban_chon]));

    const thayDoi = await this.repo.chayTrongGiaoDich(async tx => {
      // Dieu kien nop_luc null: hai lan nop song song chi mot lan duoc ghi
      const soGhi = await this.repo.ghiKetQuaNeuChuaNop(
        luot.id,
        { diem: kq.diem, so_cau_dung: kq.so_cau_dung, tong_cau: kq.tong_cau, dat, tra_loi: luuTraLoi, nop_luc: bayGio },
        tx
      );
      if (!soGhi) throw new ConflictException("Lượt làm bài này đã nộp");
      await this.nhatKy.ghi(
        {
          hoSoId,
          hanhDong: dat ? "THI_DAT" : "THI_TRUOT",
          doiTuong: "luot_lam",
          doiTuongId: luot.id,
          duLieu: { bai_kiem_tra_id: de.id, diem: kq.diem, nguong_dat: de.nguong_dat, qua_gio: quaGio, phien_ban_tai_lieu: luot.phien_ban_tai_lieu }
        },
        tx
      );
      return dat ? this.xetDat.xetSauThayDoi(tx, hoSoId, de.khoa_hoc_id) : KHONG_THAY_DOI;
    });

    const soLan = await this.demLanDaLam(hoSoId, de);
    const giaiThich: GiaiThichCauHoi[] | null = dat
      ? kq.chiTiet.map(c => ({
          cau_hoi_id: c.cau.id,
          noi_dung: c.cau.noi_dung,
          lua_chon: c.cau.lua_chon,
          dap_an: c.cau.dap_an,
          ban_chon: c.ban_chon,
          dung: c.dung,
          giai_thich: c.cau.giai_thich
        }))
      : null;
    return {
      luot_lam_id: luot.id,
      bai_kiem_tra_id: de.id,
      diem: kq.diem,
      so_cau_dung: kq.so_cau_dung,
      tong_cau: kq.tong_cau,
      nguong_dat: de.nguong_dat,
      dat,
      nop_luc: bayGio.toISOString(),
      ghi_chu: quaGio ? "Nộp quá thời gian làm bài — lượt này không được tính đạt" : null,
      giai_thich: giaiThich,
      so_lan_con_lai: de.so_lan_toi_da != null ? Math.max(0, de.so_lan_toi_da - soLan) : null,
      thay_doi: thayDoi
    };
  }

  async lichSu(hoSoId: string, baiKiemTraId: string): Promise<LuotLamTomTat[]> {
    if (!laUuid(baiKiemTraId)) throw new NotFoundException("Không tìm thấy bài kiểm tra");
    const ds = await this.repo.lichSu(hoSoId, baiKiemTraId);
    return ds.map(l => ({ ...l, bat_dau_luc: l.bat_dau_luc.toISOString(), nop_luc: l.nop_luc?.toISOString() ?? null }));
  }
}

/**
 * Bai thuc hanh: hoc vien nop (link / tep), MENTOR / QUAN_LY / THIEN_KHUE cham.
 * KHONG tu cham bai cua minh (kiem nguoi cham != nguoi nop — danh tinh tu token).
 */
@Injectable()
export class ThucHanhService {
  constructor(
    private readonly repo: ThucHanhRepository,
    private readonly duLieuHoc: DuLieuHocRepository,
    private readonly xetDat: XetDatService,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  async nop(nd: ThongTinNguoiDung, khoaHocId: string, body: NopThucHanhBody): Promise<BaiThucHanh> {
    if (!laUuid(khoaHocId)) throw new NotFoundException("Không tìm thấy khoá học");
    const khoa = await this.repo.layKhoa(khoaHocId);
    if (!khoa || !khoa.bat) throw new NotFoundException("Không tìm thấy khoá học");
    if (!khoa.can_thuc_hanh) throw new BadRequestException("Khoá học này không yêu cầu bài thực hành");
    // SALE / CSKH: bai thuc hanh khoa co yeu cau luyen AI chi vao CHO_CHAM qua Sales Training (khong nop link tay)
    if (docYeuCauLuyenAi(khoa.yeu_cau_luyen_ai) && coVaiLuyenAi(nd.vaiChiTiet)) {
      throw new BadRequestException("Khoá này nộp bài thực hành qua mục “Luyện tư vấn với AI” — đạt đủ phiên luyện, bài sẽ tự chuyển cho mentor duyệt");
    }
    const link = body.link?.trim() || null;
    const tepUrl = body.tep_url?.trim() || null;
    if (!link && !tepUrl) throw new BadRequestException("Cần đường dẫn bài làm hoặc tệp đính kèm");

    const cu = await this.repo.timBaiChoChamHoacDat(nd.id, khoa.id);
    if (cu?.trang_thai === "DAT") throw new ConflictException("Bài thực hành của khoá này đã được duyệt đạt");
    if (cu?.trang_thai === "CHO_CHAM") throw new ConflictException("Bạn đã có bài đang chờ chấm — đợi kết quả trước khi nộp lại");

    const vaiCuaToi = nd.vaiChiTiet.map(v => v.vai);
    let vai: Vai | null = null;
    if (body.vai) {
      if (!vaiCuaToi.includes(body.vai)) throw new BadRequestException("Bạn không có vai này");
      vai = body.vai;
    } else {
      vai = vaiCuaToi.find(v => khoa.vai_ap_dung.includes(v)) ?? null;
    }

    const bai = await this.repo.tao({ khoa_hoc_id: khoa.id, ho_so_id: nd.id, vai, tieu_de: body.tieu_de?.trim() || null, mo_ta: body.mo_ta?.trim() || null, link, tep_url: tepUrl });
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "NOP_THUC_HANH", doiTuong: "bai_thuc_hanh", doiTuongId: bai.id, duLieu: { khoa_hoc_id: khoa.id } });
    return anhXaThucHanh(bai);
  }

  /** Hang doi cham (mac dinh CHO_CHAM, cu nhat truoc) */
  async danhSach(q: { trang?: number; so_dong?: number; trang_thai?: TrangThaiThucHanh; khoa_hoc_id?: string }): Promise<KetQuaCoMeta<BaiThucHanhChoCham[], PhanTrangMeta>> {
    const { skip, take, trang, so_dong } = phanTrang(q);
    const trangThai = q.trang_thai ?? "CHO_CHAM";
    const loc = { trangThai, khoaHocId: q.khoa_hoc_id };
    const [ds, tong] = await Promise.all([this.repo.danhSach(loc, skip, take), this.repo.dem(loc)]);
    const ten = await this.duLieuHoc.tenHoSo(ds.map(d => d.nguoi_cham_id));
    const data = ds.map(d => ({
      ...anhXaThucHanh(d, ten),
      hoc_vien_ten: d.ho_so.ho_ten,
      hoc_vien_email: d.ho_so.email,
      khoa_hoc_ten: d.khoa_hoc.ten,
      khoa_hoc_ma: d.khoa_hoc.ma,
      yeu_cau_thuc_hanh: d.khoa_hoc.yeu_cau_thuc_hanh
    }));
    return coMeta(data, taoMetaPhanTrang(trang, so_dong, tong));
  }

  async cham(nguoiChamId: string, baiId: string, body: ChamThucHanhBody): Promise<KetQuaChamThucHanh> {
    if (!laUuid(baiId)) throw new NotFoundException("Không tìm thấy bài thực hành");
    const bai = await this.repo.layKemTenKhoa(baiId);
    if (!bai) throw new NotFoundException("Không tìm thấy bài thực hành");
    if (bai.ho_so_id === nguoiChamId) throw new ForbiddenException("Bạn không được tự chấm bài thực hành của chính mình");
    if (bai.trang_thai !== "CHO_CHAM") throw new ConflictException("Bài thực hành này đã được chấm");
    const nhanXet = body.nhan_xet?.trim() || null;
    if (body.ket_qua === "CHUA_DAT" && !nhanXet) throw new BadRequestException("Cần nhận xét khi chấm chưa đạt để học viên biết cần sửa gì");

    const bayGio = new Date();
    const thayDoi = await this.repo.chayTrongGiaoDich(async tx => {
      // Dieu kien CHO_CHAM: hai nguoi cham cung luc chi mot nguoi duoc ghi
      const soGhi = await this.repo.ghiKetQuaCham(
        bai.id,
        nguoiChamId,
        { trang_thai: body.ket_qua, diem: body.diem ?? null, nhan_xet: nhanXet, nguoi_cham_id: nguoiChamId, cham_luc: bayGio },
        tx
      );
      if (!soGhi) throw new ConflictException("Bài thực hành này đã được chấm");
      await this.nhatKy.ghi(
        {
          hoSoId: nguoiChamId,
          hanhDong: "CHAM_THUC_HANH",
          doiTuong: "bai_thuc_hanh",
          doiTuongId: bai.id,
          duLieu: { hoc_vien_id: bai.ho_so_id, khoa_hoc_id: bai.khoa_hoc_id, ket_qua: body.ket_qua, diem: body.diem ?? null }
        },
        tx
      );
      await this.thongBao.gui(
        {
          hoSoId: bai.ho_so_id,
          loai: "DAO_TAO",
          tieuDe: body.ket_qua === "DAT" ? `Bài thực hành “${bai.khoa_hoc.ten}” đã đạt` : `Bài thực hành “${bai.khoa_hoc.ten}” chưa đạt`,
          noiDung: nhanXet ?? undefined,
          lienKet: `/hoc-vien/khoa-hoc/${bai.khoa_hoc_id}`,
          duLieu: { bai_thuc_hanh_id: bai.id, ket_qua: body.ket_qua }
        },
        tx
      );
      return body.ket_qua === "DAT" ? this.xetDat.xetSauThayDoi(tx, bai.ho_so_id, bai.khoa_hoc_id) : KHONG_THAY_DOI;
    });

    const moi = await this.repo.layTheoId(bai.id);
    return { bai_thuc_hanh: anhXaThucHanh(moi, await this.duLieuHoc.tenHoSo([nguoiChamId])), thay_doi: thayDoi };
  }
}

/** So lan truot (o bai chua dat) tu muc nay tro len -> "Cần hỗ trợ" */
export const NGUONG_TRUOT_CAN_HO_TRO = 2;
export interface LocTienDoDoi {
  trang?: number;
  so_dong?: number;
  vai?: Vai;
  trang_thai?: TrangThaiHocVien;
  tu_khoa?: string;
}
/**
 * Tien do doi (MENTOR / QUAN_LY): moi ho so co vai phai hoc. Tinh tren khoa bat buoc (NEN_TANG + NGHIEP_VU) cua vai.
 * Loc trang thai tinh trong bo nho (so hoc vien noi bo nho) roi moi phan trang.
 */
@Injectable()
export class TienDoDoiService {
  constructor(private readonly repo: TienDoDoiRepository) {}

  async danhSach(q: LocTienDoDoi): Promise<KetQuaCoMeta<HangTienDoDoi[], PhanTrangMeta & { tong_hop: TongHopTienDoDoi }>> {
    const vaiLoc: Vai[] = q.vai ? [q.vai] : [...VAI_PHAI_HOC];
    const tk = q.tu_khoa?.trim();
    const [dsHoSo, dsKhoa] = await Promise.all([this.repo.dsHoSoHocVien(vaiLoc, tk || undefined), this.repo.dsKhoaBatBuoc()]);
    const ids = dsHoSo.map(h => h.id);
    const khoaIds = dsKhoa.map(k => k.id);
    const [tienDo, luot, thucHanh, quyen] = ids.length ? await this.repo.napDuLieuNhieuHoSo(ids, khoaIds) : [[], [], [], []];

    const nhom = <T extends { ho_so_id: string }>(ds: T[]) => {
      const m = new Map<string, T[]>();
      for (const x of ds) m.set(x.ho_so_id, [...(m.get(x.ho_so_id) ?? []), x]);
      return m;
    };
    const [mTienDo, mLuot, mThucHanh, mQuyen] = [nhom(tienDo), nhom(luot), nhom(thucHanh), nhom(quyen)];

    const tatCa: HangTienDoDoi[] = dsHoSo.map(h => {
      const dl: DuLieuHocVien = {
        baiXong: new Set((mTienDo.get(h.id) ?? []).map(t => t.bai_hoc_id)),
        luotLam: mLuot.get(h.id) ?? [],
        thucHanh: mThucHanh.get(h.id) ?? [],
        quyenSku: mQuyen.get(h.id) ?? []
      };
      const vaiHoc = h.vai_tro.filter(v => VAI_PHAI_HOC.includes(v.vai));
      const khoa = sapXepKhoa([...new Map(vaiHoc.flatMap(v => khoaBatBuocCuaVai(dsKhoa, v.vai)).map(k => [k.id, k])).values()]);
      const td = khoa.map(k => ({ k, t: tinhTienDo(k, dl) }));
      const soBai = td.reduce((a, x) => a + x.t.so_bai, 0);
      const soBaiXong = td.reduce((a, x) => a + x.t.so_bai_xong, 0);
      const coDe = td.filter(x => x.k.bai_kiem_tra.some(b => b.bat_buoc));
      const deDat = coDe.filter(x => x.t.kiem_tra_dat).length;
      const idsDeChuaDat = new Set(coDe.filter(x => !x.t.kiem_tra_dat).flatMap(x => x.k.bai_kiem_tra.map(b => b.id)));
      const soLanTruot = dl.luotLam.filter(l => !l.dat && idsDeChuaDat.has(l.bai_kiem_tra_id)).length;
      const idsKhoa = new Set(khoa.map(k => k.id));
      const thCuaKhoa = dl.thucHanh.filter(t => idsKhoa.has(t.khoa_hoc_id));
      const choCham = thCuaKhoa.filter(t => t.trang_thai === "CHO_CHAM").length;
      const thTruot = khoa.some(k => {
        const moiNhat = thCuaKhoa.filter(t => t.khoa_hoc_id === k.id).sort((a, b) => b.nop_luc.getTime() - a.nop_luc.getTime())[0];
        return moiNhat?.trang_thai === "CHUA_DAT";
      });
      const daLam = dl.luotLam.some(l => coDe.some(x => x.k.bai_kiem_tra.some(b => b.id === l.bai_kiem_tra_id)));

      let trangThai: TrangThaiHocVien;
      if (khoa.length && td.every(x => x.t.hoan_thanh)) trangThai = "HOAN_THANH";
      else if (soLanTruot >= NGUONG_TRUOT_CAN_HO_TRO || thTruot) trangThai = "CAN_HO_TRO";
      else if (soBaiXong > 0 || daLam || thCuaKhoa.length > 0) trangThai = "DANG_HOC";
      else trangThai = "CHUA_BAT_DAU";

      const moc = [
        ...(mTienDo.get(h.id) ?? []).map(t => t.hoan_thanh_luc?.getTime() ?? 0),
        ...dl.luotLam.map(l => l.nop_luc?.getTime() ?? 0),
        ...dl.thucHanh.map(t => t.nop_luc.getTime())
      ];
      const cuoi = moc.length ? Math.max(...moc) : 0;
      return {
        ho_so_id: h.id,
        ho_ten: h.ho_ten,
        email: h.email,
        vai: h.vai_tro.map(v => ({ vai: v.vai, trang_thai: v.trang_thai })),
        lo_trinh: khoa.filter(k => k.loai === "NGHIEP_VU").map(k => k.ten),
        so_bai: soBai,
        so_bai_xong: soBaiXong,
        phan_tram: soBai ? Math.round((soBaiXong * 100) / soBai) : 0,
        kiem_tra: coDe.length ? (dl.luotLam.length || deDat ? `${deDat}/${coDe.length} bài đạt` : "Chưa làm") : "Không có bài kiểm tra",
        so_lan_truot: soLanTruot,
        thuc_hanh_cho_cham: choCham,
        so_quyen_sku: dl.quyenSku.filter(x => x.trang_thai === "HOAT_DONG").length,
        trang_thai: trangThai,
        hoat_dong_cuoi: cuoi ? new Date(cuoi).toISOString() : null
      };
    });

    const tong_hop: TongHopTienDoDoi = {
      hoc_vien: tatCa.length,
      tien_do_trung_binh: tatCa.length ? Math.round(tatCa.reduce((a, r) => a + r.phan_tram, 0) / tatCa.length) : 0,
      hoan_thanh: tatCa.filter(r => r.trang_thai === "HOAN_THANH").length,
      can_ho_tro: tatCa.filter(r => r.trang_thai === "CAN_HO_TRO").length
    };
    const loc = q.trang_thai ? tatCa.filter(r => r.trang_thai === q.trang_thai) : tatCa;
    const { skip, take, trang, so_dong } = phanTrang(q);
    return coMeta(loc.slice(skip, skip + take), { ...taoMetaPhanTrang(trang, so_dong, loc.length), tong_hop });
  }
}
