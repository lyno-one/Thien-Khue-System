// Khach hang & doi tac: hang the, KH hanh phuc, doi tac. Lop: HangThanhVienService, KhHanhPhucService, DoiTacService.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { type HangThanhVien, type moi_kh_hanh_phuc, Prisma, type TrangThaiMoiKh } from "@prisma/client";
import { chuanHoaSdt, laSdtHopLe } from "../infrastructure/crm/chuan-hoa-sdt";
import { coVai } from "../common/guards/vai.guard";
import { CrmDocService } from "../infrastructure/crm/crm-doc.service";
import { NhatKyService, ThongBaoService } from "./core.service";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import type {
  CapNhatCauHinhHangDto, CapNhatDoiTacDto, CapNhatHopDongDto, CapNhatMoiKhDto, GuiPhanHoiDto, LocDoiTacQuery, LocMoiKhQuery, LocPhanHoiQuery,
  MoiKhHanhPhucDto, TaoDoiTacDto, TaoHopDongDto
} from "../dto/khach-doi-tac/khach-doi-tac.dto";
import {
  type CauHinhHangTinh, type KetQuaTinhHang, kiemThienKhueThat, laDonHopLe, sdtKhachDaXacMinh, SO_LAN_MUA_KH_HANH_PHUC, tinhHang
} from "../common/utils/khach-doi-tac";
import { DoiTacRepository, HangThanhVienRepository, HoSoKhachRepository, KhHanhPhucRepository } from "../repositories/khach-doi-tac.repository";
import { coMeta } from "../common/interceptors/bao-response.interceptor";
import { phanTrang, taoMetaPhanTrang } from "../common/utils/phan-trang";

export interface KetQuaHangDayDu extends KetQuaTinhHang {
  sdt_chuan: string;
  tong_mua_hop_le: number;
  so_don_hop_le: number;
  lan_mua_cuoi: Date | null;
  du_dieu_kien_hanh_phuc: boolean;
}
type CauHinhDb = Prisma.hang_thanh_vien_cau_hinhGetPayload<object>;
function sangCauHinhTinh(c: CauHinhDb): CauHinhHangTinh {
  return {
    hang: c.hang,
    ten: c.ten,
    nguong_tich_luy: Number(c.nguong_tich_luy),
    giam_gia_phan_tram: Number(c.giam_gia_phan_tram),
    quyen_loi: c.quyen_loi,
    bat: c.bat
  };
}
/** Hang thanh vien: tinh luc doc tu CrmDocService.tongMuaHopLe — khong cache, hoan / huy tu tinh lai */
@Injectable()
export class HangThanhVienService {
  constructor(
    private readonly repo: HangThanhVienRepository,
    private readonly hoSoKhach: HoSoKhachRepository,
    private readonly crmDoc: CrmDocService,
    private readonly nhatKy: NhatKyService
  ) {}

  async layCauHinh(): Promise<CauHinhDb[]> {
    return this.repo.layCauHinh();
  }

  /** Tinh hang cho mot SDT (chuan hoa). cauHinh truyen san khi tinh hang loat */
  async tinhHangTheoSdt(sdt: string, cauHinh?: CauHinhDb[]): Promise<KetQuaHangDayDu> {
    const chuan = chuanHoaSdt(sdt);
    const [tong, ch] = await Promise.all([this.crmDoc.tongMuaHopLe(chuan), cauHinh ? Promise.resolve(cauHinh) : this.layCauHinh()]);
    const kq = tinhHang(tong.tong_tien, ch.map(sangCauHinhTinh));
    return {
      ...kq,
      sdt_chuan: tong.sdt_chuan,
      tong_mua_hop_le: tong.tong_tien,
      so_don_hop_le: tong.so_don,
      lan_mua_cuoi: tong.lan_mua_cuoi,
      du_dieu_kien_hanh_phuc: tong.so_don >= SO_LAN_MUA_KH_HANH_PHUC
    };
  }

  /** Khach dang o dung hang (tinh lai tu CRM): lay khach co tong mua >= nguong hang roi loc theo hang tinh duoc */
  async layKhachTheoHang(hang: HangThanhVien): Promise<{ sdt_chuan: string; tong_tien: number; so_don: number }[]> {
    const cauHinh = (await this.layCauHinh()).map(sangCauHinhTinh);
    const nguong = Math.min(...cauHinh.filter(c => c.hang === hang).map(c => c.nguong_tich_luy), Number.MAX_SAFE_INTEGER);
    const ds = await this.crmDoc.layKhachTheoTongMua(nguong === Number.MAX_SAFE_INTEGER ? 0 : nguong);
    return ds
      .filter(k => tinhHang(Number(k.tong_tien), cauHinh).hang === hang)
      .map(k => ({ sdt_chuan: k.sdt_chuan, tong_tien: Number(k.tong_tien), so_don: k.so_don }));
  }

