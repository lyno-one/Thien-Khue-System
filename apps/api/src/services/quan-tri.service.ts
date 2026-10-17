// Quan tri: ban phe duyet, 6 nhom ho so, bang dieu hanh. Lop: DeXuatService, HoSoQuanTriService, TongQuanService.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { type de_xuat_duyet, type HangThanhVien, LoaiDeXuat, Prisma, Vai } from "@prisma/client";
import type {
  BangTyLeHoaHong, ChinhSachHienHanh, DeXuatChiTiet, DeXuatDuyet, DoiTacChiTietQt, DoiTacDongQt, GiaoDichDongQt, HangChoPheDuyet, KhachHangChiTietQt, KhachHangDongQt,
  NguoiDungChiTietQt, NguoiDungDongQt, NguoiHocDongQt, NguoiTomTatQt, NhatKyQt, SanPhamChiTietQt, SanPhamDongQt, TongQuanQuanTri, TrangThaiNguoiHocQt
} from "@thien-khue/contracts";
import { NhatKyService, ThongBaoService } from "./core.service";
import { phanTrang, type PhanTrangMeta, taoMetaPhanTrang } from "../common/utils/phan-trang";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { GhiNhanDonService, HoaHongService } from "./mang-luoi-hoa-hong.service";
import { ApDungDeXuatService, nguoiLienQuanNhanh } from "./quan-tri-ap-dung.service";
import {
  anhXaNhatKy, coBuocKiem, dauNgayVn, LOI_VAI_TU_CRM, loiDuyet, loiHuy, loiKiem, nemNeuLoi, type NguoiThaoTac, sauNgayVn, soBuocDeXuat,
  trangThaiBatDau, trangThaiChoDuyetDb, trangThaiHieuLuc, VAI_KIEM, VAI_LAP_DE_XUAT, VAI_PHAI_HOC, vaiDuyetTheoLoai
} from "../common/utils/quan-tri";
import type {
  DeXuatQueryDto, DoiTacQueryDto, GiaoDichQueryDto, KhachHangQueryDto, NguoiDungQueryDto, NguoiHocQueryDto, NhatKyQueryDto, QuyetDinhDto,
  SanPhamQueryDto, TaoDeXuatDto
} from "../dto/quan-tri/quan-tri.dto";
import { DeXuatRepository, HoSoQuanTriRepository, type LocDeXuat, NguoiTomTatRepository, TongQuanRepository } from "../repositories/quan-tri.repository";
import { chuanHoaSdt } from "../infrastructure/crm/chuan-hoa-sdt";
import { CrmDocService } from "../infrastructure/crm/crm-doc.service";

/*
 * Ban phe duyet — maker-checker qua thien_khue.de_xuat_duyet (so buoc theo loai, common/utils/quan-tri):
 *   3 buoc (tien, du lieu khach): CHO_KIEM --(nguoi kiem != nguoi de xuat)--> CHO_DUYET --(nguoi duyet != ca hai)--> DA_DUYET
 *   2 buoc (con lai):             CHO_DUYET --(nguoi duyet != nguoi de xuat, dung vai theo loai)--> DA_DUYET
 *   Ap dung quyet dinh trong transaction duyet. Tu choi o buoc nao -> TU_CHOI; nguoi de xuat rut -> HUY. Moi buoc ghi nhat_ky.
 * Doi trang thai bang updateMany co dieu kien trang_thai cu -> hai nguoi bam cung luc chi mot nguoi thang.
 */

/** Loai lap duoc tu ban phe duyet (loai khac do module so huu tao) */
const LOAI_LAP_TU_QUAN_TRI: LoaiDeXuat[] = ["CAP_QUYEN_SKU", "DUYET_QUA_TANG", "DUYET_VOUCHER", "XAC_MINH_DON", "DOI_CHINH_SACH", "CHI_TRA_HOA_HONG", "XUAT_DU_LIEU_KHACH", "KHAC"];
const LIEN_KET = (id: string) => `/quan-tri/phe-duyet?id=${id}`;
@Injectable()
export class DeXuatService {
  private readonly logger = new Logger("DeXuat");

  constructor(
    private readonly repo: DeXuatRepository,
    private readonly nguoiTomTat: NguoiTomTatRepository,
    private readonly apDung: ApDungDeXuatService,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService,
    @Optional() private readonly ghiNhanDon?: GhiNhanDonService,
    @Optional() private readonly hoaHong?: HoaHongService
  ) {}

