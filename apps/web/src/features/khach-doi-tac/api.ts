"use client";

import type {
  BaoCaoDoiTac,
  CapNhatCapPhatBody,
  CapNhatCauHinhHangBody,
  CapNhatDoiTacBody,
  CapNhatHopDongBody,
  CapNhatMoiKhBody,
  CapPhatBody,
  CapPhatTheoHangBody,
  CapPhatUuDai,
  CauHinhHang,
  DoiTac,
  DoiTacCuaToi,
  DuyetUuDaiBody,
  GuiPhanHoiBody,
  HangCuaToi,
  HangThanhVien,
  HanhPhucCuaToi,
  HopDongDoiTac,
  KetQuaCapPhatTheoHang,
  MoiKhHanhPhuc,
  MoiKhHanhPhucBody,
  PhanHoiMauThu,
  PhanHoiMauThuNoiBo,
  QuaTang,
  TaoDoiTacBody,
  TaoHopDongBody,
  TaoQuaTangBody,
  TaoVoucherBody,
  ThamDinhQuaBody,
  TraCuuHang,
  UngVienHanhPhuc,
  UuDaiCuaToi,
  Voucher
} from "@thien-khue/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, thongDiepLoi } from "@/lib/api";

// Goi API module khach-doi-tac (/api/khach-doi-tac/*)
const G = "/khach-doi-tac";

export const apiKdt = {
  // khach
  hangCuaToi: () => api.get<HangCuaToi>(`${G}/toi/hang`),
  uuDaiCuaToi: () => api.get<UuDaiCuaToi>(`${G}/toi/uu-dai`),
  hanhPhucCuaToi: () => api.get<HanhPhucCuaToi>(`${G}/toi/hanh-phuc`),
  traLoiMoi: (tham_gia: boolean) => api.post<MoiKhHanhPhuc>(`${G}/toi/hanh-phuc/tra-loi`, { tham_gia }),
  dongYHinh: (dong_y: boolean) => api.patch<MoiKhHanhPhuc>(`${G}/toi/hanh-phuc/dong-y-hinh`, { dong_y }),
  guiPhanHoi: (body: GuiPhanHoiBody) => api.post<PhanHoiMauThu>(`${G}/toi/hanh-phuc/phan-hoi`, body),

  // hang
  cauHinh: () => api.get<CauHinhHang[]>(`${G}/hang/cau-hinh`),
  capNhatCauHinh: (hang: HangThanhVien, body: CapNhatCauHinhHangBody) => api.put<CauHinhHang>(`${G}/hang/cau-hinh/${hang}`, body),
  traCuu: (sdt: string) => api.get<TraCuuHang>(`${G}/hang/tra-cuu`, { sdt }),

  // KH hanh phuc
  ungVien: () => api.get<UngVienHanhPhuc[]>(`${G}/hanh-phuc/ung-vien`),
  dsMoi: (q: { trang?: number; trang_thai?: string }) => api.layCoMeta<MoiKhHanhPhuc[]>(`${G}/hanh-phuc/moi`, { so_dong: 20, ...q }),
  moi: (body: MoiKhHanhPhucBody) => api.post<MoiKhHanhPhuc>(`${G}/hanh-phuc/moi`, body),
  capNhatMoi: (id: string, body: CapNhatMoiKhBody) => api.patch<MoiKhHanhPhuc>(`${G}/hanh-phuc/moi/${id}`, body),
  dsPhanHoi: (q: { trang?: number; chi_duoc_dung_hinh?: string }) => api.layCoMeta<PhanHoiMauThuNoiBo[]>(`${G}/hanh-phuc/phan-hoi`, { so_dong: 20, ...q }),

  // qua / voucher / cap phat
  dsQua: (q: { trang?: number; trang_thai?: string }) => api.layCoMeta<QuaTang[]>(`${G}/qua-tang`, { so_dong: 20, ...q }),
  taoQua: (body: TaoQuaTangBody) => api.post<QuaTang>(`${G}/qua-tang`, body),
  thamDinhQua: (id: string, body: ThamDinhQuaBody) => api.post<QuaTang>(`${G}/qua-tang/${id}/tham-dinh`, body),
  duyetQua: (id: string, body: DuyetUuDaiBody) => api.post<QuaTang>(`${G}/qua-tang/${id}/duyet`, body),
  dsVoucher: (q: { trang?: number; trang_thai?: string }) => api.layCoMeta<Voucher[]>(`${G}/voucher`, { so_dong: 20, ...q }),
  taoVoucher: (body: TaoVoucherBody) => api.post<Voucher>(`${G}/voucher`, body),
  duyetVoucher: (id: string, body: DuyetUuDaiBody) => api.post<Voucher>(`${G}/voucher/${id}/duyet`, body),
  dsCapPhat: (q: { trang?: number; sdt?: string; trang_thai?: string }) => api.layCoMeta<CapPhatUuDai[]>(`${G}/cap-phat`, { so_dong: 20, ...q }),
  capPhat: (body: CapPhatBody) => api.post<CapPhatUuDai>(`${G}/cap-phat`, body),
  capPhatTheoHang: (body: CapPhatTheoHangBody) => api.post<KetQuaCapPhatTheoHang>(`${G}/cap-phat/theo-hang`, body),
  capNhatCapPhat: (id: string, body: CapNhatCapPhatBody) => api.patch<CapPhatUuDai>(`${G}/cap-phat/${id}`, body),

  // doi tac
  dsDoiTac: (q: { trang?: number; tu_khoa?: string; loai?: string }) => api.layCoMeta<DoiTac[]>(`${G}/doi-tac`, { so_dong: 50, ...q }),
  taoDoiTac: (body: TaoDoiTacBody) => api.post<DoiTac>(`${G}/doi-tac`, body),
  capNhatDoiTac: (id: string, body: CapNhatDoiTacBody) => api.patch<DoiTac>(`${G}/doi-tac/${id}`, body),
  dsHopDong: (doiTacId: string) => api.get<HopDongDoiTac[]>(`${G}/doi-tac/${doiTacId}/hop-dong`),
  taoHopDong: (doiTacId: string, body: TaoHopDongBody) => api.post<HopDongDoiTac>(`${G}/doi-tac/${doiTacId}/hop-dong`, body),
  capNhatHopDong: (id: string, body: CapNhatHopDongBody) => api.patch<HopDongDoiTac>(`${G}/hop-dong/${id}`, body),
  baoCao: () => api.get<BaoCaoDoiTac[]>(`${G}/doi-tac/bao-cao`),
  doiTacCuaToi: () => api.get<DoiTacCuaToi>(`${G}/doi-tac/cua-toi`)
};

