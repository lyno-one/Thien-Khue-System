import type {
  BaiHocQuanTri,
  BaiKiemTraQuanTri,
  CauHoiQuanTri,
  KetQuaTangPhienBan,
  KhoaHocQuanTri,
  KhoaHocQuanTriChiTiet,
  LocKhoaHocQuanTriQuery,
  PhanTrangMeta,
  SuaBaiHocBody,
  SuaBaiKiemTraBody,
  SuaCauHoiBody,
  SuaKhoaHocBody,
  TangPhienBanBody,
  TaoBaiHocBody,
  TaoBaiKiemTraBody,
  TaoCauHoiBody,
  TaoKhoaHocBody
} from "@thien-khue/contracts";
import { api } from "@/lib/api";

/* Duong dan quan tri noi dung LMS — theo bang route cuoi packages/contracts/src/dao-tao.ts (/api/dao-tao/quan-tri/*) */
const G = "/dao-tao/quan-tri";
const ma = encodeURIComponent;

export const quanTriNoiDungApi = {
  dsKhoa: (q: LocKhoaHocQuanTriQuery) => api.layCoMeta<KhoaHocQuanTri[], PhanTrangMeta>(`${G}/khoa-hoc`, { ...q, bat: q.bat === undefined ? undefined : String(q.bat) }),
  chiTietKhoa: (id: string) => api.get<KhoaHocQuanTriChiTiet>(`${G}/khoa-hoc/${ma(id)}`),
  taoKhoa: (b: TaoKhoaHocBody) => api.post<KhoaHocQuanTri>(`${G}/khoa-hoc`, b),
  suaKhoa: (id: string, b: SuaKhoaHocBody) => api.patch<KhoaHocQuanTri>(`${G}/khoa-hoc/${ma(id)}`, b),
  tatKhoa: (id: string) => api.delete<KhoaHocQuanTri>(`${G}/khoa-hoc/${ma(id)}`),
  tangPhienBan: (id: string, b: TangPhienBanBody) => api.post<KetQuaTangPhienBan>(`${G}/khoa-hoc/${ma(id)}/tang-phien-ban`, b),

  taoBai: (khoaId: string, b: TaoBaiHocBody) => api.post<BaiHocQuanTri>(`${G}/khoa-hoc/${ma(khoaId)}/bai-hoc`, b),
  suaBai: (id: string, b: SuaBaiHocBody) => api.patch<BaiHocQuanTri>(`${G}/bai-hoc/${ma(id)}`, b),
  tatBai: (id: string) => api.delete<BaiHocQuanTri>(`${G}/bai-hoc/${ma(id)}`),

  taoDe: (khoaId: string, b: TaoBaiKiemTraBody) => api.post<BaiKiemTraQuanTri>(`${G}/khoa-hoc/${ma(khoaId)}/bai-kiem-tra`, b),
  suaDe: (id: string, b: SuaBaiKiemTraBody) => api.patch<BaiKiemTraQuanTri>(`${G}/bai-kiem-tra/${ma(id)}`, b),
  tatDe: (id: string) => api.delete<BaiKiemTraQuanTri>(`${G}/bai-kiem-tra/${ma(id)}`),

  taoCau: (deId: string, b: TaoCauHoiBody) => api.post<CauHoiQuanTri>(`${G}/bai-kiem-tra/${ma(deId)}/cau-hoi`, b),
  suaCau: (id: string, b: SuaCauHoiBody) => api.patch<CauHoiQuanTri>(`${G}/cau-hoi/${ma(id)}`, b),
  xoaCau: (id: string) => api.delete<{ id: string }>(`${G}/cau-hoi/${ma(id)}`)
};
