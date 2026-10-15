// Cau hinh tu bien moi truong (.env.local nap o main.ts). Doc luoi + kiem bat buoc mot lan.

export interface CauHinh {
  port: number;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  crmApiUrl: string;
  corsOrigins: string[];
  /** Goc Sales Training (form vao: <url>/api/vao-tu-thien-khue). Rong = tat tich hop luyen AI */
  salesTrainingUrl: string;
  /** Bi mat HMAC dung chung voi Sales Training (>= 32 ky tu). Rong / ngan = tu choi moi request server->server */
  tichHopStSecret: string;
}

let daDoc: CauHinh | null = null;

function batBuoc(ten: string): string {
  const v = process.env[ten]?.trim();
  if (!v) throw new Error(`Thiếu biến môi trường ${ten} (xem apps/api/.env.example)`);
  return v;
}

export function layCauHinh(): CauHinh {
  if (daDoc) return daDoc;
  daDoc = {
    port: Number(process.env.PORT ?? 3310),
    supabaseUrl: batBuoc("SUPABASE_URL").replace(/\/+$/, ""),
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY?.trim() ?? "",
    supabaseServiceRoleKey: batBuoc("SUPABASE_SERVICE_ROLE_KEY"),
    crmApiUrl: (process.env.CRM_API_URL ?? "http://localhost:3220").replace(/\/+$/, ""),
    corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3300")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
    salesTrainingUrl: (process.env.SALES_TRAINING_URL ?? "").trim().replace(/\/+$/, ""),
    tichHopStSecret: process.env.TICH_HOP_ST_SECRET?.trim() ?? ""
  };
  return daDoc;
}

/** Chi dung trong test */
export function datLaiCauHinh(): void {
  daDoc = null;
}
