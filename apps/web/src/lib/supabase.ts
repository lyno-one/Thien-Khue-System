import { GoTrueClient } from "@supabase/auth-js";

/*
 * Supabase Auth cua CRM (dung chung) — chi dung de DANG NHAP / giu phien phia web.
 * Du lieu nghiep vu luon di qua Nest (src/lib/api.ts), khong doc bang truc tiep tu web.
 * Chi nap @supabase/auth-js (GoTrueClient) thay vi ca supabase-js: web khong dung Realtime / Postgrest / Storage,
 * bot ~45 kB gzip JS tren moi trang. Cau hinh giong createClient (storageKey, header apikey) -> phien cu van dung duoc.
 */

interface SupabaseAuth {
  auth: GoTrueClient;
}

let client: SupabaseAuth | null = null;

export function laySupabase(): SupabaseAuth {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (xem apps/web/.env.example)");
  client = {
    auth: new GoTrueClient({
      url: `${url.replace(/\/+$/, "")}/auth/v1`,
      headers: { Authorization: `Bearer ${anon}`, apikey: anon },
      storageKey: "thien-khue-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "implicit"
    })
  };
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
