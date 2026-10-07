import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * Supabase Auth cua CRM (dung chung) — chi dung de DANG NHAP / giu phien phia web.
 * Du lieu nghiep vu luon di qua Nest (src/lib/api.ts), khong doc bang truc tiep tu web.
 */

let client: SupabaseClient | null = null;

export function laySupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (xem apps/web/.env.example)");
  client = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "thien-khue-auth" }
  });
  return client;
}

/** Access token hien tai (tu lam moi neu sap het han) — null neu chua dang nhap */
export async function layAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { data } = await laySupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

/** Dang nhap email + mat khau. Loi -> nem Error voi cau tieng Viet */
export async function dangNhapEmail(email: string, matKhau: string) {
  const { data, error } = await laySupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: matKhau });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) throw new Error("Email hoặc mật khẩu không đúng");
    if (/email not confirmed/i.test(error.message)) throw new Error("Email chưa được xác nhận");
    throw new Error("Không đăng nhập được, thử lại sau");
  }
  return data.session;
}

export async function dangXuatSupabase(): Promise<void> {
  await laySupabase().auth.signOut();
}
