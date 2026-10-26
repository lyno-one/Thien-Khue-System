"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { thongDiepLoi } from "@/lib/api";

/*
 * Tai du lieu co bo nho dem dung chung theo khoa (sidebar tien do + trang tong quan cung doc danh sach khoa hoc
 * ma chi goi API mot lan). lamMoi(khoa) sau khi ghi (hoan thanh bai, nop bai...) de moi noi cung cap nhat.
 */

interface MucDem {
  data?: unknown;
  loi?: string;
  dangTai: boolean;
  lan: number;
}

const kho = new Map<string, MucDem>();
const nguoiNghe = new Map<string, Set<() => void>>();
const hamTai = new Map<string, () => Promise<unknown>>();

function bao(khoa: string) {
  nguoiNghe.get(khoa)?.forEach(f => f());
}

async function chay(khoa: string) {
  const ham = hamTai.get(khoa);
  if (!ham) return;
  const cu = kho.get(khoa);
  const lan = (cu?.lan ?? 0) + 1;
  kho.set(khoa, { data: cu?.data, loi: undefined, dangTai: true, lan });
  bao(khoa);
  try {
    const data = await ham();
    if (kho.get(khoa)?.lan !== lan) return; // co lan tai moi hon
    kho.set(khoa, { data, dangTai: false, lan });
  } catch (e) {
    if (kho.get(khoa)?.lan !== lan) return;
    kho.set(khoa, { data: cu?.data, loi: thongDiepLoi(e), dangTai: false, lan });
  }
  bao(khoa);
}

/** Tai lai mot (hoac nhieu) khoa dang dung; khoa bat dau bang tien to "x*" lam moi moi khoa "x..." */
export function lamMoi(...dsKhoa: string[]) {
  for (const k of dsKhoa) {
    if (k.endsWith("*")) {
      const tien = k.slice(0, -1);
      for (const kk of hamTai.keys()) if (kk.startsWith(tien)) void chay(kk);
    } else if (hamTai.has(k)) void chay(k);
  }
}

const RONG: MucDem = { dangTai: true, lan: 0 };

export function useDuLieu<T>(khoa: string | null, ham: () => Promise<T>) {
  if (khoa) hamTai.set(khoa, ham);

  const dangKy = useCallback(
    (f: () => void) => {
      if (!khoa) return () => undefined;
      let ds = nguoiNghe.get(khoa);
      if (!ds) nguoiNghe.set(khoa, (ds = new Set()));
      ds.add(f);
      return () => {
        ds.delete(f);
      };
    },
    [khoa]
  );
  const muc = useSyncExternalStore(
    dangKy,
    () => (khoa ? (kho.get(khoa) ?? RONG) : RONG),
    () => RONG
  );

  useEffect(() => {
    if (!khoa) return;
    const m = kho.get(khoa);
    // Chua co -> tai; da co (vao lai trang) -> tai ngam de moi, van hien du lieu cu ngay
    if (!m || !m.dangTai) void chay(khoa);
  }, [khoa]);

  return {
    data: muc.data as T | undefined,
    loi: muc.loi ?? null,
    dangTai: muc.dangTai && muc.data === undefined,
    taiLai: useCallback(() => {
      if (khoa) void chay(khoa);
    }, [khoa])
  };
}

/** Trang thai gui form / thao tac (nut dang xu ly + loi) */
export function useThaoTac() {
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const chayThaoTac = useCallback(async <T,>(ham: () => Promise<T>): Promise<T | undefined> => {
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
  return { dangXuLy, loi, setLoi, chay: chayThaoTac };
}

export const KHOA = {
  loTrinh: "dao-tao:lo-trinh",
  dsKhoaHoc: "dao-tao:ds-khoa-hoc",
  /** Tien to moi chi tiet khoa — lamMoi(KHOA.moiKhoaHoc) */
  moiKhoaHoc: "dao-tao:khoa-hoc:*",
  khoaHoc: (id: string) => `dao-tao:khoa-hoc:${id}`,
  baiHoc: (id: string) => `dao-tao:bai-hoc:${id}`,
  luyenAi: (khoaHocId: string) => `dao-tao:luyen-ai:${khoaHocId}`,
  chungChi: "dao-tao:chung-chi",
  quyenSku: "dao-tao:quyen-sku",
  /** Bai hoc Lyno (CRM) — tach khoi tien do LMS cua Thien Khue */
  loTrinhLyno: "dao-tao:bai-lyno:lo-trinh",
  baiLyno: (id: string) => `dao-tao:bai-lyno:bai:${id}`,
  quizLyno: (id: string) => `dao-tao:bai-lyno:quiz:${id}`
};

/** Sau moi thao tac lam doi tien do (hoc xong bai, nop bai, xac nhan SKU): lam moi moi thu lien quan */
export function lamMoiTienDo() {
  lamMoi(KHOA.loTrinh, KHOA.dsKhoaHoc, KHOA.moiKhoaHoc, KHOA.chungChi, KHOA.quyenSku);
}

/** Sau khi danh dau da hoc / nop quiz bai Lyno: lam moi lo trinh Lyno (the tong quan + danh sach) va chinh bai do */
export function lamMoiBaiLyno(baiId: string) {
  lamMoi(KHOA.loTrinhLyno, KHOA.baiLyno(baiId));
}
