"use client";

import type { Vai } from "@thien-khue/contracts";
import { useCallback, useEffect, useState } from "react";
import { useXacThuc } from "@/providers/auth-provider";

/*
 * "Vai dang dung" khi mot ho so co nhieu vai HOAT_DONG — chi la lua chon giao dien (mac dinh trang, menu).
 * Quyen that van kiem o Nest theo moi vai HOAT_DONG. Luu localStorage theo ho so; bao cac tab / component khac qua su kien.
 *   const { vaiDangDung, chonVai, dsVai } = useVaiDangDung();
 */

const SU_KIEN = "tk:vai-dang-dung";
const khoa = (hoSoId: string) => `tk-vai-dang-dung:${hoSoId}`;

/** Thu tu uu tien khi chua chon: vai lam viec truoc, KHACH sau cung */
const UU_TIEN: Vai[] = ["THIEN_KHUE", "ADMIN", "QUAN_LY", "SALE", "CSKH", "MENTOR", "CTV", "KOL", "KOC", "THUC_TAP", "DOI_TAC", "KHACH"];

/** Trang chinh cua tung vai */
export const TRANG_CUA_VAI: Record<Vai, string> = {
  KHACH: "/thanh-vien",
  SALE: "/lam-viec/ban-hang",
  CSKH: "/lam-viec/ban-hang",
  CTV: "/lam-viec/mang-luoi",
  THUC_TAP: "/lam-viec/mang-luoi",
  KOL: "/lam-viec/mang-luoi",
  KOC: "/lam-viec/mang-luoi",
  MENTOR: "/hoc-vien/quan-tri",
  DOI_TAC: "/thanh-vien",
  QUAN_LY: "/quan-tri",
  ADMIN: "/quan-tri",
  THIEN_KHUE: "/quan-tri"
};

function docLuu(hoSoId: string): Vai | null {
  try {
    return (window.localStorage.getItem(khoa(hoSoId)) as Vai | null) ?? null;
  } catch {
    return null;
  }
}

export function useVaiDangDung() {
  const { nguoiDung } = useXacThuc();
  const dsVai = [...(nguoiDung?.vai ?? [])].sort((a, b) => UU_TIEN.indexOf(a) - UU_TIEN.indexOf(b));
  const hoSoId = nguoiDung?.id ?? null;
  const [daLuu, setDaLuu] = useState<Vai | null>(null);

  useEffect(() => {
    if (!hoSoId) return;
    setDaLuu(docLuu(hoSoId));
    const nghe = () => setDaLuu(docLuu(hoSoId));
    window.addEventListener(SU_KIEN, nghe);
    window.addEventListener("storage", nghe);
    return () => {
      window.removeEventListener(SU_KIEN, nghe);
      window.removeEventListener("storage", nghe);
    };
  }, [hoSoId]);

  const chonVai = useCallback(
    (vai: Vai) => {
      if (!hoSoId) return;
      try {
        window.localStorage.setItem(khoa(hoSoId), vai);
      } catch {
        // Trinh duyet chan storage: van doi trong phien hien tai
      }
      setDaLuu(vai);
      window.dispatchEvent(new Event(SU_KIEN));
    },
    [hoSoId]
  );

  // Vai da luu co the da bi tam dung / ket thuc -> roi ve vai uu tien
  const vaiDangDung: Vai | null = daLuu && dsVai.includes(daLuu) ? daLuu : (dsVai[0] ?? null);
  return { vaiDangDung, chonVai, dsVai };
}
