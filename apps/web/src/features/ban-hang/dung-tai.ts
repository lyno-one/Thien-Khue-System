"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { thongDiepLoi } from "@/lib/api";

/** Tai du lieu mot lan + taiLai(); bo ket qua cu khi deps doi (tranh ghi de khi mang cham) */
export function useTai<T>(ham: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const lan = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goi = useCallback(ham, deps);

  const taiLai = useCallback(async () => {
    const lanNay = ++lan.current;
    setDangTai(true);
    try {
      const kq = await goi();
      if (lanNay === lan.current) {
        setData(kq);
        setLoi(null);
      }
    } catch (e) {
      if (lanNay === lan.current) setLoi(thongDiepLoi(e));
    } finally {
      if (lanNay === lan.current) setDangTai(false);
    }
  }, [goi]);

  useEffect(() => {
    void taiLai();
  }, [taiLai]);

  return { data, loi, dangTai, taiLai, setData };
}
