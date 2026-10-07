// Mang luoi CTV / TTS / KOL / KOC: ma gioi thieu, chien dich, thuc tap. Lop: MaGioiThieuService, ChienDichService, ThucTapService.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type {
  BaiTapTts, CapNhatChienDichBody, CapNhatSoLieuBody, ChamBaiTapTtsBody, ChienDichChoToi, ChienDichMl, ChienDichQuanLy, DanhGiaTts,
  DeXuatChuyenVaiTtsBody, DuyetNoiDungBody, KhoaHocLoTrinhTts, MaGioiThieuCongKhai, MaGioiThieuCuaToi, NoiDungKocMl, NopBaiTapTtsBody, NopNoiDungBody,
  SuaNoiDungBody, TaiLieuSanPhamMl, TaoChienDichBody, ThamGiaChienDichMl
} from "@thien-khue/contracts";
import {
  type bai_thuc_hanh, type chien_dich, type noi_dung_koc, Prisma, type TrangThaiChienDich, type TrangThaiNoiDung, type TrangThaiThucHanh,
  type TrangThaiVai, type Vai
} from "@prisma/client";
import { CrmDocService, type MauCrm } from "../infrastructure/crm/crm-doc.service";
import { NhatKyService, ThongBaoService } from "./core.service";
import { QuyenSkuService } from "./dao-tao-quyen-sku.service";
import { chonVai, iso, laLinkHopLe, laTrungKhoa, skuThieuQuyen, taoChuoiMa, VAI_GIOI_THIEU } from "../common/utils/mang-luoi";
import { KHOANG_CLICK_MS, SO_LAN_THU_MA, VAI_TOI_CAO } from "../constants/mang-luoi.constants";
import { kiemVaiKhongTuCrm, trangThaiHieuLuc } from "../common/utils/quan-tri";
import { ChienDichRepository, HoSoMangLuoiRepository, MaGioiThieuRepository, ThucTapRepository } from "../repositories/mang-luoi.repository";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";

/**
 * Ma / duong dan gioi thieu cua CTV, TTS, KOL, KOC — CHI cap cho SKU da co quyen_sku HOAT_DONG (QuyenSkuService).
 * Tai lieu san pham chi tra cho SKU duoc phep.
 */
@Injectable()
export class MaGioiThieuService {
  constructor(
    private readonly maRepo: MaGioiThieuRepository,
    private readonly chienDichRepo: ChienDichRepository,
    private readonly hoSoRepo: HoSoMangLuoiRepository,
    private readonly crmDoc: CrmDocService,
    private readonly quyenSku: QuyenSkuService,
    private readonly nhatKy: NhatKyService
  ) {}

  private async timMau(mauId?: string, maMau?: string): Promise<MauCrm> {
    const mau = mauId ? await this.crmDoc.layMau(mauId) : maMau ? await this.crmDoc.layMauTheoMa(maMau) : null;
    if (!mauId && !maMau) throw new BadRequestException("Chọn sản phẩm (mã SKU) để lấy mã giới thiệu");
    if (!mau) throw new NotFoundException("Không tìm thấy sản phẩm trên CRM");
    return mau;
  }

  /**
   * Lay (hoac tao) ma gioi thieu cho mot SKU. Chan 403 neu chua co quyen SKU. Moi (nguoi, SKU, chien dich) mot ma dang bat —
   * goi lai tra ma cu.
   */
  async layHoacTao(hoSoId: string, body: { mau_id?: string; ma_mau?: string; chien_dich_id?: string }): Promise<MaGioiThieuCuaToi> {
    const vai = chonVai(await this.hoSoRepo.layVaiHoatDong(hoSoId), VAI_GIOI_THIEU);
    if (!vai) throw new ForbiddenException("Chỉ CTV, thực tập sinh, KOL, KOC đang hoạt động mới lấy được mã giới thiệu");
    const mau = await this.timMau(body.mau_id, body.ma_mau);
    // Hoc truoc khi ban: chua dat khoa SKU -> 403
    await this.quyenSku.kiem(hoSoId, mau.id, "LAY_MA_GIOI_THIEU");
    if (mau.trang_thai === "ngung") throw new BadRequestException(`Mã ${mau.ma} đã ngừng bán`);

    const chienDichId = body.chien_dich_id ?? null;
    if (chienDichId) {
      const cd = await this.chienDichRepo.timTheoId(chienDichId);
      if (!cd) throw new NotFoundException("Không tìm thấy chiến dịch");
      if (!cd.mau_ids.includes(mau.id)) throw new BadRequestException(`Mã ${mau.ma} không thuộc chiến dịch này`);
      const tg = await this.chienDichRepo.timThamGia(chienDichId, hoSoId);
      if (tg?.trang_thai !== "DA_DUYET") throw new ForbiddenException("Bạn cần được duyệt tham gia chiến dịch trước khi lấy mã");
    }

    const daCo = await this.maRepo.timMaDangBat(hoSoId, mau.id, chienDichId);
    if (daCo) return (await this.dinhDang(hoSoId, [daCo.id]))[0]!;

    for (let lan = 0; lan < SO_LAN_THU_MA; lan++) {
      try {
        const ma = await this.maRepo.tao({ ho_so_id: hoSoId, mau_id: mau.id, ma_mau: mau.ma, ma: taoChuoiMa(mau.ma), chien_dich_id: chienDichId });
        await this.nhatKy.ghiAnToan({ hoSoId, hanhDong: "TAO_MA_GIOI_THIEU", doiTuong: "ma_gioi_thieu", doiTuongId: ma.id, duLieu: { ma: ma.ma, ma_mau: mau.ma, chien_dich_id: chienDichId } });
        return (await this.dinhDang(hoSoId, [ma.id]))[0]!;
      } catch (e) {
        if (!laTrungKhoa(e)) throw e; // trung chuoi ma -> sinh lai
      }
    }
    throw new InternalServerErrorException("Không tạo được mã giới thiệu, thử lại");
  }

  async cuaToi(hoSoId: string): Promise<MaGioiThieuCuaToi[]> {
    return this.dinhDang(hoSoId, await this.maRepo.layIdsCuaHoSo(hoSoId));
  }