  /**
   * Hang cua khach dang dang nhap — chi theo SDT DA XAC MINH (LOI-CAN-SUA muc 1, 3).
   * Chua co SDT -> hang thuong, khong goi CRM; co SDT chua xac minh -> 403 SDT_CHUA_XAC_MINH kem huong dan.
   */
  async layHangCuaToi(nd: ThongTinNguoiDung) {
    const sdt = sdtKhachDaXacMinh(await this.hoSoKhach.laySdtHoSo(nd.id));
    const cauHinh = await this.layCauHinh();
    if (!sdt) {
      const kq = tinhHang(0, cauHinh.map(sangCauHinhTinh));
      return {
        ...kq,
        co_sdt: false,
        sdt_chuan: "",
        tong_mua_hop_le: 0,
        so_don_hop_le: 0,
        lan_mua_cuoi: null,
        du_dieu_kien_hanh_phuc: false,
        cau_hinh: cauHinh,
        don_gan_day: []
      };
    }
    const [kq, dsDon] = await Promise.all([this.tinhHangTheoSdt(sdt, cauHinh), this.crmDoc.layDonTheoSdt(sdt, 20)]);
    return {
      ...kq,
      co_sdt: true,
      cau_hinh: cauHinh,
      // Cho khach thay don nao tinh / khong tinh (hoan, huy, doi tra). Khong tra id noi bo CRM — khach chi can ma don
      don_gan_day: dsDon.map(d => ({
        ma_don: d.ma_don,
        loai_don: d.loai_don,
        trang_thai: d.trang_thai,
        tong_tien: d.tong_tien,
        created_at: d.created_at,
        tinh_vao_hang: laDonHopLe(d)
      }))
    };
  }

  /**
   * Tra cuu hang theo SDT cho nhan vien. QUAN_LY (va ADMIN / THIEN_KHUE) xem moi khach;
   * SALE / CSKH chi xem khach dang duoc giao cho minh (KIEN-TRUC muc 7).
   */
  async traCuu(nd: ThongTinNguoiDung, sdt: string) {
    const chuan = await this.kiemDuocXemKhach(nd, sdt);
    const [kq, khach] = await Promise.all([this.tinhHangTheoSdt(chuan), this.crmDoc.layKhachTheoSdt(chuan)]);
    return { ...kq, ten_khach: khach?.ten ?? null };
  }

  /**
   * Pham vi khach nhan vien duoc xem: null = moi khach (QUAN_LY / ADMIN / THIEN_KHUE);
   * con lai (SALE / CSKH) = danh sach sdt_chuan dang duoc giao (KIEN-TRUC muc 7).
   */
  async phamViKhach(nd: ThongTinNguoiDung): Promise<string[] | null> {
    if (coVai(nd, ["QUAN_LY"])) return null;
    const ds = await this.repo.laySdtKhachDangPhuTrach(nd.id);
    return [...new Set(ds.map(d => d.sdt_chuan))];
  }

  /** Chuan hoa + kiem nhan vien duoc thao tac voi khach nay; tra sdt_chuan */
  async kiemDuocXemKhach(nd: ThongTinNguoiDung, sdt: string): Promise<string> {
    const chuan = chuanHoaSdt(sdt);
    if (!laSdtHopLe(chuan)) throw new BadRequestException("Số điện thoại không hợp lệ");
    const phamVi = await this.phamViKhach(nd);
    if (phamVi && !phamVi.includes(chuan)) throw new ForbiddenException("Bạn chỉ thao tác được với khách đang được giao cho mình");
    return chuan;
  }