/** Tai du lieu don gian: { data, loi, dangTai, taiLai } — khoa doi thi tai lai */
export function useTai<T>(ham: () => Promise<T>, phuThuoc: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const lan = useRef(0);
  const hamRef = useRef(ham);
  hamRef.current = ham;

  const taiLai = useCallback(async () => {
    const lanNay = ++lan.current;
    setDangTai(true);
    setLoi(null);
    try {
      const kq = await hamRef.current();
      if (lanNay === lan.current) setData(kq);
    } catch (e) {
      if (lanNay === lan.current) setLoi(thongDiepLoi(e));
    } finally {
      if (lanNay === lan.current) setDangTai(false);
    }
  }, []);

  useEffect(() => {
    void taiLai();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, phuThuoc);

  return { data, loi, dangTai, taiLai };
}

/** Chay mot thao tac ghi: { chay, dangXuLy, loi } */
export function useThaoTac() {
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const chay = useCallback(async <T,>(ham: () => Promise<T>): Promise<T | undefined> => {
    setDangXuLy(true);
    setLoi(null);
    try {
      return await ham();
    } catch (e) {
      setLoi(thongDiepLoi(e));
      return undefined;
    } finally {
      setDangXuLy(false);
    }
  }, []);
  return { chay, dangXuLy, loi, datLoi: setLoi };
}

/**
 * Quyet dinh chi Thien Khue (duyet qua / voucher, sua cau hinh hang): vai THIEN_KHUE THAT.
 * Khong dung coVai — coVai cho ADMIN qua, con API chan ADMIN (LOI-CAN-SUA muc 5, 12).
 */
export function laThienKhueThat(nd: { vai: readonly string[] } | null | undefined): boolean {
  return !!nd?.vai.includes("THIEN_KHUE");
}