  /** Bat / tat ma cua chinh minh. Bat lai van phai con quyen SKU. */
  async doiTrangThai(hoSoId: string, id: string, bat: boolean): Promise<MaGioiThieuCuaToi> {
    const ma = await this.maRepo.timTheoId(id);
    if (!ma || ma.ho_so_id !== hoSoId) throw new NotFoundException("Không tìm thấy mã giới thiệu");
    if (bat && ma.mau_id) await this.quyenSku.kiem(hoSoId, ma.mau_id, "LAY_MA_GIOI_THIEU");
    await this.maRepo.datBat(id, bat);
    await this.nhatKy.ghiAnToan({ hoSoId, hanhDong: bat ? "BAT_MA_GIOI_THIEU" : "TAT_MA_GIOI_THIEU", doiTuong: "ma_gioi_thieu", doiTuongId: id, duLieu: { ma: ma.ma } });
    return (await this.dinhDang(hoSoId, [id]))[0]!;
  }

  private async dinhDang(hoSoId: string, ids: string[]): Promise<MaGioiThieuCuaToi[]> {
    if (!ids.length) return [];
    const ds = await this.maRepo.layKemThongKe(ids);
    const mauIds = [...new Set(ds.map(d => d.mau_id).filter((x): x is string => !!x))];
    const [mau, duocPhep, don] = await Promise.all([
      this.crmDoc.layMauTheoIds(mauIds),
      this.quyenSku.layMauDuocPhep(hoSoId),
      this.maRepo.demDonTheoMa(ids)
    ]);
    const theoMau = new Map(mau.map(m => [m.id, m]));
    const dp = new Set(duocPhep);
    return ds.map(d => {
      const m = d.mau_id ? theoMau.get(d.mau_id) : undefined;
      const g = don.find(x => x.ma_gioi_thieu_id === d.id);
      return {
        id: d.id,
        ma: d.ma,
        mau_id: d.mau_id,
        ma_mau: d.ma_mau ?? m?.ma ?? null,
        ten_mau: m?.ten ?? null,
        anh_url: m?.anh_url ?? null,
        gia_ban: m?.gia_ban ?? null,
        chien_dich_id: d.chien_dich_id,
        ten_chien_dich: d.chien_dich?.ten ?? null,
        bat: d.bat,
        con_quyen: d.mau_id ? dp.has(d.mau_id) : false,
        so_click: d._count.luot_click,
        so_don: g?._count._all ?? 0,
        doanh_so: Number(g?._sum.tong_tien ?? 0),
        created_at: d.created_at.toISOString()
      };
    });
  }

  /** Tai lieu san pham cua cac SKU minh co quyen (ke ca CAN_HOC_LAI de biet phai hoc lai) */
  async taiLieu(hoSoId: string): Promise<TaiLieuSanPhamMl[]> {
    const quyen = await this.maRepo.layQuyenSkuCoTaiLieu(hoSoId);
    if (!quyen.length) return [];
    const mauIds = quyen.map(q => q.mau_id);
    const [mau, khoa] = await Promise.all([
      this.crmDoc.layMauTheoIds(mauIds),
      this.maRepo.layKhoaSanPham(mauIds)
    ]);
    const q = new Map(quyen.map(x => [x.mau_id, x]));
    return mau.map(m => {
      const k = khoa.find(x => x.mau_id === m.id);
      const qq = q.get(m.id)!;
      return {
        mau_id: m.id,
        ma_mau: m.ma,
        ten: m.ten,
        gia_ban: m.gia_ban,
        chat_lieu: m.chat_lieu,
        form_dang: m.form_dang,
        anh_url: m.anh_url,
        anh_size_chart: m.anh_size_chart,
        cau_tu_van: m.cau_tu_van,
        trang_thai_ban: m.trang_thai,
        trang_thai_quyen: qq.trang_thai,
        phien_ban_tai_lieu: qq.phien_ban_tai_lieu,
        khoa_hoc: k ? { id: k.id, ma: k.ma, ten: k.ten } : null
      };
    });
  }

  // ---------------------------------------------------------------- cong khai (storefront ?mgt=)

  /** Tra cuu ma cho trang cong khai — khong lo ho ten / lien he cua nguoi gioi thieu */
  async traCuuCongKhai(ma: string): Promise<MaGioiThieuCongKhai> {
    const row = await this.maRepo.timTheoMa(ma.trim().toUpperCase());
    if (!row || !row.bat) throw new NotFoundException("Mã giới thiệu không tồn tại hoặc đã tắt");
    const mau = row.mau_id ? await this.crmDoc.layMau(row.mau_id) : null;
    return { ma: row.ma, ma_mau: row.ma_mau, ten_mau: mau?.ten ?? null, anh_url: mau?.anh_url ?? null, gia_ban: mau?.gia_ban ?? null };
  }

  /** Ghi luot click (IP bam, khong luu IP tho); cung IP trong 30 phut chi tinh mot lan */
  async ghiClick(ma: string, thongTin: { ip?: string | null; userAgent?: string | null; nguonUrl?: string | null }): Promise<{ da_ghi: boolean }> {
    const row = await this.maRepo.timTheoMa(ma.trim().toUpperCase());
    if (!row || !row.bat) throw new NotFoundException("Mã giới thiệu không tồn tại hoặc đã tắt");
    const ipBam = thongTin.ip ? createHash("sha256").update(`tk-mgt|${thongTin.ip}`).digest("hex").slice(0, 32) : null;
    if (ipBam) {
      const ganDay = await this.maRepo.timClickGanDay(row.id, ipBam, new Date(Date.now() - KHOANG_CLICK_MS));
      if (ganDay) return { da_ghi: false };
    }
    await this.maRepo.taoClick({
      ma_gioi_thieu_id: row.id,
      ip_bam: ipBam,
      user_agent: thongTin.userAgent?.slice(0, 300) ?? null,
      nguon_url: thongTin.nguonUrl?.slice(0, 500) ?? null
    });
    return { da_ghi: true };
  }
}

const laQuanLy = (nd: ThongTinNguoiDung) => nd.vai.some(v => VAI_TOI_CAO.includes(v));
function dinhDangChienDich(c: chien_dich): ChienDichMl {
  return {
    id: c.id,
    ten: c.ten,
    mo_ta: c.mo_ta,
    mau_ids: c.mau_ids,
    ma_maus: c.ma_maus,
    vai_ap_dung: c.vai_ap_dung,
    ngan_sach: c.ngan_sach === null ? null : Number(c.ngan_sach),
    bat_dau: iso(c.bat_dau),
    han: iso(c.han),
    trang_thai: c.trang_thai,
    created_at: c.created_at.toISOString()
  };
}
/**
 * Chien dich KOL / KOC (+ CTV neu vai_ap_dung cho phep): nhan chien dich CHI khi moi SKU deu da co quyen,
 * nop kich ban / video (link), gan SKU, cap nhat luot xem / tuong tac, duyet & nghiem thu.
 */
