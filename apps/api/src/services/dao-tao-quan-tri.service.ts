// Quan tri noi dung dao tao. Lop: QuanTriNoiDungService.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Vai } from "@prisma/client";
import type {
  BaiHocQuanTri,
  BaiKiemTraQuanTri,
  CauHoiQuanTri,
  KhoaHocQuanTri,
  KhoaHocQuanTriChiTiet,
  SuaBaiHocBody,
  SuaBaiKiemTraBody,
  SuaCauHoiBody,
  SuaKhoaHocBody,
  TaoBaiHocBody,
  TaoBaiKiemTraBody,
  TaoCauHoiBody,
  TaoKhoaHocBody
} from "@thien-khue/contracts";
import { coMeta, type KetQuaCoMeta } from "../common/interceptors/bao-response.interceptor";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { chuanHoaCauHoi, laUuid, NGUONG_DAT_TOI_THIEU, VAI_PHAI_HOC } from "../common/utils/dao-tao";
import { type PhanTrangMeta, phanTrang, taoMetaPhanTrang } from "../common/utils/phan-trang";
import { CrmDocService } from "../infrastructure/crm/crm-doc.service";
import { type KhoaCoDem, QuanTriNoiDungRepository } from "../repositories/dao-tao.repository";
import { NhatKyService } from "./core.service";

/** Loi trung khoa duy nhat (ma) -> 409 tieng Viet */
function batTrung(e: unknown, thongDiep: string): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ConflictException(thongDiep);
  throw e;
}

function kiemId(id: string, ten: string): void {
  if (!laUuid(id)) throw new NotFoundException(`Không tìm thấy ${ten}`);
}

/** Kiem cau hoi: >= 2 lua chon khong rong, >= 1 dap an trong khoang */
export function kiemCauHoi(luaChon: string[], dapAn: number[]): void {
  if (luaChon.length < 2 || luaChon.some(l => !l.trim())) throw new BadRequestException("Câu hỏi cần ít nhất 2 lựa chọn, không để trống");
  if (!dapAn.length) throw new BadRequestException("Câu hỏi cần ít nhất 1 đáp án đúng");
  if (dapAn.some(d => !Number.isInteger(d) || d < 0 || d >= luaChon.length)) throw new BadRequestException("Đáp án phải là chỉ số của một lựa chọn");
}

/** Nguoi thao tac (tu token) — can vai de kiem quyen noi cong hoc + xung dot loi ich */
export type NguoiThaoTac = Pick<ThongTinNguoiDung, "id" | "vai" | "vaiChiTiet">;

/*
 * Cong "hoc truoc khi ban" (LOI-CAN-SUA muc 9/11): moi thao tac NOI cong (tat bai thi / khoa bat buoc, bo bat_buoc,
 * bo yeu cau thuc hanh, bo vai khoi khoa bat buoc) la quyet dinh cap quyen ban -> chi THIEN_KHUE that (khong phai ADMIN /
 * QUAN_LY qua VAI_TOI_CAO). Nguoi dang hoc khoa (vai phai hoc nam trong vai_ap_dung) khong xem dap an / sua de cua khoa do.
 */
export function laThienKhue(nd: Pick<NguoiThaoTac, "vai">): boolean {
  return nd.vai.includes("THIEN_KHUE");
}

export function kiemNoiCongHoc(nd: Pick<NguoiThaoTac, "vai">, thayDoi: string[]): void {
  if (!thayDoi.length || laThienKhue(nd)) return;
  throw new ForbiddenException(
    `Chỉ Thiên Khuê được nới điều kiện học (${thayDoi.join("; ")}). Vui lòng gửi đề xuất cho Thiên Khuê duyệt.`
  );
}

/** Nguoi thao tac co vai phai hoc (chua KET_THUC) ma khoa ap dung -> la hoc vien cua khoa */
export function laHocVienCuaKhoa(nd: Pick<NguoiThaoTac, "vaiChiTiet">, vaiApDung: readonly Vai[]): boolean {
  return nd.vaiChiTiet.some(v => VAI_PHAI_HOC.includes(v.vai) && v.trang_thai !== "KET_THUC" && vaiApDung.includes(v.vai));
}

function kiemKhongPhaiHocVien(nd: Pick<NguoiThaoTac, "vaiChiTiet">, vaiApDung: readonly Vai[]): void {
  if (laHocVienCuaKhoa(nd, vaiApDung)) {
    throw new ForbiddenException("Bạn đang là học viên của khoá này nên không được xem đáp án hoặc sửa đề thi của khoá");
  }
}

