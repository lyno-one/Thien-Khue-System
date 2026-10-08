import type { PhanTrangMeta } from "@thien-khue/contracts";
import { api, goiApi } from "@/lib/api";
import type {
  BaiHocChiTiet,
  BaiThucHanh,
  BaiThucHanhChoCham,
  ChamThucHanhBody,
  ChungChi,
  DeThi,
  KetQuaChamThucHanh,
  KetQuaHoanThanhBai,
  KetQuaNopBai,
  KetQuaXacNhanSku,
  KhoaHocChiTiet,
  KhoaHocTomTat,
  LoaiKhoaHoc,
  LoTrinhCuaToi,
  LuotLamTomTat,
  NopBaiKiemTraBody,
  NopThucHanhBody,
  PhieuLuyenAi,
  PhieuXemLuyenAi,
  QuyenSkuCuaToi,
  TaoPhieuLuyenAiBody,
  TienDoLuyenAi,
  TrangThaiThucHanh
} from "./kieu";

/*
 * Moi duong dan API cua LMS gom MOT cho — theo BANG ROUTE cuoi packages/contracts/src/dao-tao.ts (/api/dao-tao/*).
 */
const ma = encodeURIComponent;

export const daoTaoApi = {
  loTrinh: () => api.get<LoTrinhCuaToi>("/dao-tao/lo-trinh"),
  dsKhoaHoc: (loai?: LoaiKhoaHoc) => api.get<KhoaHocTomTat[]>("/dao-tao/khoa-hoc", { loai }),
  khoaHoc: (idHoacMa: string) => api.get<KhoaHocChiTiet>(`/dao-tao/khoa-hoc/${ma(idHoacMa)}`),
  baiHoc: (id: string) => api.get<BaiHocChiTiet>(`/dao-tao/bai-hoc/${ma(id)}`),
  hoanThanhBai: (id: string) => api.post<KetQuaHoanThanhBai>(`/dao-tao/bai-hoc/${ma(id)}/hoan-thanh`),
  boHoanThanhBai: (id: string) => api.delete<KetQuaHoanThanhBai>(`/dao-tao/bai-hoc/${ma(id)}/hoan-thanh`),

  /** Mo (hoac lay lai) luot lam dang do — de KHONG co dap an */
  batDauKiemTra: (id: string) => api.post<DeThi>(`/dao-tao/bai-kiem-tra/${ma(id)}/bat-dau`),
  nopBai: (id: string, body: NopBaiKiemTraBody) => api.post<KetQuaNopBai>(`/dao-tao/bai-kiem-tra/${ma(id)}/nop`, body),
  lichSuKiemTra: (id: string) => api.get<LuotLamTomTat[]>(`/dao-tao/bai-kiem-tra/${ma(id)}/lich-su`),

  nopThucHanh: (khoaHocId: string, body: NopThucHanhBody) => api.post<BaiThucHanh>(`/dao-tao/khoa-hoc/${ma(khoaHocId)}/thuc-hanh`, body),
  thucHanhCuaToi: () => api.get<BaiThucHanh[]>("/dao-tao/thuc-hanh/cua-toi"),

  /** Luyen tu van voi AI (Sales Training): tien do cua toi + mo phieu vao (dung mot lan, han 10 phut) */
  luyenAi: (khoaHocId: string) => api.get<TienDoLuyenAi>(`/dao-tao/khoa-hoc/${ma(khoaHocId)}/luyen-ai`),
  taoPhieuLuyenAi: (body: TaoPhieuLuyenAiBody) => api.post<PhieuLuyenAi>("/dao-tao/luyen-ai/phieu", body),
  /** Phieu XEM lai mot phien (id = phien_luyen_ai.id cua TK; chu phien / mentor / quan ly; dung mot lan, han 2 phut) */
  taoPhieuXemLuyenAi: (phienId: string) => api.post<PhieuXemLuyenAi>(`/dao-tao/luyen-ai/phien/${ma(phienId)}/phieu-xem`),

  chungChiCuaToi: () => api.get<ChungChi[]>("/dao-tao/chung-chi/cua-toi"),
  quyenSkuCuaToi: () => api.get<QuyenSkuCuaToi[]>("/dao-tao/quyen-sku/cua-toi"),
  /** Chi khi yeu_cau_hoc_lai = XAC_NHAN */
  xacNhanSku: (mauId: string) => api.post<KetQuaXacNhanSku>(`/dao-tao/quyen-sku/${ma(mauId)}/xac-nhan`),

  /** Mentor / quan ly: hang doi cham (co meta phan trang) */
  dsThucHanh: (q: { trang_thai?: TrangThaiThucHanh; khoa_hoc_id?: string; trang?: number; so_dong?: number }) =>
    goiApi<BaiThucHanhChoCham[], PhanTrangMeta>("GET", "/dao-tao/thuc-hanh", { query: { ...q } }),
  chamThucHanh: (id: string, body: ChamThucHanhBody) => api.post<KetQuaChamThucHanh>(`/dao-tao/thuc-hanh/${ma(id)}/cham`, body)
};