  /**
   * Sua thong tin hien thi cua hang (ten, quyen loi them, bat / tat) — CHI Thien Khue that (ADMIN khong thay).
   * Nguong tich luy / % giam la chinh sach -> bat buoc qua de xuat DOI_CHINH_SACH (NGUONG_HANG) o ban phe duyet
   * (maker-checker, chi apDungChinhSach o quan-tri ghi hai cot nay). LOI-CAN-SUA muc 5, 12.
   */
  async capNhatCauHinh(nd: ThongTinNguoiDung, hang: HangThanhVien, dto: CapNhatCauHinhHangDto) {
    kiemThienKhueThat(nd, "đổi cấu hình hạng thẻ");
    const ds = await this.layCauHinh();
    const cu = ds.find(c => c.hang === hang);
    if (!cu) throw new NotFoundException("Không tìm thấy cấu hình hạng");
    const doiNguong = dto.nguong_tich_luy !== undefined && dto.nguong_tich_luy !== Number(cu.nguong_tich_luy);
    const doiGiam = dto.giam_gia_phan_tram !== undefined && dto.giam_gia_phan_tram !== Number(cu.giam_gia_phan_tram);
    if (doiNguong || doiGiam)
      throw new BadRequestException(
        "Đổi ngưỡng tích luỹ hoặc mức giảm giá phải lập đề xuất “Đổi chính sách — ngưỡng hạng” ở Bàn phê duyệt (người lập, người kiểm, Thiên Khuê duyệt)"
      );
    const data: Prisma.hang_thanh_vien_cau_hinhUpdateInput = {
      ...(dto.ten !== undefined ? { ten: dto.ten } : {}),
      ...(dto.quyen_loi !== undefined ? { quyen_loi: dto.quyen_loi } : {}),
      ...(dto.bat !== undefined ? { bat: dto.bat } : {})
    };
    if (!Object.keys(data).length) throw new BadRequestException("Không có thông tin nào để cập nhật");
    return this.repo.chayTrongGiaoDich(async tx => {
      const kq = await this.repo.capNhatCauHinh(hang, data, tx);
      await this.nhatKy.ghi(
        {
          hoSoId: nd.id,
          hanhDong: "DOI_CAU_HINH_HANG",
          doiTuong: "hang_thanh_vien_cau_hinh",
          doiTuongId: cu.id,
          duLieu: {
            truoc: { ...sangCauHinhTinh(cu) },
            sau: { ...sangCauHinhTinh(kq) }
          } as unknown as Prisma.InputJsonValue
        },
        tx
      );
      return kq;
    });
  }
}

/*
 * Khach hang hanh phuc: khach >= 10 lan mua hop le duoc moi mua som mau thu + gop y size / chat lieu / kieu dang.
 * TU NGUYEN (khach tu tra loi, roi bat cu luc nao). Dong y dung hinh la co RIENG, mac dinh false,
 * khong bao gio tu bat theo viec tham gia.
 */

/** Trang thai con trong chuong trinh (duoc gui phan hoi, doi co dong y hinh) */
const DANG_THAM_GIA: TrangThaiMoiKh[] = ["THAM_GIA", "DA_GUI_MAU", "DA_PHAN_HOI"];
/** Loi moi tra cho chinh khach: bo truong noi bo (ghi chu nhan vien, nguoi moi) */
function loiMoiChoKhach(m: moi_kh_hanh_phuc) {
  const { ghi_chu: _ghiChu, nguoi_moi_id: _nguoiMoi, ...conLai } = m;
  return conLai;
}
/** moi_kh_hanh_phuc.sdt_chuan unique: hai nguoi moi cung luc -> 409 thay vi 500 */
function nemNeuTrungLoiMoi(e: unknown): never {
  if ((e as { code?: string })?.code === "P2002") throw new ConflictException("Khách đã có lời mời trong chương trình");
  throw e;
}
@Injectable()
export class KhHanhPhucService {
  constructor(
    private readonly repo: KhHanhPhucRepository,
    private readonly hoSoKhach: HoSoKhachRepository,
    private readonly crmDoc: CrmDocService,
    private readonly hangSv: HangThanhVienService,
    private readonly nhatKy: NhatKyService,
    private readonly thongBao: ThongBaoService
  ) {}

  /** SDT mua hang DA XAC MINH cua khach (null = chua co SDT; chua xac minh -> 403) — LOI-CAN-SUA muc 1, 3 */
  private async sdtCuaToi(nd: ThongTinNguoiDung): Promise<string | null> {
    return sdtKhachDaXacMinh(await this.hoSoKhach.laySdtHoSo(nd.id));
  }

  // ---------------------------------------------------------------- khach

  async layCuaToi(nd: ThongTinNguoiDung) {
    const sdt = await this.sdtCuaToi(nd);
    if (!sdt) return { co_sdt: false, so_lan_mua_hop_le: 0, du_dieu_kien: false, loi_moi: null, phan_hoi: [] };
    const [tong, loiMoi] = await Promise.all([this.crmDoc.tongMuaHopLe(sdt), this.repo.layLoiMoiMoiNhat(sdt)]);
    const phanHoi = loiMoi ? await this.repo.layPhanHoiCuaLoiMoi(loiMoi.id) : [];
    return {
      co_sdt: true,
      so_lan_mua_hop_le: tong.so_don,
      du_dieu_kien: tong.so_don >= SO_LAN_MUA_KH_HANH_PHUC,
      loi_moi: loiMoi ? loiMoiChoKhach(loiMoi) : null,
      phan_hoi: phanHoi
    };
  }

