import type { ApiLoi, ApiResponse } from "@thien-khue/contracts";
import { layAccessToken } from "./supabase";

/*
 * Goi Nest API (NEXT_PUBLIC_API_URL, prefix /api) — tu gan Bearer cua phien Supabase.
 * Response thanh cong { data, meta? }; loi { error: { code, message } } -> nem LoiApi (message tieng Viet tu server).
 *
 *   const ds = await api.get<KhoaHoc[]>("/dao-tao/khoa-hoc");
 *   const { data, meta } = await api.layCoMeta<Lead[]>("/ban-hang/lead", { trang: 1 });
 *   await api.post("/cong-khai/lien-he", body, { congKhai: true });
 */

export class LoiApi extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "LoiApi";
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface TuyChonGoi {
  query?: Query;
  body?: unknown;
  /** Khong gan Bearer (route @CongKhai) */
  congKhai?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /**
   * Access token dung san (vd tu Session trong onAuthStateChange) — KHONG goi lai getSession():
   * goi getSession() trong callback onAuthStateChange cua supabase-js se treo (khoa phien dang bi giu).
   */
  token?: string;
}

/** Khong co phan hoi sau 20 s -> bao loi thay vi treo man hinh tai mai */
const CHO_TOI_DA_MS = 20_000;

const GOC_API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3310").replace(/\/+$/, "");

function taoUrl(duongDan: string, query?: Query): string {
  const p = duongDan.startsWith("/") ? duongDan : `/${duongDan}`;
  const url = new URL(`${GOC_API}/api${p}`);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  return url.toString();
}

export async function goiApi<T, M = unknown>(phuongThuc: string, duongDan: string, tuyChon: TuyChonGoi = {}): Promise<ApiResponse<T, M>> {
  const headers: Record<string, string> = { Accept: "application/json", ...tuyChon.headers };
  if (tuyChon.body !== undefined && !(tuyChon.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (!tuyChon.congKhai) {
    const token = tuyChon.token ?? (await layAccessToken());
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const hetGio = tuyChon.signal ? null : new AbortController();
  const henGio = hetGio ? setTimeout(() => hetGio.abort(), CHO_TOI_DA_MS) : null;

  let res: Response;
  try {
    res = await fetch(taoUrl(duongDan, tuyChon.query), {
      method: phuongThuc,
      headers,
      body:
        tuyChon.body === undefined ? undefined : tuyChon.body instanceof FormData ? tuyChon.body : JSON.stringify(tuyChon.body),
      signal: tuyChon.signal ?? hetGio?.signal,
      cache: "no-store"
    });
  } catch (e) {
    if ((e as Error).name === "AbortError" && !hetGio?.signal.aborted) throw e;
    throw new LoiApi(0, "NETWORK_ERROR", "Không kết nối được máy chủ, kiểm tra mạng rồi thử lại");
  } finally {
    if (henGio) clearTimeout(henGio);
  }

  if (res.status === 204) return { data: undefined as T };
  let than: unknown = null;
  try {
    than = await res.json();
  } catch {
    than = null;
  }
  if (!res.ok) {
    const loi = (than as ApiLoi | null)?.error;
    throw new LoiApi(res.status, loi?.code ?? "ERROR", loi?.message ?? "Có lỗi xảy ra, thử lại sau", loi?.details);
  }
  return (than ?? { data: null }) as ApiResponse<T, M>;
}

export const api = {
  get: async <T>(duongDan: string, query?: Query, tuyChon?: Omit<TuyChonGoi, "query">) =>
    (await goiApi<T>("GET", duongDan, { ...tuyChon, query })).data,
  post: async <T>(duongDan: string, body?: unknown, tuyChon?: Omit<TuyChonGoi, "body">) =>
    (await goiApi<T>("POST", duongDan, { ...tuyChon, body })).data,
  patch: async <T>(duongDan: string, body?: unknown, tuyChon?: Omit<TuyChonGoi, "body">) =>
    (await goiApi<T>("PATCH", duongDan, { ...tuyChon, body })).data,
  put: async <T>(duongDan: string, body?: unknown, tuyChon?: Omit<TuyChonGoi, "body">) =>
    (await goiApi<T>("PUT", duongDan, { ...tuyChon, body })).data,
  delete: async <T>(duongDan: string, tuyChon?: TuyChonGoi) => (await goiApi<T>("DELETE", duongDan, tuyChon)).data,
  /** Lay ca meta (phan trang) */
  layCoMeta: <T, M = import("@thien-khue/contracts").PhanTrangMeta>(duongDan: string, query?: Query, tuyChon?: Omit<TuyChonGoi, "query">) =>
    goiApi<T, M>("GET", duongDan, { ...tuyChon, query })
};

/** Cau thong bao loi cho nguoi dung tu bat ky loi nao */
export function thongDiepLoi(e: unknown): string {
  if (e instanceof LoiApi) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return "Có lỗi xảy ra, thử lại sau";
}