function kiemNguong(nguong: number | undefined): void {
  if (nguong !== undefined && (!Number.isInteger(nguong) || nguong < NGUONG_DAT_TOI_THIEU || nguong > 100)) {
    throw new BadRequestException(`Ngưỡng đạt phải từ ${NGUONG_DAT_TOI_THIEU}% đến 100%`);
  }
}

/** Thay doi lam NOI cong o khoa (so voi trang thai hien tai) — rong = khong noi */
export function thayDoiNoiKhoa(
  cu: { bat: boolean; bat_buoc: boolean; can_thuc_hanh: boolean; vai_ap_dung: Vai[] },
  body: Pick<SuaKhoaHocBody, "bat" | "bat_buoc" | "can_thuc_hanh" | "vai_ap_dung">
): string[] {
  const ds: string[] = [];
  const congBatBuoc = cu.bat && cu.bat_buoc;
  if (cu.bat_buoc && body.bat_buoc === false) ds.push("bỏ bắt buộc của khoá");
  if (cu.can_thuc_hanh && body.can_thuc_hanh === false) ds.push("bỏ yêu cầu bài thực hành");
  if (congBatBuoc && body.bat === false) ds.push("tắt khoá bắt buộc");
  const vaiMoi = body.vai_ap_dung;
  if (congBatBuoc && vaiMoi) {
    const bo = cu.vai_ap_dung.filter(v => !vaiMoi.includes(v));
    if (bo.length) ds.push(`bỏ vai ${bo.join(", ")} khỏi khoá bắt buộc`);
  }
  return ds;
}

/** Thay doi lam NOI cong o bai kiem tra */
export function thayDoiNoiDe(cu: { bat: boolean; bat_buoc: boolean }, body: Pick<SuaBaiKiemTraBody, "bat" | "bat_buoc">): string[] {
  const ds: string[] = [];
  if (cu.bat_buoc && body.bat_buoc === false) ds.push("bỏ bắt buộc của bài kiểm tra");
  if (cu.bat && cu.bat_buoc && body.bat === false) ds.push("tắt bài kiểm tra bắt buộc");
  return ds;
}

/** An dap an + giai thich (nguoi xem dang hoc khoa) */
function anDapAn(d: BaiKiemTraQuanTri): BaiKiemTraQuanTri {
  return d.cau_hoi ? { ...d, cau_hoi: d.cau_hoi.map(c => ({ ...c, dap_an: [], giai_thich: null })) } : d;
}

function anhXaKhoa(k: KhoaCoDem, soHocVien: number): KhoaHocQuanTri {
  const { _count, created_at, updated_at, ...con } = k;
  return {
    ...con,
    so_bai: _count.bai_hoc,
    so_bai_kiem_tra: _count.bai_kiem_tra,
    so_hoc_vien: soHocVien,
    created_at: created_at.toISOString(),
    updated_at: updated_at.toISOString()
  };
}

function anhXaBai(b: Prisma.bai_hocGetPayload<object>): BaiHocQuanTri {
  const { created_at: _c, updated_at: _u, ...con } = b;
  return con;
}

function anhXaCau(c: Prisma.cau_hoiGetPayload<object>): CauHoiQuanTri {
  const n = chuanHoaCauHoi(c);
  return { id: c.id, bai_kiem_tra_id: c.bai_kiem_tra_id, ma: c.ma, noi_dung: c.noi_dung, lua_chon: n.lua_chon, dap_an: n.dap_an, giai_thich: c.giai_thich, diem: c.diem, thu_tu: c.thu_tu };
}

function anhXaDe(d: Prisma.bai_kiem_traGetPayload<{ include: { cau_hoi: true } }> | (Prisma.bai_kiem_traGetPayload<object> & { _count?: { cau_hoi: number } })): BaiKiemTraQuanTri {
  const cauHoi = "cau_hoi" in d ? [...d.cau_hoi].sort((a, b) => a.thu_tu - b.thu_tu || a.ma.localeCompare(b.ma)) : undefined;
  return {
    id: d.id,
    khoa_hoc_id: d.khoa_hoc_id,
    ma: d.ma,
    tieu_de: d.tieu_de,
    nguong_dat: d.nguong_dat,
    bat_buoc: d.bat_buoc,
    so_cau_hien: d.so_cau_hien,
    thoi_gian_phut: d.thoi_gian_phut,
    so_lan_toi_da: d.so_lan_toi_da,
    bat: d.bat,
    so_cau: cauHoi ? cauHoi.length : ("_count" in d && d._count ? d._count.cau_hoi : 0),
    ...(cauHoi ? { cau_hoi: cauHoi.map(anhXaCau) } : {})
  };
}