  /**
   * Sau khi transaction duyet COMMIT: viec cua mang-luoi (tien) — loi khong lam hong quyet dinh da duyet
   * (XAC_MINH_DON: job dong bo mang-luoi tao bu hoa hong; DIEU_CHINH: QUAN_LY bam "Áp dụng" o /lam-viec/mang-luoi/quan-ly).
   */
  private async sauKhiDuyet(nd: ThongTinNguoiDung, dx: de_xuat_duyet): Promise<void> {
    try {
      if (dx.loai === "XAC_MINH_DON" && dx.doi_tuong_id && this.ghiNhanDon) await this.ghiNhanDon.taoHoaHongNeuThieu(dx.doi_tuong_id, nd.id);
      if (dx.loai === "DIEU_CHINH_HOA_HONG" && this.hoaHong) await this.hoaHong.apDungDieuChinh(nd.id, dx.id);
    } catch (e) {
      this.logger.warn(`Đề xuất ${dx.id} (${dx.loai}) đã duyệt nhưng bước áp dụng của mạng lưới lỗi: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ================================================================ GHI

  async tao(nd: ThongTinNguoiDung, body: TaoDeXuatDto): Promise<DeXuatDuyet> {
    if (!nd.vai.some(v => VAI_LAP_DE_XUAT.includes(v))) throw new ForbiddenException("Chỉ Quản lý / Quản trị viên / Thiên Khuê được lập đề xuất");
    // Moi vai lay tu CRM: doi vai = doi phong ban / quyen o CRM, khong con de xuat chuyen vai
    if (body.loai === "CHUYEN_VAI") throw new BadRequestException(LOI_VAI_TU_CRM);
    if (!LOAI_LAP_TU_QUAN_TRI.includes(body.loai)) throw new BadRequestException("Loại đề xuất này do module nghiệp vụ tạo, không lập từ bàn phê duyệt");
    const cb = await this.apDung.chuanBi(body.loai, body.doi_tuong_id ?? null, body.du_lieu ?? {}, body.doi_tuong);

    // Nguoi lap khong de xuat cho chinh minh (vd tu xin vai / tu xin quyen / chu ma, nguoi nhap ma cua don dang xac minh / nguoi nhan chi tra)
    const dxTam = { loai: body.loai, doi_tuong: cb.doi_tuong, doi_tuong_id: cb.doi_tuong_id, du_lieu: cb.du_lieu as Prisma.JsonObject };
    const lienQuan = [...new Set([...nguoiLienQuanNhanh(dxTam), ...(await this.apDung.nguoiLienQuan(dxTam))])];
    if (lienQuan.includes(nd.id)) throw new ForbiddenException("Không lập đề xuất có lợi cho chính mình — nhờ người khác lập");

    const dx = await this.repo.chayTrongGiaoDich(async tx => {
      if (cb.doi_tuong_id) {
        const trung = await this.repo.timDangMoTrung({ loai: body.loai, doiTuong: cb.doi_tuong, doiTuongId: cb.doi_tuong_id }, tx);
        if (trung) throw new ConflictException("Đã có đề xuất đang chờ xử lý cho đối tượng này");
      }
      const moi = await this.repo.tao(
        { loai: body.loai, doi_tuong: cb.doi_tuong, doi_tuong_id: cb.doi_tuong_id, du_lieu: cb.du_lieu, ly_do: body.ly_do?.trim() || null, nguoi_de_xuat_id: nd.id, trang_thai: trangThaiBatDau(body.loai) },
        tx
      );
      await this.nhatKy.ghi(
        { hoSoId: nd.id, hanhDong: "DE_XUAT_TAO", doiTuong: "de_xuat_duyet", doiTuongId: moi.id, duLieu: { loai: moi.loai, so_buoc: soBuocDeXuat(moi.loai), doi_tuong: moi.doi_tuong, doi_tuong_id: moi.doi_tuong_id, du_lieu: cb.du_lieu } },
        tx
      );
      if (coBuocKiem(moi.loai)) {
        const nguoiKiem = await this.hoSoCoVai(tx, VAI_KIEM, [nd.id, ...lienQuan]);
        await this.thongBao.guiNhieu(nguoiKiem, { loai: "PHE_DUYET", tieuDe: "Có đề xuất mới cần kiểm", noiDung: moTaNgan(moi), lienKet: LIEN_KET(moi.id), duLieu: { de_xuat_duyet_id: moi.id } }, tx);
      } else {
        // 2 buoc: bao thang nguoi co tham quyen duyet (dung vai theo loai)
        const nguoiDuyet = await this.hoSoCoVai(tx, vaiDuyetTheoLoai(moi.loai, moi.du_lieu), [nd.id, ...lienQuan], true);
        await this.thongBao.guiNhieu(nguoiDuyet, { loai: "PHE_DUYET", tieuDe: "Có đề xuất chờ bạn duyệt", noiDung: moTaNgan(moi), lienKet: LIEN_KET(moi.id), duLieu: { de_xuat_duyet_id: moi.id } }, tx);
      }
      return moi;
    });
    return (await this.anhXa(nd, [dx]))[0];
  }

  async kiem(nd: ThongTinNguoiDung, id: string, body: QuyetDinhDto): Promise<DeXuatDuyet> {
    const dx = await this.layTho(id);
    const lienQuan = await this.apDung.nguoiLienQuan(dx);
    nemNeuLoi(loiKiem(nd, dx, lienQuan));
    const yKien = body.y_kien?.trim() || null;
    if (!body.dong_y && !yKien) throw new BadRequestException("Từ chối cần ghi ý kiến");

    const kq = await this.repo.chayTrongGiaoDich(async tx => {
      const bay = new Date();
      const cn = await this.repo.ghiKiem(id, { nguoiKiemId: nd.id, bay, yKien, dongY: body.dong_y }, tx);
      if (!cn.count) throw new ConflictException("Đề xuất vừa được người khác xử lý — tải lại để xem");
      const sau = await this.repo.layHoacLoi(id, tx);
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: body.dong_y ? "DE_XUAT_KIEM_DONG_Y" : "DE_XUAT_KIEM_TU_CHOI", doiTuong: "de_xuat_duyet", doiTuongId: id, duLieu: { loai: dx.loai, y_kien: yKien } }, tx);
      if (body.dong_y) {
        const nguoiDuyet = await this.hoSoCoVai(tx, vaiDuyetTheoLoai(dx.loai, dx.du_lieu), [dx.nguoi_de_xuat_id, nd.id, ...lienQuan], true);
        await this.thongBao.guiNhieu(nguoiDuyet, { loai: "PHE_DUYET", tieuDe: "Có đề xuất chờ bạn duyệt", noiDung: moTaNgan(dx), lienKet: LIEN_KET(id), duLieu: { de_xuat_duyet_id: id } }, tx);
      } else {
        const tacDong = await this.apDung.khiTuChoi({ tx, dx: sau, nguoiDuyetId: nd.id, yKien });
        if (tacDong) await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "DE_XUAT_AP_DUNG_TU_CHOI", doiTuong: "de_xuat_duyet", doiTuongId: id, duLieu: tacDong }, tx);
        await this.thongBao.gui({ hoSoId: dx.nguoi_de_xuat_id, loai: "PHE_DUYET", tieuDe: "Đề xuất của bạn bị từ chối ở bước kiểm", noiDung: yKien ?? undefined, lienKet: LIEN_KET(id), duLieu: { de_xuat_duyet_id: id } }, tx);
      }
      return sau;
    });
    return (await this.anhXa(nd, [kq]))[0];
  }

  async duyet(nd: ThongTinNguoiDung, id: string, body: QuyetDinhDto): Promise<DeXuatDuyet> {
    const dx = await this.layTho(id);
    const lienQuan = await this.apDung.nguoiLienQuan(dx);
    nemNeuLoi(loiDuyet(nd, dx, lienQuan));
    const yKien = body.y_kien?.trim() || null;
    if (!body.dong_y && !yKien) throw new BadRequestException("Từ chối cần ghi ý kiến");

    const kq = await this.repo.chayTrongGiaoDich(async tx => {
      const bay = new Date();
      const cn = await this.repo.ghiDuyet(id, { nguoiDuyetId: nd.id, bay, yKien, dongY: body.dong_y, tuTrangThai: trangThaiChoDuyetDb(dx.loai) }, tx);
      if (!cn.count) throw new ConflictException("Đề xuất vừa được người khác xử lý — tải lại để xem");
      const sau = await this.repo.layHoacLoi(id, tx);
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: body.dong_y ? "DE_XUAT_DUYET" : "DE_XUAT_TU_CHOI", doiTuong: "de_xuat_duyet", doiTuongId: id, duLieu: { loai: dx.loai, y_kien: yKien } }, tx);
      // Ap dung quyet dinh trong CUNG transaction: loi -> rollback ca trang thai duyet
      const tacDong = body.dong_y ? await this.apDung.apDung({ tx, dx: sau, nguoiDuyetId: nd.id, yKien }) : await this.apDung.khiTuChoi({ tx, dx: sau, nguoiDuyetId: nd.id, yKien });
      if (tacDong) await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: body.dong_y ? "DE_XUAT_AP_DUNG" : "DE_XUAT_AP_DUNG_TU_CHOI", doiTuong: "de_xuat_duyet", doiTuongId: id, duLieu: tacDong }, tx);
      const nhan = [dx.nguoi_de_xuat_id, ...(dx.nguoi_kiem_id ? [dx.nguoi_kiem_id] : [])];
      await this.thongBao.guiNhieu(nhan, { loai: "PHE_DUYET", tieuDe: body.dong_y ? "Đề xuất đã được duyệt" : "Đề xuất bị từ chối", noiDung: yKien ?? moTaNgan(dx), lienKet: LIEN_KET(id), duLieu: { de_xuat_duyet_id: id } }, tx);
      return sau;
    });
    if (body.dong_y) await this.sauKhiDuyet(nd, kq);
    return (await this.anhXa(nd, [kq]))[0];
  }

  async huy(nd: ThongTinNguoiDung, id: string, lyDo?: string): Promise<DeXuatDuyet> {
    const dx = await this.layTho(id);
    nemNeuLoi(loiHuy(nd, dx));
    const kq = await this.repo.chayTrongGiaoDich(async tx => {
      const cn = await this.repo.ghiHuy(id, nd.id, tx);
      if (!cn.count) throw new ConflictException("Đề xuất vừa được xử lý, không rút được");
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "DE_XUAT_HUY", doiTuong: "de_xuat_duyet", doiTuongId: id, duLieu: { loai: dx.loai, ly_do: lyDo?.trim() || null } }, tx);
      return this.repo.layHoacLoi(id, tx);
    });
    return (await this.anhXa(nd, [kq]))[0];
  }

  // ================================================================ DOC

  async layDanhSach(nd: ThongTinNguoiDung, q: DeXuatQueryDto) {
    const loc: LocDeXuat = { trangThai: q.trang_thai, loai: q.loai };
    if (q.pham_vi === "CUA_TOI") loc.nguoiDeXuatId = nd.id;
    if (q.pham_vi === "CAN_TOI") {
      // Viec cua toi: cho kiem (loai 3 buoc, khong phai cua toi) + cho duyet (khong phai toi de xuat / kiem, dung vai theo loai)
      const loaiDuyet = (Object.values(LoaiDeXuat) as LoaiDeXuat[]).filter(l => nd.vai.some(v => vaiDuyetTheoLoai(l).includes(v)));
      const coKiem = nd.vai.some(v => VAI_KIEM.includes(v));
      loc.canToi = { hoSoId: nd.id, coKiem, loaiDuyet };
    }
    const { skip, take, trang, so_dong } = phanTrang(q);
    const { ds, tong } = await this.repo.danhSach(loc, skip, take);
    return { ds: await this.anhXa(nd, ds), meta: taoMetaPhanTrang(trang, so_dong, tong) };
  }

  async layChiTiet(nd: ThongTinNguoiDung, id: string): Promise<DeXuatChiTiet> {
    const dx = await this.layTho(id);
    const lienQuan = await this.apDung.nguoiLienQuan(dx);
    const [mot] = await this.anhXa(nd, [dx], new Map([[dx.id, lienQuan]]));
    const nk = await this.repo.nhatKyCuaDeXuat(id);
    const nguoi = await this.nguoiTomTat.layNguoiTomTat(nk.map(n => n.ho_so_id));
    return { ...mot, nhat_ky: nk.map(n => anhXaNhatKy(n, nguoi)) };
  }

  /** Viec chua co de xuat mo: qua / voucher cho tham dinh, don cho xac minh */
  async layHangCho(): Promise<HangChoPheDuyet> {
    const mo = await this.repo.doiTuongDaCoDeXuatMo();
    const daCo = mo.map(m => m.doi_tuong_id as string);
    const [qua, voucher, don] = await this.repo.hangCho(daCo);
    const maIds = don.map(d => d.ma_gioi_thieu_id).filter((x): x is string => !!x);
    const ma = maIds.length ? await this.repo.chuMaGioiThieuTheoIds(maIds) : [];
    const chuMa = new Map(ma.map(m => [m.id, m.ho_so_id]));
    const nguoi = await this.nguoiTomTat.layNguoiTomTat(don.flatMap(d => [d.nguoi_chot_ho_so_id, d.nguoi_ban_ho_so_id, d.ma_gioi_thieu_id ? (chuMa.get(d.ma_gioi_thieu_id) ?? null) : null]));
    const lay = (id: string | null | undefined) => (id ? (nguoi.get(id) ?? null) : null);
    return {
      qua_tang: qua.map(q => ({ id: q.id, ten: q.ten, doi_tac: q.doi_tac?.ten ?? null, gia_tri: q.gia_tri === null ? null : Number(q.gia_tri), so_luong: q.so_luong, created_at: q.created_at.toISOString() })),
      voucher: voucher.map(v => ({ id: v.id, ma: v.ma, ten: v.ten, doi_tac: v.doi_tac?.ten ?? null, loai_giam: v.loai_giam, gia_tri: Number(v.gia_tri), created_at: v.created_at.toISOString() })),
      don_cho_xac_minh: don.map(d => ({
        id: d.id,
        ma_don: d.ma_don,
        tong_tien: Number(d.tong_tien),
        nguon: d.nguon,
        ma_gioi_thieu: d.ma_gioi_thieu,
        nguoi_gioi_thieu: lay(d.ma_gioi_thieu_id ? chuMa.get(d.ma_gioi_thieu_id) : null),
        nguoi_chot: lay(d.nguoi_chot_ho_so_id),
        nguoi_ban_hien_tai: lay(d.nguoi_ban_ho_so_id),
        ly_do: d.ly_do,
        created_at: d.created_at.toISOString()
      }))
    };
  }

  /** Chinh sach dang hieu luc — form doi chinh sach hien gia tri truoc */
  async layChinhSach(): Promise<ChinhSachHienHanh> {
    const bay = new Date();
    const [tl, hang] = await Promise.all([
      this.repo.tyLeHoaHongHieuLuc(bay),
      this.repo.hangThanhVienTheoThuTu()
    ]);
    return {
      ty_le_hoa_hong: tl.map(t => ({ id: t.id, vai: t.vai, mau_id: t.mau_id, ma_mau: t.ma_mau, ty_le: Number(t.ty_le), hieu_luc_tu: t.hieu_luc_tu.toISOString(), ghi_chu: t.ghi_chu })),
      hang_thanh_vien: hang.map(h => ({ hang: h.hang, ten: h.ten, nguong_tich_luy: Number(h.nguong_tich_luy), giam_gia_phan_tram: Number(h.giam_gia_phan_tram), bat: h.bat }))
    };
  }

  /** Bang ty le hoa hong: dang hieu luc + lich su (trang thai suy ra tu bat / hieu_luc_tu / hieu_luc_den) */
  async layBangTyLeHoaHong(): Promise<BangTyLeHoaHong> {
    const bay = new Date();
    const ds = await this.repo.tyLeHoaHongTatCa();
    return {
      ty_le: ds.map(t => ({
        id: t.id,
        vai: t.vai,
        mau_id: t.mau_id,
        ma_mau: t.ma_mau,
        ty_le: Number(t.ty_le),
        hieu_luc_tu: t.hieu_luc_tu.toISOString(),
        hieu_luc_den: t.hieu_luc_den?.toISOString() ?? null,
        bat: t.bat,
        ghi_chu: t.ghi_chu,
        trang_thai: !t.bat || (t.hieu_luc_den !== null && t.hieu_luc_den <= bay) ? "DA_HET" : t.hieu_luc_tu > bay ? "CHUA_TOI" : "DANG_AP_DUNG"
      }))
    };
  }

  /** So de xuat can toi xu ly (o bang dieu hanh) */
  async demCanToi(nd: ThongTinNguoiDung): Promise<number> {
    const r = await this.layDanhSach(nd, { pham_vi: "CAN_TOI", so_dong: 1 });
    return r.meta.tong;
  }

  // ================================================================ NOI BO

  private async layTho(id: string): Promise<de_xuat_duyet> {
    const dx = await this.repo.lay(id);
    if (!dx) throw new NotFoundException("Không tìm thấy đề xuất");
    return dx;
  }

  /** ho_so co mot trong cac vai HOAT_DONG (tru danh sach loai) — nguoi nhan thong bao */
  private async hoSoCoVai(tx: Prisma.TransactionClient, vai: Vai[], loaiTru: string[], chinhXac = false): Promise<string[]> {
    const ds = await this.repo.hoSoHoatDongCoVai(chinhXac ? vai : [...new Set<Vai>([...vai, "ADMIN", "THIEN_KHUE"])], loaiTru, tx);
    return [...new Set(ds.map(d => d.ho_so_id))];
  }

  private async anhXa(nd: ThongTinNguoiDung, ds: de_xuat_duyet[], lienQuanDu?: Map<string, string[]>): Promise<DeXuatDuyet[]> {
    const nguoi = await this.nguoiTomTat.layNguoiTomTat(ds.flatMap(d => [d.nguoi_de_xuat_id, d.nguoi_kiem_id, d.nguoi_duyet_id]));
    const thaoTac: NguoiThaoTac = { id: nd.id, vai: nd.vai };
    const lay = (id: string | null): NguoiTomTatQt | null => (id ? (nguoi.get(id) ?? { id, ho_ten: "(không rõ)", email: null }) : null);
    return ds.map(d => {
      const lq = lienQuanDu?.get(d.id) ?? nguoiLienQuanNhanh(d);
      const lDuyet = loiDuyet(thaoTac, d, lq);
      return {
        id: d.id,
        loai: d.loai,
        doi_tuong: d.doi_tuong,
        doi_tuong_id: d.doi_tuong_id,
        du_lieu: (d.du_lieu ?? {}) as Record<string, unknown>,
        ly_do: d.ly_do,
        trang_thai: trangThaiHieuLuc(d),
        so_buoc: soBuocDeXuat(d.loai),
        nguoi_de_xuat: lay(d.nguoi_de_xuat_id),
        nguoi_kiem: lay(d.nguoi_kiem_id),
        kiem_luc: d.kiem_luc?.toISOString() ?? null,
        y_kien_kiem: d.y_kien_kiem,
        nguoi_duyet: lay(d.nguoi_duyet_id),
        duyet_luc: d.duyet_luc?.toISOString() ?? null,
        y_kien_duyet: d.y_kien_duyet,
        created_at: d.created_at.toISOString(),
        mo_ta_doi_tuong: moTaDoiTuong(d),
        co_the_kiem: !loiKiem(thaoTac, d, lq),
        co_the_duyet: !lDuyet,
        co_the_huy: !loiHuy(thaoTac, d),
        ly_do_khong_duyet: trangThaiHieuLuc(d) === "CHO_DUYET" && lDuyet ? lDuyet.thongDiep : null
      };
    });
  }
}
function moTaDoiTuong(d: Pick<de_xuat_duyet, "loai" | "du_lieu">): string | null {
  const x = (d.du_lieu ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  switch (d.loai) {
    case "CHUYEN_VAI":
      return `${s(x.ho_ten)} · ${s(x.vai ?? x.vai_moi)} → ${s(x.trang_thai_moi ?? x.trang_thai_vai_moi)}`;
    case "CAP_QUYEN_SKU":
      return `${s(x.ho_ten)} · ${s(x.ma_mau)} → ${s(x.trang_thai_moi)}`;
    case "DUYET_QUA_TANG":
      return `${s(x.ten)}${x.doi_tac ? ` · ${s(x.doi_tac)}` : ""}`;
    case "DUYET_VOUCHER":
      return `${s(x.ma)} · ${s(x.ten)}`;
    case "XAC_MINH_DON":
      return `Đơn ${s(x.ma_don)} · ${x.ket_qua === "HUY" ? "huỷ ghi nhận" : `ghi nhận ${s(x.nguon)}`}`;
    case "CHI_TRA_HOA_HONG":
      return `Kỳ ${s(x.ky)} · ${s(x.so_khoan)} khoản · ${Array.isArray(x.nguoi_nhan_ids) ? x.nguoi_nhan_ids.length : 0} người · ${typeof x.tong_tien === "number" ? x.tong_tien.toLocaleString("vi-VN") : "—"}đ`;
    case "DOI_CHINH_SACH":
      return x.chinh_sach === "TY_LE_HOA_HONG"
        ? `Hoa hồng ${s(x.vai)}${x.ma_mau ? ` (${s(x.ma_mau)})` : ""}: ${x.ty_le_truoc ?? "—"}% → ${s(x.ty_le)}%`
        : `Hạng ${s(x.hang)}: ngưỡng ${s(x.nguong_tich_luy ?? x.nguong_truoc)} · giảm ${s(x.giam_gia_phan_tram ?? x.giam_gia_truoc)}%`;
    default:
      return null;
  }
}
function moTaNgan(d: Pick<de_xuat_duyet, "loai" | "du_lieu">): string {
  return moTaDoiTuong(d) ?? d.loai;
}

/*
 * 6 nhom ho so lien ket (README muc 4): Nguoi dung, Khach hang (doc CRM), San pham (doc CRM + khoa hoc / quyen SKU),
 * Hoat dong (nhat ky), Giao dich (ghi_nhan_don + hoa_hong), Doi tac. CHI DOC — moi thay doi di qua ban phe duyet.
 * Du lieu CRM chi doc qua CrmDocService.
 */

export interface CauHinhHang {
  hang: HangThanhVien;
  nguong: number;
  bat: boolean;
}
/** Hang cao nhat co nguong <= tong mua hop le (tinh luc doc — hoan / huy tu rot) */
export function tinhHangTheoTong(tong: number, cauHinh: CauHinhHang[]): HangThanhVien | null {
  let dat: HangThanhVien | null = null;
  for (const c of cauHinh.filter(c => c.bat).sort((a, b) => a.nguong - b.nguong)) if (tong >= c.nguong) dat = c.hang;
  return dat;
}
export interface SanPhamMeta {
  trang: number;
  so_dong: number;
  co_trang_sau: boolean;
  /** Tong so mau theo bo loc (CrmDocService.demMau) */
  tong: number;
}
@Injectable()
export class HoSoQuanTriService {
  constructor(
    private readonly repo: HoSoQuanTriRepository,
    private readonly nguoiTomTat: NguoiTomTatRepository,
    private readonly crmDoc: CrmDocService
  ) {}

  // ================================================================ NGUOI DUNG

  async dsNguoiDung(q: NguoiDungQueryDto): Promise<{ ds: NguoiDungDongQt[]; meta: PhanTrangMeta }> {
    const { skip, take, trang, so_dong } = phanTrang(q);
    const { ds, tong } = await this.repo.dsHoSo(
      { tuKhoa: q.tu_khoa, sdtChuan: q.tu_khoa ? chuanHoaSdt(q.tu_khoa) : null, vai: q.vai, trangThaiVai: q.trang_thai_vai },
      skip,
      take
    );
    return {
      ds: ds.map(h => ({
        id: h.id,
        ho_ten: h.ho_ten,
        email: h.email,
        sdt: h.sdt,
        crm_user_id: h.crm_user_id,
        kich_hoat_lam_viec: h.kich_hoat_lam_viec,
        vai: h.vai_tro,
        so_quyen_sku: h._count.quyen_sku,
        created_at: h.created_at.toISOString()
      })),
      meta: taoMetaPhanTrang(trang, so_dong, tong)
    };
  }

  async chiTietNguoiDung(id: string): Promise<NguoiDungChiTietQt> {
    const h = await this.repo.hoSoChiTiet(id);
    if (!h) throw new NotFoundException("Không tìm thấy hồ sơ");
    const [gnAgg, hhNhom, nk] = await Promise.all([
      this.repo.tongDonHopLeCuaNguoiBan(id),
      this.repo.hoaHongTheoTrangThai(id),
      this.repo.nhatKyLienQuanHoSo(id)
    ]);
    const tongHh = (tt: string[]) => hhNhom.filter(x => tt.includes(x.trang_thai)).reduce((s, x) => s + Number(x._sum.so_tien ?? 0), 0);
    const nguoi = await this.nguoiTomTat.layNguoiTomTat([...h.lich_su_vai_tro.map(l => l.nguoi_doi_id), ...nk.map(n => n.ho_so_id)]);
    return {
      id: h.id,
      ho_ten: h.ho_ten,
      email: h.email,
      sdt: h.sdt,
      crm_user_id: h.crm_user_id,
      kich_hoat_lam_viec: h.kich_hoat_lam_viec,
      so_quyen_sku: h.quyen_sku.filter(q => q.trang_thai === "HOAT_DONG").length,
      created_at: h.created_at.toISOString(),
      vai: h.vai_tro.map(v => ({ vai: v.vai, trang_thai: v.trang_thai, tu_luc: v.tu_luc.toISOString(), den_luc: v.den_luc?.toISOString() ?? null, nguon: v.nguon })),
      lich_su_vai: h.lich_su_vai_tro.map(l => ({
        vai: l.vai,
        trang_thai_cu: l.trang_thai_cu,
        trang_thai_moi: l.trang_thai_moi,
        ly_do: l.ly_do,
        nguoi_doi: l.nguoi_doi_id ? (nguoi.get(l.nguoi_doi_id) ?? null) : null,
        created_at: l.created_at.toISOString()
      })),
      quyen_sku: h.quyen_sku.map(q => ({ mau_id: q.mau_id, ma_mau: q.ma_mau, trang_thai: q.trang_thai, cap_luc: q.cap_luc.toISOString(), phien_ban_tai_lieu: q.phien_ban_tai_lieu })),
      chung_chi: h.chung_chi.map(c => ({ ma_chung_chi: c.ma_chung_chi, khoa_hoc: c.khoa_hoc.ten, diem: c.diem, cap_luc: c.cap_luc.toISOString() })),
      luot_lam: h.luot_lam.map(l => ({ bai_kiem_tra: l.bai_kiem_tra.tieu_de, diem: l.diem, dat: l.dat, nop_luc: l.nop_luc?.toISOString() ?? null })),
      giao_dich: {
        so_don: gnAgg._count,
        doanh_so: Number(gnAgg._sum.tong_tien ?? 0),
        hoa_hong_cho: tongHh(["CHO_DOI_SOAT", "DU_DIEU_KIEN"]),
        hoa_hong_da_tra: tongHh(["DA_TRA"])
      },
      nhat_ky: nk.map(n => anhXaNhatKy(n, nguoi))
    };
  }

  // ================================================================ KHACH HANG (CRM)

  private async cauHinhHang(): Promise<CauHinhHang[]> {
    const ds = await this.repo.dsHangCauHinh();
    return ds.map(c => ({ hang: c.hang, nguong: Number(c.nguong_tich_luy), bat: c.bat }));
  }

  /** Khong co sdt: khach mua nhieu nhat (>= so_lan_toi_thieu don hop le). Co sdt: mot khach. */
  async dsKhachHang(q: KhachHangQueryDto): Promise<KhachHangDongQt[]> {
    const cauHinh = await this.cauHinhHang();
    if (q.sdt) {
      const sdt = chuanHoaSdt(q.sdt);
      if (!sdt) return [];
      const [khach, tong] = await Promise.all([this.crmDoc.layKhachTheoSdt(sdt), this.crmDoc.tongMuaHopLe(sdt)]);
      if (!khach && !tong.so_don) return [];
      return [{ sdt_chuan: sdt, ten: khach?.ten ?? null, tong_tien: tong.tong_tien, so_don: tong.so_don, lan_mua_cuoi: tong.lan_mua_cuoi?.toISOString() ?? null, hang: tinhHangTheoTong(tong.tong_tien, cauHinh) }];
    }
    if (!q.so_lan_toi_thieu || q.so_lan_toi_thieu <= 1) {
      // Mot cau SQL (khach_hang noi tong mua hop le) — khong N truy van lay ten
      const { ds } = await this.crmDoc.layDanhSachKhach({ gioiHan: q.gioi_han ?? 50 });
      return ds.map(k => ({
        sdt_chuan: k.sdt,
        ten: k.ten,
        tong_tien: Number(k.tong_tien),
        so_don: k.so_don,
        lan_mua_cuoi: k.lan_mua_cuoi ? new Date(k.lan_mua_cuoi).toISOString() : null,
        hang: tinhHangTheoTong(Number(k.tong_tien), cauHinh)
      }));
    }
    const top = await this.crmDoc.layKhachDuSoLanMua(q.so_lan_toi_thieu, q.gioi_han ?? 50);
    const ten = await Promise.all(top.map(t => this.crmDoc.layKhachTheoSdt(t.sdt_chuan).then(k => k?.ten ?? null)));
    return top.map((t, i) => ({
      sdt_chuan: t.sdt_chuan,
      ten: ten[i],
      tong_tien: Number(t.tong_tien),
      so_don: t.so_don,
      lan_mua_cuoi: t.lan_mua_cuoi ? new Date(t.lan_mua_cuoi).toISOString() : null,
      hang: tinhHangTheoTong(Number(t.tong_tien), cauHinh)
    }));
  }

  async chiTietKhachHang(sdtVao: string): Promise<KhachHangChiTietQt> {
    const sdt = chuanHoaSdt(sdtVao);
    if (!sdt) throw new NotFoundException("Số điện thoại không hợp lệ");
    const [khach, tong, don, cauHinh, giao, uuDai, moi] = await Promise.all([
      this.crmDoc.layKhachTheoSdt(sdt),
      this.crmDoc.tongMuaHopLe(sdt),
      this.crmDoc.layDonTheoSdt(sdt, 30),
      this.cauHinhHang(),
      this.repo.giaoKhachDangPhuTrach(sdt),
      this.repo.uuDaiDaCap(sdt),
      this.repo.moiKhHanhPhucMoiNhat(sdt)
    ]);
    if (!khach && !don.length) throw new NotFoundException("Không tìm thấy khách trong CRM");
    const nguoi = await this.nguoiTomTat.layNguoiTomTat([giao?.ho_so_id]);
    return {
      sdt_chuan: sdt,
      ten: khach?.ten ?? don[0]?.khach_ten ?? null,
      tong_tien: tong.tong_tien,
      so_don: tong.so_don,
      lan_mua_cuoi: tong.lan_mua_cuoi?.toISOString() ?? null,
      hang: tinhHangTheoTong(tong.tong_tien, cauHinh),
      dia_chi: khach?.dia_chi ?? null,
      ghi_chu: khach?.ghi_chu ?? null,
      don: don.map(d => ({ id: d.id, ma_don: d.ma_don, loai_don: d.loai_don, trang_thai: d.trang_thai, tong_tien: Number(d.tong_tien), created_at: new Date(d.created_at).toISOString() })),
      phu_trach: giao ? { ho_so: nguoi.get(giao.ho_so_id) ?? null, nguon: giao.nguon, giao_luc: giao.giao_luc.toISOString() } : null,
      uu_dai: uuDai.map(u => ({
        id: u.id,
        loai: u.voucher_id ? ("VOUCHER" as const) : ("QUA_TANG" as const),
        ten: u.voucher?.ten ?? u.qua_tang?.ten ?? "—",
        trang_thai: u.trang_thai,
        cap_luc: u.cap_luc.toISOString()
      })),
      kh_hanh_phuc: moi ? { trang_thai: moi.trang_thai, moi_luc: moi.moi_luc.toISOString(), dong_y_dung_hinh: moi.dong_y_dung_hinh } : null
    };
  }

  // ================================================================ SAN PHAM (CRM mau + khoa hoc / quyen SKU)

  async dsSanPham(q: SanPhamQueryDto): Promise<{ ds: SanPhamDongQt[]; meta: SanPhamMeta }> {
    const { skip, take, trang, so_dong } = phanTrang(q, 30);
    const [mau, tong] = await Promise.all([
      this.crmDoc.layDanhSachMau({ tuKhoa: q.tu_khoa, baoGomNgung: q.bao_gom_ngung, gioiHan: take + 1, boQua: skip }),
      this.crmDoc.demMau({ tuKhoa: q.tu_khoa, baoGomNgung: q.bao_gom_ngung })
    ]);
    const trangNay = mau.slice(0, take);
    const ds = await this.ganKhoaVaQuyen(trangNay);
    return { ds, meta: { trang, so_dong, co_trang_sau: mau.length > take, tong } };
  }

  private async ganKhoaVaQuyen(mau: { id: string; ma: string; ten: string; gia_ban: number | null; trang_thai: string; anh_url: string | null }[]): Promise<SanPhamDongQt[]> {
    const ids = mau.map(m => m.id);
    if (!ids.length) return [];
    const [khoa, quyen] = await Promise.all([
      this.repo.khoaSanPhamTheoMau(ids),
      this.repo.demQuyenSkuTheoMau(ids)
    ]);
    return mau.map(m => {
      const k = khoa.find(x => x.mau_id === m.id);
      const dem = (tt: string) => quyen.find(x => x.mau_id === m.id && x.trang_thai === tt)?._count ?? 0;
      return {
        id: m.id,
        ma: m.ma,
        ten: m.ten,
        gia_ban: m.gia_ban === null ? null : Number(m.gia_ban),
        trang_thai: m.trang_thai,
        anh_url: m.anh_url,
        khoa_hoc: k ? { id: k.id, ma: k.ma, ten: k.ten, phien_ban_tai_lieu: k.phien_ban_tai_lieu } : null,
        quyen_sku: { hoat_dong: dem("HOAT_DONG"), can_hoc_lai: dem("CAN_HOC_LAI"), thu_hoi: dem("THU_HOI") }
      };
    });
  }

  async chiTietSanPham(mauId: string): Promise<SanPhamChiTietQt> {
    const mau = await this.crmDoc.layMau(mauId);
    if (!mau) throw new NotFoundException("Không tìm thấy sản phẩm trong CRM");
    const [[dong], tonKho, quyen] = await Promise.all([
      this.ganKhoaVaQuyen([mau]),
      this.crmDoc.layTonKho(mauId),
      this.repo.nguoiCoQuyenSku(mauId)
    ]);
    return {
      ...dong,
      chat_lieu: mau.chat_lieu,
      form_dang: mau.form_dang,
      ton_kho: tonKho.map(t => ({ size: t.size, mau_sac: t.mau_sac, so_luong: Number(t.so_luong) })),
      nguoi_co_quyen: quyen.map(q => ({ ho_so: q.ho_so, trang_thai: q.trang_thai, cap_luc: q.cap_luc.toISOString(), phien_ban_tai_lieu: q.phien_ban_tai_lieu }))
    };
  }

  // ================================================================ HOAT DONG (nhat ky)

  async dsNhatKy(q: NhatKyQueryDto): Promise<{ ds: NhatKyQt[]; meta: PhanTrangMeta }> {
    const { skip, take, trang, so_dong } = phanTrang(q, 50);
    const { ds, tong } = await this.repo.dsNhatKy(
      {
        hoSoId: q.ho_so_id,
        doiTuong: q.doi_tuong,
        doiTuongId: q.doi_tuong_id,
        hanhDong: q.hanh_dong ? q.hanh_dong.toUpperCase() : undefined,
        tu: q.tu_ngay ? dauNgayVn(q.tu_ngay) : undefined,
        den: q.den_ngay ? sauNgayVn(q.den_ngay) : undefined
      },
      skip,
      take
    );
    const nguoi = await this.nguoiTomTat.layNguoiTomTat(ds.map(n => n.ho_so_id));
    return { ds: ds.map(n => anhXaNhatKy(n, nguoi)), meta: taoMetaPhanTrang(trang, so_dong, tong) };
  }

  // ================================================================ GIAO DICH (ghi nhan don + hoa hong)

  async dsGiaoDich(q: GiaoDichQueryDto): Promise<{ ds: GiaoDichDongQt[]; meta: PhanTrangMeta }> {
    const { skip, take, trang, so_dong } = phanTrang(q);
    const { ds, tong } = await this.repo.dsGhiNhanDon({ trangThai: q.trang_thai, nguon: q.nguon, tuKhoa: q.tu_khoa }, skip, take);
    const nguoi = await this.nguoiTomTat.layNguoiTomTat(ds.flatMap(d => [d.nguoi_ban_ho_so_id, d.nguoi_chot_ho_so_id]));
    const lay = (id: string | null) => (id ? (nguoi.get(id) ?? null) : null);
    return {
      ds: ds.map(d => ({
        id: d.id,
        crm_don_id: d.crm_don_id,
        ma_don: d.ma_don,
        tong_tien: Number(d.tong_tien),
        nguon: d.nguon,
        trang_thai: d.trang_thai,
        ma_gioi_thieu: d.ma_gioi_thieu,
        nguoi_ban: lay(d.nguoi_ban_ho_so_id),
        nguoi_chot: lay(d.nguoi_chot_ho_so_id),
        hoa_hong: d.hoa_hong ? { so_tien: Number(d.hoa_hong.so_tien), ty_le: d.hoa_hong.ty_le === null ? null : Number(d.hoa_hong.ty_le), trang_thai: d.hoa_hong.trang_thai, ky: d.hoa_hong.ky } : null,
        created_at: d.created_at.toISOString()
      })),
      meta: taoMetaPhanTrang(trang, so_dong, tong)
    };
  }

  // ================================================================ DOI TAC

  async dsDoiTac(q: DoiTacQueryDto): Promise<{ ds: DoiTacDongQt[]; meta: PhanTrangMeta }> {
    const { skip, take, trang, so_dong } = phanTrang(q);
    const { ds, tong } = await this.repo.dsDoiTac({ tuKhoa: q.tu_khoa }, skip, take);
    const tien = ds.length ? await this.repo.tienHopDongTheoDoiTac(ds.map(d => d.id)) : [];
    return {
      ds: ds.map(d => {
        const t = tien.find(x => x.doi_tac_id === d.id);
        return {
          id: d.id,
          ten: d.ten,
          loai: d.loai,
          nguoi_lien_he: d.nguoi_lien_he,
          sdt: d.sdt,
          email: d.email,
          bat: d.bat,
          so_qua: d._count.qua_tang,
          so_voucher: d._count.voucher,
          so_hop_dong: d._count.hop_dong,
          doanh_thu_qua: Number(t?._sum.doanh_thu_qua ?? 0),
          chi_phi_tai_tro: Number(t?._sum.chi_phi_tai_tro ?? 0)
        };
      }),
      meta: taoMetaPhanTrang(trang, so_dong, tong)
    };
  }

  async chiTietDoiTac(id: string): Promise<DoiTacChiTietQt> {
    const d = await this.repo.doiTacChiTiet(id);
    if (!d) throw new NotFoundException("Không tìm thấy đối tác");
    const hdHieuLuc = d.hop_dong.filter(h => h.trang_thai !== "HUY");
    return {
      id: d.id,
      ten: d.ten,
      loai: d.loai,
      nguoi_lien_he: d.nguoi_lien_he,
      sdt: d.sdt,
      email: d.email,
      bat: d.bat,
      ma_so_thue: d.ma_so_thue,
      dia_chi: d.dia_chi,
      ghi_chu: d.ghi_chu,
      so_qua: d.qua_tang.length,
      so_voucher: d.voucher.length,
      so_hop_dong: d.hop_dong.length,
      doanh_thu_qua: hdHieuLuc.reduce((s, h) => s + Number(h.doanh_thu_qua), 0),
      chi_phi_tai_tro: hdHieuLuc.reduce((s, h) => s + Number(h.chi_phi_tai_tro), 0),
      qua_tang: d.qua_tang.map(q => ({ id: q.id, ten: q.ten, gia_tri: q.gia_tri === null ? null : Number(q.gia_tri), trang_thai: q.trang_thai, created_at: q.created_at.toISOString() })),
      voucher: d.voucher.map(v => ({ id: v.id, ma: v.ma, ten: v.ten, trang_thai: v.trang_thai, het_han: v.het_han?.toISOString() ?? null })),
      hop_dong: d.hop_dong.map(h => ({
        id: h.id,
        ten: h.ten,
        loai: h.loai,
        trang_thai: h.trang_thai,
        gia_tri_hop_dong: h.gia_tri_hop_dong === null ? null : Number(h.gia_tri_hop_dong),
        doanh_thu_qua: Number(h.doanh_thu_qua),
        chi_phi_tai_tro: Number(h.chi_phi_tai_tro)
      }))
    };
  }
}

/** So lan truot mot bai (chua dat) de danh dau "Cần hỗ trợ" */
export const SO_LAN_TRUOT_CAN_HO_TRO = 2;
export interface TienDoHocVien {
  vaiDangHoc: { vai: Vai; trang_thai: string }[];
  baiHocXong: number;
  tongBaiHoc: number;
  baiDat: number;
  tongBai: number;
  /** So lan truot nhieu nhat tren mot bai chua dat */
  truotNhieuNhat: number;
  coLuotLam: boolean;
}
/** Trang thai hien thi tren bang dieu hanh (LMS.dc.html: Hoàn thành / Đang học / Chưa bắt đầu / Cần hỗ trợ) */
export function phanLoaiNguoiHoc(t: TienDoHocVien): TrangThaiNguoiHocQt {
  const conHoc = t.vaiDangHoc.filter(v => v.trang_thai !== "KET_THUC");
  if (conHoc.length && conHoc.every(v => v.trang_thai === "HOAT_DONG")) return "HOAN_THANH";
  if (t.truotNhieuNhat >= SO_LAN_TRUOT_CAN_HO_TRO) return "CAN_HO_TRO";
  if (!t.baiHocXong && !t.coLuotLam) return "CHUA_BAT_DAU";
  return "DANG_HOC";
}
@Injectable()
export class TongQuanService {
  constructor(
    private readonly repo: TongQuanRepository,
    private readonly deXuat: DeXuatService
  ) {}

  /** So lieu tong: nguoi hoc, ty le dat, don theo nguon, hoa hong cho, de xuat cho */
  async layTongQuan(nd: ThongTinNguoiDung): Promise<TongQuanQuanTri> {
    const [vaiHoc, luotTong, luotDat, donNguon, choXacMinh, hh, deXuatNhom, canToi, quaCho, nguoiDung] = await Promise.all([
      this.repo.vaiHocConHieuLuc([...VAI_PHAI_HOC]),
      this.repo.demLuotDaNop(),
      this.repo.demLuotDat(),
      this.repo.donTheoNguon(),
      this.repo.demDonChoXacMinh(),
      this.repo.hoaHongCho(),
      this.repo.deXuatDangMoTheoTrangThai(),
      this.deXuat.demCanToi(nd),
      this.repo.demQuaChoThamDinh(),
      this.repo.demHoSo()
    ]);
    const nguoi = new Map<string, string[]>();
    for (const v of vaiHoc) nguoi.set(v.ho_so_id, [...(nguoi.get(v.ho_so_id) ?? []), v.trang_thai]);
    const dsTt = [...nguoi.values()];
    return {
      nguoi_hoc: {
        tong: nguoi.size,
        dang_hoc: dsTt.filter(t => t.includes("DANG_HOC")).length,
        hoat_dong: dsTt.filter(t => t.every(x => x === "HOAT_DONG")).length
      },
      ty_le_dat: luotTong ? Math.round((luotDat / luotTong) * 1000) / 10 : null,
      luot_lam: { tong: luotTong, dat: luotDat },
      don_theo_nguon: (["SALE", "CTV", "KOC", "KOL"] as const).map(nguon => {
        const r = donNguon.find(x => x.nguon === nguon);
        return { nguon, so_don: r?._count ?? 0, tong_tien: Number(r?._sum.tong_tien ?? 0) };
      }),
      don_cho_xac_minh: choXacMinh,
      hoa_hong_cho: { so_tien: Number(hh._sum.so_tien ?? 0), so_dong: hh._count },
      de_xuat: {
        cho_kiem: deXuatNhom.filter(x => trangThaiHieuLuc(x) === "CHO_KIEM").reduce((t, x) => t + x._count, 0),
        cho_duyet: deXuatNhom.filter(x => trangThaiHieuLuc(x) === "CHO_DUYET").reduce((t, x) => t + x._count, 0),
        can_toi: canToi
      },
      qua_cho_tham_dinh: quaCho,
      nguoi_dung: nguoiDung
    };
  }

  /** Bang nguoi hoc (LMS.dc.html "Bảng điều hành đào tạo"): tien do bai hoc, bai kiem tra dat, trang thai */
  async layNguoiHoc(q: NguoiHocQueryDto): Promise<{ ds: NguoiHocDongQt[]; meta: PhanTrangMeta }> {
    const vaiLoc: Vai[] = q.vai ? [q.vai] : [...VAI_PHAI_HOC];
    const { skip, take, trang, so_dong } = phanTrang(q);
    const [{ hoSo, tong }, khoa] = await Promise.all([this.repo.nguoiHocTheoTrang(vaiLoc, skip, take), this.repo.khoaBatBuoc()]);
    const ids = hoSo.map(h => h.id);
    const [tienDo, luot] = ids.length
      ? await Promise.all([
          this.repo.baiHocDaXong(ids),
          this.repo.luotDaNop(ids)
        ])
      : [[], []];

    const ds = hoSo.map(h => {
      const vaiHoc = h.vai_tro.filter(v => VAI_PHAI_HOC.includes(v.vai));
      const vaiCon = vaiHoc.filter(v => v.trang_thai !== "KET_THUC").map(v => v.vai);
      const khoaApDung = khoa.filter(k => !k.vai_ap_dung.length || k.vai_ap_dung.some(v => vaiCon.includes(v)));
      const baiHoc = new Set(khoaApDung.flatMap(k => k.bai_hoc.map(b => b.id)));
      const bai = new Set(khoaApDung.flatMap(k => k.bai_kiem_tra.map(b => b.id)));
      const xong = tienDo.filter(t => t.ho_so_id === h.id && baiHoc.has(t.bai_hoc_id)).length;
      const luotCuaToi = luot.filter(l => l.ho_so_id === h.id);
      const dat = new Set(luotCuaToi.filter(l => l.dat && bai.has(l.bai_kiem_tra_id)).map(l => l.bai_kiem_tra_id));
      const truot = new Map<string, number>();
      for (const l of luotCuaToi) if (!l.dat && !dat.has(l.bai_kiem_tra_id)) truot.set(l.bai_kiem_tra_id, (truot.get(l.bai_kiem_tra_id) ?? 0) + 1);
      const td: TienDoHocVien = {
        vaiDangHoc: vaiHoc,
        baiHocXong: xong,
        tongBaiHoc: baiHoc.size,
        baiDat: dat.size,
        tongBai: bai.size,
        truotNhieuNhat: Math.max(0, ...truot.values()),
        coLuotLam: luotCuaToi.length > 0
      };
      return {
        ho_so_id: h.id,
        ho_ten: h.ho_ten,
        vai: vaiHoc,
        bai_hoc_xong: xong,
        tong_bai_hoc: baiHoc.size,
        tien_do: baiHoc.size ? Math.round((xong / baiHoc.size) * 100) : 0,
        bai_kiem_tra_dat: dat.size,
        tong_bai_kiem_tra: bai.size,
        trang_thai: phanLoaiNguoiHoc(td)
      };
    });
    return { ds, meta: taoMetaPhanTrang(trang, so_dong, tong) };
  }
}
