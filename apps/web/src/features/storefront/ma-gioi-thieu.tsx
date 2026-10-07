"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

/*
 * Ma gioi thieu tren link chia se (/san-pham/<SKU>?mgt=<ma>, do mang-luoi tao):
 * ghi luot click (POST /api/mang-luoi/cong-khai/ma/:ma/click — server bam IP, 30 phut / IP tinh mot lan)
 * va nho ma 30 ngay trong trinh duyet de form "Tư vấn cho tôi" gui kem (lead.ma_gioi_thieu -> ban-hang ghi nhan).
 */

const KHOA = "tk_mgt";
const HAN_MS = 30 * 24 * 3600 * 1000;
const DANG_MA = /^[A-Za-z0-9-]{4,40}$/;

export function layMaGioiThieuDaLuu(): string | null {
  try {
    const tho = window.localStorage.getItem(KHOA);
    if (!tho) return null;
    const { ma, luc } = JSON.parse(tho) as { ma?: string; luc?: number };
    if (!ma || !luc || Date.now() - luc > HAN_MS || !DANG_MA.test(ma)) return null;
    return ma;
  } catch {
    return null;
  }
}

/** Dat o trang san pham: doc ?mgt= mot lan khi mo trang */
export function GhiMaGioiThieu() {
  useEffect(() => {
    const ma = new URLSearchParams(window.location.search).get("mgt")?.trim().toUpperCase();
    if (!ma || !DANG_MA.test(ma)) return;
    try {
      window.localStorage.setItem(KHOA, JSON.stringify({ ma, luc: Date.now() }));
    } catch {
      // trinh duyet chan luu tru — van ghi click
    }
    void api
      .post(`/mang-luoi/cong-khai/ma/${encodeURIComponent(ma)}/click`, { nguon_url: window.location.href.slice(0, 500) }, { congKhai: true })
      .catch(() => undefined);
  }, []);
  return null;
}
