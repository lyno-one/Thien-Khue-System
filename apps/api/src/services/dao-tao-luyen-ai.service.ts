// Luyen tu van voi AI (Sales Training) — phieu vao, nhan ket qua, tien do. Hop dong: docs/TICH-HOP-SALES-TRAINING.md.
import { BadRequestException, ConflictException, ForbiddenException, GoneException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { NguCanhPhieuLuyenAi, PhanHoiKetQuaLuyenAi, PhieuLuyenAi, TaoPhieuLuyenAiBody, TienDoLuyenAi, YeuCauLuyenAi } from "@thien-khue/contracts";
import { randomBytes } from "node:crypto";
import { layCauHinh } from "../config/cau-hinh";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { DO_DAI_BI_MAT_TOI_THIEU } from "../common/utils/hmac";
import {
  anhXaPhienLuyenAi, coVaiLuyenAi, datPhienLuyenAi, docYeuCauLuyenAi, HAN_PHIEU_LUYEN_AI_MS, KY_NANG_LUYEN_AI, mocTinhLai, moTaBaiLuyenAi,
  NGUONG_LUYEN_AI_TOI_THIEU, taoBangChungLuyenAi, tinhTienDoLuyenAi
} from "../common/utils/dao-tao-luyen-ai";
import { LuyenAiRepository } from "../repositories/dao-tao.repository";
import type { KetQuaLuyenAiDto } from "../dto/dao-tao/dao-tao-luyen-ai.dto";
import { NhatKyService, ThongBaoService } from "./core.service";

/** Khoa bo yeu cau sau khi phieu da phat: van luu ket qua theo luat mac dinh, nhung khong tao bai thuc hanh */
const YEU_CAU_MAC_DINH: YeuCauLuyenAi = { nguong: NGUONG_LUYEN_AI_TOI_THIEU, can: { TU_VAN: 1, DOI_TRA: 1 } };
/** So SKU toi da gui sang Sales Training */
const SO_MA_MAU_TOI_DA = 20;
/** Thu lai khi trung khoa (hai ket qua den cung luc) */
const SO_LAN_THU_TRUNG = 3;

type PhieuDaNap = NonNullable<Awaited<ReturnType<LuyenAiRepository["timPhieu"]>>>;

function laTrungKhoa(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Nguoi hoc SALE / CSKH luyen tu van voi AI ben Sales Training:
 *  - taoPhieu (Bearer): phieu mot lan, han 10 phut; web tu POST form sang Sales Training (token khong len URL).
 *  - doiPhieu (HMAC): Sales Training doi phieu lay ngu canh.
 *  - nhanKetQua (HMAC): luu diem + tom tat (idempotent theo phien_id), du phien dat -> bai thuc hanh LUYEN_AI CHO_CHAM.
 * Mentor duyet bai o hang doi cham nhu moi bai khac (ThucHanhService.cham: khong tu cham, xet kich hoat vai).
 */
@Injectable()
export class LuyenAiService {
  constructor(
    private readonly repo: LuyenAiRepository,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  private tichHopDaBat(): boolean {
    const ch = layCauHinh();
    return !!ch.salesTrainingUrl && ch.tichHopStSecret.length >= DO_DAI_BI_MAT_TOI_THIEU;
  }

  async taoPhieu(nd: ThongTinNguoiDung, body: TaoPhieuLuyenAiBody): Promise<PhieuLuyenAi> {
    if (!this.tichHopDaBat()) throw new ServiceUnavailableException("Chưa cấu hình tích hợp Sales Training");
    if (!coVaiLuyenAi(nd.vaiChiTiet)) throw new ForbiddenException("Chỉ Sale / CSKH đang học hoặc đang hoạt động mới luyện tư vấn với AI");
    const khoa = await this.repo.timKhoa(body.khoa_hoc_id.trim());
    if (!khoa || !khoa.bat) throw new NotFoundException("Không tìm thấy khoá học");
    if (!docYeuCauLuyenAi(khoa.yeu_cau_luyen_ai)) throw new BadRequestException("Khoá học này không có bước luyện tư vấn với AI");

    const ma = randomBytes(24).toString("base64url");
    const hetHan = new Date(Date.now() + HAN_PHIEU_LUYEN_AI_MS);
    await this.repo.taoPhieu({ ma, ho_so_id: nd.id, khoa_hoc_id: khoa.id, loai: body.loai, het_han: hetHan });
    // Khong ghi ma phieu vao nhat ky (phieu la chia khoa vao Sales Training trong 10 phut)
    await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "TAO_PHIEU_LUYEN_AI", doiTuong: "khoa_hoc", doiTuongId: khoa.id, duLieu: { loai: body.loai } });
    return { ma_phieu: ma, url_vao: `${layCauHinh().salesTrainingUrl}/api/vao-tu-thien-khue`, het_han: hetHan.toISOString() };
  }

  /** Sales Training doi phieu (HMAC). Dung MOT lan: het han / da dung -> 410 */
  async doiPhieu(ma: string): Promise<NguCanhPhieuLuyenAi> {
    const bayGio = new Date();
    const daDung = await this.repo.dungPhieu(ma, bayGio);
    const phieu = await this.repo.timPhieu(ma);
    if (!phieu) throw new NotFoundException("Không tìm thấy phiếu luyện tập");
    if (!daDung) {
      if (phieu.dung_luc) throw new GoneException({ code: "PHIEU_DA_DUNG", message: "Phiếu luyện tập đã được dùng — mở lại từ học viện" });
      throw new GoneException({ code: "PHIEU_HET_HAN", message: "Phiếu luyện tập đã hết hạn — mở lại từ học viện" });
    }
    let maMau = [...new Set(await this.repo.dsMaMauDaHoc(phieu.ho_so_id))];
    if (!maMau.length) maMau = await this.repo.dsMaMauKhoaSanPham(SO_MA_MAU_TOI_DA);
    return {
      ho_so_id: phieu.ho_so_id,
      crm_user_id: phieu.ho_so.crm_user_id ?? phieu.ho_so.id,
      loai: phieu.loai,
      khoa_hoc_ma: phieu.khoa_hoc.ma,
      ten_khoa: phieu.khoa_hoc.ten,
      ma_mau: maMau.slice(0, SO_MA_MAU_TOI_DA)
    };
  }

  /** Sales Training gui ket qua (HMAC). Idempotent theo phien_id: gui lai tra cung ket qua, khong nhan ban */
  async nhanKetQua(body: KetQuaLuyenAiDto): Promise<PhanHoiKetQuaLuyenAi> {
    const phieu = await this.repo.timPhieu(body.ma_phieu);
    if (!phieu) throw new NotFoundException("Không tìm thấy phiếu luyện tập");
    // Phien phai cua dung nguoi da mo phieu — khong nop phien cua nguoi khac
    if (body.crm_user_id !== (phieu.ho_so.crm_user_id ?? phieu.ho_so.id)) throw new ForbiddenException("Phiên luyện không thuộc người đã mở phiếu");
    if (body.loai !== phieu.loai) throw new BadRequestException("Loại tình huống không khớp với phiếu");
    if (!phieu.dung_luc) throw new ConflictException("Phiếu chưa được dùng để mở phiên luyện");

    for (let lan = 1; ; lan++) {
      try {
        return await this.ghiKetQua(phieu, body);
      } catch (e) {
        // Hai ket qua cung luc: phien_id trung / bai CHO_CHAM trung -> transaction huy, chay lai doc ban ghi da co
        if (laTrungKhoa(e) && lan < SO_LAN_THU_TRUNG) continue;
        throw e;
      }
    }
  }

  private async ghiKetQua(phieu: PhieuDaNap, body: KetQuaLuyenAiDto): Promise<PhanHoiKetQuaLuyenAi> {
    const ycKhoa = phieu.khoa_hoc.bat ? docYeuCauLuyenAi(phieu.khoa_hoc.yeu_cau_luyen_ai) : null;
    const yc = ycKhoa ?? YEU_CAU_MAC_DINH;
    const hoSoId = phieu.ho_so_id;
    const khoaId = phieu.khoa_hoc_id;
    const bayGio = new Date();

    const kq = await this.repo.chayTrongGiaoDich(async tx => {
      const cu = await this.repo.timPhien(body.phien_id, tx);
      let dat: boolean;
      let moi = false;
      if (cu) {
        if (cu.ho_so_id !== hoSoId || cu.khoa_hoc_id !== khoaId) throw new ConflictException("phien_id đã được ghi cho người / khoá khác");
        dat = cu.dat;
      } else {
        const viPham = (body.vi_pham ?? []).map(v => ({ loai: v.loai ?? "", trich: v.trich ?? "" }));
        // Tin so lon hon giua so_vi_pham va danh sach vi pham (khong de lech lam phien "dat")
        const soViPham = Math.max(body.so_vi_pham, viPham.length);
        const diemTong = Math.round(body.diem_tong);
        dat = datPhienLuyenAi(diemTong, soViPham, yc.nguong);
        const kn = (body.diem_ky_nang ?? {}) as Partial<Record<(typeof KY_NANG_LUYEN_AI)[number], number>>;
        const diemKyNang = Object.fromEntries(KY_NANG_LUYEN_AI.map(k => [k, Math.round(kn[k] ?? 0)]));
        await this.repo.taoPhien(
          {
            phien_id_st: body.phien_id,
            ma_phieu: body.ma_phieu,
            ho_so_id: hoSoId,
            khoa_hoc_id: khoaId,
            loai: phieu.loai,
            diem_tong: diemTong,
            diem_ky_nang: diemKyNang,
            so_vi_pham: soViPham,
            vi_pham: viPham,
            tom_tat: body.tom_tat?.trim() || null,
            diem_manh: body.diem_manh ?? [],
            can_cai_thien: body.can_cai_thien ?? [],
            dat,
            link_xem: body.link_xem?.trim() || null,
            ket_thuc_luc: body.ket_thuc_luc ? new Date(body.ket_thuc_luc) : null
          },
          tx
        );
        moi = true;
        await this.nhatKy.ghi(
          {
            hoSoId: null,
            hanhDong: "NHAN_KET_QUA_LUYEN_AI",
            doiTuong: "phien_luyen_ai",
            doiTuongId: null,
            duLieu: { ho_so_id: hoSoId, khoa_hoc_id: khoaId, phien_id_st: body.phien_id, loai: phieu.loai, diem_tong: diemTong, so_vi_pham: soViPham, dat }
          },
          tx
        );
      }

      const [dsPhien, dsBai] = await Promise.all([this.repo.dsPhien(hoSoId, khoaId, tx), this.repo.dsBaiThucHanh(hoSoId, khoaId, tx)]);
      const moc = mocTinhLai(dsBai.filter(b => b.nguon === "LUYEN_AI"));
      const td = tinhTienDoLuyenAi(yc, dsPhien, moc);

      let baiId: string | undefined;
      let baiMoi = false;
      if (td.du && ycKhoa) {
        const daDat = dsBai.find(b => b.trang_thai === "DAT");
        const choCham = dsBai.find(b => b.trang_thai === "CHO_CHAM" && b.nguon === "LUYEN_AI");
        if (daDat) baiId = daDat.id;
        else {
          const bangChung = taoBangChungLuyenAi(yc, dsPhien, moc, bayGio);
          const duLieuBai = { bang_chung: bangChung as unknown as Prisma.InputJsonValue, mo_ta: moTaBaiLuyenAi(bangChung) };
          if (choCham) {
            // Phien dat moi hon co the diem cao hon -> lam moi bang chung (chi khi bai van CHO_CHAM)
            if (moi && dat) await this.repo.capNhatBangChung(choCham.id, duLieuBai, tx);
            baiId = choCham.id;
          } else {
            const bai = await this.repo.taoBaiThucHanh(
              {
                khoa_hoc_id: khoaId,
                ho_so_id: hoSoId,
                vai: phieu.ho_so.vai_tro[0]?.vai ?? null,
                tieu_de: "Luyện tư vấn với AI",
                ...duLieuBai,
                nguon: "LUYEN_AI",
                trang_thai: "CHO_CHAM",
                nop_luc: bayGio
              },
              tx
            );
            baiId = bai.id;
            baiMoi = true;
            await this.nhatKy.ghi(
              {
                hoSoId: null,
                hanhDong: "NOP_THUC_HANH_LUYEN_AI",
                doiTuong: "bai_thuc_hanh",
                doiTuongId: bai.id,
                duLieu: { ho_so_id: hoSoId, khoa_hoc_id: khoaId, phien: bangChung.phien.map(p => p.phien_id_st) }
              },
              tx
            );
            await this.thongBao.gui(
              {
                hoSoId,
                loai: "DAO_TAO",
                tieuDe: `Đủ phiên luyện đạt — bài thực hành “${phieu.khoa_hoc.ten}” chờ mentor duyệt`,
                noiDung: "Bạn đã đạt cả tình huống tư vấn bán hàng và đổi trả. Mentor sẽ xem lại điểm và nhận xét.",
                lienKet: `/hoc-vien/khoa-hoc/${khoaId}#luyen-ai`,
                duLieu: { bai_thuc_hanh_id: bai.id, khoa_hoc_id: khoaId }
              },
              tx
            );
          }
        }
      }
      return { dat, theoLoai: td.theoLoai, baiId, baiMoi };
    });

    return { dat: kq.dat, tien_do: kq.theoLoai, ...(kq.baiId ? { bai_thuc_hanh_id: kq.baiId } : {}) };
  }

  /** Tien do luyen AI cua toi o mot khoa (uuid hoac ma) */
  async tienDo(nd: ThongTinNguoiDung, khoaIdHoacMa: string): Promise<TienDoLuyenAi> {
    const khoa = await this.repo.timKhoa(khoaIdHoacMa.trim());
    if (!khoa || !khoa.bat) throw new NotFoundException("Không tìm thấy khoá học");
    const yc = docYeuCauLuyenAi(khoa.yeu_cau_luyen_ai);
    const [dsPhien, dsBai] = await Promise.all([this.repo.dsPhien(nd.id, khoa.id), this.repo.dsBaiThucHanh(nd.id, khoa.id)]);
    const baiLuyen = dsBai.filter(b => b.nguon === "LUYEN_AI");
    const moc = mocTinhLai(baiLuyen);
    const td = tinhTienDoLuyenAi(yc ?? YEU_CAU_MAC_DINH, dsPhien, moc);

    const apDung = !!yc && coVaiLuyenAi(nd.vaiChiTiet);
    let lyDo: string | null = null;
    if (!yc) lyDo = "Khoá học này không có bước luyện tư vấn với AI";
    else if (!coVaiLuyenAi(nd.vaiChiTiet)) lyDo = "Bước này dành cho Sale / CSKH đang học hoặc đang hoạt động";
    else if (!this.tichHopDaBat()) lyDo = "Tích hợp Sales Training chưa được cấu hình — liên hệ quản trị";

    const baiMoiNhat = baiLuyen[0] ?? null;
    return {
      khoa_hoc_id: khoa.id,
      yeu_cau: yc,
      ap_dung: apDung,
      duoc_luyen: !lyDo,
      ly_do_khong_duoc: lyDo,
      loai: td.loai,
      du_dieu_kien: td.du,
      bai_thuc_hanh: baiMoiNhat
        ? { id: baiMoiNhat.id, trang_thai: baiMoiNhat.trang_thai, nhan_xet: baiMoiNhat.nhan_xet, cham_luc: baiMoiNhat.cham_luc?.toISOString() ?? null }
        : null,
      tinh_tu: moc?.toISOString() ?? null,
      phien: dsPhien.map(anhXaPhienLuyenAi)
    };
  }
}