@Injectable()
export class ChienDichService {
  constructor(
    private readonly repo: ChienDichRepository,
    private readonly hoSoRepo: HoSoMangLuoiRepository,
    private readonly crmDoc: CrmDocService,
    private readonly quyenSku: QuyenSkuService,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  // ---------------------------------------------------------------- quan ly chien dich

  /** Ma SKU -> (id, ma) tu CRM; bao loi ma khong ton tai */
  private async giaiMaSku(maMaus: string[]): Promise<{ ids: string[]; mas: string[] }> {
    const duy = [...new Set(maMaus.map(m => m.trim().toUpperCase()).filter(Boolean))];
    if (!duy.length) throw new BadRequestException("Chiến dịch cần ít nhất một mã sản phẩm");
    const ds = await Promise.all(duy.map(m => this.crmDoc.layMauTheoMa(m)));
    const thieu = duy.filter((_, i) => !ds[i]);
    if (thieu.length) throw new BadRequestException(`Không tìm thấy mã sản phẩm: ${thieu.join(", ")}`);
    return { ids: ds.map(m => m!.id), mas: ds.map(m => m!.ma) };
  }

  async tao(nd: ThongTinNguoiDung, body: TaoChienDichBody): Promise<ChienDichMl> {
    const sku = await this.giaiMaSku(body.ma_maus);
    const vai = (body.vai_ap_dung?.length ? body.vai_ap_dung : ["KOL", "KOC"]) as Vai[];
    if (body.bat_dau && body.han && new Date(body.han) < new Date(body.bat_dau)) throw new BadRequestException("Hạn chiến dịch phải sau ngày bắt đầu");
    const cd = await this.repo.tao({
      ten: body.ten.trim(),
      mo_ta: body.mo_ta?.trim() || null,
      mau_ids: sku.ids,
      ma_maus: sku.mas,
      vai_ap_dung: vai,
      ngan_sach: body.ngan_sach !== undefined ? new Prisma.Decimal(Math.round(body.ngan_sach)) : null,
      bat_dau: body.bat_dau ? new Date(body.bat_dau) : null,
      han: body.han ? new Date(body.han) : null,
      trang_thai: body.trang_thai ?? "NHAP",
      nguoi_tao_id: nd.id
    });
    await this.nhatKy.ghiAnToan({ hoSoId: nd.id, hanhDong: "TAO_CHIEN_DICH", doiTuong: "chien_dich", doiTuongId: cd.id, duLieu: { ten: cd.ten, ma_maus: cd.ma_maus } });
    return dinhDangChienDich(cd);
  }

  async capNhat(nd: ThongTinNguoiDung, id: string, body: CapNhatChienDichBody): Promise<ChienDichMl> {
    const cu = await this.repo.timTheoId(id);
    if (!cu) throw new NotFoundException("Không tìm thấy chiến dịch");
    const data: Prisma.chien_dichUpdateInput = {};
    if (body.ten !== undefined) data.ten = body.ten.trim();
    if (body.mo_ta !== undefined) data.mo_ta = body.mo_ta.trim() || null;
    if (body.ma_maus !== undefined) {
      const daCoNguoi = await this.repo.demThamGiaDaNhan(id);
      if (daCoNguoi) throw new ConflictException("Chiến dịch đã có người nhận — không đổi danh sách SKU, hãy tạo chiến dịch mới");
      const sku = await this.giaiMaSku(body.ma_maus);
      data.mau_ids = sku.ids;
      data.ma_maus = sku.mas;
    }
    if (body.vai_ap_dung !== undefined) data.vai_ap_dung = body.vai_ap_dung as Vai[];
    if (body.ngan_sach !== undefined) data.ngan_sach = new Prisma.Decimal(Math.round(body.ngan_sach));
    if (body.bat_dau !== undefined) data.bat_dau = body.bat_dau ? new Date(body.bat_dau) : null;
    if (body.han !== undefined) data.han = body.han ? new Date(body.han) : null;
    if (body.trang_thai !== undefined) data.trang_thai = body.trang_thai as TrangThaiChienDich;
    const cd = await this.repo.capNhat(id, data);
    await this.nhatKy.ghiAnToan({
      hoSoId: nd.id,
      hanhDong: "SUA_CHIEN_DICH",
      doiTuong: "chien_dich",
      doiTuongId: id,
      duLieu: { truoc: { trang_thai: cu.trang_thai, ma_maus: cu.ma_maus }, sau: { trang_thai: cd.trang_thai, ma_maus: cd.ma_maus } }
    });
    return dinhDangChienDich(cd);
  }

  async danhSachQuanLy(): Promise<ChienDichQuanLy[]> {
    const ds = await this.repo.danhSachMoiNhat();
    if (!ds.length) return [];
    const ids = ds.map(d => d.id);
    const [tg, nd] = await Promise.all([
      this.repo.demThamGiaTheoTrangThai(ids),
      this.repo.demNoiDungTheoChienDich(ids)
    ]);
    return ds.map(c => {
      const t = tg.filter(x => x.chien_dich_id === c.id);
      const n = nd.find(x => x.chien_dich_id === c.id);
      return {
        ...dinhDangChienDich(c),
        so_tham_gia: t.filter(x => x.trang_thai === "DA_DUYET" || x.trang_thai === "HOAN_THANH").reduce((s, x) => s + x._count._all, 0),
        so_cho_duyet: t.find(x => x.trang_thai === "CHO_DUYET")?._count._all ?? 0,
        so_noi_dung: n?._count._all ?? 0,
        tong_luot_xem: n?._sum.luot_xem ?? 0
      };
    });
  }

  // ---------------------------------------------------------------- nguoi tham gia

  /** Chien dich dang chay hop vai cua toi, kem co du quyen SKU chua + trang thai tham gia */
  async choToi(nd: ThongTinNguoiDung): Promise<ChienDichChoToi[]> {
    const ds = await this.repo.choNguoi(nd.id, nd.vai, laQuanLy(nd));
    const duocPhep = new Set(await this.quyenSku.layMauDuocPhep(nd.id));
    return ds.map(c => {
      const thieu = skuThieuQuyen(c.mau_ids, duocPhep);
      const tg = c.tham_gia[0];
      return {
        ...dinhDangChienDich(c),
        du_quyen: thieu.length === 0,
        ma_mau_thieu_quyen: thieu.map(id => c.ma_maus[c.mau_ids.indexOf(id)] ?? id),
        tham_gia: tg ? { id: tg.id, trang_thai: tg.trang_thai, ghi_chu: tg.ghi_chu, duyet_luc: iso(tg.duyet_luc) } : null
      };
    });
  }

  /** Nhan chien dich: dang chay, chua het han, dung vai, MOI SKU deu co quyen (403 neu thieu) -> CHO_DUYET */
  async nhan(nd: ThongTinNguoiDung, chienDichId: string, ghiChu?: string) {
    const cd = await this.repo.timTheoId(chienDichId);
    if (!cd) throw new NotFoundException("Không tìm thấy chiến dịch");
    if (cd.trang_thai !== "DANG_CHAY") throw new BadRequestException("Chiến dịch không trong thời gian nhận");
    if (cd.han && cd.han < new Date()) throw new BadRequestException("Chiến dịch đã hết hạn");
    if (cd.vai_ap_dung.length && !nd.vai.some(v => cd.vai_ap_dung.includes(v)) && !laQuanLy(nd)) {
      throw new ForbiddenException("Chiến dịch không áp dụng cho vai trò của bạn");
    }
    if (!nd.vai.some(v => VAI_GIOI_THIEU.includes(v))) throw new ForbiddenException("Chỉ KOL, KOC, CTV, thực tập sinh đang hoạt động mới nhận chiến dịch");
    // Moi SKU cua chien dich phai co quyen — kiem tung ma de bao dung ma thieu
    for (const mauId of cd.mau_ids) await this.quyenSku.kiem(nd.id, mauId, "NHAN_CHIEN_DICH");
    try {
      const tg = await this.repo.taoThamGia({ chien_dich_id: cd.id, ho_so_id: nd.id, ghi_chu: ghiChu?.trim() || null });
      await this.nhatKy.ghiAnToan({ hoSoId: nd.id, hanhDong: "NHAN_CHIEN_DICH", doiTuong: "tham_gia_chien_dich", doiTuongId: tg.id, duLieu: { chien_dich: cd.ten } });
      const phuTrach = (await this.hoSoRepo.layNguoiPhuTrach()).filter(id => id !== nd.id);
      await this.thongBao
        .guiNhieu(phuTrach, { loai: "CHIEN_DICH", tieuDe: `${nd.hoSo.ho_ten} đăng ký nhận chiến dịch "${cd.ten}"`, lienKet: "/lam-viec/mang-luoi/quan-ly" })
        .catch(() => 0);
      return { id: tg.id, trang_thai: tg.trang_thai };
    } catch (e) {
      if (laTrungKhoa(e)) throw new ConflictException("Bạn đã đăng ký chiến dịch này");
      throw e;
    }
  }

  async danhSachThamGia(chienDichId?: string): Promise<ThamGiaChienDichMl[]> {
    const ds = await this.repo.danhSachThamGia(chienDichId);
    const dem = ds.length
      ? await this.repo.demNoiDungTheoNguoi([...new Set(ds.map(d => d.chien_dich_id))], [...new Set(ds.map(d => d.ho_so_id))])
      : [];
    return ds.map(d => ({
      id: d.id,
      chien_dich_id: d.chien_dich_id,
      ten_chien_dich: d.chien_dich.ten,
      ho_so: d.ho_so,
      trang_thai: d.trang_thai,
      ghi_chu: d.ghi_chu,
      duyet_luc: iso(d.duyet_luc),
      so_noi_dung: dem.find(x => x.chien_dich_id === d.chien_dich_id && x.ho_so_id === d.ho_so_id)?._count._all ?? 0,
      created_at: d.created_at.toISOString()
    }));
  }

  /** QUAN_LY duyet dang ky tham gia (khong tu duyet cho minh) */
  async duyetThamGia(nd: ThongTinNguoiDung, id: string, dongY: boolean, ghiChu?: string) {
    const tg = await this.repo.timThamGiaKemChienDich(id);
    if (!tg) throw new NotFoundException("Không tìm thấy đăng ký tham gia");
    if (tg.ho_so_id === nd.id) throw new ForbiddenException("Không tự duyệt đăng ký của chính mình");
    if (dongY) {
      // Quyen SKU co the bi thu hoi / can hoc lai sau khi dang ky
      const duocPhep = new Set(await this.quyenSku.layMauDuocPhep(tg.ho_so_id));
      const thieu = skuThieuQuyen(tg.chien_dich.mau_ids, duocPhep);
      if (thieu.length) throw new ConflictException("Người đăng ký không còn đủ quyền SKU của chiến dịch");
    }
    const n = await this.repo.capNhatThamGiaNeu(id, "CHO_DUYET", {
      trang_thai: dongY ? "DA_DUYET" : "TU_CHOI",
      nguoi_duyet_id: nd.id,
      duyet_luc: new Date(),
      ghi_chu: ghiChu?.trim() || tg.ghi_chu
    });
    if (!n) throw new ConflictException("Đăng ký không còn ở trạng thái chờ duyệt");
    await this.nhatKy.ghiAnToan({ hoSoId: nd.id, hanhDong: dongY ? "DUYET_THAM_GIA" : "TU_CHOI_THAM_GIA", doiTuong: "tham_gia_chien_dich", doiTuongId: id, duLieu: { ghi_chu: ghiChu ?? null } });
    await this.thongBao
      .gui({
        hoSoId: tg.ho_so_id,
        loai: "CHIEN_DICH",
        tieuDe: dongY ? `Bạn đã được nhận chiến dịch "${tg.chien_dich.ten}"` : `Đăng ký chiến dịch "${tg.chien_dich.ten}" chưa được duyệt`,
        noiDung: ghiChu,
        lienKet: "/lam-viec/mang-luoi/chien-dich"
      })
      .catch(() => undefined);
    return { id, trang_thai: dongY ? "DA_DUYET" : "TU_CHOI" };
  }

  /** Nghiem thu: phai co it nhat mot noi dung DA_DUYET / DA_DANG trong chien dich */
  async nghiemThu(nd: ThongTinNguoiDung, id: string, ghiChu?: string) {
    const tg = await this.repo.timThamGiaKemChienDich(id);
    if (!tg) throw new NotFoundException("Không tìm thấy đăng ký tham gia");
    if (tg.ho_so_id === nd.id) throw new ForbiddenException("Không tự nghiệm thu cho chính mình");
    const dat = await this.repo.layNoiDungDat(tg.ho_so_id, tg.chien_dich_id);
    if (!dat.length) throw new BadRequestException("Chưa có nội dung nào được duyệt để nghiệm thu");
    const n = await this.repo.capNhatThamGiaNeu(id, "DA_DUYET", { trang_thai: "HOAN_THANH", ghi_chu: ghiChu?.trim() || tg.ghi_chu });
    if (!n) throw new ConflictException("Chỉ nghiệm thu đăng ký đã được nhận");
    const tong = { so_noi_dung: dat.length, luot_xem: dat.reduce((s, d) => s + d.luot_xem, 0), luot_tuong_tac: dat.reduce((s, d) => s + d.luot_tuong_tac, 0) };
    await this.nhatKy.ghiAnToan({ hoSoId: nd.id, hanhDong: "NGHIEM_THU_CHIEN_DICH", doiTuong: "tham_gia_chien_dich", doiTuongId: id, duLieu: { ...tong, ghi_chu: ghiChu ?? null } });
    await this.thongBao
      .gui({ hoSoId: tg.ho_so_id, loai: "CHIEN_DICH", tieuDe: `Chiến dịch "${tg.chien_dich.ten}" đã được nghiệm thu`, noiDung: ghiChu, lienKet: "/lam-viec/mang-luoi/chien-dich" })
      .catch(() => undefined);
    return { id, trang_thai: "HOAN_THANH", ...tong };
  }

  // ---------------------------------------------------------------- noi dung KOL / KOC

  private async dinhDangNoiDung(ds: (noi_dung_koc & { chien_dich: { ten: string } | null })[]): Promise<NoiDungKocMl[]> {
    const ten = await this.hoSoRepo.layTenHoSo(ds.map(d => d.ho_so_id));
    return ds.map(d => ({
      id: d.id,
      ho_so: ten.get(d.ho_so_id) ?? { id: d.ho_so_id, ho_ten: "—" },
      chien_dich_id: d.chien_dich_id,
      ten_chien_dich: d.chien_dich?.ten ?? null,
      mau_id: d.mau_id,
      ma_mau: d.ma_mau,
      loai: d.loai,
      tieu_de: d.tieu_de,
      kich_ban: d.kich_ban,
      link_video: d.link_video,
      nen_tang: (d.nen_tang as NoiDungKocMl["nen_tang"]) ?? null,
      trang_thai: d.trang_thai,
      nhan_xet: d.nhan_xet,
      duyet_luc: iso(d.duyet_luc),
      luot_xem: d.luot_xem,
      luot_tuong_tac: d.luot_tuong_tac,
      so_lieu_cap_nhat_luc: iso(d.so_lieu_cap_nhat_luc),
      created_at: d.created_at.toISOString(),
      updated_at: d.updated_at.toISOString()
    }));
  }

  /** Gan SKU: phai co quyen; neu thuoc chien dich thi SKU phai nam trong chien dich */
  private async ganSku(hoSoId: string, maMau: string, chienDich: chien_dich | null): Promise<{ id: string; ma: string }> {
    const mau = await this.crmDoc.layMauTheoMa(maMau);
    if (!mau) throw new NotFoundException(`Không tìm thấy mã sản phẩm ${maMau}`);
    await this.quyenSku.kiem(hoSoId, mau.id, "NHAN_CHIEN_DICH");
    if (chienDich && !chienDich.mau_ids.includes(mau.id)) throw new BadRequestException(`Mã ${mau.ma} không thuộc chiến dịch`);
    return { id: mau.id, ma: mau.ma };
  }

  private kiemNoiDung(loai: "KICH_BAN" | "VIDEO", kichBan?: string | null, link?: string | null) {
    if (loai === "VIDEO" && !laLinkHopLe(link)) throw new BadRequestException("Video cần đường dẫn hợp lệ (https://...)");
    if (loai === "KICH_BAN" && !kichBan?.trim() && !laLinkHopLe(link)) throw new BadRequestException("Kịch bản cần nội dung hoặc đường dẫn tài liệu");
    if (link && !laLinkHopLe(link)) throw new BadRequestException("Đường dẫn không hợp lệ");
  }

  async nopNoiDung(nd: ThongTinNguoiDung, body: NopNoiDungBody): Promise<NoiDungKocMl> {
    let cd: chien_dich | null = null;
    if (body.chien_dich_id) {
      cd = await this.repo.timTheoId(body.chien_dich_id);
      if (!cd) throw new NotFoundException("Không tìm thấy chiến dịch");
      const tg = await this.repo.timThamGia(cd.id, nd.id);
      if (tg?.trang_thai !== "DA_DUYET") throw new ForbiddenException("Bạn cần được nhận chiến dịch trước khi nộp nội dung");
    }
    this.kiemNoiDung(body.loai, body.kich_ban, body.link_video);
    // Noi dung trong chien dich mot SKU -> tu gan SKU do
    const maMau = body.ma_mau?.trim() || (cd && cd.ma_maus.length === 1 ? cd.ma_maus[0] : undefined);
    const sku = maMau ? await this.ganSku(nd.id, maMau, cd) : null;
    const moi = await this.repo.taoNoiDung({
      ho_so_id: nd.id,
      chien_dich_id: cd?.id ?? null,
      mau_id: sku?.id ?? null,
      ma_mau: sku?.ma ?? null,
      loai: body.loai,
      tieu_de: body.tieu_de.trim(),
      kich_ban: body.kich_ban?.trim() || null,
      link_video: body.link_video?.trim() || null,
      nen_tang: body.nen_tang ?? null,
      trang_thai: body.luu_nhap ? "NHAP" : "CHO_DUYET"
    });
    await this.nhatKy.ghiAnToan({ hoSoId: nd.id, hanhDong: "NOP_NOI_DUNG_KOC", doiTuong: "noi_dung_koc", doiTuongId: moi.id, duLieu: { loai: moi.loai, ma_mau: moi.ma_mau, chien_dich_id: moi.chien_dich_id } });
    return (await this.dinhDangNoiDung([moi]))[0]!;
  }

  /** Sua noi dung cua minh khi NHAP / CAN_SUA / TU_CHOI -> gui duyet lai */
  async suaNoiDung(nd: ThongTinNguoiDung, id: string, body: SuaNoiDungBody): Promise<NoiDungKocMl> {
    const cu = await this.repo.timNoiDungKemChienDich(id);
    if (!cu || cu.ho_so_id !== nd.id) throw new NotFoundException("Không tìm thấy nội dung");
    if (!(["NHAP", "CAN_SUA", "TU_CHOI"] as TrangThaiNoiDung[]).includes(cu.trang_thai)) throw new ConflictException("Nội dung đã duyệt / đang chờ duyệt — không sửa được");
    const loai = body.loai ?? cu.loai;
    const kichBan = body.kich_ban !== undefined ? body.kich_ban : cu.kich_ban;
    const link = body.link_video !== undefined ? body.link_video : cu.link_video;
    this.kiemNoiDung(loai, kichBan, link);
    const sku = body.ma_mau ? await this.ganSku(nd.id, body.ma_mau, cu.chien_dich) : null;
    const moi = await this.repo.capNhatNoiDung(id, {
      loai,
      tieu_de: body.tieu_de?.trim() ?? cu.tieu_de,
      kich_ban: kichBan?.trim() || null,
      link_video: link?.trim() || null,
      nen_tang: body.nen_tang ?? cu.nen_tang,
      ...(sku ? { mau_id: sku.id, ma_mau: sku.ma } : {}),
      trang_thai: body.luu_nhap ? "NHAP" : "CHO_DUYET"
    });
    return (await this.dinhDangNoiDung([moi]))[0]!;
  }

  async noiDungCuaToi(hoSoId: string): Promise<NoiDungKocMl[]> {
    const ds = await this.repo.noiDungCuaHoSo(hoSoId);
    return this.dinhDangNoiDung(ds);
  }

  async noiDungQuanLy(tuyChon: { trang_thai?: TrangThaiNoiDung; chien_dich_id?: string }): Promise<NoiDungKocMl[]> {
    const ds = await this.repo.noiDungLoc(tuyChon);
    return this.dinhDangNoiDung(ds);
  }

  /** Luot xem / tuong tac: chu noi dung (sau khi duyet) hoac quan ly nhap tay */
  async capNhatSoLieu(nd: ThongTinNguoiDung, id: string, body: CapNhatSoLieuBody): Promise<NoiDungKocMl> {
    const cu = await this.repo.timNoiDung(id);
    if (!cu) throw new NotFoundException("Không tìm thấy nội dung");
    const quanLy = laQuanLy(nd);
    if (cu.ho_so_id !== nd.id && !quanLy) throw new ForbiddenException("Chỉ chủ nội dung hoặc quản lý được cập nhật số liệu");
    if (cu.trang_thai !== "DA_DUYET" && cu.trang_thai !== "DA_DANG") throw new ConflictException("Chỉ cập nhật số liệu cho nội dung đã duyệt");
    if (body.da_dang && !laLinkHopLe(cu.link_video)) throw new BadRequestException("Cần đường dẫn bài đăng trước khi đánh dấu đã đăng");
    const moi = await this.repo.capNhatNoiDung(id, {
      luot_xem: body.luot_xem,
      luot_tuong_tac: body.luot_tuong_tac,
      so_lieu_cap_nhat_luc: new Date(),
      ...(body.da_dang ? { trang_thai: "DA_DANG" as const } : {})
    });
    await this.nhatKy.ghiAnToan({
      hoSoId: nd.id,
      hanhDong: "CAP_NHAT_SO_LIEU_NOI_DUNG",
      doiTuong: "noi_dung_koc",
      doiTuongId: id,
      duLieu: { truoc: { luot_xem: cu.luot_xem, luot_tuong_tac: cu.luot_tuong_tac }, sau: { luot_xem: body.luot_xem, luot_tuong_tac: body.luot_tuong_tac }, boi_quan_ly: cu.ho_so_id !== nd.id }
    });
    return (await this.dinhDangNoiDung([moi]))[0]!;
  }

  /** QUAN_LY duyet noi dung CHO_DUYET (khong tu duyet) */
  async duyetNoiDung(nd: ThongTinNguoiDung, id: string, body: DuyetNoiDungBody): Promise<NoiDungKocMl> {
    const cu = await this.repo.timNoiDung(id);
    if (!cu) throw new NotFoundException("Không tìm thấy nội dung");
    if (cu.ho_so_id === nd.id) throw new ForbiddenException("Không tự duyệt nội dung của chính mình");
    if (body.ket_qua !== "DA_DUYET" && !body.nhan_xet?.trim()) throw new BadRequestException("Cần nhận xét khi yêu cầu sửa / từ chối");
    const n = await this.repo.capNhatNoiDungNeu(id, "CHO_DUYET", { trang_thai: body.ket_qua, nhan_xet: body.nhan_xet?.trim() || null, nguoi_duyet_id: nd.id, duyet_luc: new Date() });
    if (!n) throw new ConflictException("Nội dung không ở trạng thái chờ duyệt");
    await this.nhatKy.ghiAnToan({ hoSoId: nd.id, hanhDong: "DUYET_NOI_DUNG_KOC", doiTuong: "noi_dung_koc", doiTuongId: id, duLieu: { ket_qua: body.ket_qua, nhan_xet: body.nhan_xet ?? null } });
    await this.thongBao
      .gui({
        hoSoId: cu.ho_so_id,
        loai: "CHIEN_DICH",
        tieuDe: body.ket_qua === "DA_DUYET" ? `Nội dung "${cu.tieu_de}" đã được duyệt` : body.ket_qua === "CAN_SUA" ? `Nội dung "${cu.tieu_de}" cần sửa` : `Nội dung "${cu.tieu_de}" bị từ chối`,
        noiDung: body.nhan_xet,
        lienKet: "/lam-viec/mang-luoi/noi-dung"
      })
      .catch(() => undefined);
    const moi = await this.repo.layNoiDungKemTen(id);
    return (await this.dinhDangNoiDung([moi]))[0]!;
  }
}

/** Diem trung binh lam tron, null khi rong */
const trungBinh = (a: number[]) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null);
/**
 * Thuc tap sinh: lo trinh (khoa hoc ap dung THUC_TAP), bai tap co mentor cham, danh gia tong hop ->
 * mentor / quan ly lap de_xuat_duyet CHUYEN_VAI (2 buoc: quan-tri duyet roi ap dung). Sale / CSKH lay tu CRM — khong de xuat;
 * TTS hoc dat khoa CTV thi ho-so tu them vai CTV (VaiService.xetTtsLenCtv).
 * Bai tap luu o bai_thuc_hanh (vai = THUC_TAP) de dung chung bang chung hoc voi LMS.
 */