  /**
   * Khach tu tra loi (tu nguyen). Chua co loi moi ma du dieu kien -> tu dang ky tham gia.
   * Tu choi / roi chuong trinh KHONG dong y dung hinh (giu nguyen co rieng).
   */
  async traLoi(nd: ThongTinNguoiDung, thamGia: boolean) {
    const sdt = await this.sdtCuaToi(nd);
    if (!sdt) throw new BadRequestException("Hồ sơ chưa có số điện thoại mua hàng");
    const loiMoi = await this.repo.layLoiMoiMoiNhat(sdt);
    const bayGio = new Date();

    if (!loiMoi) {
      if (!thamGia) throw new NotFoundException("Bạn chưa có lời mời nào");
      const tong = await this.crmDoc.tongMuaHopLe(sdt);
      if (tong.so_don < SO_LAN_MUA_KH_HANH_PHUC)
        throw new BadRequestException(`Chương trình dành cho khách từ ${SO_LAN_MUA_KH_HANH_PHUC} lần mua hợp lệ (bạn đang có ${tong.so_don})`);
      return this.repo
        .chayTrongGiaoDich(async tx => {
          const moi = await this.repo.taoLoiMoi(
            {
              sdt_chuan: sdt,
              ten_khach: nd.hoSo.ho_ten,
              so_lan_mua_luc_moi: tong.so_don,
              trang_thai: "THAM_GIA",
              dong_y_dung_hinh: false,
              tra_loi_luc: bayGio
            },
            tx
          );
          await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "KH_HANH_PHUC_TU_THAM_GIA", doiTuong: "moi_kh_hanh_phuc", doiTuongId: moi.id }, tx);
          return loiMoiChoKhach(moi);
        })
        .catch(nemNeuTrungLoiMoi);
    }

    let trangThaiMoi: TrangThaiMoiKh;
    if (thamGia) {
      if (DANG_THAM_GIA.includes(loiMoi.trang_thai)) return loiMoiChoKhach(loiMoi);
      trangThaiMoi = "THAM_GIA";
    } else {
      if (loiMoi.trang_thai === "TU_CHOI" || loiMoi.trang_thai === "ROI_CHUONG_TRINH") return loiMoiChoKhach(loiMoi);
      trangThaiMoi = loiMoi.trang_thai === "DA_MOI" ? "TU_CHOI" : "ROI_CHUONG_TRINH";
    }
    return this.repo.chayTrongGiaoDich(async tx => {
      const kq = await this.repo.capNhatLoiMoi(loiMoi.id, { trang_thai: trangThaiMoi, tra_loi_luc: bayGio }, tx);
      await this.nhatKy.ghi(
        { hoSoId: nd.id, hanhDong: `KH_HANH_PHUC_${trangThaiMoi}`, doiTuong: "moi_kh_hanh_phuc", doiTuongId: loiMoi.id, duLieu: { truoc: loiMoi.trang_thai } },
        tx
      );
      return loiMoiChoKhach(kq);
    });
  }

  /** Co dong y dung hinh — rieng, khach tu bat / tat, ghi thoi diem */
  async doiDongYHinh(nd: ThongTinNguoiDung, dongY: boolean) {
    const sdt = await this.sdtCuaToi(nd);
    if (!sdt) throw new BadRequestException("Hồ sơ chưa có số điện thoại mua hàng");
    const loiMoi = await this.repo.layLoiMoiMoiNhat(sdt);
    if (!loiMoi) throw new NotFoundException("Bạn chưa tham gia chương trình");
    if (dongY && !DANG_THAM_GIA.includes(loiMoi.trang_thai)) throw new BadRequestException("Chỉ bật được khi đang tham gia chương trình");
    return this.repo.chayTrongGiaoDich(async tx => {
      const kq = await this.repo.capNhatLoiMoi(loiMoi.id, { dong_y_dung_hinh: dongY, dong_y_dung_hinh_luc: dongY ? new Date() : null }, tx);
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: dongY ? "DONG_Y_DUNG_HINH" : "RUT_DONG_Y_DUNG_HINH", doiTuong: "moi_kh_hanh_phuc", doiTuongId: loiMoi.id }, tx);
      return loiMoiChoKhach(kq);
    });
  }

  /** Gop y mau thu (size / chat lieu / kieu dang). cho_phep_dung_hinh mac dinh false */
  async guiPhanHoi(nd: ThongTinNguoiDung, dto: GuiPhanHoiDto) {
    const sdt = await this.sdtCuaToi(nd);
    if (!sdt) throw new BadRequestException("Hồ sơ chưa có số điện thoại mua hàng");
    const loiMoi = await this.repo.layLoiMoiMoiNhat(sdt);
    if (!loiMoi || !DANG_THAM_GIA.includes(loiMoi.trang_thai)) throw new ForbiddenException("Chỉ khách đang tham gia chương trình mới gửi góp ý");
    let mauId: string | null = null;
    let maMau: string | null = null;
    if (dto.ma_mau?.trim()) {
      const mau = await this.crmDoc.layMauTheoMa(dto.ma_mau.trim().toUpperCase());
      if (!mau) throw new BadRequestException("Không tìm thấy mẫu " + dto.ma_mau);
      mauId = mau.id;
      maMau = mau.ma;
    }
    return this.repo.chayTrongGiaoDich(async tx => {
      const ph = await this.repo.taoPhanHoi(
        {
          moi_kh_hanh_phuc_id: loiMoi.id,
          mau_id: mauId,
          ma_mau: maMau,
          diem_size: dto.diem_size ?? null,
          diem_chat_lieu: dto.diem_chat_lieu ?? null,
          diem_kieu_dang: dto.diem_kieu_dang ?? null,
          noi_dung: dto.noi_dung.trim(),
          hinh_anh: dto.hinh_anh ?? [],
          cho_phep_dung_hinh: dto.cho_phep_dung_hinh === true
        },
        tx
      );
      if (loiMoi.trang_thai !== "DA_PHAN_HOI") await this.repo.capNhatLoiMoi(loiMoi.id, { trang_thai: "DA_PHAN_HOI" }, tx);
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "GUI_PHAN_HOI_MAU_THU", doiTuong: "phan_hoi_mau_thu", doiTuongId: ph.id, duLieu: { ma_mau: maMau } }, tx);
      return ph;
    });
  }

  // ---------------------------------------------------------------- nhan vien (QUAN_LY / CSKH duoc giao)

  /** Khach du 10 lan mua hop le chua tung duoc moi */
  async ungVien(nd: ThongTinNguoiDung) {
    const [dsDu, daMoi, phamVi] = await Promise.all([
      this.crmDoc.layKhachDuSoLanMua(SO_LAN_MUA_KH_HANH_PHUC, 500),
      this.repo.laySdtDaMoi(),
      this.hangSv.phamViKhach(nd)
    ]);
    const tapDaMoi = new Set(daMoi.map(m => m.sdt_chuan));
    const ds = dsDu.filter(k => !tapDaMoi.has(k.sdt_chuan) && (!phamVi || phamVi.includes(k.sdt_chuan))).slice(0, 100);
    const ten = await Promise.all(ds.map(k => this.crmDoc.layKhachTheoSdt(k.sdt_chuan)));
    return ds.map((k, i) => ({
      sdt_chuan: k.sdt_chuan,
      ten_khach: ten[i]?.ten ?? null,
      so_don: k.so_don,
      tong_tien: Number(k.tong_tien),
      lan_mua_cuoi: k.lan_mua_cuoi
    }));
  }

  async moi(nd: ThongTinNguoiDung, dto: MoiKhHanhPhucDto) {
    const sdt = await this.hangSv.kiemDuocXemKhach(nd, dto.sdt);
    const [tong, daCo, khach] = await Promise.all([this.crmDoc.tongMuaHopLe(sdt), this.repo.layLoiMoiMoiNhat(sdt), this.crmDoc.layKhachTheoSdt(sdt)]);
    if (tong.so_don < SO_LAN_MUA_KH_HANH_PHUC)
      throw new BadRequestException(`Khách mới có ${tong.so_don} lần mua hợp lệ, cần từ ${SO_LAN_MUA_KH_HANH_PHUC}`);
    // Ton trong tu nguyen: da tu choi / da roi thi khong moi lai
    if (daCo) throw new ConflictException(`Khách đã có lời mời (trạng thái ${daCo.trang_thai})`);
    const moi = await this.repo
      .chayTrongGiaoDich(async tx => {
        const m = await this.repo.taoLoiMoi(
          {
            sdt_chuan: sdt,
            ten_khach: khach?.ten ?? null,
            so_lan_mua_luc_moi: tong.so_don,
            trang_thai: "DA_MOI",
            dong_y_dung_hinh: false,
            nguoi_moi_id: nd.id,
            ghi_chu: dto.ghi_chu ?? null
          },
          tx
        );
        await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "MOI_KH_HANH_PHUC", doiTuong: "moi_kh_hanh_phuc", doiTuongId: m.id, duLieu: { so_don: tong.so_don } }, tx);
        return m;
      })
      .catch(nemNeuTrungLoiMoi);
    try {
      // Chi bao ho so da xac minh SDT — ho so tu khai SDT nguoi khac khong nhan loi moi thay khach
      const hoSo = await this.hoSoKhach.layIdHoSoDaXacMinhTheoSdt(sdt);
      await this.thongBao.guiNhieu(
        hoSo.map(h => h.id),
        {
          tieuDe: "Lời mời Khách hàng hạnh phúc",
          noiDung: "Cảm ơn bạn đã đồng hành cùng LYNO & Thiên Khuê. Bạn được mời mua sớm mẫu thử và góp ý sản phẩm — hoàn toàn tự nguyện.",
          lienKet: "/thanh-vien"
        }
      );
    } catch {
      // thong bao la viec phu
    }
    return moi;
  }

  async danhSachMoi(nd: ThongTinNguoiDung, loc: LocMoiKhQuery) {
    const { skip, take, trang, so_dong } = phanTrang(loc);
    const phamVi = await this.hangSv.phamViKhach(nd);
    const [ds, tong] = await this.repo.danhSachLoiMoi({ trang_thai: loc.trang_thai, phamVi }, skip, take);
    return coMeta(
      ds.map(({ _count, ...m }) => ({ ...m, so_phan_hoi: _count.phan_hoi })),
      taoMetaPhanTrang(trang, so_dong, tong)
    );
  }

  /** Nhan vien chi doi DA_GUI_MAU (sau khi khach THAM_GIA) hoac danh dau roi chuong trinh */
  async capNhatMoi(nd: ThongTinNguoiDung, id: string, dto: CapNhatMoiKhDto) {
    const m = await this.repo.layLoiMoi(id);
    if (!m) throw new NotFoundException("Không tìm thấy lời mời");
    await this.hangSv.kiemDuocXemKhach(nd, m.sdt_chuan);
    if (dto.trang_thai === "DA_GUI_MAU" && !DANG_THAM_GIA.includes(m.trang_thai))
      throw new BadRequestException("Chỉ gửi mẫu cho khách đã đồng ý tham gia");
    if (dto.trang_thai === "ROI_CHUONG_TRINH" && (m.trang_thai === "TU_CHOI" || m.trang_thai === "ROI_CHUONG_TRINH"))
      throw new ConflictException("Lời mời đã kết thúc");
    return this.repo.chayTrongGiaoDich(async tx => {
      const kq = await this.repo.capNhatLoiMoi(id, { trang_thai: dto.trang_thai, ...(dto.ghi_chu !== undefined ? { ghi_chu: dto.ghi_chu } : {}) }, tx);
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: `KH_HANH_PHUC_${dto.trang_thai}`, doiTuong: "moi_kh_hanh_phuc", doiTuongId: id, duLieu: { truoc: m.trang_thai } }, tx);
      return kq;
    });
  }

  /**
   * Phan hoi mau thu cho nhan vien. duoc_dung_hinh = khach dong y o CA loi moi lan phan hoi.
   * Hinh cua phan hoi chua duoc phep: chi de doc noi bo, khong dung truyen thong.
   */
  async danhSachPhanHoi(nd: ThongTinNguoiDung, loc: LocPhanHoiQuery) {
    const { skip, take, trang, so_dong } = phanTrang(loc);
    const phamVi = await this.hangSv.phamViKhach(nd);
    const [ds, tong] = await this.repo.danhSachPhanHoi({ ma_mau: loc.ma_mau, chiDuocDungHinh: loc.chi_duoc_dung_hinh === "true", phamVi }, skip, take);
    return coMeta(
      ds.map(({ moi, ...p }) => ({
        ...p,
        sdt_chuan: moi.sdt_chuan,
        ten_khach: moi.ten_khach,
        duoc_dung_hinh: p.cho_phep_dung_hinh && moi.dong_y_dung_hinh
      })),
      taoMetaPhanTrang(trang, so_dong, tong)
    );
  }
}

