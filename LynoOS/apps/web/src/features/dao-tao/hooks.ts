"use client";

import { daoTaoApi } from "./api";
import { KHOA, useDuLieu } from "./dung-du-lieu";

/* Hook doc du lieu LMS (bo nho dem dung chung — xem dung-du-lieu.ts) */

export const useLoTrinh = () => useDuLieu(KHOA.loTrinh, daoTaoApi.loTrinh);
export const useDsKhoaHoc = () => useDuLieu(KHOA.dsKhoaHoc, () => daoTaoApi.dsKhoaHoc());
export const useKhoaHoc = (id: string | null) => useDuLieu(id ? KHOA.khoaHoc(id) : null, () => daoTaoApi.khoaHoc(id ?? ""));
export const useBaiHoc = (id: string | null) => useDuLieu(id ? KHOA.baiHoc(id) : null, () => daoTaoApi.baiHoc(id ?? ""));
export const useChungChi = () => useDuLieu(KHOA.chungChi, daoTaoApi.chungChiCuaToi);
export const useQuyenSku = () => useDuLieu(KHOA.quyenSku, daoTaoApi.quyenSkuCuaToi);
