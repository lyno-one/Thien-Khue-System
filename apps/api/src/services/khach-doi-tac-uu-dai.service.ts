// Khach hang & doi tac: qua tang / voucher / cap phat. Lop: UuDaiService.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type HangThanhVien } from "@prisma/client";
import { chuanHoaSdt } from "../infrastructure/crm/chuan-hoa-sdt";
import { coMeta } from "../common/interceptors/bao-response.interceptor";
import { coVai } from "../common/guards/vai.guard";
import { NhatKyService, ThongBaoService } from "./core.service";
import { phanTrang, taoMetaPhanTrang } from "../common/utils/phan-trang";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import type {
  CapNhatCapPhatDto,
  CapNhatQuaTangDto,
  CapNhatVoucherDto,
  CapPhatDto,
  CapPhatTheoHangDto,
  DuyetUuDaiDto,
  LocCapPhatQuery,
  LocUuDaiQuery,
  NgungUuDaiDto,
  TaoQuaTangDto,
  TaoVoucherDto,
  ThamDinhQuaDto
} from "../dto/khach-doi-tac/khach-doi-tac.dto";
import { hangDuocHuong, kiemThienKhueThat, sdtKhachDaXacMinh } from "../common/utils/khach-doi-tac";
import { HangThanhVienService } from "./khach-doi-tac.service";
import { DoiTacRepository, HoSoKhachRepository, UuDaiRepository } from "../repositories/khach-doi-tac.repository";

/*
 * Qua tang & voucher doi tac + cap phat theo hang.
 * Luat: qua tao ra o CHO_THAM_DINH -> QUAN_LY tham dinh (khac nguoi de xuat) -> THIEN_KHUE duyet (khac nguoi de xuat,
 * khac nguoi tham dinh) moi DA_DUYET va hien thi cho khach. Voucher: tao -> THIEN_KHUE duyet (nguoi tao khong tu duyet).
 */

const HANH_DONG_TAO_VOUCHER = "TAO_VOUCHER";

/** Voucher con hieu luc tai thoi diem `luc` */
function voucherConHan(v: { bat_dau: Date | null; het_han: Date | null }, luc = new Date()): boolean {
  return (!v.bat_dau || v.bat_dau <= luc) && (!v.het_han || v.het_han > luc);
}

/** Qua / voucher bi tu choi duoc sua va gui lai: xoa het dau vet tham dinh + duyet de xet lai tu dau */
const DAT_LAI_DUYET_QUA = { trang_thai: "CHO_THAM_DINH", nguoi_tham_dinh_id: null, ket_qua_tham_dinh: null, nguoi_duyet_id: null, duyet_luc: null, ly_do_tu_choi: null } as const;
const DAT_LAI_DUYET_VOUCHER = { trang_thai: "CHO_THAM_DINH", nguoi_tham_dinh_id: null, nguoi_duyet_id: null, duyet_luc: null } as const;

/** Chi nguoi de xuat sua / huy (giu maker-checker). Ban ghi cu khong ro nguoi de xuat: QUAN_LY duoc xu ly */
function kiemLaNguoiDeXuat(nd: ThongTinNguoiDung, nguoiDeXuatId: string | null, viec: string): void {
  if (nguoiDeXuatId ? nguoiDeXuatId === nd.id : coVai(nd, ["QUAN_LY"])) return;
  throw new ForbiddenException(`Chỉ người đề xuất mới được ${viec}`);
}