@Injectable()
export class ThucTapService {
  constructor(
    private readonly repo: ThucTapRepository,
    private readonly hoSoRepo: HoSoMangLuoiRepository,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  async loTrinh(hoSoId: string): Promise<KhoaHocLoTrinhTts[]> {
    const khoa = await this.repo.layKhoaLoTrinh();
    if (!khoa.length) return [];
    const baiHocIds = khoa.flatMap(k => k.bai_hoc.map(b => b.id));
    const ktIds = khoa.flatMap(k => k.bai_kiem_tra.map(b => b.id));
    const [xong, luot, baiTap] = await Promise.all([
      this.repo.layBaiHocDaXong(hoSoId, baiHocIds),
      this.repo.layLuotLamDaNop(hoSoId, ktIds),
      this.repo.layTrangThaiBaiTapTheoKhoa(hoSoId, khoa.map(k => k.id))
    ]);
    const daXong = new Set(xong.map(x => x.bai_hoc_id));
    return khoa.map(k => {
      const ktCuaKhoa = new Set(k.bai_kiem_tra.map(b => b.id));
      const l = luot.filter(x => ktCuaKhoa.has(x.bai_kiem_tra_id));
      const bt = baiTap.filter(b => b.khoa_hoc_id === k.id);
      return {
        id: k.id,
        ma: k.ma,
        ten: k.ten,
        loai: k.loai,
        bat_buoc: k.bat_buoc,
        can_thuc_hanh: k.can_thuc_hanh,
        yeu_cau_thuc_hanh: k.yeu_cau_thuc_hanh,
        so_bai_hoc: k.bai_hoc.length,
        so_bai_xong: k.bai_hoc.filter(b => daXong.has(b.id)).length,
        diem_kiem_tra: l.length ? Math.max(...l.map(x => x.diem)) : null,
        dat_kiem_tra: l.some(x => x.dat),
        bai_tap: { tong: bt.length, dat: bt.filter(b => b.trang_thai === "DAT").length, cho_cham: bt.filter(b => b.trang_thai === "CHO_CHAM").length }
      };
    });
  }

  private async dinhDang(ds: (bai_thuc_hanh & { khoa_hoc: { id: string; ten: string } })[]): Promise<BaiTapTts[]> {
    const ten = await this.hoSoRepo.layTenHoSo(ds.flatMap(d => [d.ho_so_id, d.nguoi_cham_id]));
    return ds.map(d => ({
      id: d.id,
      khoa_hoc: d.khoa_hoc,
      ho_so: ten.get(d.ho_so_id) ?? { id: d.ho_so_id, ho_ten: "—" },
      tieu_de: d.tieu_de,
      mo_ta: d.mo_ta,
      link: d.link,
      trang_thai: d.trang_thai,
      diem: d.diem,
      nhan_xet: d.nhan_xet,
      nguoi_cham: d.nguoi_cham_id ? (ten.get(d.nguoi_cham_id) ?? null) : null,
      cham_luc: iso(d.cham_luc),
      nop_luc: d.nop_luc.toISOString()
    }));
  }

  async nopBaiTap(nd: ThongTinNguoiDung, body: NopBaiTapTtsBody): Promise<BaiTapTts> {
    if (!nd.vaiChiTiet.some(v => v.vai === "THUC_TAP" && v.trang_thai !== "KET_THUC")) throw new ForbiddenException("Chỉ thực tập sinh mới nộp bài tập ở đây");
    const khoa = await this.repo.timKhoaHoc(body.khoa_hoc_id);
    if (!khoa || !khoa.bat || !khoa.vai_ap_dung.includes("THUC_TAP")) throw new NotFoundException("Khoá học không thuộc lộ trình thực tập");
    if (!body.link?.trim() && !body.mo_ta?.trim()) throw new BadRequestException("Bài tập cần mô tả hoặc đường dẫn bài làm");
    if (body.link && !laLinkHopLe(body.link)) throw new BadRequestException("Đường dẫn bài làm không hợp lệ");
    const moi = await this.repo.taoBaiTap({ khoa_hoc_id: khoa.id, ho_so_id: nd.id, tieu_de: body.tieu_de.trim(), mo_ta: body.mo_ta?.trim() || null, link: body.link?.trim() || null });
    await this.nhatKy.ghiAnToan({ hoSoId: nd.id, hanhDong: "NOP_BAI_TAP_TTS", doiTuong: "bai_thuc_hanh", doiTuongId: moi.id, duLieu: { khoa_hoc_id: khoa.id } });
    const mentor = await this.hoSoRepo.layHoSoIdCoVai(["MENTOR"]);
    await this.thongBao
      .guiNhieu(
        mentor.filter(id => id !== nd.id),
        { loai: "DAO_TAO", tieuDe: `${nd.hoSo.ho_ten} vừa nộp bài tập "${moi.tieu_de}"`, lienKet: "/lam-viec/mang-luoi/thuc-tap" }
      )
      .catch(() => 0);
    return (await this.dinhDang([moi]))[0]!;
  }

  async baiTapCuaToi(hoSoId: string): Promise<BaiTapTts[]> {
    const ds = await this.repo.baiTapCuaHoSo(hoSoId);
    return this.dinhDang(ds);
  }

  /** Mentor / quan ly: bai tap TTS (mac dinh cho cham) */
  async baiTapChoMentor(trangThai?: TrangThaiThucHanh, hoSoId?: string): Promise<BaiTapTts[]> {
    const ds = await this.repo.baiTapLoc(trangThai, hoSoId);
    return this.dinhDang(ds);
  }

  /** Mentor cham: khong cham bai cua chinh minh; chi bai CHO_CHAM (updateMany co dieu kien chong cham trung) */
  async cham(nd: ThongTinNguoiDung, id: string, body: ChamBaiTapTtsBody): Promise<BaiTapTts> {
    const bt = await this.repo.timBaiTap(id);
    if (!bt || bt.vai !== "THUC_TAP") throw new NotFoundException("Không tìm thấy bài tập thực tập");
    if (bt.ho_so_id === nd.id) throw new ForbiddenException("Không tự chấm bài của chính mình");
    if (body.diem < 0 || body.diem > 100) throw new BadRequestException("Điểm từ 0 đến 100");
    const n = await this.repo.chamNeuChoCham(id, { trang_thai: body.ket_qua, diem: body.diem, nhan_xet: body.nhan_xet.trim(), nguoi_cham_id: nd.id, cham_luc: new Date() });
    if (!n) throw new ConflictException("Bài tập đã được chấm");
    await this.nhatKy.ghiAnToan({ hoSoId: nd.id, hanhDong: "CHAM_BAI_TAP_TTS", doiTuong: "bai_thuc_hanh", doiTuongId: id, duLieu: { ket_qua: body.ket_qua, diem: body.diem } });
    await this.thongBao
      .gui({
        hoSoId: bt.ho_so_id,
        loai: "DAO_TAO",
        tieuDe: `Bài tập "${bt.tieu_de ?? ""}" ${body.ket_qua === "DAT" ? "đạt" : "chưa đạt"} (${body.diem}/100)`,
        noiDung: body.nhan_xet,
        lienKet: "/lam-viec/mang-luoi/thuc-tap"
      })
      .catch(() => undefined);
    const moi = await this.repo.layBaiTapKemKhoa(id);
    return (await this.dinhDang([moi]))[0]!;
  }

  /** Ket qua danh gia mot TTS — can cu de xuat chuyen vai */
  async danhGia(hoSoId: string): Promise<DanhGiaTts> {
    const hs = await this.hoSoRepo.timKemVai(hoSoId);
    if (!hs) throw new NotFoundException("Không tìm thấy hồ sơ");
    const lt = await this.loTrinh(hoSoId);
    const [bt, luot, deXuat] = await Promise.all([
      this.repo.layDiemBaiTap(hoSoId),
      this.repo.layLuotLamDaNop(hoSoId),
      this.repo.layDeXuatChuyenVaiDangMo(hoSoId)
    ]);
    // Moi bai kiem tra lay diem cao nhat
    const caoNhat = new Map<string, { diem: number; dat: boolean }>();
    for (const l of luot) {
      const c = caoNhat.get(l.bai_kiem_tra_id);
      if (!c || l.diem > c.diem) caoNhat.set(l.bai_kiem_tra_id, { diem: l.diem, dat: l.dat || !!c?.dat });
      else if (l.dat) c.dat = true;
    }
    const kt = [...caoNhat.values()];
    const diemBt = bt.filter(b => b.trang_thai !== "CHO_CHAM" && b.diem !== null).map(b => b.diem!);
    return {
      ho_so: { id: hs.id, ho_ten: hs.ho_ten, email: hs.email },
      vai: hs.vai_tro.map(v => ({ vai: v.vai, trang_thai: v.trang_thai })),
      bai_tap: {
        tong: bt.length,
        dat: bt.filter(b => b.trang_thai === "DAT").length,
        chua_dat: bt.filter(b => b.trang_thai === "CHUA_DAT").length,
        cho_cham: bt.filter(b => b.trang_thai === "CHO_CHAM").length,
        diem_tb: trungBinh(diemBt)
      },
      kiem_tra: { tong: kt.length, dat: kt.filter(k => k.dat).length, diem_tb: trungBinh(kt.map(k => k.diem)) },
      bai_hoc: { xong: lt.reduce((s, k) => s + k.so_bai_xong, 0), tong: lt.reduce((s, k) => s + k.so_bai_hoc, 0) },
      de_xuat_dang_mo: deXuat.map(d => ({
        id: d.id,
        sang_vai: ((d.du_lieu ?? {}) as { vai?: Vai }).vai ?? "KHACH",
        // De xuat chuyen vai la 2 buoc: ban ghi CHO_KIEM (tao truoc khi gon) hien la cho duyet
        trang_thai: trangThaiHieuLuc({ loai: "CHUYEN_VAI", trang_thai: d.trang_thai }),
        created_at: d.created_at.toISOString()
      }))
    };
  }

  /** Danh sach TTS (mentor xem) kem tom tat danh gia */
  async danhSachTts(): Promise<DanhGiaTts[]> {
    const ds = await this.repo.layHoSoIdTts();
    return Promise.all(ds.map(id => this.danhGia(id)));
  }

  /**
   * Mentor / quan ly de xuat chuyen vai cho TTS (CHUYEN_VAI, doi_tuong ho_so) — can cu: it nhat mot bai tap DAT.
   * Nguoi de xuat khong la chinh TTS; duyet o ban phe duyet (2 buoc: nguoi duyet khac nguoi de xuat).
   * Sale / CSKH la vai lay tu CRM -> 400.
   */
  async deXuatChuyenVai(nd: ThongTinNguoiDung, body: DeXuatChuyenVaiTtsBody) {
    if (body.ho_so_id === nd.id) throw new ForbiddenException("Không tự đề xuất chuyển vai cho chính mình");
    kiemVaiKhongTuCrm(body.sang_vai);
    const dg = await this.danhGia(body.ho_so_id);
    if (!dg.vai.some(v => v.vai === "THUC_TAP" && v.trang_thai !== "KET_THUC")) throw new BadRequestException("Hồ sơ không phải thực tập sinh");
    if (dg.bai_tap.dat < 1) throw new BadRequestException("Cần ít nhất một bài tập được mentor chấm đạt làm căn cứ đề xuất");
    if (dg.vai.some(v => v.vai === body.sang_vai && v.trang_thai === "HOAT_DONG")) throw new ConflictException("Hồ sơ đã có vai này");
    if (dg.de_xuat_dang_mo.some(d => d.sang_vai === body.sang_vai)) throw new ConflictException("Đã có đề xuất chuyển sang vai này đang chờ duyệt");
    const trangThaiMoi: TrangThaiVai = body.trang_thai_moi ?? "DANG_HOC";
    const dx = await this.repo.chayTrongGiaoDich(async tx => {
      const dx = await this.repo.taoDeXuatChuyenVai(
        body.ho_so_id,
        // Dang du_lieu khop DuLieuDeXuatChuyenVai cua quan-tri ({ vai, trang_thai_moi }) + can cu
        {
          vai: body.sang_vai,
          trang_thai_moi: trangThaiMoi,
          tu_vai: "THUC_TAP",
          can_cu: { bai_tap: dg.bai_tap, kiem_tra: dg.kiem_tra, bai_hoc: dg.bai_hoc }
        },
        body.ly_do.trim(),
        nd.id,
        tx
      );
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "DE_XUAT_CHUYEN_VAI_TTS", doiTuong: "de_xuat_duyet", doiTuongId: dx.id, duLieu: { ho_so_id: body.ho_so_id, sang_vai: body.sang_vai } }, tx);
      return dx;
    });
    const phuTrach = (await this.hoSoRepo.layNguoiPhuTrach()).filter(id => id !== nd.id && id !== body.ho_so_id);
    await this.thongBao
      .guiNhieu(phuTrach, { loai: "PHE_DUYET", tieuDe: `Đề xuất chuyển ${dg.ho_so.ho_ten} sang vai ${body.sang_vai}`, noiDung: body.ly_do, lienKet: "/quan-tri/phe-duyet" })
      .catch(() => 0);
    await this.thongBao
      .gui({ hoSoId: body.ho_so_id, loai: "PHE_DUYET", tieuDe: `Bạn được đề xuất chuyển sang vai ${body.sang_vai}`, noiDung: "Đề xuất đang chờ duyệt.", lienKet: "/lam-viec/mang-luoi/thuc-tap" })
      .catch(() => undefined);
    return { id: dx.id, trang_thai: trangThaiHieuLuc(dx) };
  }
}
