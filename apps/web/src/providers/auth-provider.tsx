"use client";

import type { NguoiDungHienTai, Vai } from "@thien-khue/contracts";
import type { Session } from "@supabase/supabase-js";
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

  const taiHoSo = useCallback(async (s: Session | null): Promise<NguoiDungHienTai | null> => {
    if (!s) {
      tokenDaTai.current = null;
      setNguoiDung(null);
      return null;
    }
    try {
      // Dung token cua chinh Session nay — khong goi lai getSession() (xem TuyChonGoi.token)
      const nd = (await goiApi<NguoiDungHienTai>("GET", "/ho-so/toi", { token: s.access_token })).data;
      tokenDaTai.current = s.user.id;
      setNguoiDung(nd);
      setLoi(null);
      return nd;
    } catch (e) {
      setNguoiDung(null);
      setLoi(thongDiepLoi(e));
      return null;
    }
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
      return taiHoSo(s);
    },
    [taiHoSo]
  );

  const dangXuat = useCallback(async () => {
    await dangXuatSupabase();
    setPhien(null);
    setNguoiDung(null);
    tokenDaTai.current = null;
  }, []);

  const taiLai = useCallback(async () => {
    const { data } = await laySupabase().auth.getSession();
    setPhien(data.session);
    await taiHoSo(data.session);
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
