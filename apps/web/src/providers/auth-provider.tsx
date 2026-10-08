"use client";

import type { NguoiDungHienTai, Vai } from "@thien-khue/contracts";
import type { Session } from "@supabase/auth-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { goiApi, thongDiepLoi } from "@/lib/api";
import { dangNhapEmail, dangXuatSupabase, laySupabase } from "@/lib/supabase";

/*
 * Phien dang nhap (Supabase Auth cua CRM) + ho so & vai tu Nest (GET /api/ho-so/toi).
 * Dung: const { nguoiDung, dangTai, coVai, dangNhap, dangXuat } = useXacThuc();
 */

/** Vai luon qua moi kiem tra coVai (giong VaiGuard o api) */
const VAI_TOI_CAO: Vai[] = ["ADMIN", "THIEN_KHUE"];

interface GiaTriXacThuc {
  phien: Session | null;
  nguoiDung: NguoiDungHienTai | null;
  /** Dang doc phien / ho so lan dau */
  dangTai: boolean;
  loi: string | null;
  dangNhap: (email: string, matKhau: string) => Promise<NguoiDungHienTai | null>;
  dangXuat: () => Promise<void>;
  taiLai: () => Promise<void>;
  /** Co mot trong cac vai dang HOAT_DONG (ADMIN / THIEN_KHUE luon true) */
  coVai: (...vai: Vai[]) => boolean;
}

const NguCanh = createContext<GiaTriXacThuc | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [phien, setPhien] = useState<Session | null>(null);
  const [nguoiDung, setNguoiDung] = useState<NguoiDungHienTai | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const tokenDaTai = useRef<string | null>(null);
  /** Lan tai ho so dang chay (theo user id): getSession() luc dau + INITIAL_SESSION / SIGNED_IN den gan nhu cung luc —
   *  dung chung mot request thay vi goi /ho-so/toi 2–3 lan moi lan mo trang */
  const dangTaiHoSo = useRef<{ id: string; p: Promise<NguoiDungHienTai | null> } | null>(null);

  const taiHoSo = useCallback(async (s: Session | null, epTaiMoi = false): Promise<NguoiDungHienTai | null> => {
    if (!s) {
      tokenDaTai.current = null;
      dangTaiHoSo.current = null;
      setNguoiDung(null);
      return null;
    }
    const dangChay = dangTaiHoSo.current;
    if (!epTaiMoi && dangChay && dangChay.id === s.user.id) return dangChay.p;
    const lan: { id: string; p: Promise<NguoiDungHienTai | null> } = { id: s.user.id, p: Promise.resolve(null) };
    const conHieuLuc = () => dangTaiHoSo.current === lan;
    dangTaiHoSo.current = lan;
    lan.p = (async () => {
      try {
        // Dung token cua chinh Session nay — khong goi lai getSession() (xem TuyChonGoi.token)
        const nd = (await goiApi<NguoiDungHienTai>("GET", "/ho-so/toi", { token: s.access_token })).data;
        // Da dang xuat / doi nguoi trong luc cho -> bo ket qua cu
        if (!conHieuLuc()) return nd;
        tokenDaTai.current = s.user.id;
        setNguoiDung(nd);
        setLoi(null);
        return nd;
      } catch (e) {
        if (!conHieuLuc()) return null;
        setNguoiDung(null);
        setLoi(thongDiepLoi(e));
        return null;
      } finally {
        if (conHieuLuc()) dangTaiHoSo.current = null;
      }
    })();
    return lan.p;
  }, []);

  useEffect(() => {
    let huy = false;
    const sb = laySupabase();
    sb.auth
      .getSession()
      .then(async ({ data }) => {
        if (huy) return;
        setPhien(data.session);
        await taiHoSo(data.session);
      })
      .catch(() => {
        if (!huy) setPhien(null);
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });
    const { data: dk } = sb.auth.onAuthStateChange((suKien, s) => {
      setPhien(s);
      // Khong goi API / supabase ngay trong callback (supabase-js dang giu khoa phien -> treo): day ra sau
      setTimeout(() => {
        if (huy) return;
        // TOKEN_REFRESHED khong can tai lai ho so; doi nguoi dung thi tai
        if (suKien === "SIGNED_OUT") void taiHoSo(null);
        else if (s && tokenDaTai.current !== s.user.id) void taiHoSo(s);
      }, 0);
    });
    return () => {
      huy = true;
      dk.subscription.unsubscribe();
    };
  }, [taiHoSo]);

  const dangNhap = useCallback(
    async (email: string, matKhau: string) => {
      const s = await dangNhapEmail(email, matKhau);
      setPhien(s);
      return taiHoSo(s, true);
    },
    [taiHoSo]
  );

  const dangXuat = useCallback(async () => {
    await dangXuatSupabase();
    setPhien(null);
    setNguoiDung(null);
    tokenDaTai.current = null;
    dangTaiHoSo.current = null;
  }, []);

  const taiLai = useCallback(async () => {
    const { data } = await laySupabase().auth.getSession();
    setPhien(data.session);
    // Tai lai co chu dich (sau khi sua ho so...) — luon goi moi, khong dung lan dang chay
    await taiHoSo(data.session, true);
  }, [taiHoSo]);

  const coVai = useCallback(
    (...vai: Vai[]) => {
      if (!nguoiDung) return false;
      return nguoiDung.vai.some(v => VAI_TOI_CAO.includes(v) || vai.includes(v));
    },
    [nguoiDung]
  );

  const giaTri = useMemo<GiaTriXacThuc>(
    () => ({ phien, nguoiDung, dangTai, loi, dangNhap, dangXuat, taiLai, coVai }),
    [phien, nguoiDung, dangTai, loi, dangNhap, dangXuat, taiLai, coVai]
  );

  return <NguCanh.Provider value={giaTri}>{children}</NguCanh.Provider>;
}

export function useXacThuc(): GiaTriXacThuc {
  const v = useContext(NguCanh);
  if (!v) throw new Error("useXacThuc phải nằm trong <AuthProvider>");
  return v;
}
