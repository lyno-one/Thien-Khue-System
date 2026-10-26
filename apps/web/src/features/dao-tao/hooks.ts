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

/** Bai hoc Lyno (CRM). `chay` = false (khong phai nhan su Lyno) -> khong goi API; data null = API tra 403 */
export const useLoTrinhBaiLyno = (chay: boolean) => useDuLieu(chay ? KHOA.loTrinhLyno : null, daoTaoApi.baiLynoLoTrinh);
export const useBaiLyno = (id: string | null) => useDuLieu(id ? KHOA.baiLyno(id) : null, () => daoTaoApi.baiLyno(id ?? ""));
export const useQuizBaiLyno = (id: string | null) => useDuLieu(id ? KHOA.quizLyno(id) : null, () => daoTaoApi.baiLynoQuiz(id ?? ""));
