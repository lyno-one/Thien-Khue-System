"use client";

import { laySupabase } from "@/lib/supabase";

/*
 * Mo Sales Training o tab moi, DANG NHAP DUNG nguoi dang dung Thien Khue (docs/TICH-HOP-SALES-TRAINING.md):
 *  1. mo tab about:blank NGAY trong su kien bam (tranh chan popup)
 *  2. lam moi phien Supabase, xin phieu (Bearer) tu TK api
 *  3. POST form an vao tab do: ma_phieu + access_token (+ truong them) — token KHONG nam tren URL
 * Dung cho "Bắt đầu luyện" (phieu LUYEN) va "Xem lại phiên" (phieu XEM). Loi -> dong tab, nem loi cho noi goi hien.
 */

/** Tao form an, POST sang Sales Training o cua so `dich`, roi go form */
function guiFormPost(url: string, truong: Record<string, string>, dich: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  form.target = dich;
  form.style.display = "none";
  for (const [ten, giaTri] of Object.entries(truong)) {
    const o = document.createElement("input");
    o.type = "hidden";
    o.name = ten;
    o.value = giaTri;
    form.appendChild(o);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

/** Origin Sales Training cau hinh cho web (NEXT_PUBLIC_SALES_TRAINING_URL) — rong = chua cau hinh */
const ORIGIN_ST = (() => {
  try {
    const u = (process.env.NEXT_PUBLIC_SALES_TRAINING_URL ?? "").trim();
    return u ? new URL(u).origin : null;
  } catch {
    return null;
  }
})();

/**
 * Chi POST token toi dung Sales Training: url_vao phai http(s) va (neu web da cau hinh NEXT_PUBLIC_SALES_TRAINING_URL)
 * cung origin voi cau hinh. Sai -> nem loi, KHONG gui token.
 */
function kiemUrlVao(urlVao: string): string {
  let u: URL;
  try {
    u = new URL(urlVao);
  } catch {
    throw new Error("Địa chỉ Sales Training không hợp lệ");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Địa chỉ Sales Training không hợp lệ");
  if (ORIGIN_ST && u.origin !== ORIGIN_ST) throw new Error("Địa chỉ Sales Training không khớp cấu hình — đã huỷ, không gửi phiên đăng nhập");
  return u.toString();
}

export interface PhienSupabase {
  access_token: string;
  refresh_token: string;
}

/**
 * GOI DONG BO trong onClick (truoc moi await) — window.open phai nam trong su kien nguoi dung.
 * `xinPhieu` nhan phien Supabase vua lam moi, tra { url_vao, truong } de POST.
 */
export async function moSalesTraining(
  xinPhieu: (phien: PhienSupabase) => Promise<{ url_vao: string; truong: Record<string, string> }>
): Promise<void> {
  const tenTab = `sales-training-${Date.now()}`;
  const tab = window.open("about:blank", tenTab);
  // Cat lien ket nguoc: trang Sales Training khong dieu khien duoc tab Thien Khue (reverse tabnabbing)
  if (tab) tab.opener = null;
  try {
    // Lam moi phien truoc khi chuyen: Sales Training nhan access token con ~1 gio (ST KHONG dung refresh token cua TK —
    // Supabase xoay vong refresh token, hai app cung lam moi mot phien se bi thu hoi ca ho phien)
    const sb = laySupabase();
    const moi = await sb.auth.refreshSession().catch(() => null);
    const phien = moi?.data.session ?? (await sb.auth.getSession()).data.session;
    if (!phien) throw new Error("Phiên đăng nhập đã hết — đăng nhập lại rồi thử lại");
    const { url_vao, truong } = await xinPhieu(phien);
    guiFormPost(kiemUrlVao(url_vao), truong, tab ? tenTab : "_blank");
  } catch (e) {
    tab?.close();
    throw e;
  }
}