/*
 * Doi tac chien luoc (doanh nghiep / ngan hang / to chuc): dat qua so luong lon, dong thuong hieu, tai tro.
 * Bao cao TACH 3 dong: doanh thu ban qua / chi phi tai tro / ket qua chien dich.
 * KHONG BAO GIO tra danh sach khach ca nhan (sdt, ten) cho doi tac — chi so dem tong hop.
 */

type KetQuaChienDich = Record<string, number>;
/** Cong don ket qua chien dich (chi khoa so) */
export function congKetQua(ds: (Prisma.JsonValue | null)[]): KetQuaChienDich {
  const tong: KetQuaChienDich = {};
  for (const kq of ds) {
    if (!kq || typeof kq !== "object" || Array.isArray(kq)) continue;
    for (const [k, v] of Object.entries(kq)) if (typeof v === "number" && Number.isFinite(v)) tong[k] = (tong[k] ?? 0) + v;
  }
  return tong;
}
/** Ket qua chien dich chi nhan so — chan lot danh sach khach vao JSON */
function chiSo(kq: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (kq === undefined) return undefined;
  if (kq === null) return Prisma.DbNull;
  const ra: KetQuaChienDich = {};
  for (const [k, v] of Object.entries(kq)) {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new BadRequestException(`Kết quả chiến dịch "${k}" phải là số (chỉ số tổng hợp, không ghi dữ liệu khách)`);
    ra[k] = v;
  }
  return ra;
}
@Injectable()
export class DoiTacService {
  constructor(
    private readonly repo: DoiTacRepository,
    private readonly nhatKy: NhatKyService
  ) {}