@Injectable()
export class UuDaiService {
  constructor(
    private readonly repo: UuDaiRepository,
    private readonly doiTacRepo: DoiTacRepository,
    private readonly hoSoKhach: HoSoKhachRepository,
    private readonly hangSv: HangThanhVienService,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  // ---------------------------------------------------------------- khach

  /**
   * Uu dai khach dang dang nhap duoc huong: CHI qua / voucher DA_DUYET, dung hang, con han.
   * Hang + uu dai da cap (kem ma voucher) chi theo SDT DA XAC MINH — chua xac minh -> 403 (LOI-CAN-SUA muc 1, 3).
   */
  async layUuDaiCuaToi(nd: ThongTinNguoiDung) {
    const sdt = sdtKhachDaXacMinh(await this.hoSoKhach.laySdtHoSo(nd.id));
    const hang: HangThanhVien | null = sdt ? (await this.hangSv.tinhHangTheoSdt(sdt)).hang : null;
    const bayGio = new Date();
    const [dsVoucher, dsQua, daCap] = await Promise.all([
      this.repo.layVoucherDaDuyetConHan(bayGio),
      this.repo.layQuaDaDuyet(),
      sdt ? this.layCapPhatTheoSdt(sdt) : Promise.resolve([])
    ]);
    return {
      hang,
      // Loc lai trang_thai o day nua: qua / voucher chua duyet KHONG BAO GIO lot ra cho khach
      voucher: dsVoucher
        .filter(v => v.trang_thai === "DA_DUYET" && voucherConHan(v, bayGio) && hangDuocHuong(v.hang_ap_dung, hang))
        .map(v => ({
          id: v.id,
          ma: v.ma,
          ten: v.ten,
          loai_giam: v.loai_giam,
          gia_tri: v.gia_tri,
          don_toi_thieu: v.don_toi_thieu,
          hang_ap_dung: v.hang_ap_dung,
          het_han: v.het_han,
          ten_doi_tac: v.doi_tac?.ten ?? null
        })),
      qua_tang: dsQua
        .filter(q => q.trang_thai === "DA_DUYET" && hangDuocHuong(q.hang_ap_dung, hang))
        .map(q => ({
          id: q.id,
          ten: q.ten,
          mo_ta: q.mo_ta,
          hinh_anh: q.hinh_anh,
          gia_tri: q.gia_tri,
          hang_ap_dung: q.hang_ap_dung,
          ten_doi_tac: q.doi_tac?.ten ?? null
        })),
      da_cap: daCap
    };
  }

  /** Uu dai da cap cho khach — chi truong khach can (khong lo nguoi cap, ly do noi bo, don CRM) */
  private async layCapPhatTheoSdt(sdtChuan: string) {
    const ds = await this.repo.layCapPhatTheoSdt(sdtChuan);
    return ds.map(c => ({
      id: c.id,
      ten_uu_dai: c.voucher?.ten ?? c.qua_tang?.ten ?? null,
      ma_voucher: c.voucher?.ma ?? null,
      trang_thai: c.trang_thai,
      cap_luc: c.cap_luc,
      dung_luc: c.dung_luc
    }));
  }

  // ---------------------------------------------------------------- qua tang

  async danhSachQua(loc: LocUuDaiQuery) {
    const { skip, take, trang, so_dong } = phanTrang(loc);
    const [ds, tong] = await this.repo.danhSachQua({ trang_thai: loc.trang_thai, doi_tac_id: loc.doi_tac_id }, skip, take);
    return coMeta(
      ds.map(({ doi_tac, ...q }) => ({ ...q, ten_doi_tac: doi_tac?.ten ?? null })),
      taoMetaPhanTrang(trang, so_dong, tong)
    );
  }

  /** De xuat qua (QUAN_LY, hoac DOI_TAC cho chinh doi tac cua minh) — luon CHO_THAM_DINH */
  async taoQua(nd: ThongTinNguoiDung, dto: TaoQuaTangDto) {
    let doiTacId = dto.doi_tac_id ?? null;
    if (!coVai(nd, ["QUAN_LY"])) {
      // Doi tac chi de xuat qua cho doanh nghiep cua minh
      const cuaToi = await this.doiTacRepo.layIdDangBatCuaHoSo(nd.id);
      if (!cuaToi) throw new ForbiddenException("Tài khoản chưa gắn với đối tác nào");
      if (doiTacId && doiTacId !== cuaToi.id) throw new ForbiddenException("Chỉ đề xuất quà cho đối tác của bạn");
      doiTacId = cuaToi.id;
    } else if (doiTacId) {
      const dt = await this.doiTacRepo.layIdTheoId(doiTacId);
      if (!dt) throw new NotFoundException("Không tìm thấy đối tác");
    }
    return this.repo.chayTrongGiaoDich(async tx => {
      const qua = await this.repo.taoQua(
        {
          doi_tac_id: doiTacId,
          ten: dto.ten.trim(),
          mo_ta: dto.mo_ta ?? null,
          hinh_anh: dto.hinh_anh ?? null,
          gia_tri: dto.gia_tri ?? null,
          so_luong: dto.so_luong ?? null,
          hang_ap_dung: dto.hang_ap_dung ?? [],
          trang_thai: "CHO_THAM_DINH",
          nguoi_de_xuat_id: nd.id
        },
        tx
      );
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "DE_XUAT_QUA_TANG", doiTuong: "qua_tang", doiTuongId: qua.id, duLieu: { ten: qua.ten } }, tx);
      return qua;
    });
  }

  /** Tham dinh chat luong (QUAN_LY, khong phai nguoi de xuat). Khong dat -> TU_CHOI ngay */
  async thamDinhQua(nd: ThongTinNguoiDung, id: string, dto: ThamDinhQuaDto) {
    const qua = await this.repo.layQua(id);
    if (!qua) throw new NotFoundException("Không tìm thấy quà tặng");
    if (qua.trang_thai !== "CHO_THAM_DINH") throw new ConflictException("Quà đã được xử lý");
    if (qua.nguoi_tham_dinh_id) throw new ConflictException("Quà đã được thẩm định, đang chờ Thiên Khuê duyệt");
    if (qua.nguoi_de_xuat_id === nd.id) throw new ForbiddenException("Người đề xuất không tự thẩm định quà của mình");
    return this.repo.chayTrongGiaoDich(async tx => {
      const soDong = await this.repo.ghiThamDinhQua(
        id,
        dto.dat
          ? { nguoi_tham_dinh_id: nd.id, ket_qua_tham_dinh: dto.ket_qua }
          : { nguoi_tham_dinh_id: nd.id, ket_qua_tham_dinh: dto.ket_qua, trang_thai: "TU_CHOI", ly_do_tu_choi: dto.ket_qua },
        tx
      );
      if (soDong !== 1) throw new ConflictException("Quà vừa được người khác xử lý");
      await this.nhatKy.ghi(
        { hoSoId: nd.id, hanhDong: dto.dat ? "THAM_DINH_QUA_DAT" : "THAM_DINH_QUA_KHONG_DAT", doiTuong: "qua_tang", doiTuongId: id, duLieu: { ket_qua: dto.ket_qua } },
        tx
      );
      return this.repo.layQuaHoacLoi(id, tx);
    });
  }

  /**
   * Thien Khue duyet qua — nguoi duyet khac nguoi de xuat va nguoi tham dinh (maker-checker).
   * Chi duyet duoc khi da tham dinh dat. Chi Thien Khue that (ADMIN khong thay) — LOI-CAN-SUA muc 5, 12.
   */
  async duyetQua(nd: ThongTinNguoiDung, id: string, dto: DuyetUuDaiDto) {
    kiemThienKhueThat(nd, "duyệt quà tặng");
    const qua = await this.repo.layQua(id);
    if (!qua) throw new NotFoundException("Không tìm thấy quà tặng");
    if (qua.nguoi_de_xuat_id === nd.id) throw new ForbiddenException("Người đề xuất không được tự duyệt quà của mình");
    if (qua.nguoi_tham_dinh_id === nd.id) throw new ForbiddenException("Người thẩm định không được đồng thời duyệt");
    if (qua.trang_thai !== "CHO_THAM_DINH") throw new ConflictException("Quà đã được xử lý");
    if (dto.duyet && !qua.nguoi_tham_dinh_id) throw new BadRequestException("Quà chưa qua thẩm định chất lượng");
    if (!dto.duyet && !dto.ly_do?.trim()) throw new BadRequestException("Cần ghi lý do từ chối");
    return this.repo.chayTrongGiaoDich(async tx => {
      const soDong = await this.repo.ghiDuyetQua(
        id,
        {
          trang_thai: dto.duyet ? "DA_DUYET" : "TU_CHOI",
          nguoi_duyet_id: nd.id,
          duyet_luc: new Date(),
          ly_do_tu_choi: dto.duyet ? null : (dto.ly_do ?? null)
        },
        tx
      );
      if (soDong !== 1) throw new ConflictException("Quà vừa được người khác xử lý");
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: dto.duyet ? "DUYET_QUA_TANG" : "TU_CHOI_QUA_TANG", doiTuong: "qua_tang", doiTuongId: id, duLieu: { ly_do: dto.ly_do ?? null } }, tx);
      if (qua.nguoi_de_xuat_id)
        await this.thongBao.gui(
          {
            hoSoId: qua.nguoi_de_xuat_id,
            loai: "PHE_DUYET",
            tieuDe: dto.duyet ? `Quà "${qua.ten}" đã được duyệt` : `Quà "${qua.ten}" bị từ chối`,
            noiDung: dto.ly_do ?? undefined,
            lienKet: "/thanh-vien/quan-ly/uu-dai"
          },
          tx
        );
      return this.repo.layQuaHoacLoi(id, tx);
    });
  }

  /**
   * Sua qua truoc khi duoc duyet — chi NGUOI DE XUAT (giu maker-checker: nguoi sua van la maker, khong thanh checker).
   * Dang cho tham dinh va chua ai tham dinh: sua tai cho. Da bi tu choi: sua xong quay lai CHO_THAM_DINH de xet lai tu dau.
   */
  async suaQua(nd: ThongTinNguoiDung, id: string, dto: CapNhatQuaTangDto) {
    const qua = await this.repo.layQua(id);
    if (!qua) throw new NotFoundException("Không tìm thấy quà tặng");
    kiemLaNguoiDeXuat(nd, qua.nguoi_de_xuat_id, "sửa");
    const data: Prisma.qua_tangUpdateManyArgs["data"] = {};
    if (dto.ten !== undefined) data.ten = dto.ten.trim();
    if (dto.mo_ta !== undefined) data.mo_ta = dto.mo_ta;
    if (dto.hinh_anh !== undefined) data.hinh_anh = dto.hinh_anh;
    if (dto.gia_tri !== undefined) data.gia_tri = dto.gia_tri;
    if (dto.so_luong !== undefined) data.so_luong = dto.so_luong;
    if (dto.hang_ap_dung !== undefined) data.hang_ap_dung = dto.hang_ap_dung;
    if (!Object.keys(data).length) throw new BadRequestException("Không có thông tin nào để cập nhật");
    if (qua.trang_thai === "TU_CHOI") Object.assign(data, DAT_LAI_DUYET_QUA);
    return this.repo.chayTrongGiaoDich(async tx => {
      const soDong = await this.repo.suaQuaChuaDuyet(id, data, tx);
      if (soDong !== 1) throw new ConflictException("Quà đã được thẩm định hoặc duyệt — không sửa được nữa, hãy huỷ và tạo lại");
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "SUA_QUA_TANG", doiTuong: "qua_tang", doiTuongId: id, duLieu: { truoc: { ten: qua.ten, trang_thai: qua.trang_thai }, gui_lai: qua.trang_thai === "TU_CHOI" } }, tx);
      return this.repo.layQuaHoacLoi(id, tx);
    });
  }

  /** Huy (xoa) qua chua duoc duyet — chi nguoi de xuat. Qua da duyet thi dung `ngungQua` */
  async huyQua(nd: ThongTinNguoiDung, id: string) {
    const qua = await this.repo.layQua(id);
    if (!qua) throw new NotFoundException("Không tìm thấy quà tặng");
    kiemLaNguoiDeXuat(nd, qua.nguoi_de_xuat_id, "huỷ");
    return this.repo.chayTrongGiaoDich(async tx => {
      if ((await this.repo.demCapPhatCuaQua(id, tx)) > 0) throw new ConflictException("Quà đã có lượt cấp phát — không xoá được");
      const soDong = await this.repo.xoaQuaChuaDuyet(id, tx);
      if (soDong !== 1) throw new ConflictException("Quà đã được duyệt — dùng thao tác Ngừng áp dụng (chỉ Thiên Khuê)");
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "HUY_QUA_TANG", doiTuong: "qua_tang", doiTuongId: id, duLieu: { ten: qua.ten, trang_thai: qua.trang_thai } }, tx);
      return { id, da_huy: true };
    });
  }

  /** Ngung qua DA_DUYET (khong hien cho khach, khong cap them) — chi Thien Khue that, bat buoc ly do. Luot da cap giu nguyen */
  async ngungQua(nd: ThongTinNguoiDung, id: string, dto: NgungUuDaiDto) {
    kiemThienKhueThat(nd, "ngừng áp dụng quà tặng");
    const qua = await this.repo.layQua(id);
    if (!qua) throw new NotFoundException("Không tìm thấy quà tặng");
    if (qua.trang_thai !== "DA_DUYET") throw new ConflictException("Chỉ ngừng được quà đang áp dụng (đã duyệt)");
    const lyDo = `Ngừng áp dụng: ${dto.ly_do.trim()}`;
    return this.repo.chayTrongGiaoDich(async tx => {
      const soDong = await this.repo.ghiNgungQua(id, lyDo, tx);
      if (soDong !== 1) throw new ConflictException("Quà vừa được người khác xử lý");
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "NGUNG_QUA_TANG", doiTuong: "qua_tang", doiTuongId: id, duLieu: { ly_do: dto.ly_do.trim() } }, tx);
      if (qua.nguoi_de_xuat_id)
        await this.thongBao.gui({ hoSoId: qua.nguoi_de_xuat_id, loai: "PHE_DUYET", tieuDe: `Quà "${qua.ten}" đã ngừng áp dụng`, noiDung: dto.ly_do.trim(), lienKet: "/thanh-vien/quan-ly/uu-dai" }, tx);
      return this.repo.layQuaHoacLoi(id, tx);
    });
  }

  // ---------------------------------------------------------------- voucher

  async danhSachVoucher(loc: LocUuDaiQuery) {
    const { skip, take, trang, so_dong } = phanTrang(loc);
    const [ds, tong] = await this.repo.danhSachVoucher({ trang_thai: loc.trang_thai, doi_tac_id: loc.doi_tac_id }, skip, take);
    return coMeta(
      ds.map(({ doi_tac, ...v }) => ({ ...v, ten_doi_tac: doi_tac?.ten ?? null })),
      taoMetaPhanTrang(trang, so_dong, tong)
    );
  }

  async taoVoucher(nd: ThongTinNguoiDung, dto: TaoVoucherDto) {
    if (dto.loai_giam === "PHAN_TRAM" && dto.gia_tri > 100) throw new BadRequestException("Giảm theo phần trăm tối đa 100%");
    if (dto.bat_dau && dto.het_han && new Date(dto.het_han) <= new Date(dto.bat_dau)) throw new BadRequestException("Ngày hết hạn phải sau ngày bắt đầu");
    if (dto.doi_tac_id) {
      const dt = await this.doiTacRepo.layIdTheoId(dto.doi_tac_id);
      if (!dt) throw new NotFoundException("Không tìm thấy đối tác");
    }
    try {
      return await this.repo.chayTrongGiaoDich(async tx => {
        const v = await this.repo.taoVoucher(
          {
            ma: dto.ma.trim().toUpperCase(),
            ten: dto.ten.trim(),
            doi_tac_id: dto.doi_tac_id ?? null,
            loai_giam: dto.loai_giam,
            gia_tri: dto.gia_tri,
            don_toi_thieu: dto.don_toi_thieu ?? null,
            hang_ap_dung: dto.hang_ap_dung ?? [],
            so_luong: dto.so_luong ?? null,
            bat_dau: dto.bat_dau ? new Date(dto.bat_dau) : null,
            het_han: dto.het_han ? new Date(dto.het_han) : null,
            trang_thai: "CHO_THAM_DINH",
            nguoi_de_xuat_id: nd.id
          },
          tx
        );
        // Nguoi tao luu ca o cot nguoi_de_xuat_id (CHECK DB chan tu duyet) lan nhat_ky (bang chung)
        await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: HANH_DONG_TAO_VOUCHER, doiTuong: "voucher", doiTuongId: v.id, duLieu: { ma: v.ma } }, tx);
        return v;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ConflictException("Mã voucher đã tồn tại");
      throw e;
    }
  }

  /** Nguoi tao voucher: cot nguoi_de_xuat_id, voucher cu thi tu nhat_ky */
  async layNguoiTaoVoucher(voucherId: string): Promise<string | null> {
    const v = await this.repo.layNguoiDeXuatVoucher(voucherId);
    if (v?.nguoi_de_xuat_id) return v.nguoi_de_xuat_id;
    const nk = await this.repo.layNguoiTaoVoucherTuNhatKy(voucherId, HANH_DONG_TAO_VOUCHER);
    return nk?.ho_so_id ?? null;
  }

  /** Chi Thien Khue that duyet (ADMIN khong thay) — LOI-CAN-SUA muc 5, 12 */
  async duyetVoucher(nd: ThongTinNguoiDung, id: string, dto: DuyetUuDaiDto) {
    kiemThienKhueThat(nd, "duyệt voucher");
    const v = await this.repo.layVoucher(id);
    if (!v) throw new NotFoundException("Không tìm thấy voucher");
    const nguoiTao = await this.layNguoiTaoVoucher(id);
    if (!nguoiTao) throw new ConflictException("Không xác định được người tạo voucher — không thể duyệt");
    if (nguoiTao === nd.id) throw new ForbiddenException("Người tạo không được tự duyệt voucher của mình");
    if (v.trang_thai !== "CHO_THAM_DINH") throw new ConflictException("Voucher đã được xử lý");
    if (!dto.duyet && !dto.ly_do?.trim()) throw new BadRequestException("Cần ghi lý do từ chối");
    return this.repo.chayTrongGiaoDich(async tx => {
      const soDong = await this.repo.ghiDuyetVoucher(id, { trang_thai: dto.duyet ? "DA_DUYET" : "TU_CHOI", nguoi_duyet_id: nd.id, duyet_luc: new Date() }, tx);
      if (soDong !== 1) throw new ConflictException("Voucher vừa được người khác xử lý");
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: dto.duyet ? "DUYET_VOUCHER" : "TU_CHOI_VOUCHER", doiTuong: "voucher", doiTuongId: id, duLieu: { ly_do: dto.ly_do ?? null } }, tx);
      await this.thongBao.gui(
        {
          hoSoId: nguoiTao,
          loai: "PHE_DUYET",
          tieuDe: dto.duyet ? `Voucher ${v.ma} đã được duyệt` : `Voucher ${v.ma} bị từ chối`,
          noiDung: dto.ly_do ?? undefined,
          lienKet: "/thanh-vien/quan-ly/uu-dai"
        },
        tx
      );
      return this.repo.layVoucherHoacLoi(id, tx);
    });
  }

  /** Sua voucher truoc khi duoc duyet — chi nguoi tao; ma voucher giu nguyen. Voucher bi tu choi sua xong quay lai CHO_THAM_DINH */
  async suaVoucher(nd: ThongTinNguoiDung, id: string, dto: CapNhatVoucherDto) {
    const v = await this.repo.layVoucher(id);
    if (!v) throw new NotFoundException("Không tìm thấy voucher");
    kiemLaNguoiDeXuat(nd, await this.layNguoiTaoVoucher(id), "sửa");
    // Kiem tren gia tri sau khi gop (chi gui mot truong van phai hop le voi truong cu)
    const loai = dto.loai_giam ?? v.loai_giam;
    const giaTri = dto.gia_tri ?? Number(v.gia_tri);
    const batDau = dto.bat_dau !== undefined ? (dto.bat_dau ? new Date(dto.bat_dau) : null) : v.bat_dau;
    const hetHan = dto.het_han !== undefined ? (dto.het_han ? new Date(dto.het_han) : null) : v.het_han;
    if (loai === "PHAN_TRAM" && giaTri > 100) throw new BadRequestException("Giảm theo phần trăm tối đa 100%");
    if (batDau && hetHan && hetHan <= batDau) throw new BadRequestException("Ngày hết hạn phải sau ngày bắt đầu");
    const data: Prisma.voucherUpdateManyArgs["data"] = {};
    if (dto.ten !== undefined) data.ten = dto.ten.trim();
    if (dto.loai_giam !== undefined) data.loai_giam = dto.loai_giam;
    if (dto.gia_tri !== undefined) data.gia_tri = dto.gia_tri;
    if (dto.don_toi_thieu !== undefined) data.don_toi_thieu = dto.don_toi_thieu;
    if (dto.hang_ap_dung !== undefined) data.hang_ap_dung = dto.hang_ap_dung;
    if (dto.so_luong !== undefined) data.so_luong = dto.so_luong;
    if (dto.bat_dau !== undefined) data.bat_dau = batDau;
    if (dto.het_han !== undefined) data.het_han = hetHan;
    if (!Object.keys(data).length) throw new BadRequestException("Không có thông tin nào để cập nhật");
    if (v.trang_thai === "TU_CHOI") Object.assign(data, DAT_LAI_DUYET_VOUCHER);
    return this.repo.chayTrongGiaoDich(async tx => {
      const soDong = await this.repo.suaVoucherChuaDuyet(id, data, tx);
      if (soDong !== 1) throw new ConflictException("Voucher đã được duyệt — không sửa được nữa, hãy tạo voucher mới");
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "SUA_VOUCHER", doiTuong: "voucher", doiTuongId: id, duLieu: { ma: v.ma, gui_lai: v.trang_thai === "TU_CHOI" } }, tx);
      return this.repo.layVoucherHoacLoi(id, tx);
    });
  }

  /** Huy (xoa) voucher chua duoc duyet — chi nguoi tao. Voucher da duyet thi dung `ngungVoucher` */
  async huyVoucher(nd: ThongTinNguoiDung, id: string) {
    const v = await this.repo.layVoucher(id);
    if (!v) throw new NotFoundException("Không tìm thấy voucher");
    kiemLaNguoiDeXuat(nd, await this.layNguoiTaoVoucher(id), "huỷ");
    return this.repo.chayTrongGiaoDich(async tx => {
      if ((await this.repo.demCapPhatCuaVoucher(id, tx)) > 0) throw new ConflictException("Voucher đã có lượt cấp phát — không xoá được");
      const soDong = await this.repo.xoaVoucherChuaDuyet(id, tx);
      if (soDong !== 1) throw new ConflictException("Voucher đã được duyệt — dùng thao tác Ngừng áp dụng (chỉ Thiên Khuê)");
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "HUY_VOUCHER", doiTuong: "voucher", doiTuongId: id, duLieu: { ma: v.ma, trang_thai: v.trang_thai } }, tx);
      return { id, da_huy: true };
    });
  }

  /** Ngung voucher DA_DUYET: dat het han = bay gio (khach khong thay, khong cap them; ma da cap van giu lich su). Chi Thien Khue that */
  async ngungVoucher(nd: ThongTinNguoiDung, id: string, dto: NgungUuDaiDto) {
    kiemThienKhueThat(nd, "ngừng áp dụng voucher");
    const v = await this.repo.layVoucher(id);
    if (!v) throw new NotFoundException("Không tìm thấy voucher");
    if (v.trang_thai !== "DA_DUYET") throw new ConflictException("Chỉ ngừng được voucher đang áp dụng (đã duyệt)");
    const nguoiTao = await this.layNguoiTaoVoucher(id);
    return this.repo.chayTrongGiaoDich(async tx => {
      const soDong = await this.repo.ghiNgungVoucher(id, new Date(), tx);
      if (soDong !== 1) throw new ConflictException("Voucher đã hết hạn hoặc vừa được người khác xử lý");
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "NGUNG_VOUCHER", doiTuong: "voucher", doiTuongId: id, duLieu: { ma: v.ma, ly_do: dto.ly_do.trim() } }, tx);
      if (nguoiTao)
        await this.thongBao.gui({ hoSoId: nguoiTao, loai: "PHE_DUYET", tieuDe: `Voucher ${v.ma} đã ngừng áp dụng`, noiDung: dto.ly_do.trim(), lienKet: "/thanh-vien/quan-ly/uu-dai" }, tx);
      return this.repo.layVoucherHoacLoi(id, tx);
    });
  }

  // ---------------------------------------------------------------- cap phat

  /** Lay uu dai (da duyet, con han) va kiem hang khach duoc huong */
  private async layUuDaiDeCap(dto: { voucher_id?: string | null; qua_tang_id?: string | null }) {
    if (!!dto.voucher_id === !!dto.qua_tang_id) throw new BadRequestException("Chọn đúng một: voucher hoặc quà tặng");
    if (dto.voucher_id) {
      const v = await this.repo.layVoucher(dto.voucher_id);
      if (!v) throw new NotFoundException("Không tìm thấy voucher");
      if (v.trang_thai !== "DA_DUYET") throw new BadRequestException("Voucher chưa được Thiên Khuê duyệt");
      if (!voucherConHan(v)) throw new BadRequestException("Voucher chưa đến hạn hoặc đã hết hạn");
      return { loai: "voucher" as const, id: v.id, ten: v.ten, hang_ap_dung: v.hang_ap_dung, so_luong: v.so_luong };
    }
    const q = await this.repo.layQua(dto.qua_tang_id!);
    if (!q) throw new NotFoundException("Không tìm thấy quà tặng");
    if (q.trang_thai !== "DA_DUYET") throw new BadRequestException("Quà chưa được Thiên Khuê duyệt");
    return { loai: "qua" as const, id: q.id, ten: q.ten, hang_ap_dung: q.hang_ap_dung, so_luong: q.so_luong };
  }

  /** Giu suat trong transaction: voucher tang da_cap co dieu kien; qua dem cap phat chua huy */
  private async giuSuat(tx: Prisma.TransactionClient, uuDai: { loai: "voucher" | "qua"; id: string; so_luong: number | null }, soSuat: number): Promise<number> {
    if (soSuat <= 0) return 0;
    if (uuDai.loai === "voucher") {
      if (uuDai.so_luong == null) {
        await this.repo.tangDaCapVoucher(uuDai.id, soSuat, tx);
        return soSuat;
      }
      const v = await this.repo.layDaCapVoucher(uuDai.id, tx);
      const duoc = Math.min(soSuat, Math.max(0, uuDai.so_luong - v.da_cap));
      if (duoc === 0) return 0;
      const soDong = await this.repo.tangDaCapVoucherNeuChuaDoi(uuDai.id, v.da_cap, duoc, tx);
      if (soDong !== 1) throw new ConflictException("Voucher đang được cấp đồng thời, thử lại");
      return duoc;
    }
    if (uuDai.so_luong == null) return soSuat;
    const daCap = await this.repo.demCapPhatQuaChuaHuy(uuDai.id, tx);
    return Math.min(soSuat, Math.max(0, uuDai.so_luong - daCap));
  }

  /** Cap cho mot khach — kiem hang hien tai (tinh lai tu CRM), khong cap trung */
  async capPhat(nd: ThongTinNguoiDung, dto: CapPhatDto) {
    const sdt = await this.hangSv.kiemDuocXemKhach(nd, dto.sdt);
    const uuDai = await this.layUuDaiDeCap(dto);
    const { hang } = await this.hangSv.tinhHangTheoSdt(sdt);
    if (!hangDuocHuong(uuDai.hang_ap_dung, hang)) throw new BadRequestException("Hạng hiện tại của khách không được hưởng ưu đãi này");
    const kq = await this.repo.chayTrongGiaoDich(async tx => {
      const trung = await this.repo.timCapPhatChuaDung(sdt, uuDai, tx);
      if (trung) throw new ConflictException("Khách đã được cấp ưu đãi này và chưa dùng");
      if ((await this.giuSuat(tx, uuDai, 1)) < 1) throw new ConflictException("Ưu đãi đã hết số lượng");
      const cp = await this.repo.taoCapPhat(
        {
          sdt_chuan: sdt,
          voucher_id: uuDai.loai === "voucher" ? uuDai.id : null,
          qua_tang_id: uuDai.loai === "qua" ? uuDai.id : null,
          ly_do: dto.ly_do ?? `Ưu đãi hạng ${hang ?? ""}`.trim(),
          nguoi_cap_id: nd.id
        },
        tx
      );
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "CAP_PHAT_UU_DAI", doiTuong: "cap_phat_uu_dai", doiTuongId: cp.id, duLieu: { [uuDai.loai]: uuDai.id, hang } }, tx);
      return cp;
    });
    await this.baoKhach([sdt], `Bạn nhận được ưu đãi: ${uuDai.ten}`);
    return kq;
  }

  /** Cap hang loat cho moi khach dang o hang (QUAN_LY) — bo qua khach da co, dung khi het so luong */
  async capPhatTheoHang(nd: ThongTinNguoiDung, dto: CapPhatTheoHangDto) {
    const uuDai = await this.layUuDaiDeCap(dto);
    if (!hangDuocHuong(uuDai.hang_ap_dung, dto.hang)) throw new BadRequestException("Ưu đãi này không áp dụng cho hạng đã chọn");
    const dsKhach = await this.hangSv.layKhachTheoHang(dto.hang);
    const kq = await this.repo.chayTrongGiaoDich(async tx => {
      const daCo = await this.repo.laySdtDaCoCapPhatChuaDung(
        dsKhach.map(k => k.sdt_chuan),
        uuDai,
        tx
      );
      const tapDaCo = new Set(daCo.map(d => d.sdt_chuan));
      const canCap = dsKhach.filter(k => !tapDaCo.has(k.sdt_chuan));
      const duoc = await this.giuSuat(tx, uuDai, canCap.length);
      const capThat = canCap.slice(0, duoc);
      if (capThat.length)
        await this.repo.taoNhieuCapPhat(
          capThat.map(k => ({
            sdt_chuan: k.sdt_chuan,
            voucher_id: uuDai.loai === "voucher" ? uuDai.id : null,
            qua_tang_id: uuDai.loai === "qua" ? uuDai.id : null,
            ly_do: dto.ly_do ?? `Ưu đãi hạng ${dto.hang}`,
            nguoi_cap_id: nd.id
          })),
          tx
        );
      const tk = {
        so_khach_du_hang: dsKhach.length,
        da_cap: capThat.length,
        bo_qua_da_co: dsKhach.length - canCap.length,
        bo_qua_het_so_luong: canCap.length - capThat.length
      };
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "CAP_PHAT_THEO_HANG", doiTuong: uuDai.loai === "voucher" ? "voucher" : "qua_tang", doiTuongId: uuDai.id, duLieu: { hang: dto.hang, ...tk } }, tx);
      return { tk, sdt: capThat.map(k => k.sdt_chuan) };
    });
    await this.baoKhach(kq.sdt, `Bạn nhận được ưu đãi: ${uuDai.ten}`);
    return kq.tk;
  }

  async danhSachCapPhat(nd: ThongTinNguoiDung, loc: LocCapPhatQuery) {
    const { skip, take, trang, so_dong } = phanTrang(loc);
    const phamVi = await this.hangSv.phamViKhach(nd);
    const sdt = loc.sdt ? chuanHoaSdt(loc.sdt) : null;
    if (sdt && phamVi && !phamVi.includes(sdt)) throw new ForbiddenException("Bạn chỉ xem được khách đang được giao cho mình");
    const [ds, tong] = await this.repo.danhSachCapPhat({ sdt, phamVi, trang_thai: loc.trang_thai }, skip, take);
    return coMeta(
      ds.map(({ voucher, qua_tang, ...c }) => ({ ...c, ten_uu_dai: voucher?.ten ?? qua_tang?.ten ?? null, ma_voucher: voucher?.ma ?? null })),
      taoMetaPhanTrang(trang, so_dong, tong)
    );
  }

  /** DA_CAP -> DA_DUNG / HUY / HET_HAN; huy voucher thi tra lai suat */
  async capNhatCapPhat(nd: ThongTinNguoiDung, id: string, dto: CapNhatCapPhatDto) {
    const cp = await this.repo.layCapPhat(id);
    if (!cp) throw new NotFoundException("Không tìm thấy lượt cấp phát");
    await this.hangSv.kiemDuocXemKhach(nd, cp.sdt_chuan);
    if (cp.trang_thai !== "DA_CAP") throw new ConflictException("Lượt cấp phát đã kết thúc");
    return this.repo.chayTrongGiaoDich(async tx => {
      const soDong = await this.repo.ghiTrangThaiCapPhat(
        id,
        {
          trang_thai: dto.trang_thai,
          ...(dto.trang_thai === "DA_DUNG" ? { dung_luc: new Date(), crm_don_id: dto.crm_don_id ?? null } : {})
        },
        tx
      );
      if (soDong !== 1) throw new ConflictException("Lượt cấp phát vừa được cập nhật");
      if (dto.trang_thai === "HUY" && cp.voucher_id) await this.repo.traSuatVoucher(cp.voucher_id, tx);
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: `CAP_PHAT_${dto.trang_thai}`, doiTuong: "cap_phat_uu_dai", doiTuongId: id }, tx);
      return this.repo.layCapPhatHoacLoi(id, tx);
    });
  }

  /** Thong bao cho khach co ho so DA XAC MINH SDT (theo sdt_chuan) — viec phu, khong chan luong chinh */
  private async baoKhach(dsSdt: string[], tieuDe: string) {
    if (!dsSdt.length) return;
    try {
      const hoSo = await this.hoSoKhach.layIdHoSoDaXacMinhTheoSdt(dsSdt);
      await this.thongBao.guiNhieu(
        hoSo.map(h => h.id),
        { loai: "HE_THONG", tieuDe, lienKet: "/thanh-vien" }
      );
    } catch {
      // bo qua: thong bao khong duoc lam hong viec cap phat da xong
    }
  }
}