/**
 * Quan tri noi dung LMS (QUAN_LY / ADMIN / THIEN_KHUE). Xoa khoa / bai / de = tat (bat=false) de giu bang chung
 * (luot lam, chung chi, quyen SKU tro toi). Cau hoi xoa that (luot lam luu tra_loi theo id, khong FK).
 */
@Injectable()
export class QuanTriNoiDungService {
  constructor(
    private readonly repo: QuanTriNoiDungRepository,
    private readonly crmDoc: CrmDocService,
    private readonly nhatKy: NhatKyService
  ) {}

  // ---------------------------------------------------------------- khoa hoc

  async danhSachKhoa(q: { trang?: number; so_dong?: number; loai?: TaoKhoaHocBody["loai"]; tu_khoa?: string; bat?: boolean }): Promise<KetQuaCoMeta<KhoaHocQuanTri[], PhanTrangMeta>> {
    const { skip, take, trang, so_dong } = phanTrang(q, 50);
    const loc = { loai: q.loai, bat: q.bat, tuKhoa: q.tu_khoa?.trim() };
    const [ds, tong] = await Promise.all([this.repo.dsKhoa(loc, skip, take), this.repo.demKhoa(loc)]);
    const soHocVien = await this.demHocVien(ds.map(k => k.id));
    return coMeta(
      ds.map(k => anhXaKhoa(k, soHocVien.get(k.id) ?? 0)),
      taoMetaPhanTrang(trang, so_dong, tong)
    );
  }

  /** So hoc vien da bat dau (co tien do bai / luot thi / thuc hanh) moi khoa */
  private async demHocVien(khoaIds: string[]): Promise<Map<string, number>> {
    if (!khoaIds.length) return new Map();
    const rows = await this.repo.demHocVienTheoKhoa(khoaIds);
    return new Map(rows.map(r => [r.khoa_hoc_id, Number(r.so)]));
  }

  async chiTietKhoa(nd: NguoiThaoTac, id: string): Promise<KhoaHocQuanTriChiTiet> {
    kiemId(id, "khoá học");
    const k = await this.repo.chiTietKhoa(id);
    if (!k) throw new NotFoundException("Không tìm thấy khoá học");
    const soHocVien = await this.demHocVien([k.id]);
    const { bai_hoc, bai_kiem_tra, ...goc } = k;
    const hocVien = laHocVienCuaKhoa(nd, k.vai_ap_dung);
    const dsDe = bai_kiem_tra.map(anhXaDe).map(d => (hocVien ? anDapAn(d) : d));
    return { ...anhXaKhoa(goc, soHocVien.get(k.id) ?? 0), bai_hoc: bai_hoc.map(anhXaBai), bai_kiem_tra: dsDe };
  }