  // ---------------------------------------------------------------- doi tac

  async danhSach(loc: LocDoiTacQuery) {
    const { skip, take, trang, so_dong } = phanTrang(loc);
    const [ds, tong] = await this.repo.danhSach({ loai: loc.loai, tu_khoa: loc.tu_khoa }, skip, take);
    return coMeta(ds, taoMetaPhanTrang(trang, so_dong, tong));
  }

  async layMot(id: string) {
    const dt = await this.repo.layTheoId(id);
    if (!dt) throw new NotFoundException("Không tìm thấy đối tác");
    return dt;
  }

  async tao(nd: ThongTinNguoiDung, dto: TaoDoiTacDto) {
    return this.repo.chayTrongGiaoDich(async tx => {
      const dt = await this.repo.tao({ ...dto, ten: dto.ten.trim() }, tx);
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "TAO_DOI_TAC", doiTuong: "doi_tac", doiTuongId: dt.id, duLieu: { ten: dt.ten, loai: dt.loai } }, tx);
      return dt;
    });
  }

  async capNhat(nd: ThongTinNguoiDung, id: string, dto: CapNhatDoiTacDto) {
    await this.layMot(id);
    return this.repo.chayTrongGiaoDich(async tx => {
      const dt = await this.repo.capNhat(id, dto, tx);
      await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "SUA_DOI_TAC", doiTuong: "doi_tac", doiTuongId: id, duLieu: { ...dto } as Prisma.InputJsonValue }, tx);
      return dt;
    });
  }

  // ---------------------------------------------------------------- hop dong

  async danhSachHopDong(doiTacId: string) {
    await this.layMot(doiTacId);
    return this.repo.danhSachHopDong(doiTacId);
  }

  async taoHopDong(nd: ThongTinNguoiDung, doiTacId: string, dto: TaoHopDongDto) {
    await this.layMot(doiTacId);
    if (dto.bat_dau && dto.ket_thuc && new Date(dto.ket_thuc) < new Date(dto.bat_dau)) throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
    const ketQua = chiSo(dto.ket_qua_chien_dich) ?? Prisma.DbNull;
    try {
      return await this.repo.chayTrongGiaoDich(async tx => {
        const hd = await this.repo.taoHopDong(
          {
            doi_tac_id: doiTacId,
            so_hop_dong: dto.so_hop_dong?.trim() || null,
            ten: dto.ten.trim(),
            loai: dto.loai,
            gia_tri_hop_dong: dto.gia_tri_hop_dong ?? null,
            doanh_thu_qua: dto.doanh_thu_qua ?? 0,
            chi_phi_tai_tro: dto.chi_phi_tai_tro ?? 0,
            ket_qua_chien_dich: ketQua,
            ket_qua_ghi_chu: dto.ket_qua_ghi_chu ?? null,
            bat_dau: dto.bat_dau ? new Date(dto.bat_dau) : null,
            ket_thuc: dto.ket_thuc ? new Date(dto.ket_thuc) : null,
            trang_thai: dto.trang_thai ?? "NHAP",
            nguoi_phu_trach_id: nd.id
          },
          tx
        );
        await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "TAO_HOP_DONG_DOI_TAC", doiTuong: "hop_dong_doi_tac", doiTuongId: hd.id, duLieu: { doi_tac_id: doiTacId, loai: hd.loai } }, tx);
        return hd;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ConflictException("Số hợp đồng đã tồn tại");
      throw e;
    }
  }

  async capNhatHopDong(nd: ThongTinNguoiDung, id: string, dto: CapNhatHopDongDto) {
    const cu = await this.repo.layHopDong(id);
    if (!cu) throw new NotFoundException("Không tìm thấy hợp đồng");
    const ketQua = chiSo(dto.ket_qua_chien_dich);
    try {
      return await this.repo.chayTrongGiaoDich(async tx => {
        const hd = await this.repo.capNhatHopDong(
          id,
          {
            so_hop_dong: dto.so_hop_dong === undefined ? undefined : dto.so_hop_dong?.trim() || null,
            ten: dto.ten?.trim(),
            loai: dto.loai,
            gia_tri_hop_dong: dto.gia_tri_hop_dong,
            doanh_thu_qua: dto.doanh_thu_qua,
            chi_phi_tai_tro: dto.chi_phi_tai_tro,
            ket_qua_chien_dich: ketQua,
            ket_qua_ghi_chu: dto.ket_qua_ghi_chu,
            bat_dau: dto.bat_dau === undefined ? undefined : dto.bat_dau ? new Date(dto.bat_dau) : null,
            ket_thuc: dto.ket_thuc === undefined ? undefined : dto.ket_thuc ? new Date(dto.ket_thuc) : null,
            trang_thai: dto.trang_thai
          },
          tx
        );
        await this.nhatKy.ghi(
          {
            hoSoId: nd.id,
            hanhDong: "SUA_HOP_DONG_DOI_TAC",
            doiTuong: "hop_dong_doi_tac",
            doiTuongId: id,
            duLieu: { truoc: { doanh_thu_qua: Number(cu.doanh_thu_qua), chi_phi_tai_tro: Number(cu.chi_phi_tai_tro), trang_thai: cu.trang_thai }, sau: { ...dto } } as Prisma.InputJsonValue
          },
          tx
        );
        return hd;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ConflictException("Số hợp đồng đã tồn tại");
      throw e;
    }
  }

  // ---------------------------------------------------------------- bao cao (chi so tong hop)

  /** Bao cao tach doanh thu qua / chi phi tai tro / ket qua chien dich — khong co du lieu khach */
  async baoCao(doiTacId?: string) {
    const dsDoiTac = await this.repo.layDoiTacKemSoLieuBaoCao(doiTacId);
    return Promise.all(
      dsDoiTac.map(async dt => {
        const [luotCap, luotDung] = await this.repo.demLuotCapVaDung(dt.id);
        return {
          doi_tac_id: dt.id,
          ten: dt.ten,
          loai: dt.loai,
          so_hop_dong: dt.hop_dong.length,
          doanh_thu_qua: dt.hop_dong.reduce((s, h) => s + Number(h.doanh_thu_qua), 0),
          chi_phi_tai_tro: dt.hop_dong.reduce((s, h) => s + Number(h.chi_phi_tai_tro), 0),
          ket_qua_chien_dich: congKetQua(dt.hop_dong.map(h => h.ket_qua_chien_dich)),
          so_qua_da_duyet: dt._count.qua_tang,
          so_voucher_da_duyet: dt._count.voucher,
          luot_cap: luotCap,
          luot_dung: luotDung
        };
      })
    );
  }

  /** Cong doi tac (vai DOI_TAC): thong tin cua chinh minh, KHONG co sdt / ten khach */
  async cuaToi(nd: ThongTinNguoiDung) {
    const dt = await this.repo.layCuaHoSo(nd.id);
    if (!dt) throw new NotFoundException("Tài khoản chưa gắn với đối tác nào");
    const [hopDong, qua, voucher, baoCao] = await Promise.all([
      this.repo.danhSachHopDong(dt.id),
      this.repo.layQuaCuaDoiTac(dt.id),
      this.repo.layVoucherCuaDoiTac(dt.id),
      this.baoCao(dt.id)
    ]);
    return { doi_tac: dt, hop_dong: hopDong, qua_tang: qua, voucher, bao_cao: baoCao[0] };
  }
}