  async taoKhoa(nd: NguoiThaoTac, body: TaoKhoaHocBody): Promise<KhoaHocQuanTri> {
    // Khoa nghiep vu mac dinh yeu cau thuc hanh; tao khoa nghiep vu KHONG thuc hanh = noi cong -> chi Thien Khue
    const canThucHanh = body.can_thuc_hanh ?? body.loai === "NGHIEP_VU";
    if (body.loai === "NGHIEP_VU" && !canThucHanh) kiemNoiCongHoc(nd, ["tạo khoá nghiệp vụ không yêu cầu bài thực hành"]);
    let mauId: string | null = null;
    let maMau: string | null = null;
    if (body.loai === "SAN_PHAM") {
      // Khoa san pham phai gan dung mot mau CRM — doc qua CrmDocService
      const mau = body.mau_id ? await this.crmDoc.layMau(body.mau_id) : body.ma_mau ? await this.crmDoc.layMauTheoMa(body.ma_mau) : null;
      if (!mau) throw new BadRequestException("Khoá sản phẩm cần mã sản phẩm (mau_id hoặc ma_mau) có trên CRM");
      const trung = await this.repo.timKhoaSanPhamDangBatTheoMau(mau.id);
      if (trung) throw new ConflictException(`Mã ${mau.ma} đã có khoá sản phẩm “${trung.ma}”`);
      mauId = mau.id;
      maMau = mau.ma;
    }
    const k = await this.repo
      .taoKhoa({
          ma: body.ma.trim(),
          ten: body.ten.trim(),
          mo_ta: body.mo_ta ?? null,
          loai: body.loai,
          vai_ap_dung: [...new Set(body.vai_ap_dung)],
          mau_id: mauId,
          ma_mau: maMau,
          bat_buoc: body.bat_buoc ?? body.loai !== "SAN_PHAM",
          can_thuc_hanh: canThucHanh,
          yeu_cau_thuc_hanh: body.yeu_cau_thuc_hanh ?? null,
          mau_sac: body.mau_sac ?? null,
          thu_tu: body.thu_tu ?? 0,
          bat: body.bat ?? true
      })
      .catch(e => batTrung(e, `Mã khoá “${body.ma}” đã tồn tại`));
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "TAO_KHOA_HOC", doiTuong: "khoa_hoc", doiTuongId: k.id, duLieu: { ma: k.ma, loai: k.loai } });
    return anhXaKhoa(k, 0);
  }

  async suaKhoa(nd: NguoiThaoTac, id: string, body: SuaKhoaHocBody): Promise<KhoaHocQuanTri> {
    kiemId(id, "khoá học");
    const cu = await this.repo.layCoCongCuaKhoa(id);
    if (!cu) throw new NotFoundException("Không tìm thấy khoá học");
    kiemNoiCongHoc(nd, thayDoiNoiKhoa(cu, body));
    const data: Prisma.khoa_hocUpdateInput = {
      ...(body.ma !== undefined ? { ma: body.ma.trim() } : {}),
      ...(body.ten !== undefined ? { ten: body.ten.trim() } : {}),
      ...(body.mo_ta !== undefined ? { mo_ta: body.mo_ta } : {}),
      ...(body.vai_ap_dung !== undefined ? { vai_ap_dung: [...new Set(body.vai_ap_dung)] } : {}),
      ...(body.bat_buoc !== undefined ? { bat_buoc: body.bat_buoc } : {}),
      ...(body.can_thuc_hanh !== undefined ? { can_thuc_hanh: body.can_thuc_hanh } : {}),
      ...(body.yeu_cau_thuc_hanh !== undefined ? { yeu_cau_thuc_hanh: body.yeu_cau_thuc_hanh } : {}),
      ...(body.mau_sac !== undefined ? { mau_sac: body.mau_sac } : {}),
      ...(body.thu_tu !== undefined ? { thu_tu: body.thu_tu } : {}),
      ...(body.bat !== undefined ? { bat: body.bat } : {})
    };
    const k = await this.repo
      .suaKhoa(id, data)
      .catch(e => {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new NotFoundException("Không tìm thấy khoá học");
        return batTrung(e, `Mã khoá “${body.ma}” đã tồn tại`);
      });
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "SUA_KHOA_HOC", doiTuong: "khoa_hoc", doiTuongId: id, duLieu: data as Prisma.InputJsonValue });
    return anhXaKhoa(k, (await this.demHocVien([k.id])).get(k.id) ?? 0);
  }

  async tatKhoa(nd: NguoiThaoTac, id: string): Promise<KhoaHocQuanTri> {
    return this.suaKhoa(nd, id, { bat: false });
  }

  // ---------------------------------------------------------------- bai hoc

  async taoBai(nguoiId: string, khoaHocId: string, body: TaoBaiHocBody): Promise<BaiHocQuanTri> {
    kiemId(khoaHocId, "khoá học");
    const khoa = await this.repo.timIdKhoa(khoaHocId);
    if (!khoa) throw new NotFoundException("Không tìm thấy khoá học");
    const b = await this.repo
      .taoBai({
          khoa_hoc_id: khoa.id,
          ma: body.ma.trim(),
          tieu_de: body.tieu_de.trim(),
          chuong: body.chuong ?? null,
          loai_noi_dung: body.loai_noi_dung ?? "MARKDOWN",
          noi_dung: body.noi_dung ?? null,
          video_url: body.video_url ?? null,
          tom_tat: body.tom_tat ?? null,
          thoi_luong_phut: body.thoi_luong_phut ?? null,
          thu_tu: body.thu_tu ?? 0,
          bat: body.bat ?? true
      })
      .catch(e => batTrung(e, `Mã bài “${body.ma}” đã có trong khoá này`));
    await this.nhatKy.ghi({ hoSoId: nguoiId, hanhDong: "TAO_BAI_HOC", doiTuong: "bai_hoc", doiTuongId: b.id, duLieu: { khoa_hoc_id: khoa.id, ma: b.ma } });
    return anhXaBai(b);
  }

  async suaBai(nguoiId: string, id: string, body: SuaBaiHocBody): Promise<BaiHocQuanTri> {
    kiemId(id, "bài học");
    const data: Prisma.bai_hocUpdateInput = { ...body, ...(body.ma ? { ma: body.ma.trim() } : {}), ...(body.tieu_de ? { tieu_de: body.tieu_de.trim() } : {}) };
    const b = await this.repo.suaBai(id, data).catch(e => {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new NotFoundException("Không tìm thấy bài học");
      return batTrung(e, `Mã bài “${body.ma}” đã có trong khoá này`);
    });
    await this.nhatKy.ghi({ hoSoId: nguoiId, hanhDong: "SUA_BAI_HOC", doiTuong: "bai_hoc", doiTuongId: id, duLieu: { truong: Object.keys(body) } });
    return anhXaBai(b);
  }

  async tatBai(nguoiId: string, id: string): Promise<BaiHocQuanTri> {
    return this.suaBai(nguoiId, id, { bat: false });
  }

  // ---------------------------------------------------------------- bai kiem tra

  async taoDe(nd: NguoiThaoTac, khoaHocId: string, body: TaoBaiKiemTraBody): Promise<BaiKiemTraQuanTri> {
    kiemId(khoaHocId, "khoá học");
    kiemNguong(body.nguong_dat);
    const khoa = await this.repo.layVaiApDungCuaKhoa(khoaHocId);
    if (!khoa) throw new NotFoundException("Không tìm thấy khoá học");
    kiemKhongPhaiHocVien(nd, khoa.vai_ap_dung);
    const d = await this.repo
      .taoDe({
          khoa_hoc_id: khoa.id,
          ma: body.ma.trim(),
          tieu_de: body.tieu_de.trim(),
          nguong_dat: body.nguong_dat ?? 90,
          bat_buoc: body.bat_buoc ?? true,
          so_cau_hien: body.so_cau_hien ?? null,
          thoi_gian_phut: body.thoi_gian_phut ?? null,
          so_lan_toi_da: body.so_lan_toi_da ?? null,
          bat: body.bat ?? true
      })
      .catch(e => batTrung(e, `Mã bài kiểm tra “${body.ma}” đã tồn tại`));
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "TAO_BAI_KIEM_TRA", doiTuong: "bai_kiem_tra", doiTuongId: d.id, duLieu: { khoa_hoc_id: khoa.id, ma: d.ma } });
    return anhXaDe(d);
  }

  async chiTietDe(nd: NguoiThaoTac, id: string): Promise<BaiKiemTraQuanTri> {
    kiemId(id, "bài kiểm tra");
    const d = await this.repo.chiTietDe(id);
    if (!d) throw new NotFoundException("Không tìm thấy bài kiểm tra");
    const { khoa_hoc, ...de } = d;
    return laHocVienCuaKhoa(nd, khoa_hoc.vai_ap_dung) ? anDapAn(anhXaDe(de)) : anhXaDe(de);
  }

  async suaDe(nd: NguoiThaoTac, id: string, body: SuaBaiKiemTraBody): Promise<BaiKiemTraQuanTri> {
    kiemId(id, "bài kiểm tra");
    kiemNguong(body.nguong_dat);
    const cu = await this.repo.layCoCongCuaDe(id);
    if (!cu) throw new NotFoundException("Không tìm thấy bài kiểm tra");
    kiemKhongPhaiHocVien(nd, cu.khoa_hoc.vai_ap_dung);
    kiemNoiCongHoc(nd, thayDoiNoiDe(cu, body));
    const data: Prisma.bai_kiem_traUpdateInput = { ...body, ...(body.ma ? { ma: body.ma.trim() } : {}), ...(body.tieu_de ? { tieu_de: body.tieu_de.trim() } : {}) };
    const d = await this.repo.suaDe(id, data).catch(e => {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new NotFoundException("Không tìm thấy bài kiểm tra");
      return batTrung(e, `Mã bài kiểm tra “${body.ma}” đã tồn tại`);
    });
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "SUA_BAI_KIEM_TRA", doiTuong: "bai_kiem_tra", doiTuongId: id, duLieu: body as Prisma.InputJsonValue });
    return anhXaDe(d);
  }

  async tatDe(nd: NguoiThaoTac, id: string): Promise<BaiKiemTraQuanTri> {
    return this.suaDe(nd, id, { bat: false });
  }

  // ---------------------------------------------------------------- cau hoi

  async taoCau(nd: NguoiThaoTac, baiKiemTraId: string, body: TaoCauHoiBody): Promise<CauHoiQuanTri> {
    kiemId(baiKiemTraId, "bài kiểm tra");
    const de = await this.repo.layVaiApDungCuaDe(baiKiemTraId);
    if (!de) throw new NotFoundException("Không tìm thấy bài kiểm tra");
    kiemKhongPhaiHocVien(nd, de.khoa_hoc.vai_ap_dung);
    const dapAn = [...new Set(body.dap_an)].sort((a, b) => a - b);
    kiemCauHoi(body.lua_chon, dapAn);
    const c = await this.repo
      .taoCau({
          bai_kiem_tra_id: de.id,
          ma: body.ma.trim(),
          noi_dung: body.noi_dung.trim(),
          lua_chon: body.lua_chon,
          dap_an: dapAn,
          giai_thich: body.giai_thich ?? null,
          diem: body.diem ?? 1,
          thu_tu: body.thu_tu ?? 0
      })
      .catch(e => batTrung(e, `Mã câu “${body.ma}” đã có trong bài kiểm tra này`));
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "TAO_CAU_HOI", doiTuong: "cau_hoi", doiTuongId: c.id, duLieu: { bai_kiem_tra_id: de.id } });
    return anhXaCau(c);
  }

  async suaCau(nd: NguoiThaoTac, id: string, body: SuaCauHoiBody): Promise<CauHoiQuanTri> {
    kiemId(id, "câu hỏi");
    const coKhoa = await this.repo.layCauKemKhoa(id);
    if (!coKhoa) throw new NotFoundException("Không tìm thấy câu hỏi");
    const { bai_kiem_tra: deCuaCau, ...cu } = coKhoa;
    kiemKhongPhaiHocVien(nd, deCuaCau.khoa_hoc.vai_ap_dung);
    const n = chuanHoaCauHoi(cu);
    const luaChon = body.lua_chon ?? n.lua_chon;
    const dapAn = [...new Set(body.dap_an ?? n.dap_an)].sort((a, b) => a - b);
    kiemCauHoi(luaChon, dapAn);
    const c = await this.repo
      .suaCau(id, {
          ...(body.ma !== undefined ? { ma: body.ma.trim() } : {}),
          ...(body.noi_dung !== undefined ? { noi_dung: body.noi_dung.trim() } : {}),
          lua_chon: luaChon,
          dap_an: dapAn,
          ...(body.giai_thich !== undefined ? { giai_thich: body.giai_thich } : {}),
          ...(body.diem !== undefined ? { diem: body.diem } : {}),
          ...(body.thu_tu !== undefined ? { thu_tu: body.thu_tu } : {})
      })
      .catch(e => batTrung(e, `Mã câu “${body.ma}” đã có trong bài kiểm tra này`));
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "SUA_CAU_HOI", doiTuong: "cau_hoi", doiTuongId: id, duLieu: { truong: Object.keys(body) } });
    return anhXaCau(c);
  }

  async xoaCau(nd: NguoiThaoTac, id: string): Promise<{ id: string }> {
    kiemId(id, "câu hỏi");
    const coKhoa = await this.repo.layCauKemKhoa(id);
    if (!coKhoa) throw new NotFoundException("Không tìm thấy câu hỏi");
    const { bai_kiem_tra: deCuaCau, ...c } = coKhoa;
    kiemKhongPhaiHocVien(nd, deCuaCau.khoa_hoc.vai_ap_dung);
    await this.repo.xoaCau(id);
    // Luu ban sao cau hoi vao nhat ky (gom dap an) de doi chieu luot lam cu
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "XOA_CAU_HOI", doiTuong: "cau_hoi", doiTuongId: id, duLieu: { ...anhXaCau(c) } as unknown as Prisma.InputJsonValue });
    return { id };
  }
}
